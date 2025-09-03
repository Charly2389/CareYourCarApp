import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, TextInput, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';
import { MaintenanceRecord, Vehicle } from '../models';
import { repo } from '../repository/Repo';

type Props = NativeStackScreenProps<RootStackParamList, 'VehicleDetail'>;

export default function VehicleDetailScreen({ route, navigation }: Props) {
  const { vehicleId } = route.params;
  const [vehicle, setVehicle] = useState<Vehicle | undefined>();
  const [maintenance, setMaintenance] = useState<MaintenanceRecord[]>([]);
  const [tab, setTab] = useState<'repostajes' | 'mantenimiento' | 'reparaciones'>('mantenimiento');
  const [editingFirstReg, setEditingFirstReg] = useState(false);
  const [firstRegDraft, setFirstRegDraft] = useState('');

  useEffect(() => {
    const refresh = async () => {
      const v = await repo.getVehicle(vehicleId);
      const m = await repo.listMaintenance(vehicleId);
      setVehicle(v);
      setMaintenance(m);
    };
    const unsub = navigation.addListener('focus', refresh);
    refresh();
    return unsub;
  }, [navigation, vehicleId]);

  if (!vehicle) {
    return (
      <View style={styles.container}><Text style={{ color: '#9CA3AF' }}>Coche no encontrado</Text></View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={{ alignItems: 'center', marginBottom: 12 }}>
        <TouchableOpacity onPress={async () => {
          const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (perm.status !== 'granted') return;
          const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [4, 3], quality: 0.8 });
          if (result.canceled) return;
          const uri = result.assets?.[0]?.uri;
          if (!uri) return;
          const updated: Vehicle = { ...vehicle, photoUri: uri } as Vehicle;
          await repo.upsertVehicle(updated);
          setVehicle(updated);
        }}>
          {vehicle.photoUri ? (
            <Image source={{ uri: vehicle.photoUri }} style={styles.photoLarge} />
          ) : (
            <View style={[styles.photoLarge, { backgroundColor: '#0B1020', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#1F2937' }]}>
              <Text style={{ color: '#9CA3AF' }}>Subir foto del vehículo</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.title}>{vehicle.make} {vehicle.model} ({vehicle.year})</Text>
        <Text style={styles.subtitle}>Matrícula: {vehicle.plate ?? '-'}</Text>
        <Text style={styles.subtitle}>Km: {vehicle.mileage.toLocaleString()}</Text>
        {!editingFirstReg ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6, justifyContent: 'space-between' }}>
            <Text style={styles.subtitle}>Año primera matriculación: {vehicle.firstRegistrationYear ?? '-'}</Text>
            <TouchableOpacity onPress={() => { setFirstRegDraft(String(vehicle.firstRegistrationYear ?? '')); setEditingFirstReg(true); }}>
              <Text style={{ color: '#60A5FA' }}>Editar</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={{ marginTop: 6 }}>
            <Text style={[styles.subtitle, { marginBottom: 6 }]}>Año primera matriculación</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <TextInput
                style={{ backgroundColor: '#0B1020', borderColor: '#1F2937', borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, color: '#E5E7EB', minWidth: 100 }}
                value={firstRegDraft}
                onChangeText={setFirstRegDraft}
                keyboardType="numeric"
                placeholder="2019"
                placeholderTextColor="#6B7280"
              />
              <TouchableOpacity onPress={async () => {
                const yr = Number(firstRegDraft);
                if (!yr || isNaN(yr) || yr < 1900 || yr > new Date().getFullYear()) {
                  Alert.alert('Valor inválido', 'Introduce un año de primera matriculación válido.');
                  return;
                }
                const updated: Vehicle = { ...vehicle, firstRegistrationYear: yr } as Vehicle;
                await repo.upsertVehicle(updated);
                setVehicle(updated);
                setEditingFirstReg(false);
              }}>
                <Text style={{ color: '#A7F3D0', fontWeight: '600' }}>Guardar</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setEditingFirstReg(false)}>
                <Text style={{ color: '#FCA5A5', fontWeight: '600' }}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      <View style={styles.segment}>
        {(['repostajes', 'mantenimiento', 'reparaciones'] as const).map((t) => (
          <TouchableOpacity key={t} style={[styles.segmentItem, tab === t && styles.segmentItemActive]} onPress={() => setTab(t)}>
            <Text style={[styles.segmentText, tab === t && styles.segmentTextActive]}>{t === 'repostajes' ? 'Repostajes' : t === 'mantenimiento' ? 'Mantenimiento' : 'Reparaciones'}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'mantenimiento' && (
        <>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <Text style={{ color: '#E5E7EB', fontWeight: '600' }}>Historial de mantenimientos</Text>
            <TouchableOpacity onPress={() => navigation.navigate('AddMaintenance', { vehicleId })}>
              <Text style={{ color: '#60A5FA' }}>Añadir</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={maintenance}
            keyExtractor={(item) => item.id}
            ListEmptyComponent={<Text style={{ color: '#9CA3AF' }}>Sin registros todavía.</Text>}
            renderItem={({ item }) => (
              <View style={styles.row}>
                <Text style={styles.rowTitle}>{capitalize(item.type)}</Text>
                <Text style={styles.rowSub}>{new Date(item.date).toLocaleDateString()} · {item.mileageAtService.toLocaleString()} km</Text>
                {item.cost ? <Text style={styles.rowCost}>{item.cost.toFixed(2)} €</Text> : null}
              </View>
            )}
            contentContainerStyle={{ paddingBottom: 24 }}
          />
        </>
      )}

      {tab === 'repostajes' && (
        <View style={{ paddingTop: 8 }}>
          <Text style={{ color: '#9CA3AF' }}>Sin registros de repostajes todavía.</Text>
        </View>
      )}

      {tab === 'reparaciones' && (
        <View style={{ paddingTop: 8 }}>
          <Text style={{ color: '#9CA3AF' }}>Sin registros de reparaciones todavía.</Text>
        </View>
      )}
    </View>
  );
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  card: { backgroundColor: '#111827', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#1F2937', marginBottom: 12 },
  title: { color: '#E5E7EB', fontSize: 18, fontWeight: '700' },
  subtitle: { color: '#9CA3AF', marginTop: 4 },
  photoLarge: { width: 140, height: 100, borderRadius: 10 },
  row: { backgroundColor: '#0B1020', borderRadius: 10, borderWidth: 1, borderColor: '#1F2937', padding: 12, marginBottom: 10 },
  rowTitle: { color: '#E5E7EB', fontWeight: '600' },
  rowSub: { color: '#9CA3AF', marginTop: 4 },
  rowCost: { color: '#A7F3D0', marginTop: 4 },
  segment: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  segmentItem: { flex: 1, paddingVertical: 10, backgroundColor: '#0B1020', borderRadius: 10, borderWidth: 1, borderColor: '#1F2937', alignItems: 'center' },
  segmentItemActive: { backgroundColor: '#1F2937', borderColor: '#2563EB' },
  segmentText: { color: '#9CA3AF', fontSize: 12 },
  segmentTextActive: { color: '#E5E7EB', fontWeight: '600' },
});

