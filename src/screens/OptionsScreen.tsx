import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { loadKmOptions, saveKmOptions, KmUpdateOptions } from '../services/reminders/kmUpdate';

type Choice = 'weekly' | 'monthly' | 'custom';

export default function OptionsScreen() {
  const [choice, setChoice] = useState<Choice>('weekly');
  const [days, setDays] = useState<string>('7');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (async () => {
      const current = await loadKmOptions();
      if (current) {
        setChoice(current.frequency as Choice);
        if (current.frequency === 'custom' && current.customDays) setDays(String(current.customDays));
      }
    })();
  }, []);

  const onSave = async () => {
    setSaving(true);
    const opts: KmUpdateOptions = {
      frequency: choice,
      customDays: choice === 'custom' ? Math.max(1, Number(days) || 1) : undefined,
    };
    await saveKmOptions(opts);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Actualización de km</Text>
      <Text style={styles.sub}>Elige cada cuánto te preguntamos los km.</Text>

      <View style={styles.segment}>
        {[
          { key: 'weekly', label: 'Cada Semana' },
          { key: 'monthly', label: 'Cada Mes' },
          { key: 'custom', label: 'Personalizado' },
        ].map((opt) => (
          <TouchableOpacity key={opt.key} style={[styles.segmentItem, choice === (opt.key as Choice) && styles.segmentItemActive]} onPress={() => setChoice(opt.key as Choice)}>
            <Text style={[styles.segmentText, choice === (opt.key as Choice) && styles.segmentTextActive]}>{opt.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {choice === 'custom' && (
        <View style={{ marginTop: 12, flexDirection: 'row', alignItems: 'center' }}>
          <Text style={styles.label}>Cada (días)</Text>
          <TextInput style={[styles.input, { marginLeft: 8, width: 100 }]} keyboardType="numeric" value={days} onChangeText={setDays} placeholder="10" placeholderTextColor="#6B7280" />
        </View>
      )}

      <TouchableOpacity style={[styles.button, saving && { opacity: 0.6 }]} onPress={onSave} disabled={saving}>
        <Text style={styles.buttonText}>{saving ? 'Guardando…' : saved ? 'Guardado' : 'Guardar'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  header: { color: '#E5E7EB', fontSize: 16, fontWeight: '700' },
  sub: { color: '#9CA3AF', marginTop: 6 },
  segment: { flexDirection: 'row', gap: 8, marginTop: 12 },
  segmentItem: { flex: 1, paddingVertical: 10, backgroundColor: '#0B1020', borderRadius: 10, borderWidth: 1, borderColor: '#1F2937', alignItems: 'center' },
  segmentItemActive: { backgroundColor: '#1F2937', borderColor: '#2563EB' },
  segmentText: { color: '#9CA3AF', fontSize: 12 },
  segmentTextActive: { color: '#E5E7EB', fontWeight: '600' },
  label: { color: '#9CA3AF' },
  input: { backgroundColor: '#0B1020', borderRadius: 8, borderWidth: 1, borderColor: '#1F2937', paddingHorizontal: 10, paddingVertical: 8, color: '#E5E7EB' },
  button: { backgroundColor: '#2563EB', padding: 12, borderRadius: 10, marginTop: 24, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '600' },
});

