import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { addInbox } from '../../services/inbox';

type Freq = 'weekly' | 'monthly' | 'custom';

export interface KmUpdateOptions {
  frequency: Freq;
  customDays?: number; // only if frequency === 'custom'
  nextDueAt?: string; // ISO
}

const KEY = 'cyc/options/kmUpdate';

export async function loadKmOptions(): Promise<KmUpdateOptions | undefined> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as KmUpdateOptions) : undefined;
  } catch {
    return undefined;
  }
}

export async function saveKmOptions(opts: KmUpdateOptions): Promise<void> {
  const normalized: KmUpdateOptions = { ...opts };
  if (!normalized.nextDueAt) {
    normalized.nextDueAt = computeNextDue(new Date(), opts).toISOString();
  }
  await AsyncStorage.setItem(KEY, JSON.stringify(normalized));
  await scheduleNotification(normalized);
}

function computeNextDue(from: Date, opts: KmUpdateOptions): Date {
  const d = new Date(from.getTime());
  const days = opts.frequency === 'weekly' ? 7 : opts.frequency === 'monthly' ? 30 : Math.max(1, opts.customDays || 7);
  d.setDate(d.getDate() + days);
  return d;
}

export async function checkKmReminderOnAppOpen(): Promise<void> {
  const opts = await loadKmOptions();
  if (!opts?.nextDueAt) return;
  const due = new Date(opts.nextDueAt);
  if (Date.now() >= due.getTime()) {
    await addInbox('Actualización de km', '¿Cuántos km lleva tu vehículo?');
    const next = computeNextDue(new Date(), opts);
    await saveKmOptions({ ...opts, nextDueAt: next.toISOString() });
  }
}

async function ensurePermissions(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const settings = await Notifications.getPermissionsAsync();
  if (settings.status !== 'granted') {
    const req = await Notifications.requestPermissionsAsync();
    return req.status === 'granted';
  }
  return true;
}

async function scheduleNotification(opts: KmUpdateOptions): Promise<void> {
  if (!(await ensurePermissions())) return;
  try {
    // Cancel any existing by storing id not used; expo API requires id on cancel
  } catch {}
  const seconds = (opts.frequency === 'weekly' ? 7 : opts.frequency === 'monthly' ? 30 : Math.max(1, opts.customDays || 7)) * 24 * 60 * 60;
  try {
    await Notifications.scheduleNotificationAsync({
      content: { title: 'Actualización de km', body: '¿Cuántos km lleva tu vehículo?' },
      trigger: { seconds, repeats: true } as any,
    });
  } catch {
    // ignore scheduling errors on unsupported platforms
  }
}

