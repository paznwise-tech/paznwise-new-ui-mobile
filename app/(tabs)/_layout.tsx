import { Tabs } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Typography } from '@/constants/theme';
import { BlurView } from 'expo-blur';

function TabIcon({ focused, emoji, label }: { focused: boolean; emoji: string; label: string }) {
  return (
    <View style={styles.tabItem}>
      <Text style={[styles.emoji, focused && styles.emojiActive]}>{emoji}</Text>
      <Text style={[styles.tabLabel, focused && styles.tabLabelActive]}>{label}</Text>
      {focused && <View style={styles.activeDot} />}
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarBackground: () => (
          <View style={[StyleSheet.absoluteFill, styles.tabBarBg]} />
        ),
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ tabBarIcon: ({ focused }) => <TabIcon focused={focused} emoji="✦" label="Home" /> }}
      />
      <Tabs.Screen
        name="browse"
        options={{ tabBarIcon: ({ focused }) => <TabIcon focused={focused} emoji="🖼" label="Art" /> }}
      />
      <Tabs.Screen
        name="events"
        options={{ tabBarIcon: ({ focused }) => <TabIcon focused={focused} emoji="🎭" label="Events" /> }}
      />
      <Tabs.Screen
        name="hire"
        options={{ tabBarIcon: ({ focused }) => <TabIcon focused={focused} emoji="🎵" label="Hire" /> }}
      />
      <Tabs.Screen
        name="profile"
        options={{ tabBarIcon: ({ focused }) => <TabIcon focused={focused} emoji="◉" label="Profile" /> }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    borderTopWidth: 1,
    borderTopColor: Colors.borderGold,
    backgroundColor: 'transparent',
    elevation: 0,
    height: 72,
    paddingBottom: 8,
  },
  tabBarBg: {
    backgroundColor: 'rgba(13,27,42,0.96)',
  },
  tabItem: { alignItems: 'center', gap: 2, paddingTop: 4 },
  emoji: { fontSize: 20, opacity: 0.45 },
  emojiActive: { opacity: 1 },
  tabLabel: { ...Typography.caption, fontSize: 9, color: Colors.tabInactive, letterSpacing: 0.5 },
  tabLabelActive: { color: Colors.gold },
  activeDot: {
    width: 4, height: 4,
    borderRadius: 2,
    backgroundColor: Colors.gold,
    marginTop: 2,
  },
});
