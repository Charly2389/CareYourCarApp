import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';
import { repo } from '../repository/Repo';
import type { MaintenanceRecord, Vehicle } from '../models';

type Props = NativeStackScreenProps<RootStackParamList, 'FilterHistory'>;

export default function FilterHistoryScreen({ route }: Props) {
  const { vehicleId, type, title } = route.params;
  const [logs, setLogs] = React.useState<MaintenanceRecord[]>([]);
  const [vehicle, setVehicle] = React.useState<Vehicle | undefined>(undefined);

  React.useEffect(() => {
    const load = async () => {
      try {
        const [list, v] = await Promise.all([
          repo.listMaintenance(vehicleId),
          repo.getVehicle(vehicleId),
        ]);
        setLogs(list.filter((l) => l.type === type));
        setVehicle(v);
      } catch {}
    };
    load();
  }, [vehicleId, type]);

  const renderHeader = () => (
    <View style={[styles.row, styles.headerRow]}>
      <Text style={[styles.cell, styles.headerCell, { flex: 1.2 }]}>Fecha</Text>
      <Text style={[styles.cell, styles.headerCell]}>Kilómetros</Text>
      <Text style={[styles.cell, styles.headerCell]}>Coste</Text>
      <Text style={[styles.cell, styles.headerCell]}>Taller</Text>
      <Text style={[styles.cell, styles.headerCell, { flex: 1.2 }]}>Próximo</Text>
      <Text style={[styles.cell, styles.headerCell, { flex: 2 }]}>Notas</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.hint}>{title}{vehicle ? ` · ${vehicle.make} ${vehicle.model}` : ''}</Text>
      <View style={styles.table}>
        {renderHeader()}
        <FlatList
          data={logs}
          keyExtractor={(it) => it.id}
          renderItem={({ item, index }) => (
            <View style={[styles.row, index % 2 ? styles.altRow : null]}>
              <Text style={[styles.cell, { flex: 1.2 }]}>{formatDay(item.date)}</Text>
              <Text style={styles.cell}>{km(item.mileageAtService)}</Text>
              <Text style={styles.cell}>{money(item.cost)}</Text>
              <Text style={styles.cell} numberOfLines={1}>{item.workshop || '-'}</Text>
              <Text style={[styles.cell, { flex: 1.2 }]} numberOfLines={1}>{next(item.nextDueDate, item.nextDueMileage)}</Text>
              <Text style={[styles.cell, { flex: 2 }]} numberOfLines={2}>{item.notes || '-'}</Text>
            </View>
          )}
          ListEmptyComponent={<Text style={styles.empty}>No hay registros aún.</Text>}
        />
      </View>
    </View>
  );
}

function km(n?: number) {
  return typeof n === 'number' && isFinite(n) ? `${Math.round(n)} km` : '-';
}
function money(n?: number) {
  return typeof n === 'number' && isFinite(n) ? `${n.toFixed(2)} €` : '-';
}
function next(date?: string, mileage?: number) {
  const parts: string[] = [];
  if (date) parts.push(formatDay(date));
  if (typeof mileage === 'number' && isFinite(mileage)) parts.push(`${Math.round(mileage)} km`);
  return parts.length ? parts.join(' o ') : '-';
}
function formatDay(iso: string) {
  try {
    // Support ISO or YYYY-MM-DD
    const d = new Date(/T/.test(iso) ? iso : `${iso}T12:00:00.000Z`);
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

