import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, TextInput, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';
import { MaintenanceRecord, Vehicle } from '../models';
import { repo } from '../repository/Repo';
import PlusButton from '../components/PlusButton';

type Props = NativeStackScreenProps<RootStackParamList, 'VehicleDetail'>;

export default function VehicleDetailScreen({ route, navigation }: Props) {
  const { vehicleId } = route.params;
  const [vehicle, setVehicle] = useState<Vehicle | undefined>();
  const [maintenance, setMaintenance] = useState<MaintenanceRecord[]>([]);
  type MaintEvent = {
    id: string;
    date: string; // ISO
    category: string;
    subcategory: string;
    mileage?: number;
    cost?: number;
    extra?: string;
  };
  const [events, setEvents] = useState<MaintEvent[]>([]);
  const [tab, setTab] = useState<'repostajes' | 'mantenimiento' | 'reparaciones'>('mantenimiento');
  const [editingFirstReg, setEditingFirstReg] = useState(false);
  const [firstRegDraft, setFirstRegDraft] = useState('');

  useEffect(() => {
    const refresh = async () => {
      const [v, m, rot, repl, tpl, twl] = await Promise.all([
        repo.getVehicle(vehicleId),
        repo.listMaintenance(vehicleId),
        repo.listTireRotationLogs(vehicleId).catch(() => []),
        repo.listTireReplacementLogs(vehicleId).catch(() => []),
        repo.listTirePressureLogs(vehicleId).catch(() => []),
        repo.listTireWearLogs(vehicleId).catch(() => []),
      ]);
      setVehicle(v!);
      const typeLabel: Record<string, string> = {
        aceite: 'Aceite',
        Neumáticos: 'Neumáticos',
        filtro_aire: 'Filtro de aire',
        filtro_habitáculo: 'Filtro de habitáculo',
        correa_distribucion: 'Correa de distribución',
        frenos: 'Frenos',
        bateria: 'Batería',
        itv: 'ITV',
        otros: 'Otros',
        filtro_aceite: 'Filtro de aceite',
        filtro_combustible: 'Filtro de combustible',
      };
      // Combine maintenance records with tyre events as synthetic records for the list
      const rotAsMaint = rot.map((r: any) => ({
        id: `rot-${r.id}`,
        vehicleId: vehicleId,
        type: 'neumaticos' as any,
        date: r.date,
        mileageAtService: r.mileage ?? 0,
        createdAt: r.date,
        notes: 'Cruce de neumáticos',
      } as MaintenanceRecord));
      const replAsMaint = repl.map((r: any) => ({
        id: `repl-${r.id}`,
        vehicleId: vehicleId,
        type: 'neumaticos' as any,
        date: r.date,
        mileageAtService: r.mileage ?? 0,
        createdAt: r.date,
        notes: r.tireType ? `Sustitución: ${r.tireType}` : 'Sustitución de Neumáticos',
      } as MaintenanceRecord));
      const combined = [...m, ...rotAsMaint, ...replAsMaint].sort((a, b) => b.date.localeCompare(a.date));
      setMaintenance(combined);

      // Also build unified event list including pressure and wear
      const maintEvents: MaintEvent[] = m.map((r) => ({
        id: (r as any).id,
        date: (r as any).date,
        category: typeLabel[(r as any).type] ?? (r as any).type,
        subcategory: 'Mantenimiento',
        mileage: (r as any).mileageAtService,
        cost: (r as any).cost,
        extra: (r as any).notes || undefined,
      }));
      const rotEvents: MaintEvent[] = (rot as any[]).map((r) => ({
        id: `rot-${r.id}`,
        date: r.date,
        category: 'Neumáticos',
        subcategory: 'Cruce de neumáticos',
        mileage: r.mileage,
      }));
      const replEvents: MaintEvent[] = (repl as any[]).map((r) => ({
        id: `repl-${r.id}`,
        date: r.date,
        category: 'Neumáticos',
        subcategory: 'Sustitución de Neumáticos',
        mileage: r.mileage,
        extra: r.tireType,
      }));
      const POS_LABEL: Record<'FL'|'FR'|'RL'|'RR', string> = {
        FL: 'Del. Izq.',
        FR: 'Del. Der.',
        RL: 'Tras. Izq.',
        RR: 'Tras. Der.',
      };
      const pressureEvents: MaintEvent[] = (tpl as any[]).map((r) => {
        const fmt = (n?: number) => (typeof n === 'number' && isFinite(n) ? n.toFixed(1) : undefined);
        const parts = [
          fmt(r.fl) ? `${POS_LABEL.FL} ${fmt(r.fl)} bar` : null,
          fmt(r.fr) ? `${POS_LABEL.FR} ${fmt(r.fr)} bar` : null,
          fmt(r.rl) ? `${POS_LABEL.RL} ${fmt(r.rl)} bar` : null,
          fmt(r.rr) ? `${POS_LABEL.RR} ${fmt(r.rr)} bar` : null,
        ].filter(Boolean);
        return {
          id: `press-${r.id}`,
          date: r.date,
          category: 'Neumáticos',
          subcategory: 'Presión de Neumáticos',
          extra: (parts as string[]).join(', '),
        } as MaintEvent;
      });
      const wearEvents: MaintEvent[] = (twl as any[]).map((r) => {
        const fmt = (n?: number) => (typeof n === 'number' && isFinite(n) ? n.toFixed(1) : undefined);
        const parts = [
          fmt(r.fl) ? `${POS_LABEL.FL} ${fmt(r.fl)} mm` : null,
          fmt(r.fr) ? `${POS_LABEL.FR} ${fmt(r.fr)} mm` : null,
          fmt(r.rl) ? `${POS_LABEL.RL} ${fmt(r.rl)} mm` : null,
          fmt(r.rr) ? `${POS_LABEL.RR} ${fmt(r.rr)} mm` : null,
        ].filter(Boolean);
        return {
          id: `wear-${r.id}`,
          date: r.date,
          category: 'Neumáticos',
          subcategory: 'Desgaste de Neumáticos',
          extra: (parts as string[]).join(', '),
        } as MaintEvent;
      });
      const all = [...maintEvents, ...rotEvents, ...replEvents, ...pressureEvents, ...wearEvents].sort((a, b) => b.date.localeCompare(a.date));
      setEvents(all);
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
          const updated: Vehicle = { ...vehicle!, photoUri: uri };
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
                const updated: Vehicle = { ...vehicle!, firstRegistrationYear: yr };
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
            <PlusButton size={40} accessibilityLabel="Añadir mantenimiento" onPress={() => navigation.navigate('AddMaintenance', { vehicleId })} />
          </View>
          <FlatList
            data={events}
            keyExtractor={(item) => item.id}
            ListEmptyComponent={<Text style={{ color: '#9CA3AF' }}>Sin registros todavía.</Text>}
            renderItem={({ item }) => (
              <View style={styles.row}>
                <Text style={styles.rowTitle}>{item.category + (item.subcategory ? (' - ' + item.subcategory) : '')}</Text>
                <Text style={styles.rowSub}>{new Date(item.date).toLocaleString()} {item.mileage != null ? (' - ' + item.mileage.toLocaleString() + ' km') : ''}</Text>
                {item.extra ? (
                  item.category.toLowerCase().includes('neum') ? (
                    <Text style={styles.rowSub}>
                      {item.extra.split(',').map((seg, idx, arr) => {
                        const part = seg.trim();
                        // Capture full label (e.g., "Del. Der." or "Tras. Izq.") before the first number
                        const m = part.match(/^(.+?)\s+(\d.*)$/);
                        const label = m ? m[1].trim() : '';
                        const rest = m ? m[2].trim() : part;
                        return (
                          <Text key={idx}>
                            {label ? (<Text style={styles.posStrong}>{label}</Text>) : null}
                            {label ? ' ' : ''}
                            {rest}
                            {idx < arr.length - 1 ? ', ' : ''}
                          </Text>
                        );
                      })}
                    </Text>
                  ) : (
                    <Text style={styles.rowSub}>{item.extra}</Text>
                  )
                ) : null}
                {typeof item.cost === 'number' ? <Text style={styles.rowCost}>{item.cost.toFixed(2)} EUR</Text> : null}
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
  posStrong: { color: '#E5E7EB', fontWeight: '700' },
  rowCost: { color: '#A7F3D0', marginTop: 4 },
  segment: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  segmentItem: { flex: 1, paddingVertical: 10, backgroundColor: '#0B1020', borderRadius: 10, borderWidth: 1, borderColor: '#1F2937', alignItems: 'center' },
  segmentItemActive: { backgroundColor: '#1F2937', borderColor: '#2563EB' },
  segmentText: { color: '#9CA3AF', fontSize: 12 },
  segmentTextActive: { color: '#E5E7EB', fontWeight: '600' },
});

