import { useEffect, useState } from 'react';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet } from 'react-native';
import LottieView from 'lottie-react-native';
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

  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    if (!fontsLoaded) return;
    
    let timer: any;
    
    AuthStorage.getAccessToken().then(async token => {
      // Hide the initial static native splash
      await SplashScreen.hideAsync();
      
      // Let our premium Lottie splash animation play for 3 seconds before transitioning
      timer = setTimeout(() => {
        setShowSplash(false);
        if (token) {
          router.replace('/(tabs)');
        } else {
          router.replace('/(auth)');
        }
      }, 3000);
    });

    return () => {
      if (timer) clearTimeout(timer);
    };
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
          <Stack.Screen name="feed/index" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="feed/[id]" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="booking/[id]" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="booking/my-bookings" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="messages/index" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="network/suggestions" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="network/follows" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="profile/edit" options={{ animation: 'slide_from_bottom' }} />
          <Stack.Screen name="profile/[id]" options={{ animation: 'slide_from_right' }} />
        </Stack>

        {showSplash && (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: '#0D1B2A', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }]}>
            <StatusBar style="light" backgroundColor="#0D1B2A" />
            <LottieView
              source={require('../assets/splash.json')}
              autoPlay
              loop={false}
              style={{ width: '100%', height: '100%' }}
            />
          </View>
        )}
      </GestureHandlerRootView>
    </AppProvider>
  );
}
