import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { MaintenanceRecord, MaintenanceType } from '../models';
import { repo } from '../repository/Repo';
import { uuid } from '../utils/uuid';

type Props = NativeStackScreenProps<RootStackParamList, 'AddMaintenance'>;

const types: MaintenanceType[] = ['aceite','neumaticos','filtro_aire','filtro_habitaculo','correa_distribucion','frenos','bateria','itv','otros'];

export default function AddEditMaintenanceScreen({ route, navigation }: Props) {
  const { vehicleId } = route.params;
  const [type, setType] = useState<MaintenanceType>('aceite');
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [mileage, setMileage] = useState('');
  const [cost, setCost] = useState('');
  const [notes, setNotes] = useState('');

  const onSave = async () => {
    if (!mileage || !date) {
      Alert.alert('Campos requeridos', 'Fecha y km son obligatorios.');
      return;
    }
    const r: MaintenanceRecord = {
      id: uuid(),
      vehicleId,
      type,
      date: new Date(date).toISOString(),
      mileageAtService: Number(mileage),
      cost: cost ? Number(cost) : undefined,
      notes: notes || undefined,
      createdAt: new Date().toISOString(),
    };
    await repo.upsertMaintenance(r);
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Tipo</Text>
      <View style={styles.segmentWrap}>
        {types.map((t) => (
          <TouchableOpacity key={t} style={[styles.segmentItem, type === t && styles.segmentItemActive]} onPress={() => setType(t)}>
            <Text style={[styles.segmentText, type === t && styles.segmentTextActive]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>Fecha</Text>
          <TextInput style={styles.input} value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" placeholderTextColor="#6B7280" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>Km</Text>
          <TextInput style={styles.input} value={mileage} onChangeText={setMileage} placeholder="86000" placeholderTextColor="#6B7280" keyboardType="numeric" />
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>Coste (€)</Text>
          <TextInput style={styles.input} value={cost} onChangeText={setCost} placeholder="120" placeholderTextColor="#6B7280" keyboardType="decimal-pad" />
        </View>
      </View>

      <Text style={styles.label}>Notas</Text>
      <TextInput style={[styles.input, { height: 100, textAlignVertical: 'top' }]} multiline value={notes} onChangeText={setNotes} placeholder="Observaciones, taller, referencias..." placeholderTextColor="#6B7280" />

      <TouchableOpacity style={styles.button} onPress={onSave}>
        <Text style={styles.buttonText}>Guardar</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  label: { color: '#9CA3AF', marginTop: 12 },
  input: {
    backgroundColor: '#111827',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#E5E7EB',
    marginTop: 6,
    borderColor: '#1F2937',
    borderWidth: 1,
  },
  segmentWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  segmentItem: { paddingHorizontal: 10, paddingVertical: 8, backgroundColor: '#0B1020', borderRadius: 8, borderWidth: 1, borderColor: '#1F2937' },
  segmentItemActive: { backgroundColor: '#1F2937', borderColor: '#2563EB' },
  segmentText: { color: '#9CA3AF', fontSize: 12 },
  segmentTextActive: { color: '#E5E7EB', fontWeight: '600' },
  button: { backgroundColor: '#2563EB', padding: 14, borderRadius: 12, marginTop: 20, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '600' },
});
