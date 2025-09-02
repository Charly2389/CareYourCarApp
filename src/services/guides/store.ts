import AsyncStorage from '@react-native-async-storage/async-storage';
import type { MaintenanceGuideItem } from './types';

const key = (vehicleId: string) => `cyc/plan/${vehicleId}`;

export async function loadCustomPlan(vehicleId: string): Promise<MaintenanceGuideItem[] | undefined> {
  try {
    const raw = await AsyncStorage.getItem(key(vehicleId));
    if (!raw) return undefined;
    return JSON.parse(raw) as MaintenanceGuideItem[];
  } catch {
    return undefined;
  }
}

export async function saveCustomPlan(vehicleId: string, items: MaintenanceGuideItem[]): Promise<void> {
  try {
    await AsyncStorage.setItem(key(vehicleId), JSON.stringify(items));
  } catch {}
}
