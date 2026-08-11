import { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput,
  ActivityIndicator, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import { useUser } from '@/context/AppContext';
import { MessageService, Message } from '@/services/messageService';
import { connectSocket, getSocket } from '@/services/socket';
import { getAuthUserId } from '@/services/currentUser';

const PAGE_SIZE = 30;
const POLL_MS = 15000; // slow safety-net; sockets carry real-time
const TYPING_TIMEOUT = 2500;

function timeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

// Defensively normalize a message coming off the socket (field names may vary).
function normalizeIncoming(raw: any, fallbackConversationId: string): Message {
  return {
    _id: raw?._id || raw?.id || `srv_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    conversationId: raw?.conversationId || fallbackConversationId,
    senderId: raw?.senderId || raw?.sender || '',
    receiverId: raw?.receiverId || raw?.receiver || '',
    message: raw?.message ?? raw?.text ?? '',
    messageType: raw?.messageType || (raw?.imageUrl || raw?.image ? 'image' : 'text'),
    imageUrl: raw?.imageUrl || raw?.image,
    status: raw?.status || 'sent',
    timestamp: raw?.timestamp || raw?.createdAt || new Date().toISOString(),
    isDeleted: raw?.isDeleted,
    deletedForEveryone: raw?.deletedForEveryone,
  };
}

export default function ChatScreen() {
  const { user } = useUser();
  const params = useLocalSearchParams<{
    conversationId: string;
    otherUserId: string;
    name: string;
    avatar: string;
  }>();
  const conversationId = String(params.conversationId ?? '');
  const otherUserId = String(params.otherUserId ?? '');
  const name = String(params.name ?? 'Conversation');
  const avatar = String(params.avatar ?? '');

  // Messaging identity = JWT subject (what the backend authorizes against), which
  // may differ from the profile `user.id`. Fall back to user.id until resolved.
  const [myId, setMyId] = useState(user.id);
  useEffect(() => {
    getAuthUserId().then(id => { if (id) setMyId(id); });
  }, []);

  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [text, setText] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [otherTyping, setOtherTyping] = useState(false);
  const listRef = useRef<FlatList<Message>>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingClearTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);

  // Newest-first list (inverted FlatList) keeps the latest message at the bottom.
  const mergeMessages = useCallback((incoming: Message[], older = false) => {
    setMessages(prev => {
      const map = new Map(prev.map(m => [m._id, m]));
      incoming.forEach(m => map.set(m._id, m));
      const all = Array.from(map.values());
      all.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      return all;
    });
  }, []);

  const loadFirstPage = useCallback(async () => {
    if (!conversationId) return;
    try {
      const data = await MessageService.getMessages(conversationId, { page: 1, limit: PAGE_SIZE });
      setMessages(
        [...data.messages].sort(
          (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        )
      );
      setHasMore(data.pagination?.hasMore ?? false);
      setPage(1);
    } catch (err: any) {
      console.warn('[Chat] load error:', err.message);
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  const loadMore = useCallback(async () => {
    if (!hasMore || loadingMore || !conversationId) return;
    setLoadingMore(true);
    try {
      const next = page + 1;
      const data = await MessageService.getMessages(conversationId, { page: next, limit: PAGE_SIZE });
      mergeMessages(data.messages, true);
      setHasMore(data.pagination?.hasMore ?? false);
      setPage(next);
    } catch (err: any) {
      console.warn('[Chat] load more error:', err.message);
    } finally {
      setLoadingMore(false);
    }
  }, [hasMore, loadingMore, page, conversationId, mergeMessages]);

  // Initial load + mark read
  useEffect(() => {
    loadFirstPage();
    if (conversationId) MessageService.markAsRead(conversationId).catch(() => {});
  }, [loadFirstPage, conversationId]);

  // Slow polling as a safety net for when the socket is disconnected.
  useEffect(() => {
    if (!conversationId) return;
    const id = setInterval(async () => {
      if (getSocket()?.connected) return; // socket is carrying real-time; skip
      try {
        const data = await MessageService.getMessages(conversationId, { page: 1, limit: PAGE_SIZE });
        mergeMessages(data.messages);
      } catch {}
    }, POLL_MS);
    return () => clearInterval(id);
  }, [conversationId, mergeMessages]);

  // ── Real-time socket: receive messages, typing, read receipts ──
  useEffect(() => {
    if (!conversationId) return;
    let disposed = false;
    let socketRef: ReturnType<typeof getSocket> = null;

    const onReceive = (raw: any) => {
      const msg = normalizeIncoming(raw, conversationId);
      if (msg.conversationId !== conversationId) return;
      mergeMessages([msg]);
      // Incoming from the other user while this chat is open → mark read.
      if (msg.senderId !== myId) {
        setOtherTyping(false);
        MessageService.markAsRead(conversationId).catch(() => {});
        socketRef?.emit('mark_read', { conversationId, receiverId: otherUserId });
      }
    };

    const onTyping = (data: any) => {
      const cid = data?.conversationId;
      const from = data?.senderId || data?.userId || data?.from;
      if (cid && cid !== conversationId) return;
      if (from && from === myId) return; // ignore own
      const typing = data?.isTyping ?? data?.typing ?? true;
      setOtherTyping(!!typing);
      if (typingClearTimer.current) clearTimeout(typingClearTimer.current);
      if (typing) {
        typingClearTimer.current = setTimeout(() => setOtherTyping(false), TYPING_TIMEOUT + 1500);
      }
    };

    const onMarkRead = (data: any) => {
      if (data?.conversationId && data.conversationId !== conversationId) return;
      setMessages(prev => prev.map(m => (m.senderId === myId ? { ...m, status: 'read' } : m)));
    };

    connectSocket().then(sock => {
      if (disposed || !sock) return;
      socketRef = sock;
      sock.on('receive_message', onReceive);
      sock.on('typing', onTyping);
      sock.on('mark_read', onMarkRead);
      sock.emit('mark_read', { conversationId, receiverId: otherUserId });
    });

    return () => {
      disposed = true;
      const s = getSocket();
      if (s) {
        s.off('receive_message', onReceive);
        s.off('typing', onTyping);
        s.off('mark_read', onMarkRead);
      }
      if (typingTimer.current) clearTimeout(typingTimer.current);
      if (typingClearTimer.current) clearTimeout(typingClearTimer.current);
    };
  }, [conversationId, otherUserId, myId, mergeMessages]);

  // Emit typing events (throttled) as the user types.
  const handleChangeText = useCallback((value: string) => {
    setText(value);
    const s = getSocket();
    if (!s?.connected || !otherUserId) return;
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      s.emit('typing', { conversationId, receiverId: otherUserId, isTyping: true });
    }
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      isTypingRef.current = false;
      s.emit('typing', { conversationId, receiverId: otherUserId, isTyping: false });
    }, TYPING_TIMEOUT);
  }, [conversationId, otherUserId]);

  const handleSend = useCallback(async () => {
    const body = text.trim();
    if (!body || sending || !otherUserId) return;
    setText('');
    setSending(true);

    // Stop typing indicator on send.
    if (typingTimer.current) clearTimeout(typingTimer.current);
    isTypingRef.current = false;
    getSocket()?.emit('typing', { conversationId, receiverId: otherUserId, isTyping: false });

    // Optimistic message
    const optimistic: Message = {
      _id: `tmp_${Date.now()}`,
      conversationId,
      senderId: myId,
      receiverId: otherUserId,
      message: body,
      messageType: 'text',
      status: 'sent',
      timestamp: new Date().toISOString(),
    };
    setMessages(prev => [optimistic, ...prev]);

    try {
      const socket = getSocket();
      if (socket?.connected) {
        socket.emit('send_message', { receiverId: otherUserId, message: body, messageType: 'text' });
      } else {
        await MessageService.sendMessage(otherUserId, body, 'text');
      }
      // Reconcile with server state (also swaps the optimistic temp id for the real one).
      const data = await MessageService.getMessages(conversationId, { page: 1, limit: PAGE_SIZE });
      setMessages(
        [...data.messages].sort(
          (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        )
      );
    } catch (err: any) {
      console.warn('[Chat] send error:', err.message);
      setMessages(prev => prev.filter(m => m._id !== optimistic._id));
      setText(body);
      Alert.alert('Message not sent', err.message || 'Please try again.');
    } finally {
      setSending(false);
    }
  }, [text, sending, otherUserId, conversationId, myId]);

  const handleSendImage = useCallback(async () => {
    if (sending || !otherUserId) return;
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Please allow access to your photo library.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
    });
    if (result.canceled || result.assets.length === 0) return;

    const asset = result.assets[0];
    setSending(true);
    try {
      await MessageService.uploadImage(otherUserId, asset.uri, asset.mimeType ?? 'image/jpeg');
      const data = await MessageService.getMessages(conversationId, { page: 1, limit: PAGE_SIZE });
      setMessages(
        [...data.messages].sort(
          (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        )
      );
    } catch (err: any) {
      console.warn('[Chat] image send error:', err.message);
      Alert.alert('Image not sent', err.message || 'Please try again.');
    } finally {
      setSending(false);
    }
  }, [sending, otherUserId, conversationId]);

  const handleLongPress = useCallback((msg: Message) => {
    const mine = msg.senderId === myId;
    const options: any[] = [
      {
        text: 'Delete for me',
        style: 'destructive',
        onPress: async () => {
          setMessages(prev => prev.filter(m => m._id !== msg._id));
          await MessageService.deleteMessageForMe(msg._id).catch(() => {});
        },
      },
    ];
    if (mine) {
      options.push({
        text: 'Delete for everyone',
        style: 'destructive',
        onPress: async () => {
          setMessages(prev =>
            prev.map(m => (m._id === msg._id ? { ...m, deletedForEveryone: true, message: '' } : m))
          );
          await MessageService.deleteMessageForEveryone(msg._id).catch(() => {});
        },
      });
    }
    options.push({ text: 'Cancel', style: 'cancel' });
    Alert.alert('Message', undefined, options);
  }, [myId]);

  const handleClearChat = useCallback(() => {
    Alert.alert('Clear conversation', 'Delete all messages in this chat?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: async () => {
          setMessages([]);
          await MessageService.clearConversation(conversationId).catch(() => {});
        },
      },
    ]);
  }, [conversationId]);

  const renderItem = useCallback(({ item }: { item: Message }) => {
    const mine = item.senderId === myId;
    const deleted = item.deletedForEveryone || item.isDeleted;
    const isImage = item.messageType === 'image' && item.imageUrl && !deleted;
    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onLongPress={() => !deleted && handleLongPress(item)}
        style={[styles.bubbleRow, mine ? styles.rowMine : styles.rowTheirs]}
      >
        <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs, isImage && styles.bubbleImage]}>
          {deleted ? (
            <Text style={[styles.deletedText, mine && { color: Colors.bg }]}>🚫 This message was deleted</Text>
          ) : isImage ? (
            <Image source={{ uri: item.imageUrl }} style={styles.msgImage} contentFit="cover" />
          ) : (
            <Text style={[styles.msgText, mine && styles.msgTextMine]}>{item.message}</Text>
          )}
          <Text style={[styles.msgTime, mine && styles.msgTimeMine]}>{timeLabel(item.timestamp)}</Text>
        </View>
      </TouchableOpacity>
    );
  }, [myId, handleLongPress]);

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: Colors.bg }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerUser}
            activeOpacity={0.8}
            onPress={() => otherUserId && router.push(`/profile/${otherUserId}` as any)}
          >
            {avatar ? (
              <Image source={{ uri: avatar }} style={styles.headerAvatar} contentFit="cover" />
            ) : (
              <View style={[styles.headerAvatar, styles.avatarFallback]}>
                <Text style={styles.avatarInitial}>{name.charAt(0).toUpperCase()}</Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.headerName} numberOfLines={1}>{name}</Text>
              {otherTyping && <Text style={styles.typingText}>typing…</Text>}
            </View>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleClearChat}>
            <Text style={styles.menuIcon}>⋯</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        {loading ? (
          <View style={styles.centerFill}>
            <ActivityIndicator color={Colors.gold} />
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            inverted
            keyExtractor={m => m._id}
            renderItem={renderItem}
            contentContainerStyle={messages.length === 0 ? styles.centerFill : { padding: Spacing.md }}
            showsVerticalScrollIndicator={false}
            onEndReached={loadMore}
            onEndReachedThreshold={0.3}
            ListEmptyComponent={<Text style={styles.emptyText}>Say hi 👋</Text>}
            ListFooterComponent={loadingMore ? <ActivityIndicator color={Colors.gold} style={{ marginVertical: Spacing.md }} /> : null}
          />
        )}

        <SafeAreaView edges={['bottom']} style={styles.inputBarWrap}>
          <View style={styles.inputBar}>
            <TouchableOpacity onPress={handleSendImage} disabled={sending} style={styles.attachBtn}>
              <Text style={styles.attachIcon}>📷</Text>
            </TouchableOpacity>
            <TextInput
              style={styles.input}
              placeholder="Message…"
              placeholderTextColor={Colors.creamFaint}
              value={text}
              onChangeText={handleChangeText}
              multiline
            />
            <TouchableOpacity
              onPress={handleSend}
              disabled={sending || !text.trim()}
              style={[styles.sendBtn, (!text.trim() || sending) && styles.sendBtnDisabled]}
            >
              {sending ? <ActivityIndicator color={Colors.bg} size="small" /> : <Text style={styles.sendIcon}>➤</Text>}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  backIcon: { color: Colors.gold, fontSize: 22 },
  headerUser: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  headerAvatar: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: Colors.border },
  headerName: { ...Typography.bodySemibold, fontSize: 16 },
  typingText: { ...Typography.caption, fontSize: 11, color: Colors.gold, fontStyle: 'italic' },
  menuIcon: { color: Colors.gold, fontSize: 22, paddingHorizontal: Spacing.xs },
  avatarFallback: { backgroundColor: Colors.bgElevated, alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { ...Typography.display, fontSize: 16, color: Colors.gold },
  centerFill: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  emptyText: { ...Typography.caption, fontSize: 14, color: Colors.creamDim, transform: [{ scaleY: -1 }] },
  bubbleRow: { marginVertical: 3, flexDirection: 'row' },
  rowMine: { justifyContent: 'flex-end' },
  rowTheirs: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '78%', borderRadius: Radius.lg, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  bubbleMine: { backgroundColor: Colors.gold, borderBottomRightRadius: Radius.sm },
  bubbleTheirs: { backgroundColor: Colors.bgCard, borderBottomLeftRadius: Radius.sm, borderWidth: 1, borderColor: Colors.border },
  bubbleImage: { padding: 4 },
  msgImage: { width: 200, height: 200, borderRadius: Radius.md },
  msgText: { ...Typography.body, fontSize: 15, color: Colors.cream },
  msgTextMine: { color: Colors.bg },
  deletedText: { ...Typography.body, fontSize: 14, fontStyle: 'italic', color: Colors.creamDim },
  msgTime: { ...Typography.caption, fontSize: 10, color: Colors.creamFaint, alignSelf: 'flex-end', marginTop: 2 },
  msgTimeMine: { color: 'rgba(13,27,42,0.6)' },
  inputBarWrap: { backgroundColor: Colors.bg, borderTopWidth: 1, borderTopColor: Colors.border },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.sm, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  attachBtn: { height: 40, justifyContent: 'center' },
  attachIcon: { fontSize: 20 },
  input: { flex: 1, ...Typography.body, fontSize: 15, color: Colors.cream, backgroundColor: Colors.bgInput, borderRadius: Radius.lg, paddingHorizontal: Spacing.md, paddingTop: Platform.OS === 'ios' ? 10 : 6, paddingBottom: Platform.OS === 'ios' ? 10 : 6, maxHeight: 120, borderWidth: 1, borderColor: Colors.border },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.gold, alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { opacity: 0.4 },
  sendIcon: { color: Colors.bg, fontSize: 16, fontFamily: 'Inter_700Bold' },
});
