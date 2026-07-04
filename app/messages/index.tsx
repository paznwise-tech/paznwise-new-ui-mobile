import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';

const CONVERSATIONS = [
  { id: 1, name: 'Priya Sharma',    last: "Yes, it's available! I can customise the size.", time: '2m',  unread: 1, img: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&h=80&fit=crop' },
  { id: 2, name: 'Rahul Bose',      last: 'I can customise dimensions. What do you need?',  time: '1h',  unread: 0, img: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop' },
  { id: 3, name: 'Vikram Nair',     last: 'Print dispatched by Monday.',                    time: '3h',  unread: 0, img: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&h=80&fit=crop' },
  { id: 4, name: 'Meera Pillai',    last: 'Yes, I accept commissions for sculptures!',       time: '1d',  unread: 2, img: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=80&h=80&fit=crop' },
];

export default function Messages() {
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
          <TextInput placeholder="Search conversations…" placeholderTextColor={Colors.creamFaint} style={styles.searchInput} />
        </View>
      </SafeAreaView>

      <FlatList
        data={CONVERSATIONS}
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        keyExtractor={i => String(i.id)}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.convo} activeOpacity={0.8}>
            <View style={styles.avatarWrap}>
              <Image source={{ uri: item.img }} style={styles.avatar} contentFit="cover" />
              <View style={styles.onlineDot} />
            </View>
            <View style={styles.convoBody}>
              <View style={styles.convoHeader}>
                <Text style={styles.convoName}>{item.name}</Text>
                <Text style={styles.convoTime}>{item.time}</Text>
              </View>
              <Text style={styles.convoLast} numberOfLines={1}>{item.last}</Text>
            </View>
            {item.unread > 0 && (
              <View style={styles.unreadBadge}><Text style={styles.unreadText}>{item.unread}</Text></View>
            )}
          </TouchableOpacity>
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
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
  convo: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md },
  avatarWrap: { position: 'relative' },
  avatar: { width: 52, height: 52, borderRadius: 26, borderWidth: 1.5, borderColor: Colors.border },
  onlineDot: { position: 'absolute', bottom: 1, right: 1, width: 12, height: 12, borderRadius: 6, backgroundColor: '#4CAF7D', borderWidth: 2, borderColor: Colors.bg },
  convoBody: { flex: 1 },
  convoHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 },
  convoName: { ...Typography.bodySemibold, fontSize: 15 },
  convoTime: { ...Typography.caption, fontSize: 11 },
  convoLast: { ...Typography.caption, fontSize: 13, color: Colors.creamDim },
  unreadBadge: { width: 20, height: 20, borderRadius: 10, backgroundColor: Colors.gold, alignItems: 'center', justifyContent: 'center' },
  unreadText: { color: Colors.bg, fontSize: 10, fontFamily: 'Inter_700Bold' },
  separator: { height: 1, backgroundColor: Colors.border, marginLeft: Spacing.md + 52 + Spacing.md },
});
