import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { Vehicle } from '../models';
import { repo } from '../repository/Repo';
import { uuid } from '../utils/uuid';

type Props = NativeStackScreenProps<RootStackParamList, 'AddVehicle'>;

const fuels = ['gasolina', 'diesel', 'hibrido', 'electrico'] as const;

export default function AddEditVehicleScreen({ navigation, route }: Props) {
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [plate, setPlate] = useState('');
  const [mileage, setMileage] = useState('');
  const [fuelType, setFuelType] = useState<typeof fuels[number]>('gasolina');

  const isEditing = Boolean(vehicle);

  useEffect(() => {
    // In future: load by id if editing
  }, []);

  const onSave = async () => {
    if (!make || !model || !year || !mileage) {
      Alert.alert('Campos requeridos', 'Marca, modelo, año y km son obligatorios.');
      return;
    }
    const v: Vehicle = {
      id: vehicle?.id ?? uuid(),
      make,
      model,
      year: Number(year),
      plate: plate || undefined,
      vin: undefined,
      mileage: Number(mileage),
      fuelType,
      createdAt: new Date().toISOString(),
    };
    await repo.upsertVehicle(v);
    navigation.replace('VehicleDetail', { vehicleId: v.id });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Marca</Text>
      <TextInput style={styles.input} value={make} onChangeText={setMake} placeholder="Ej: Toyota" placeholderTextColor="#6B7280" />

      <Text style={styles.label}>Modelo</Text>
      <TextInput style={styles.input} value={model} onChangeText={setModel} placeholder="Ej: Corolla" placeholderTextColor="#6B7280" />

      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>Año</Text>
          <TextInput style={styles.input} value={year} onChangeText={setYear} placeholder="2018" placeholderTextColor="#6B7280" keyboardType="numeric" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>Km actuales</Text>
          <TextInput style={styles.input} value={mileage} onChangeText={setMileage} placeholder="85000" placeholderTextColor="#6B7280" keyboardType="numeric" />
        </View>
      </View>

      <Text style={styles.label}>Matrícula</Text>
      <TextInput style={styles.input} value={plate} onChangeText={setPlate} placeholder="0000-XXX" placeholderTextColor="#6B7280" />

      <Text style={styles.label}>Combustible</Text>
      <View style={styles.segment}>
        {fuels.map((f) => (
          <TouchableOpacity key={f} style={[styles.segmentItem, fuelType === f && styles.segmentItemActive]} onPress={() => setFuelType(f)}>
            <Text style={[styles.segmentText, fuelType === f && styles.segmentTextActive]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.button} onPress={onSave}>
        <Text style={styles.buttonText}>{isEditing ? 'Guardar' : 'Añadir coche'}</Text>
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
  segment: { flexDirection: 'row', marginTop: 6, gap: 8 },
  segmentItem: { flex: 1, paddingVertical: 10, backgroundColor: '#0B1020', borderRadius: 10, borderWidth: 1, borderColor: '#1F2937', alignItems: 'center' },
  segmentItemActive: { backgroundColor: '#1F2937', borderColor: '#2563EB' },
  segmentText: { color: '#9CA3AF', fontSize: 12 },
  segmentTextActive: { color: '#E5E7EB', fontWeight: '600' },
  button: { backgroundColor: '#2563EB', padding: 14, borderRadius: 12, marginTop: 20, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '600' },
});
