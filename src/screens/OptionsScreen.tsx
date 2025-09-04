import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { loadKmOptions, saveKmOptions, KmUpdateOptions } from '../services/reminders/kmUpdate';
import { repo } from '../repository/Repo';
import type { Vehicle } from '../models';

type Choice = 'weekly' | 'monthly' | 'custom';

export default function OptionsScreen() {
  const [choice, setChoice] = useState<Choice>('weekly');
  const [days, setDays] = useState<string>('7');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [hour, setHour] = useState('9');
  const [minute, setMinute] = useState('0');
  const [scope, setScope] = useState<'global' | 'vehicle'>('global');
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vehicleId, setVehicleId] = useState<string | undefined>(undefined);

  useEffect(() => {
    (async () => {
      const list = await repo.listVehicles();
      setVehicles(list);
      if (list.length && !vehicleId) setVehicleId(list[0].id);
      const current = await loadKmOptions();
      if (current) {
        setChoice(current.frequency as Choice);
        if (current.frequency === 'custom' && current.customDays) setDays(String(current.customDays));
        if (typeof current.hour === 'number') setHour(String(current.hour));
        if (typeof current.minute === 'number') setMinute(String(current.minute));
      }
    })();
  }, []);

  const onSave = async () => {
    setSaving(true);
    const opts: KmUpdateOptions = {
      frequency: choice,
      customDays: choice === 'custom' ? Math.max(1, Number(days) || 1) : undefined,
      hour: Math.min(23, Math.max(0, Number(hour) || 9)),
      minute: Math.min(59, Math.max(0, Number(minute) || 0)),
    };
    await saveKmOptions(opts, scope === 'vehicle' ? vehicleId : undefined);
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

      <Text style={[styles.label, { marginTop: 16 }]}>Hora del recordatorio</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
        <TextInput style={[styles.input, { width: 80 }]} keyboardType="numeric" value={hour} onChangeText={setHour} placeholder="9" placeholderTextColor="#6B7280" />
        <Text style={{ color: '#9CA3AF', marginHorizontal: 8 }}>:</Text>
        <TextInput style={[styles.input, { width: 80 }]} keyboardType="numeric" value={minute} onChangeText={setMinute} placeholder="00" placeholderTextColor="#6B7280" />
      </View>

      <Text style={[styles.label, { marginTop: 16 }]}>Ámbito</Text>
      <View style={styles.segment}>
        {(['global', 'vehicle'] as const).map((s) => (
          <TouchableOpacity key={s} style={[styles.segmentItem, scope === s && styles.segmentItemActive]} onPress={() => setScope(s)}>
            <Text style={[styles.segmentText, scope === s && styles.segmentTextActive]}>{s === 'global' ? 'Global' : 'Por vehículo'}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {scope === 'vehicle' && (
        <View style={{ marginTop: 12 }}>
          <Text style={styles.sub}>Selecciona vehículo</Text>
          <View style={[styles.segment, { flexWrap: 'wrap' }]}>
            {vehicles.map((v) => (
              <TouchableOpacity key={v.id} style={[styles.segmentItem, vehicleId === v.id && styles.segmentItemActive]} onPress={() => setVehicleId(v.id)}>
                <Text style={[styles.segmentText, vehicleId === v.id && styles.segmentTextActive]}>{v.make} {v.model}</Text>
              </TouchableOpacity>
            ))}
          </View>
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
