import { useEffect } from 'react';
import { Stack } from 'expo-router';
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
import { QueryClientProvider } from '@tanstack/react-query';
import { AppProvider, useUser } from '@/context/AppContext';
import { queryClient } from '@/api/queryClient';
import { usePushNotifications } from '@/push/usePushNotifications';
import { PaywallSheet } from '@/components/subscription/PaywallSheet';

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

  if (!fontsLoaded) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <AppProvider>
        <RootNavigator />
      </AppProvider>
    </QueryClientProvider>
  );
}

/**
 * Lives inside AppProvider so it can read the session.
 *
 * Redirection is declarative: `Stack.Protected` mounts only the stack that
 * matches the current session, so there is no boot-time `router.replace`
 * racing the first render, and no timer standing in for the real work.
 * Public browsing screens sit outside both guards — the catalogue, feed and
 * event endpoints accept an optional token, and the profile tab has its own
 * guest state.
 */
function RootNavigator() {
  const { status } = useUser();

  // Registration waits for a session: the device-token endpoint is
  // authenticated, and a token registered before sign-in has no owner.
  usePushNotifications(status === 'signedIn');

  useEffect(() => {
    if (status !== 'loading') SplashScreen.hideAsync().catch(() => {});
  }, [status]);

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: Colors.bg }}>
        <StatusBar style="light" backgroundColor={Colors.bg} />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Colors.bg } }}>
          {/* Signed out. Declared before (tabs) deliberately: both groups own
              the root path, so while this is mounted `/` resolves to the
              onboarding carousel, and falls through to the tabs once a
              session unmounts it. */}
          <Stack.Protected guard={status === 'signedOut'}>
            <Stack.Screen name="(auth)" options={{ animation: 'fade' }} />
          </Stack.Protected>

          {/* Public — browsable as a guest */}
          <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
          <Stack.Screen name="product/[id]" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="product/category/[slug]" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="artist/[id]" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="profile/[id]" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="feed/index" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="feed/[id]" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="events/[id]" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="search/index" options={{ animation: 'fade' }} />
          <Stack.Screen name="discover/index" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="help/index" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="contact/index" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="legal/[slug]" options={{ animation: 'slide_from_right' }} />

          {/* Requires a session. Every route here is behind `authenticate` on
              the API, so mounting them for a guest only yields 401s. Screens
              must be declared explicitly — an undeclared route is auto-added
              outside the guard and would be reachable by deep link. */}
          <Stack.Protected guard={status === 'signedIn'}>
            <Stack.Screen name="product/cart" options={{ animation: 'slide_from_bottom' }} />
            <Stack.Screen name="product/create" options={{ animation: 'slide_from_bottom' }} />
            <Stack.Screen name="product/my-listings" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="product/edit/[id]" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="checkout/index" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="checkout/confirmed" options={{ animation: 'fade' }} />
            <Stack.Screen name="addresses/index" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="orders/index" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="orders/[id]" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="order-tracking/[orderId]" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="returns/index" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="returns/[id]" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="returns/create" options={{ animation: 'slide_from_bottom' }} />
            <Stack.Screen name="favorites/index" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="coupons/index" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="reviews/index" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="reviews/write" options={{ animation: 'slide_from_bottom' }} />
            <Stack.Screen name="rentals/index" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="rentals/[id]" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="rentals/request" options={{ animation: 'slide_from_bottom' }} />
            <Stack.Screen name="notifications/index" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="settings/index" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="subscription/index" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="messages/index" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="messages/[conversationId]" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="network/suggestions" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="network/follows" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="profile/edit" options={{ animation: 'slide_from_bottom' }} />
            <Stack.Screen name="feed/create" options={{ animation: 'slide_from_bottom' }} />
            <Stack.Screen name="feed/edit/[id]" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="feed/my-posts" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="events/book/[id]" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="events/create" options={{ animation: 'slide_from_bottom' }} />
            <Stack.Screen name="event-bookings/index" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="booking/[id]" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="booking/my-bookings" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="booking/detail/[id]" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="booking/confirmed" options={{ animation: 'fade' }} />
            <Stack.Screen name="sell/index" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="sell/terms" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="sell/pending" options={{ animation: 'fade' }} />
            <Stack.Screen name="seller/dashboard/index" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="seller/reviews/index" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="seller/royalties/index" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="artist/register-artist" options={{ animation: 'slide_from_bottom' }} />
            <Stack.Screen name="artist/dashboard/index" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="artist/availability/index" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="artist/bookings/index" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="artist/services/create" options={{ animation: 'slide_from_bottom' }} />
            <Stack.Screen name="artist/events/index" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="artist/events/[id]" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="organizer/events/index" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="organizer/events/[id]" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="organizer/events/create" options={{ animation: 'slide_from_bottom' }} />
            <Stack.Screen name="artist/rentals" options={{ animation: 'slide_from_right' }} />
          </Stack.Protected>
        </Stack>

        <PaywallSheet />

        {/* Held over the real boot work — validating the stored session —
            rather than an arbitrary timer. */}
        {status === 'loading' && (
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
  );
}
