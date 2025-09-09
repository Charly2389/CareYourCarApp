import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';
import { repo } from '../repository/Repo';
import type { TireRotationLog, Vehicle } from '../models';

type Props = NativeStackScreenProps<RootStackParamList, 'TireRotationHistory'>;

export default function TireRotationHistoryScreen({ route }: Props) {
  const { vehicleId } = route.params;
  const [logs, setLogs] = React.useState<TireRotationLog[]>([]);
  const [vehicle, setVehicle] = React.useState<Vehicle | undefined>(undefined);

  React.useEffect(() => {
    const load = async () => {
      try {
        const [list, v] = await Promise.all([
          repo.listTireRotationLogs(vehicleId),
          repo.getVehicle(vehicleId),
        ]);
        setLogs(list);
        setVehicle(v);
      } catch {}
    };
    const unsub = () => {};
    load();
    return unsub;
  }, [vehicleId]);

  const renderHeader = () => (
    <View style={[styles.row, styles.headerRow]}>
      <Text style={[styles.cell, styles.headerCell, { flex: 1.4 }]}>Fecha</Text>
      <Text style={[styles.cell, styles.headerCell]}>Kilómetros</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.hint}>Histórico de cruces de neumáticos{vehicle ? ` · ${vehicle.make} ${vehicle.model}` : ''}</Text>
      <View style={styles.table}>
        {renderHeader()}
        <FlatList
          data={logs}
          keyExtractor={(it) => it.id}
          renderItem={({ item, index }) => (
            <View style={[styles.row, index % 2 ? styles.altRow : null]}>
              <Text style={[styles.cell, { flex: 1.4 }]}>{formatDay(item.date)}</Text>
              <Text style={styles.cell}>{num(item.mileage)}</Text>
            </View>
          )}
          ListEmptyComponent={<Text style={styles.empty}>No hay registros aún.</Text>}
        />
      </View>
    </View>
  );
}

function num(n?: number) {
  return typeof n === 'number' && isFinite(n) ? `${Math.round(n)} km` : '-';
}
function formatDay(iso: string) {
  try {
    const d = new Date(iso);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  } catch {
    return iso;
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  hint: { color: '#9CA3AF', marginBottom: 8 },
  table: { borderColor: '#1F2937', borderWidth: 1, borderRadius: 8, overflow: 'hidden' },
  row: { flexDirection: 'row', paddingHorizontal: 8, paddingVertical: 10, borderBottomColor: '#1F2937', borderBottomWidth: 1 },
  headerRow: { backgroundColor: '#111827' },
  altRow: { backgroundColor: '#0B1020' },
  cell: { flex: 1, color: '#E5E7EB' },
  headerCell: { color: '#9CA3AF', fontWeight: '600' },
  empty: { color: '#6B7280', padding: 12 },
});

