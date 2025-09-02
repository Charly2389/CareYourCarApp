import AsyncStorage from '@react-native-async-storage/async-storage';
import { uuid } from '../utils/uuid';

export interface InboxItem {
  id: string;
  title: string;
  body: string;
  createdAt: string; // ISO
  read?: boolean;
}

const KEY = 'cyc/inbox';

type Listener = (items: InboxItem[]) => void;
const listeners = new Set<Listener>();

async function load(): Promise<InboxItem[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as InboxItem[]) : [];
  } catch {
    return [];
  }
}

async function save(items: InboxItem[]) {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(items));
  } catch {}
}

function emit(items: InboxItem[]) {
  for (const l of listeners) l(items);
}

export async function addInbox(title: string, body: string): Promise<void> {
  const items = await load();
  const item: InboxItem = { id: uuid(), title, body, createdAt: new Date().toISOString(), read: false };
  const next = [item, ...items].slice(0, 100);
  await save(next);
  emit(next);
}

export async function listInbox(): Promise<InboxItem[]> {
  return load();
}

export async function listUnread(): Promise<InboxItem[]> {
  const items = await load();
  return items.filter((i) => !i.read);
}

export async function markRead(id: string): Promise<void> {
  const items = await load();
  const next = items.map((i) => (i.id === id ? { ...i, read: true } : i));
  await save(next);
  emit(next);
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  (async () => listener(await load()))();
  return () => listeners.delete(listener);
}

