import AsyncStorage from '@react-native-async-storage/async-storage';
import type { UserProfile } from '../models';

const KEY_ONBOARDING = 'cyc/onboardingDone';
const KEY_PROFILE = 'cyc/userProfile';

export async function getOnboardingDone(): Promise<boolean> {
  try {
    const v = await AsyncStorage.getItem(KEY_ONBOARDING);
    return v === 'true';
  } catch {
    return false;
  }
}

export async function setOnboardingDone(done: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY_ONBOARDING, done ? 'true' : 'false');
  } catch {
    // ignore
  }
}

export async function getUserProfile(): Promise<UserProfile | undefined> {
  try {
    const raw = await AsyncStorage.getItem(KEY_PROFILE);
    if (!raw) return undefined;
    return JSON.parse(raw) as UserProfile;
  } catch {
    return undefined;
  }
}

export async function saveUserProfile(p: UserProfile): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY_PROFILE, JSON.stringify(p));
  } catch {
    // ignore
  }
}

