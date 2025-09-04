import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput, Image, ScrollView } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';
import { repo } from '../repository/Repo';

type Props = NativeStackScreenProps<RootStackParamList, 'AddMaintenance'>;

type Leaf = { label: string };
type Node = { label: string; children?: Leaf[] };

const MENU: Node[] = [
  { label: 'Neumaticos', children: [
    { label: 'Comprobacion Presion' },
    { label: 'Comprobacion Neumaticos' },
    { label: 'Cruce Neumaticos' },
    { label: 'Sustitucion Neumaticos' },
  ]},
  { label: 'Filtros', children: [
    { label: 'Habitaculo' },
    { label: 'Aire' },
    { label: 'Aceite' },
    { label: 'Combustible' },
    { label: 'Otros' },
  ]},
  { label: 'Aceite' },
  { label: 'Frenos' },
  { label: 'Liquidos', children: [
    { label: 'LimpiaParabrisas' },
    { label: 'Refrigerante' },
    { label: 'Frenos' },
    { label: 'Direccion' },
    { label: 'Otros' },
  ]},
  { label: 'Bateria' },
  { label: 'Correa/Cadena distribucion' },
  { label: 'Suspension' },
  { label: 'Otros' },
];

export default function AddEditMaintenanceScreen(props: Props) {
  const { vehicleId } = props.route.params;
  const [open, setOpen] = React.useState<Record<string, boolean>>({});
  const [selected, setSelected] = React.useState<{ parent: string; label: string } | null>(null);
  const toggle = (key: string) => setOpen((p) => ({ ...p, [key]: !p[key] }));

  const [measured, setMeasured] = React.useState({ FL: '', FR: '', RL: '', RR: '' });
  const [recFront, setRecFront] = React.useState<string>('2.3');
  const [recRear, setRecRear] = React.useState<string>('2.1');
  const [editingFront, setEditingFront] = React.useState(false);
  const [editingRear, setEditingRear] = React.useState(false);
  const [editingWheel, setEditingWheel] = React.useState<'FL' | 'FR' | 'RL' | 'RR' | null>(null);
  const [canvas, setCanvas] = React.useState<{ w: number; h: number }>({ w: 0, h: 0 });

  React.useEffect(() => {
    (async () => {
      try {
        const v = await repo.getVehicle(vehicleId);
        if (v && (v as any).tirePressureFrontBar) setRecFront(String((v as any).tirePressureFrontBar));
        if (v && (v as any).tirePressureRearBar) setRecRear(String((v as any).tirePressureRearBar));
      } catch {}
    })();
  }, [vehicleId]);

  const saveRecommendation = async () => {
    const front = Number(recFront); const rear = Number(recRear);
    if (!isFinite(front) || !isFinite(rear)) return;
    try {
      const v = await repo.getVehicle(vehicleId);
      if (v) {
        (v as any).tirePressureFrontBar = front;
        (v as any).tirePressureRearBar = rear;
        await repo.upsertVehicle(v);
      }
    } catch {}
  };
  const commitFront = async () => { await saveRecommendation(); setEditingFront(false); };
  const commitRear = async () => { await saveRecommendation(); setEditingRear(false); };

  const P = {
    FL: { x: 0.22, y: 0.22 },
    FR: { x: 0.78, y: 0.22 },
    RL: { x: 0.22, y: 0.78 },
    RR: { x: 0.78, y: 0.78 },
  } as const;
  const xy = (key: keyof typeof P) => ({ x: Math.round(P[key].x * canvas.w), y: Math.round(P[key].y * canvas.h) });

  

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
      <Text style={styles.header}>Añadir mantenimiento</Text>
      <Text style={styles.sub}>Elige una categoría</Text>

      <View style={{ marginTop: 12 }}>
        {MENU.map((item) => {
          const children = item.children && item.children.length > 0 ? item.children : [{ label: item.label }];
          return (
            <View key={item.label} style={styles.group}>
              <TouchableOpacity style={styles.row} onPress={() => toggle(item.label)}>
                <Text style={styles.rowText}>{item.label}</Text>
                <Text style={styles.rowText}>{open[item.label] ? 'v' : '>'}</Text>
              </TouchableOpacity>
              {open[item.label] ? (
                <View style={{ marginLeft: 12 }}>
                  {children.map((c) => (
                    <TouchableOpacity key={`${item.label}-${c.label}`} style={styles.subRow} onPress={() => setSelected({ parent: item.label, label: c.label })}>
                      <Text style={styles.subRowText}>{c.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : null}
            </View>
          );
        })}
      </View>

      {selected ? (
        <>
          <View style={styles.selectionBox}>
            <Text style={styles.selText}>Seleccionado: {selected.parent}{selected.parent !== selected.label ? ' → ' + selected.label : ''}</Text>
          </View>

          {selected.parent === 'Neumaticos' && selected.label === 'Comprobacion Presion' ? (
            <View style={{ marginTop: 12 }}>
              <Text style={styles.sub}>Pulsa sobre la presión recomendada para editarla</Text>
              <View style={styles.carCanvas} onLayout={(e) => setCanvas({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
                <Image
                  source={require('../../assets/car_top.png')}
                  resizeMode="contain"
                  style={styles.carImage}
                />
                {/* Front Left (FL) - arriba izquierda */}
                <TouchableOpacity style={[styles.recBadge, { top: xy('FL').y - 44, left: xy('FL').x - 60 }]} onPress={() => setEditingFront(true)}>
                  {editingFront ? (
                    <TextInput
                      style={styles.editInputSmall}
                      keyboardType="numeric"
                      autoFocus
                      value={recFront}
                      onChangeText={setRecFront}
                      onSubmitEditing={commitFront}
                      onBlur={commitFront}
                    />
                  ) : (
                    <Text style={styles.recTextStrong}>Recomendado: {Number(recFront || '2.3').toFixed(1)} bar</Text>
                  )}
                </TouchableOpacity>
                {/* Front Right (FR) - arriba derecha */}
                <TouchableOpacity style={[styles.recBadge, { top: xy('FR').y - 44, left: xy('FR').x - 60 }]} onPress={() => setEditingFront(true)}>
                  {editingFront ? (
                    <TextInput
                      style={styles.editInputSmall}
                      keyboardType="numeric"
                      autoFocus
                      value={recFront}
                      onChangeText={setRecFront}
                      onSubmitEditing={commitFront}
                      onBlur={commitFront}
                    />
                  ) : (
                    <Text style={styles.recTextStrong}>Recomendado: {Number(recFront || '2.3').toFixed(1)} bar</Text>
                  )}
                </TouchableOpacity>
                {/* Rear Left (RL) - abajo izquierda */}
                <TouchableOpacity style={[styles.recBadge, { top: xy('RL').y - 44, left: xy('RL').x - 60 }]} onPress={() => setEditingRear(true)}>
                  {editingRear ? (
                    <TextInput
                      style={styles.editInputSmall}
                      keyboardType="numeric"
                      autoFocus
                      value={recRear}
                      onChangeText={setRecRear}
                      onSubmitEditing={commitRear}
                      onBlur={commitRear}
                    />
                  ) : (
                    <Text style={styles.recTextStrong}>Recomendado: {Number(recRear || '2.1').toFixed(1)} bar</Text>
                  )}
                </TouchableOpacity>
                {/* Rear Right (RR) - abajo derecha */}
                <TouchableOpacity style={[styles.recBadge, { top: xy('RR').y - 44, left: xy('RR').x - 60 }]} onPress={() => setEditingRear(true)}>
                  {editingRear ? (
                    <TextInput
                      style={styles.editInputSmall}
                      keyboardType="numeric"
                      autoFocus
                      value={recRear}
                      onChangeText={setRecRear}
                      onSubmitEditing={commitRear}
                      onBlur={commitRear}
                    />
                  ) : (
                    <Text style={styles.recTextStrong}>Recomendado: {Number(recRear || '2.1').toFixed(1)} bar</Text>
                  )}
                </TouchableOpacity>

                {/* Hotspots para introducir medido */}
                {(['FL','FR','RL','RR'] as const).map((w) => {
                  const p = xy(w);
                  return (
                    <TouchableOpacity key={w} style={[styles.wheelHotspot, { top: p.y - 14, left: p.x - 14 }]} onPress={() => setEditingWheel(w)} />
                  );
                })}
                {editingWheel ? (
                  <View style={[styles.measureBadge, { top: (editingWheel === 'FL' || editingWheel === 'FR') ? xy(editingWheel).y - 46 : xy(editingWheel).y + 12, left: xy(editingWheel).x - 50 }]}>
                    <Text style={styles.recText}>Medido</Text>
                    <TextInput
                      style={[styles.editInputSmall, { marginLeft: 6 }]}
                      keyboardType="numeric"
                      value={measured[editingWheel]}
                      onChangeText={(t) => setMeasured((m) => ({ ...m, [editingWheel]: t }))}
                      onSubmitEditing={() => setEditingWheel(null)}
                      onBlur={() => setEditingWheel(null)}
                      placeholder={editingWheel === 'FL' || editingWheel === 'FR' ? recFront : recRear}
                      placeholderTextColor="#6B7280"
                    />
                  </View>
                ) : null}
              </View>
            </View>
          ) : (
            <Text style={[styles.selHint, { marginTop: 8 }]}>Continuaremos con los detalles en el siguiente paso.</Text>
          )}
        </>
      ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  scrollContent: { paddingBottom: 24 },
  header: { color: '#E5E7EB', fontSize: 16, fontWeight: '700' },
  sub: { color: '#9CA3AF', marginTop: 4 },
  group: { borderBottomColor: '#1F2937', borderBottomWidth: 1 },
  row: { paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowText: { color: '#E5E7EB', fontSize: 15 },
  subRow: { paddingVertical: 10, paddingHorizontal: 6 },
  subRowText: { color: '#D1D5DB' },
  selectionBox: { marginTop: 16, backgroundColor: '#111827', borderRadius: 10, borderWidth: 1, borderColor: '#1F2937', padding: 12 },
  selText: { color: '#E5E7EB', fontWeight: '600' },
  selHint: { color: '#9CA3AF', marginTop: 4 },
  gridRow: { flexDirection: 'row', marginTop: 12 },
  tyreBox: { flex: 1, backgroundColor: '#0B1020', borderColor: '#1F2937', borderWidth: 1, borderRadius: 10, padding: 10 },
  tyreTitle: { color: '#E5E7EB', fontWeight: '600', marginBottom: 6 },
  tyreRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  recText: { color: '#9CA3AF' },
  input: { backgroundColor: '#0B1020', borderRadius: 8, borderWidth: 1, borderColor: '#374151', paddingHorizontal: 10, paddingVertical: 6, color: '#E5E7EB', marginLeft: 8, minWidth: 70, textAlign: 'right' },
  carCanvas: { marginTop: 12, height: 240, width: '100%', maxWidth: 360, alignSelf: 'center', borderColor: '#1F2937', borderWidth: 1, borderRadius: 12, position: 'relative', backgroundColor: '#0B1020' },
  carImage: { position: 'absolute', top: 8, left: 8, right: 8, bottom: 8, opacity: 0.98 },
  recBadge: { position: 'absolute', paddingHorizontal: 8, paddingVertical: 4, backgroundColor: '#111827', borderColor: '#1F2937', borderWidth: 1, borderRadius: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84, elevation: 3 },
  recTextStrong: { color: '#E5E7EB', fontWeight: '600' },
  editInputSmall: { minWidth: 64, backgroundColor: '#0B1020', color: '#E5E7EB', paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: '#374151', borderRadius: 6 },
  wheelHotspot: { position: 'absolute', width: 30, height: 30, borderRadius: 15, backgroundColor: '#2563EB33', borderColor: '#60A5FA', borderWidth: 2 },
  measureBadge: { position: 'absolute', flexDirection: 'row', alignItems: 'center', backgroundColor: '#111827', borderColor: '#1F2937', borderWidth: 1, paddingHorizontal: 8, paddingVertical: 6, borderRadius: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84, elevation: 3 },
});
