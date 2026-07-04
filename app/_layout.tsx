import { useEffect } from 'react';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts,
  CormorantGaramond_400Regular,
  CormorantGaramond_500Medium,
  CormorantGaramond_500Medium_Italic,
  CormorantGaramond_600SemiBold,
  CormorantGaramond_700Bold,
} from '@expo-google-fonts/cormorant-garamond';
import {
  Inter_400Regular,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Colors } from '@/constants/theme';
import { AppProvider } from '@/context/AppContext';
import { AuthStorage } from '@/services/authStorage';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    CormorantGaramond_400Regular,
    CormorantGaramond_500Medium,
    CormorantGaramond_500Medium_Italic,
    CormorantGaramond_600SemiBold,
    CormorantGaramond_700Bold,
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (!fontsLoaded) return;
    AuthStorage.getAccessToken().then(async token => {
      await SplashScreen.hideAsync();
      if (token) router.replace('/(tabs)');
    });
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <AppProvider>
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: Colors.bg }}>
        <StatusBar style="light" backgroundColor={Colors.bg} />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Colors.bg } }}>
          <Stack.Screen name="(auth)" options={{ animation: 'fade' }} />
          <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
          <Stack.Screen name="product/[id]" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="product/cart" options={{ animation: 'slide_from_bottom' }} />
          <Stack.Screen name="product/create" options={{ animation: 'slide_from_bottom' }} />
          <Stack.Screen name="product/marketplace" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="product/my-listings" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="product/edit/[id]" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="artist/[id]" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="artist/register-artist" options={{ animation: 'slide_from_bottom' }} />
          <Stack.Screen name="booking/[id]" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="booking/my-bookings" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="messages/index" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="network/suggestions" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="network/follows" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="profile/edit" options={{ animation: 'slide_from_bottom' }} />
          <Stack.Screen name="profile/[id]" options={{ animation: 'slide_from_right' }} />
        </Stack>
      </GestureHandlerRootView>
    </AppProvider>
  );
}
