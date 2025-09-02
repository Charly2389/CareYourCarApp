import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { InboxItem, listUnread, markRead, subscribe } from '../services/inbox';

export default function Banner() {
  const [item, setItem] = useState<InboxItem | null>(null);

  useEffect(() => {
    let mounted = true;
    const unsub = subscribe(async (items) => {
      if (!mounted) return;
      const unread = items.filter((i) => !i.read);
      setItem(unread[0] || null);
    });
    (async () => {
      const unread = await listUnread();
      if (mounted) setItem(unread[0] || null);
    })();
    return () => {
      mounted = false;
      unsub();
    };
  }, []);

  if (!item) return null;

  return (
    <View style={styles.wrap}>
      <View style={styles.banner}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.body}>{item.body}</Text>
        </View>
        <TouchableOpacity onPress={() => markRead(item.id)}>
          <Text style={styles.action}>Cerrar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: Platform.select({ ios: 50, android: 20, default: 0 }),
    left: 0,
    right: 0,
    zIndex: 1000,
    alignItems: 'center',
  },
  banner: {
    width: '96%',
    maxWidth: 800,
    borderRadius: 10,
    backgroundColor: '#1F2937',
    borderColor: '#374151',
    borderWidth: 1,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  title: { color: '#E5E7EB', fontWeight: '700' },
  body: { color: '#D1D5DB', marginTop: 2 },
  action: { color: '#93C5FD', fontWeight: '700' },
});

