import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { addInbox } from './inbox';

async function ensurePermissions() {
  try {
    if (Platform.OS === 'web') return false;
    // Avoid permission flow inside Expo Go where some features are limited
    if (Constants.executionEnvironment === 'storeClient') return false;
    const settings = await Notifications.getPermissionsAsync();
    if (settings.granted || settings.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) return true;
    const req = await Notifications.requestPermissionsAsync();
    return !!req.granted;
  } catch {
    return false;
  }
}

export async function notify(title: string, body: string) {
  try {
    const ok = await ensurePermissions();
    if (!ok) return;
    await Notifications.scheduleNotificationAsync({ content: { title, body }, trigger: null });
  } catch {
    // ignore
  }
  try {
    await addInbox(title, body);
  } catch {}
}
