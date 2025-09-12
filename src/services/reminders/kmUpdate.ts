import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { addInbox } from '../../services/inbox';
import { repo } from '../../repository/Repo';

type Freq = 'weekly' | 'monthly' | 'custom';

export interface KmUpdateOptions {
  frequency: Freq;
  customDays?: number; // only if frequency === 'custom'
  hour?: number; // 0-23 local time
  minute?: number; // 0-59
  nextDueAt?: string; // ISO
}

const KEY_PREFIX = 'cyc/options/kmUpdate';

function keyFor(vehicleId?: string) {
  return vehicleId ? `${KEY_PREFIX}/vehicle/${vehicleId}` : `${KEY_PREFIX}`;
}

export async function loadKmOptions(vehicleId?: string): Promise<KmUpdateOptions | undefined> {
  try {
    const raw = await AsyncStorage.getItem(keyFor(vehicleId));
    return raw ? (JSON.parse(raw) as KmUpdateOptions) : undefined;
  } catch {
    return undefined;
  }
}

export async function saveKmOptions(opts: KmUpdateOptions, vehicleId?: string): Promise<void> {
  const normalized: KmUpdateOptions = { ...opts };
  if (!normalized.nextDueAt) {
    normalized.nextDueAt = computeNextDue(new Date(), opts).toISOString();
  }
  await AsyncStorage.setItem(keyFor(vehicleId), JSON.stringify(normalized));
  await scheduleNotification(normalized, vehicleId);
}

function computeNextDue(from: Date, opts: KmUpdateOptions): Date {
  const d = new Date(from.getTime());
  const hours = typeof opts.hour === 'number' ? opts.hour : 9;
  const minutes = typeof opts.minute === 'number' ? opts.minute : 0;
  if (opts.frequency === 'weekly') {
    d.setDate(d.getDate() + 7);
  } else if (opts.frequency === 'monthly') {
    d.setMonth(d.getMonth() + 1);
  } else {
    const days = Math.max(1, opts.customDays || 7);
    d.setDate(d.getDate() + days);
  }
  d.setHours(hours, minutes, 0, 0);
  return d;
}

export async function checkKmReminderOnAppOpen(): Promise<void> {
  const keys = await AsyncStorage.getAllKeys();
  const kmKeys = keys.filter((k) => k.startsWith(KEY_PREFIX));
  if (!kmKeys.includes(KEY_PREFIX)) kmKeys.push(KEY_PREFIX);
  for (const k of kmKeys) {
    try {
      const raw = await AsyncStorage.getItem(k);
      if (!raw) continue;
      const opts = JSON.parse(raw) as KmUpdateOptions;
      if (!opts?.nextDueAt) continue;
      const due = new Date(opts.nextDueAt);
      if (Date.now() >= due.getTime()) {
        const vehicleId = k.startsWith(`${KEY_PREFIX}/vehicle/`) ? k.split('/').pop() : undefined;
        let body = '¿Cuántos km lleva tu vehículo?';
        if (vehicleId) {
          try {
            const v = await repo.getVehicle(vehicleId);
            if (v) {
              const placa = v.plate ? ` (${v.plate})` : '';
              body = `¿Cuántos km lleva tu ${v.make} ${v.model}${placa}?`;
            }
          } catch {}
        }
        await addInbox('Actualización de km', body, { type: 'kmUpdate', vehicleId });
        const next = computeNextDue(new Date(), opts);
        await saveKmOptions({ ...opts, nextDueAt: next.toISOString() }, vehicleId);
      }
    } catch {}
  }
}

async function ensurePermissions(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  // Skip permission flow in Expo Go (store client) as push APIs are limited
  if (Constants.executionEnvironment === 'storeClient') return false;
  const settings = await Notifications.getPermissionsAsync();
  if (settings.status !== 'granted') {
    const req = await Notifications.requestPermissionsAsync();
    return req.status === 'granted';
  }
  return true;
}

async function scheduleNotification(opts: KmUpdateOptions, vehicleId?: string): Promise<void> {
  if (!(await ensurePermissions())) return;
  const title = 'Actualización de km';
  let body = '¿Cuántos km lleva tu vehículo?';
  if (vehicleId) {
    try {
      const v = await repo.getVehicle(vehicleId);
      if (v) {
        const placa = v.plate ? ` (${v.plate})` : '';
        body = `¿Cuántos km lleva tu ${v.make} ${v.model}${placa}?`;
      }
    } catch {}
  }
  const next = opts.nextDueAt ? new Date(opts.nextDueAt) : computeNextDue(new Date(), opts);
  try {
    await Notifications.scheduleNotificationAsync({
      content: { title, body },
      trigger: next as any,
    });
  } catch {}
}
