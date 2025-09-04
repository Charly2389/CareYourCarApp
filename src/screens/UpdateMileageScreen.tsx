import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Alert } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';
import { Vehicle } from '../models';
import { repo } from '../repository/Repo';
import { markRead } from '../services/inbox';

type Props = NativeStackScreenProps<RootStackParamList, 'UpdateMileage'>;

export default function UpdateMileageScreen({ route, navigation }: Props) {
  const inboxId = route.params?.inboxId;
  const preselectVehicleId = (route.params as any)?.vehicleId as string | undefined;
  const [vehicles, setVehicles] = useState<Vehicle[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [km, setKm] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const list = await repo.listVehicles();
      setVehicles(list);
      if (preselectVehicleId && list.find((v) => v.id === preselectVehicleId)) setSelectedId(preselectVehicleId);
      else if (list.length > 0) setSelectedId(list[0].id);
    })();
  }, []);

  const onSave = async () => {
    if (!selectedId) return;
    const n = Number(km);
    if (!n || isNaN(n) || n < 0) {
      Alert.alert('Valor inválido', 'Introduce un número de kilómetros válido.');
      return;
    }
    setSaving(true);
    const v = await repo.getVehicle(selectedId);
    if (!v) {
      setSaving(false);
      Alert.alert('Error', 'Vehículo no encontrado.');
      return;
    }
    const updated: Vehicle = { ...v, mileage: n } as Vehicle;
    await repo.upsertVehicle(updated);
    if (inboxId) await markRead(inboxId);
    setSaving(false);
    navigation.goBack();
  };

  if (vehicles === null) {
    return (
      <View style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Actualiza los km de tu vehículo</Text>
      {vehicles.length === 0 ? (
        <Text style={styles.sub}>Primero añade un vehículo.</Text>
      ) : (
        <>
          <Text style={[styles.sub, { marginBottom: 8 }]}>Selecciona vehículo</Text>
          <View style={styles.segment}>
            {vehicles.map((v) => (
              <TouchableOpacity key={v.id} style={[styles.segmentItem, selectedId === v.id && styles.segmentItemActive]} onPress={() => setSelectedId(v.id)}>
                <Text style={[styles.segmentText, selectedId === v.id && styles.segmentTextActive]}>{v.make} {v.model}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={[styles.sub, { marginTop: 16 }]}>Kilómetros actuales</Text>
          <TextInput style={[styles.input, { marginTop: 6 }]} keyboardType="numeric" value={km} onChangeText={setKm} placeholder="85000" placeholderTextColor="#6B7280" />
          <TouchableOpacity style={[styles.button, saving && { opacity: 0.6 }]} onPress={onSave} disabled={saving || !selectedId}>
            <Text style={styles.buttonText}>{saving ? 'Guardando…' : 'Guardar'}</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  header: { color: '#E5E7EB', fontSize: 16, fontWeight: '700' },
  sub: { color: '#9CA3AF', marginTop: 6 },
  segment: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  segmentItem: { paddingHorizontal: 10, paddingVertical: 8, backgroundColor: '#0B1020', borderRadius: 8, borderWidth: 1, borderColor: '#1F2937' },
  segmentItemActive: { backgroundColor: '#1F2937', borderColor: '#2563EB' },
  segmentText: { color: '#9CA3AF', fontSize: 12 },
  segmentTextActive: { color: '#E5E7EB', fontWeight: '600' },
  input: { backgroundColor: '#0B1020', borderRadius: 8, borderWidth: 1, borderColor: '#1F2937', paddingHorizontal: 10, paddingVertical: 8, color: '#E5E7EB' },
  button: { backgroundColor: '#2563EB', padding: 12, borderRadius: 10, marginTop: 16, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '600' },
});
