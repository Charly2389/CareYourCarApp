import AsyncStorage from '@react-native-async-storage/async-storage';

export type CommunityOverride = { intervalKm?: number; intervalMonths?: number };
export type CommunityOverrides = Record<string, CommunityOverride>; // key: maintenance type

function key(make: string, model: string | undefined, year: number) {
  const mk = (make || '').toLowerCase().trim();
  const md = (model || '').toLowerCase().trim();
  return `cyc/community/${mk}/${md}/${year}`;
}

export async function getCommunityOverrides(make: string | undefined, model: string | undefined, year: number | undefined): Promise<CommunityOverrides> {
  try {
    if (!make || !year) return {};
    const raw = await AsyncStorage.getItem(key(make, model, year));
    return raw ? (JSON.parse(raw) as CommunityOverrides) : {};
  } catch {
    return {};
  }
}

export async function applyCommunityOverride(
  make: string,
  model: string | undefined,
  year: number,
  type: string,
  field: 'intervalKm' | 'intervalMonths',
  value: number | undefined,
): Promise<void> {
  try {
    const k = key(make, model, year);
    const current = await getCommunityOverrides(make, model, year);
    const item = current[type] || {};
    if (value === undefined) {
      delete (item as any)[field];
    } else {
      (item as any)[field] = value;
    }
    current[type] = item;
    await AsyncStorage.setItem(k, JSON.stringify(current));
  } catch {
    // ignore
  }
}

