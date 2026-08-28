import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { DeviceTokenService, type DevicePlatform } from '@/services/deviceTokenService';

/**
 * Push registration.
 *
 * The backend sends through the Firebase Admin SDK (`admin.messaging().send`),
 * which takes a NATIVE FCM/APNs token. That is why this uses
 * `getDevicePushTokenAsync` and not `getExpoPushTokenAsync`: an Expo push
 * token is only meaningful to Expo's own push service and would be silently
 * unusable by this API — the request would look fine and nothing would ever
 * arrive.
 */

let currentToken: string | null = null;

/** The last token registered this session, so sign-out can unregister it. */
export function getRegisteredToken(): string | null {
  return currentToken;
}

function platformName(): DevicePlatform {
  return Platform.OS === 'ios' ? 'IOS' : Platform.OS === 'android' ? 'ANDROID' : 'WEB';
}

/**
 * Asks for permission and registers this device.
 *
 * Returns false when push is simply unavailable — a simulator, a denied
 * prompt, or a build without Firebase credentials. None of those are errors
 * worth surfacing: the app works, it just will not receive pushes.
 */
export async function registerForPush(): Promise<boolean> {
  // Simulators cannot receive push, and asking would prompt for nothing.
  if (!Device.isDevice) return false;

  try {
    const existing = await Notifications.getPermissionsAsync();
    let status = existing.status;

    if (status !== 'granted') {
      // Only ask if the OS still allows it; a hard denial cannot be reversed
      // from here and re-prompting does nothing.
      if (!existing.canAskAgain) return false;
      status = (await Notifications.requestPermissionsAsync()).status;
    }
    if (status !== 'granted') return false;

    if (Platform.OS === 'android') {
      // Android 8+ drops notifications with no channel.
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Paznwise',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    const { data: token } = await Notifications.getDevicePushTokenAsync();
    if (!token || typeof token !== 'string') return false;

    await DeviceTokenService.register({
      token,
      platform: platformName(),
      deviceId: Device.modelName ?? undefined,
      appVersion: Constants.expoConfig?.version ?? undefined,
    });

    currentToken = token;
    return true;
  } catch {
    // Missing google-services.json or an APNs key lands here. Push is a
    // nice-to-have; failing to register must not disturb the session.
    return false;
  }
}

/** Unregisters before tokens are cleared, so the server stops pushing here. */
export async function unregisterPush(): Promise<void> {
  if (!currentToken) return;
  try {
    await DeviceTokenService.unregister(currentToken);
  } catch {
    // Sign-out must not be blocked by this; the server drops dead tokens
    // on its next send anyway.
  } finally {
    currentToken = null;
  }
}
