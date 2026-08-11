import { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, ActivityIndicator, RefreshControl } from 'react-native';
import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import { useUser } from '@/context/AppContext';
import { MessageService, Conversation, getOtherParticipant, buildConversationId } from '@/services/messageService';
import { UserService, PublicUser } from '@/services/userService';
import { SearchService, SearchUser } from '@/services/searchService';
import { connectSocket, getSocket } from '@/services/socket';
import { getAuthUserId } from '@/services/currentUser';

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'now';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

interface ConversationRow extends Conversation {
  otherUserId: string;
  otherUser: PublicUser | null;
}

export default function Messages() {
  const { user } = useUser();
  const [rows, setRows] = useState<ConversationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [people, setPeople] = useState<SearchUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [suggestions, setSuggestions] = useState<SearchUser[]>([]);
  const [searchFocused, setSearchFocused] = useState(false);

  // Messaging identity = JWT subject (what the backend authorizes against), which
  // may differ from the profile `user.id`. Fall back to user.id until resolved.
  const [myId, setMyId] = useState(user.id);
  useEffect(() => {
    getAuthUserId().then(id => { if (id) setMyId(id); });
  }, []);

  const load = useCallback(async () => {
    if (!myId) return;
    setError(null);
    try {
      const convos = await MessageService.getConversations();
      // Resolve the "other" participant's profile for each conversation.
      const resolved = await Promise.all(
        convos.map(async (c): Promise<ConversationRow> => {
          const otherUserId = getOtherParticipant(c.participants, myId) ?? '';
          let otherUser: PublicUser | null = null;
          if (otherUserId) {
            otherUser = await UserService.getProfileById(otherUserId).catch(() => null);
          }
          return { ...c, otherUserId, otherUser };
        })
      );
      setRows(resolved);
    } catch (err: any) {
      console.warn('[Messages] load error:', err.message);
      setError(err.message || 'Failed to load conversations');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [myId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  // Suggested people (Paznwise user suggestions) for the empty-search dropdown.
  useEffect(() => {
    UserService.getAllUsers()
      .then(list =>
        setSuggestions(
          list.map(u => ({
            id: u.id,
            name: u.name,
            username: u.username,
            avatar: u.avatar,
            isVerified: u.isVerified,
            role: u.role ? String(u.role).toUpperCase() : undefined,
            followersCount: u.followersCount,
          }))
        )
      )
      .catch(err => console.warn('[Messages] suggestions error:', err.message));
  }, []);

  // Debounced server-side user search to start new chats.
  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setPeople([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const handle = setTimeout(() => {
      SearchService.searchUsers(q)
        .then(setPeople)
        .catch(err => {
          console.warn('[Messages] search error:', err.message);
          setPeople([]);
        })
        .finally(() => setSearching(false));
    }, 300);
    return () => clearTimeout(handle);
  }, [query]);

  // Bump the list in real-time when a message arrives on any conversation.
  useEffect(() => {
    let disposed = false;
    const onReceive = () => load();
    connectSocket().then(sock => {
      if (disposed || !sock) return;
      sock.on('receive_message', onReceive);
    });
    return () => {
      disposed = true;
      getSocket()?.off('receive_message', onReceive);
    };
  }, [load]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(r => {
      const name = r.otherUser?.name ?? r.otherUser?.username ?? '';
      return name.toLowerCase().includes(q);
    });
  }, [rows, query]);

  // People to start a NEW chat with. While typing → server search results;
  // focused with empty box → suggested users (dropdown). Always excludes self
  // and anyone you already have a conversation with (those show below).
  const isSearching = query.trim().length > 0;
  const peopleResults = useMemo(() => {
    const source = isSearching ? people : searchFocused ? suggestions : [];
    if (source.length === 0) return [];
    const existingIds = new Set(rows.map(r => r.otherUserId));
    return source.filter(p => p.id !== myId && !existingIds.has(p.id));
  }, [isSearching, people, searchFocused, suggestions, rows, myId]);
  const peopleLabel = isSearching ? 'People' : 'Suggested';

  const openUser = useCallback((p: SearchUser) => {
    if (!myId || !p.id) return;
    const name = p.name || p.username || 'Conversation';
    router.push({
      pathname: '/messages/[conversationId]',
      params: {
        conversationId: buildConversationId(myId, p.id),
        otherUserId: p.id,
        name,
        avatar: p.avatar ?? '',
      },
    } as any);
  }, [myId]);

  const openConversation = useCallback((row: ConversationRow) => {
    const name = row.otherUser?.name || row.otherUser?.username || 'Conversation';
    router.push({
      pathname: '/messages/[conversationId]',
      params: {
        conversationId: row.conversationId,
        otherUserId: row.otherUserId,
        name,
        avatar: row.otherUser?.avatar ?? '',
      },
    } as any);
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: Colors.bg }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Messages</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            placeholder="Search people or conversations…"
            placeholderTextColor={Colors.creamFaint}
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setTimeout(() => setSearchFocused(false), 150)}
          />
        </View>
      </SafeAreaView>

      {loading ? (
        <View style={styles.centerFill}>
          <ActivityIndicator color={Colors.gold} />
        </View>
      ) : error ? (
        <View style={styles.centerFill}>
          <Text style={styles.emptyText}>{error}</Text>
          <TouchableOpacity onPress={load} style={styles.retryBtn}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filtered}
          contentContainerStyle={
            filtered.length === 0 && peopleResults.length === 0 ? styles.centerFill : { paddingBottom: 100 }
          }
          showsVerticalScrollIndicator={false}
          keyExtractor={i => i.conversationId}
          keyboardShouldPersistTaps="handled"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.gold} />}
          ListHeaderComponent={
            searching && peopleResults.length === 0 ? (
              <View style={styles.searchingRow}>
                <ActivityIndicator color={Colors.gold} size="small" />
                <Text style={styles.emptyText}>Searching people…</Text>
              </View>
            ) : peopleResults.length > 0 ? (
              <View style={styles.peopleSection}>
                <Text style={styles.sectionLabel}>{peopleLabel}</Text>
                {peopleResults.map(p => {
                  const name = p.name || p.username || 'User';
                  const followers = p.followersCount ?? 0;
                  const meta = [
                    p.role || null,
                    `${followers} ${followers === 1 ? 'follower' : 'followers'}`,
                  ].filter(Boolean).join('  ·  ');
                  return (
                    <TouchableOpacity key={p.id} style={styles.convo} activeOpacity={0.8} onPress={() => openUser(p)}>
                      <View style={styles.avatarWrap}>
                        {p.avatar ? (
                          <Image source={{ uri: p.avatar }} style={styles.avatar} contentFit="cover" />
                        ) : (
                          <View style={[styles.avatar, styles.avatarFallback]}>
                            <Text style={styles.avatarInitial}>{name.charAt(0).toUpperCase()}</Text>
                          </View>
                        )}
                      </View>
                      <View style={styles.convoBody}>
                        <View style={styles.nameRow}>
                          <Text style={styles.convoName} numberOfLines={1}>{name}</Text>
                          {p.isVerified && <Text style={styles.verified}>✓</Text>}
                        </View>
                        {!!p.username && <Text style={styles.username} numberOfLines={1}>@{p.username}</Text>}
                        {!!meta && <Text style={styles.metaLine} numberOfLines={1}>{meta}</Text>}
                      </View>
                      <View style={styles.msgPill}><Text style={styles.msgPillText}>Message</Text></View>
                    </TouchableOpacity>
                  );
                })}
                {filtered.length > 0 && <Text style={[styles.sectionLabel, { marginTop: Spacing.md }]}>Conversations</Text>}
              </View>
            ) : null
          }
          ListEmptyComponent={
            peopleResults.length > 0 || searching ? null : (
              <Text style={styles.emptyText}>{query ? 'No matches found.' : 'No conversations yet.'}</Text>
            )
          }
          renderItem={({ item }) => {
            const name = item.otherUser?.name || item.otherUser?.username || 'Conversation';
            const avatar = item.otherUser?.avatar;
            const last = item.lastMessage;
            const isImage = last?.messageType === 'image';
            const preview = last ? (isImage ? '📷 Photo' : last.message) : 'No messages yet';
            const unread = item.unreadCount ?? 0;
            return (
              <TouchableOpacity style={styles.convo} activeOpacity={0.8} onPress={() => openConversation(item)}>
                <View style={styles.avatarWrap}>
                  {avatar ? (
                    <Image source={{ uri: avatar }} style={styles.avatar} contentFit="cover" />
                  ) : (
                    <View style={[styles.avatar, styles.avatarFallback]}>
                      <Text style={styles.avatarInitial}>{name.charAt(0).toUpperCase()}</Text>
                    </View>
                  )}
                </View>
                <View style={styles.convoBody}>
                  <View style={styles.convoHeader}>
                    <Text style={styles.convoName} numberOfLines={1}>{name}</Text>
                    <Text style={styles.convoTime}>{timeAgo(item.updatedAt)}</Text>
                  </View>
                  <Text style={[styles.convoLast, unread > 0 && styles.convoLastUnread]} numberOfLines={1}>
                    {preview}
                  </Text>
                </View>
                {unread > 0 && (
                  <View style={styles.unreadBadge}><Text style={styles.unreadText}>{unread}</Text></View>
                )}
              </TouchableOpacity>
            );
          }}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  backIcon: { color: Colors.gold, fontSize: 22 },
  title: { ...Typography.display, fontSize: 22 },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: Colors.bgInput, borderRadius: Radius.full, paddingHorizontal: Spacing.md, marginHorizontal: Spacing.md, marginBottom: Spacing.sm, height: 44, borderWidth: 1, borderColor: Colors.border },
  searchIcon: { fontSize: 14 },
  searchInput: { flex: 1, ...Typography.body, fontSize: 14, color: Colors.cream },
  centerFill: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl, gap: Spacing.md },
  emptyText: { ...Typography.caption, fontSize: 14, color: Colors.creamDim, textAlign: 'center' },
  retryBtn: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.borderGold },
  retryText: { ...Typography.bodySemibold, fontSize: 13, color: Colors.gold },
  searchingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, paddingVertical: Spacing.lg },
  peopleSection: { paddingBottom: Spacing.xs },
  sectionLabel: { ...Typography.label, marginHorizontal: Spacing.md, marginBottom: Spacing.xs, marginTop: Spacing.sm },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  verified: { color: Colors.gold, fontSize: 12, fontFamily: 'Inter_700Bold' },
  username: { ...Typography.caption, fontSize: 13, color: Colors.creamDim },
  metaLine: { ...Typography.caption, fontSize: 11, color: Colors.creamFaint, marginTop: 1 },
  msgPill: { paddingHorizontal: Spacing.md, paddingVertical: 6, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.borderGold },
  msgPillText: { ...Typography.bodySemibold, fontSize: 12, color: Colors.gold },
  convo: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md },
  avatarWrap: { position: 'relative' },
  avatar: { width: 52, height: 52, borderRadius: 26, borderWidth: 1.5, borderColor: Colors.border },
  avatarFallback: { backgroundColor: Colors.bgElevated, alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { ...Typography.display, fontSize: 22, color: Colors.gold },
  convoBody: { flex: 1 },
  convoHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 },
  convoName: { ...Typography.bodySemibold, fontSize: 15, flex: 1, marginRight: Spacing.sm },
  convoTime: { ...Typography.caption, fontSize: 11 },
  convoLast: { ...Typography.caption, fontSize: 13, color: Colors.creamDim },
  convoLastUnread: { color: Colors.cream, fontFamily: 'Inter_600SemiBold' },
  unreadBadge: { minWidth: 20, height: 20, paddingHorizontal: 5, borderRadius: 10, backgroundColor: Colors.gold, alignItems: 'center', justifyContent: 'center' },
  unreadText: { color: Colors.bg, fontSize: 10, fontFamily: 'Inter_700Bold' },
  separator: { height: 1, backgroundColor: Colors.border, marginLeft: Spacing.md + 52 + Spacing.md },
});
