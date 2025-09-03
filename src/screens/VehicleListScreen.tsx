import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Platform, Alert } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';
import { Vehicle } from '../models';
import { repo } from '../repository/Repo';

type Props = NativeStackScreenProps<RootStackParamList, 'Vehicles'>;

export default function VehicleListScreen({ navigation }: Props) {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      repo.listVehicles().then(setVehicles);
    });
    return unsubscribe;
  }, [navigation]);

  const confirmDeleteVehicle = (v: Vehicle) => {
    const perform = async () => {
      await repo.deleteVehicle(v.id);
      setVehicles((prev) => prev.filter((x) => x.id !== v.id));
    };
    if (Platform.OS === 'web') {
      // @ts-ignore
      const ok = (typeof window !== 'undefined' && (window as any).confirm) ? (window as any).confirm('¿Seguro que deseas eliminar este vehículo y su historial?') : true;
      if (ok) perform();
    } else {
      Alert.alert(
        'Eliminar vehículo',
        '¿Seguro que deseas eliminar este vehículo y su historial?',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Eliminar', style: 'destructive', onPress: perform },
        ]
      );
    }
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={vehicles}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={<Text style={styles.empty}>Aún no has añadido ningún coche.</Text>}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('VehicleDetail', { vehicleId: item.id })}>
            <Text style={styles.title}>{item.make} {item.model}</Text>
            <View style={{ alignItems: 'flex-end', marginTop: 6 }}>
              <TouchableOpacity onPress={() => confirmDeleteVehicle(item)}>
                <Text style={{ color: '#FCA5A5', fontWeight: '600' }}>Eliminar vehículo</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.subtitle}>{item.year} • {item.plate ?? 'sin matrícula'} • {item.mileage.toLocaleString()} km</Text>
          </TouchableOpacity>
        )}
        contentContainerStyle={{ padding: 16 }}
      />
      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('AddVehicle')}>
        <Text style={styles.fabText}>＋</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  card: {
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1F2937',
  },
  title: { color: '#E5E7EB', fontSize: 16, fontWeight: '600' },
  subtitle: { color: '#9CA3AF', marginTop: 4 },
  empty: { color: '#9CA3AF', textAlign: 'center', marginTop: 24 },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    backgroundColor: '#2563EB',
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      web: { boxShadow: '0px 4px 12px rgba(0,0,0,0.3)' },
      default: {
        shadowColor: '#000',
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 6,
      },
    }),
  },
  fabText: { color: '#fff', fontSize: 28, lineHeight: 28 },
});
