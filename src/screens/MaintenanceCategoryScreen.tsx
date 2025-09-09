import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput, Image, ScrollView, Linking } from 'react-native';
import { addInbox } from '../services/inbox';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';
import { repo } from '../repository/Repo';
import { uuid } from '../utils/uuid';
import type { TirePressureLog, TireRotationLog, TireReplacementLog } from '../models';

type Props = NativeStackScreenProps<RootStackParamList, 'MaintenanceCategory'>;

const NEUMATICOS_ITEMS = [
  'Comprobacion Presion',
  'Comprobacion Neumaticos',
  'Cruce Neumaticos',
  'Sustitucion Neumaticos',
];

export default function MaintenanceCategoryScreen({ route, navigation }: Props) {
  const { vehicleId, category } = route.params;
  const [sub, setSub] = React.useState<string | null>(null);

  const [measured, setMeasured] = React.useState({ FL: '', FR: '', RL: '', RR: '' });
  const [recFront, setRecFront] = React.useState<string>('2.3');
  const [recRear, setRecRear] = React.useState<string>('2.1');
  const [editingFront, setEditingFront] = React.useState(false);
  const [editingRear, setEditingRear] = React.useState(false);
  const [editingWheel, setEditingWheel] = React.useState<'FL'|'FR'|'RL'|'RR'|null>(null);
  const [wear, setWear] = React.useState({ FL: '', FR: '', RL: '', RR: '' });
  const [editingWearWheel, setEditingWearWheel] = React.useState<'FL'|'FR'|'RL'|'RR'|null>(null);
  const [warn, setWarn] = React.useState<{ FL: boolean; FR: boolean; RL: boolean; RR: boolean }>({ FL: false, FR: false, RL: false, RR: false });
  const [canvas, setCanvas] = React.useState<{ w: number; h: number }>({ w: 0, h: 0 });
  const [rotationKm, setRotationKm] = React.useState<string>('');
  const [replacementKm, setReplacementKm] = React.useState<string>('');
  const [tireType, setTireType] = React.useState<string>('');

  React.useEffect(() => {
    (async () => {
      try {
        const v = await repo.getVehicle(vehicleId);
        if (v?.tirePressureFrontBar) setRecFront(String(v.tirePressureFrontBar));
        if (v?.tirePressureRearBar) setRecRear(String(v.tirePressureRearBar));
        if (v?.tireSizeSpec) setTireType(v.tireSizeSpec);
      } catch {}
    })();
  }, [vehicleId]);

  const saveRecommendation = async () => {
    const front = Number(recFront); const rear = Number(recRear);
    if (!isFinite(front) || !isFinite(rear)) return;
    try {
      const v = await repo.getVehicle(vehicleId);
      if (v) {
        v.tirePressureFrontBar = front;
        v.tirePressureRearBar = rear;
        await repo.upsertVehicle(v);
      }
    } catch {}
  };
  const commitFront = async () => { await saveRecommendation(); setEditingFront(false); };
  const commitRear = async () => { await saveRecommendation(); setEditingRear(false); };

  const P = { FL: { x: 0.22, y: 0.22 }, FR: { x: 0.78, y: 0.22 }, RL: { x: 0.22, y: 0.78 }, RR: { x: 0.78, y: 0.78 } } as const;
  const xy = (key: keyof typeof P) => ({ x: Math.round(P[key].x * canvas.w), y: Math.round(P[key].y * canvas.h) });
  const POS_LABEL: Record<'FL'|'FR'|'RL'|'RR', string> = {
    FL: 'delantera izquierda',
    FR: 'delantera derecha',
    RL: 'trasera izquierda',
    RR: 'trasera derecha',
  };

  // Load last wear to color hotspots
  React.useEffect(() => {
    (async () => {
      try {
        const list = await repo.listTireWearLogs(vehicleId);
        const last = list[0];
        if (last) {
          setWarn({
            FL: typeof last.fl === 'number' ? last.fl <= 1.6 : false,
            FR: typeof last.fr === 'number' ? last.fr <= 1.6 : false,
            RL: typeof last.rl === 'number' ? last.rl <= 1.6 : false,
            RR: typeof last.rr === 'number' ? last.rr <= 1.6 : false,
          });
        }
      } catch {}
    })();
  }, [vehicleId]);

  const renderNeumaticos = () => {
    if (!sub) {
      return (
        <View>
          {NEUMATICOS_ITEMS.map((name) => (
            <TouchableOpacity key={name} style={styles.itemRow} onPress={() => setSub(name)}>
              <Text style={styles.itemText}>{name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      );
    }
    if (sub === 'Sustitucion Neumaticos') {
      return (
        <View style={{ marginTop: 12 }}>
          <Text style={styles.sub}>Registra la sustitución de neumáticos y el tipo montado.</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12 }}>
            <Text style={[styles.sub, { marginRight: 8 }]}>Kilómetros actuales</Text>
            <TextInput
              value={replacementKm}
              onChangeText={setReplacementKm}
              keyboardType='numeric'
              style={[styles.editInputSmall, { minWidth: 96 }]}
              placeholder='Ej: 68500'
              placeholderTextColor="#6B7280"
            />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12 }}>
            <Text style={[styles.sub, { marginRight: 8 }]}>Tipo de neumático</Text>
            <TextInput
              value={tireType}
              onChangeText={setTireType}
              keyboardType='default'
              style={[styles.editInputSmall, { minWidth: 160 }]}
              placeholder='Ej: 205/55 R16 91V'
              placeholderTextColor="#6B7280"
              autoCapitalize='characters'
            />
          </View>
          <View style={{ flexDirection: 'row', marginTop: 12 }}>
            <TouchableOpacity
              accessibilityRole='button'
              onPress={async () => {
                const km = Number(replacementKm.replace(/[^0-9.]/g, ''));
                if (!isFinite(km)) return;
                const log: TireReplacementLog = {
                  id: uuid(),
                  vehicleId,
                  date: new Date().toISOString(),
                  mileage: Math.round(km),
                  tireType: tireType?.trim() || undefined,
                };
                try {
                  await repo.addTireReplacementLog(log);
                  if (tireType?.trim()) {
                    const v = await repo.getVehicle(vehicleId);
                    if (v) { v.tireSizeSpec = tireType.trim(); await repo.upsertVehicle(v); }
                  }
                } catch {}
                setReplacementKm('');
              }}
              style={[styles.backBtn, { backgroundColor: '#10B98122', borderColor: '#10B98155', marginRight: 12 }]}
            >
              <Text style={[styles.backText, { color: '#A7F3D0' }]}>Registrar Sustitución de neumáticos</Text>
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityRole='button'
              onPress={() => navigation.navigate('TireReplacementHistory', { vehicleId })}
              style={[styles.backBtn, { backgroundColor: '#111827' }]}
            >
              <Text style={styles.backText}>Consultar histórico</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity onPress={() => setSub(null)} style={[styles.backBtn, { alignSelf: 'flex-start', marginTop: 12 }]}>
            <Text style={styles.backText}>Atrás</Text>
          </TouchableOpacity>
        </View>
      );
    }
    if (sub === 'Cruce Neumaticos') {
      return (
        <View style={{ marginTop: 12 }}>
          <Text style={styles.sub}>Registra el cruce de neumáticos para llevar control del mantenimiento.</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12 }}>
            <Text style={[styles.sub, { marginRight: 8 }]}>Kilómetros actuales</Text>
            <TextInput
              value={rotationKm}
              onChangeText={setRotationKm}
              keyboardType='numeric'
              style={[styles.editInputSmall, { minWidth: 96 }]}
              placeholder='Ej: 68500'
              placeholderTextColor="#6B7280"
            />
          </View>
          <View style={{ flexDirection: 'row', marginTop: 12 }}>
            <TouchableOpacity
              accessibilityRole='button'
              onPress={async () => {
                const km = Number(rotationKm.replace(/[^0-9.]/g, ''));
                if (!isFinite(km)) return;
                const log: TireRotationLog = {
                  id: uuid(),
                  vehicleId,
                  date: new Date().toISOString(),
                  mileage: Math.round(km),
                };
                try { await repo.addTireRotationLog(log); } catch {}
                setRotationKm('');
              }}
              style={[styles.backBtn, { backgroundColor: '#10B98122', borderColor: '#10B98155', marginRight: 12 }]}
            >
              <Text style={[styles.backText, { color: '#A7F3D0' }]}>Registrar Cruce de neumáticos</Text>
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityRole='button'
              onPress={() => navigation.navigate('TireRotationHistory', { vehicleId })}
              style={[styles.backBtn, { backgroundColor: '#111827' }]}
            >
              <Text style={styles.backText}>Consultar histórico</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity onPress={() => setSub(null)} style={[styles.backBtn, { alignSelf: 'flex-start', marginTop: 12 }]}>
            <Text style={styles.backText}>Atrás</Text>
          </TouchableOpacity>
        </View>
      );
    }
    if (sub === 'Sustitucion Neumaticos') {
      return (
        <View style={{ marginTop: 12 }}>
          <Text style={styles.sub}>Registra la sustitución de neumáticos y el tipo montado.</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12 }}>
            <Text style={[styles.sub, { marginRight: 8 }]}>Kilómetros actuales</Text>
            <TextInput
              value={replacementKm}
              onChangeText={setReplacementKm}
              keyboardType='numeric'
              style={[styles.editInputSmall, { minWidth: 96 }]}
              placeholder='Ej: 68500'
              placeholderTextColor="#6B7280"
            />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12 }}>
            <Text style={[styles.sub, { marginRight: 8 }]}>Tipo de neumático</Text>
            <TextInput
              value={tireType}
              onChangeText={setTireType}
              keyboardType='default'
              style={[styles.editInputSmall, { minWidth: 160 }]}
              placeholder='Ej: 205/55 R16 91V'
              placeholderTextColor="#6B7280"
              autoCapitalize='characters'
            />
          </View>
          <View style={{ flexDirection: 'row', marginTop: 12 }}>
            <TouchableOpacity
              accessibilityRole='button'
              onPress={async () => {
                const km = Number(replacementKm.replace(/[^0-9.]/g, ''));
                if (!isFinite(km)) return;
                const log: TireReplacementLog = {
                  id: uuid(),
                  vehicleId,
                  date: new Date().toISOString(),
                  mileage: Math.round(km),
                  tireType: tireType?.trim() || undefined,
                };
                try {
                  await repo.addTireReplacementLog(log);
                  // Save tire type on vehicle too
                  if (tireType?.trim()) {
                    const v = await repo.getVehicle(vehicleId);
                    if (v) { v.tireSizeSpec = tireType.trim(); await repo.upsertVehicle(v); }
                  }
                } catch {}
                setReplacementKm('');
              }}
              style={[styles.backBtn, { backgroundColor: '#10B98122', borderColor: '#10B98155', marginRight: 12 }]}
            >
              <Text style={[styles.backText, { color: '#A7F3D0' }]}>Registrar Sustitución de neumáticos</Text>
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityRole='button'
              onPress={() => navigation.navigate('TireReplacementHistory', { vehicleId })}
              style={[styles.backBtn, { backgroundColor: '#111827' }]}
            >
              <Text style={styles.backText}>Consultar histórico</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity onPress={() => setSub(null)} style={[styles.backBtn, { alignSelf: 'flex-start', marginTop: 12 }]}>
            <Text style={styles.backText}>Atrás</Text>
          </TouchableOpacity>
        </View>
      );
    }
    if (sub === 'Cruce Neumaticos') {
      return (
        <View style={{ marginTop: 12 }}>
          <Text style={styles.sub}>Registra el cruce de neumáticos para llevar control del mantenimiento.</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12 }}>
            <Text style={[styles.sub, { marginRight: 8 }]}>Kilómetros actuales</Text>
            <TextInput
              value={rotationKm}
              onChangeText={setRotationKm}
              keyboardType='numeric'
              style={[styles.editInputSmall, { minWidth: 96 }]}
              placeholder='Ej: 68500'
              placeholderTextColor="#6B7280"
            />
          </View>
          <View style={{ flexDirection: 'row', marginTop: 12 }}>
            <TouchableOpacity
              accessibilityRole='button'
              onPress={async () => {
                const km = Number(rotationKm.replace(/[^0-9.]/g, ''));
                if (!isFinite(km)) return;
                const log: TireRotationLog = {
                  id: uuid(),
                  vehicleId,
                  date: new Date().toISOString(),
                  mileage: Math.round(km),
                };
                try { await repo.addTireRotationLog(log); } catch {}
                setRotationKm('');
              }}
              style={[styles.backBtn, { backgroundColor: '#10B98122', borderColor: '#10B98155', marginRight: 12 }]}
            >
              <Text style={[styles.backText, { color: '#A7F3D0' }]}>Registrar Cruce de neumáticos</Text>
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityRole='button'
              onPress={() => navigation.navigate('TireRotationHistory', { vehicleId })}
              style={[styles.backBtn, { backgroundColor: '#111827' }]}
            >
              <Text style={styles.backText}>Consultar histórico</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity onPress={() => setSub(null)} style={[styles.backBtn, { alignSelf: 'flex-start', marginTop: 12 }]}>
            <Text style={styles.backText}>Atrás</Text>
          </TouchableOpacity>
        </View>
      );
    }
    if (sub === 'Comprobacion Neumaticos') {
      return (
        <View style={{ marginTop: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
            <Text style={styles.sub}>Video: </Text>
            <TouchableOpacity
              accessibilityRole='button'
              onPress={() => Linking.openURL('https://www.youtube.com/watch?v=GhbPKjN6J5s&t')}
            >
            <Text style={{ color: '#60A5FA', fontWeight: '600' }}>Cómo comprobar tus nemáticos correctamente.</Text>
          </TouchableOpacity>
          </View>
          <Text style={styles.sub}>La profundidad minima legal del dibujo es 1,6 mm.</Text>
          <View style={styles.carCanvas} onLayout={(e) => setCanvas({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
            <Image source={require('../../assets/car_top.png')} resizeMode="contain" style={styles.carImage} />
            {(['FL','FR','RL','RR'] as const).map((w) => (
              <TouchableOpacity
                key={w}
                style={[styles.wheelHotspot, warn[w] ? styles.wheelHotspotWarn : null, { top: xy(w).y - 15, left: xy(w).x - 15 }]}
                onPress={() => setEditingWearWheel(w)}
              />
            ))}
            {editingWearWheel && (
              <View style={[styles.measureBadge, { top: xy(editingWearWheel).y - 52, left: xy(editingWearWheel).x - 64 }] }>
                <Text style={{ color: '#9CA3AF', marginRight: 8 }}>{POS_LABEL[editingWearWheel]}</Text>
                <TextInput
                  style={styles.editInputSmall}
                  keyboardType="numeric"
                  autoFocus
                  placeholder="mm"
                  value={(wear as any)[editingWearWheel]}
                  onChangeText={(txt) => {
                    setWear((prev) => ({ ...prev, [editingWearWheel]: txt }));
                    const v = parseFloat(txt.replace(',', '.'));
                    if (!Number.isNaN(v)) {
                      setWarn((prev) => ({ ...prev, [editingWearWheel]: v <= 1.6 } as any));
                    }
                  }}
                  onSubmitEditing={() => setEditingWearWheel(null)}
                  onBlur={() => setEditingWearWheel(null)}
                />
                <Text style={{ color: '#9CA3AF', marginLeft: 6 }}>mm</Text>
              </View>
            )}
          </View>
          <View style={{ flexDirection: 'row', marginTop: 12 }}>
            <TouchableOpacity
              accessibilityRole='button'
              onPress={async () => {
                const parse = (s: string) => (s ? Number(s.replace(',', '.')) : undefined);
                const log = {
                  id: uuid(),
                  vehicleId,
                  date: new Date().toISOString(),
                  fl: parse(wear.FL),
                  fr: parse(wear.FR),
                  rl: parse(wear.RL),
                  rr: parse(wear.RR),
                } as any;
                try {
                  await repo.addTireWearLog(log);
                  // Update warn state based on saved values and emit banners
                  const keys: ('FL'|'FR'|'RL'|'RR')[] = ['FL','FR','RL','RR'];
                  const posLabel: Record<'FL'|'FR'|'RL'|'RR', string> = {
                    FL: 'delantera izquierda',
                    FR: 'delantera derecha',
                    RL: 'trasera izquierda',
                    RR: 'trasera derecha',
                  };
                  const newWarn: any = { ...warn };
                  for (const k of keys) {
                    const val = (log as any)[k.toLowerCase()];
                    if (typeof val === 'number') {
                      newWarn[k] = val <= 1.6;
                      if (newWarn[k]) {
                        await addInbox('Neumáticos', `Rueda ${posLabel[k]} desgastada. Sustitúyala`);
                      }
                    }
                  }
                  setWarn(newWarn);
                } catch {}
                setWear({ FL: '', FR: '', RL: '', RR: '' });
              }}
              style={[styles.backBtn, { backgroundColor: '#10B98122', borderColor: '#10B98155', marginRight: 12 }]}
            >
              <Text style={[styles.backText, { color: '#A7F3D0' }]}>Guardar registro</Text>
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityRole='button'
              onPress={() => navigation.navigate('TireWearHistory', { vehicleId })}
              style={[styles.backBtn, { backgroundColor: '#111827' }]}
            >
              <Text style={styles.backText}>Consultar histÃ³rico</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity onPress={() => setSub(null)} style={[styles.backBtn, { alignSelf: 'flex-start', marginTop: 12 }]}>
            <Text style={styles.backText}>AtrÃ¡s</Text>
          </TouchableOpacity>
        </View>
      );
    }
    if (sub === 'Comprobacion Presion') {
      return (
        <View style={{ marginTop: 12 }}>
          <Text style={styles.sub}>Pulsa sobre la presiÃ³n recomendada para editarla</Text>
          <View style={styles.carCanvas} onLayout={(e) => setCanvas({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
            <Image source={require('../../assets/car_top.png')} resizeMode="contain" style={styles.carImage} />
            <TouchableOpacity style={[styles.recBadge, { top: xy('FL').y - 44, left: xy('FL').x - 60 }]} onPress={() => setEditingFront(true)}>
              {editingFront ? (
                <TextInput style={styles.editInputSmall} keyboardType="numeric" autoFocus value={recFront} onChangeText={setRecFront} onSubmitEditing={commitFront} onBlur={commitFront} />
              ) : (<Text style={styles.recTextStrong}>Recomendado: {Number(recFront || '2.3').toFixed(1)} bar</Text>)}
            </TouchableOpacity>
            <TouchableOpacity style={[styles.recBadge, { top: xy('FR').y - 44, left: xy('FR').x - 60 }]} onPress={() => setEditingFront(true)}>
              {editingFront ? (
                <TextInput style={styles.editInputSmall} keyboardType="numeric" autoFocus value={recFront} onChangeText={setRecFront} onSubmitEditing={commitFront} onBlur={commitFront} />
              ) : (<Text style={styles.recTextStrong}>Recomendado: {Number(recFront || '2.3').toFixed(1)} bar</Text>)}
            </TouchableOpacity>
            <TouchableOpacity style={[styles.recBadge, { top: xy('RL').y - 44, left: xy('RL').x - 60 }]} onPress={() => setEditingRear(true)}>
              {editingRear ? (
                <TextInput style={styles.editInputSmall} keyboardType="numeric" autoFocus value={recRear} onChangeText={setRecRear} onSubmitEditing={commitRear} onBlur={commitRear} />
              ) : (<Text style={styles.recTextStrong}>Recomendado: {Number(recRear || '2.1').toFixed(1)} bar</Text>)}
            </TouchableOpacity>
            <TouchableOpacity style={[styles.recBadge, { top: xy('RR').y - 44, left: xy('RR').x - 60 }]} onPress={() => setEditingRear(true)}>
              {editingRear ? (
                <TextInput style={styles.editInputSmall} keyboardType="numeric" autoFocus value={recRear} onChangeText={setRecRear} onSubmitEditing={commitRear} onBlur={commitRear} />
              ) : (<Text style={styles.recTextStrong}>Recomendado: {Number(recRear || '2.1').toFixed(1)} bar</Text>)}
            </TouchableOpacity>
            {(['FL','FR','RL','RR'] as const).map((w) => {
              const p = xy(w);
              return (<TouchableOpacity key={w} style={[styles.wheelHotspot, { top: p.y - 14, left: p.x - 14 }]} onPress={() => setEditingWheel(w)} />);
            })}
            {editingWheel ? (
              <View style={[styles.measureBadge, { top: (editingWheel === 'FL' || editingWheel === 'FR') ? xy(editingWheel).y - 46 : xy(editingWheel).y + 12, left: xy(editingWheel).x - 50 }]}>
                <Text style={styles.recText}>Medido</Text>
                <TextInput
                  style={[styles.editInputSmall, { marginLeft: 6 }]}
                  keyboardType="numeric"
                  autoFocus
                  value={measured[editingWheel]}
                  onChangeText={(t) => setMeasured((m) => ({ ...m, [editingWheel!]: t }))}
                  onSubmitEditing={() => setEditingWheel(null)}
                  onBlur={() => setEditingWheel(null)}
                  placeholder={editingWheel === 'FL' || editingWheel === 'FR' ? recFront : recRear}
                  placeholderTextColor="#6B7280"
                />
              </View>
            ) : null}
          </View>
          <View style={{ flexDirection: 'row', marginTop: 12 }}>
            <TouchableOpacity
              accessibilityRole='button'
              onPress={async () => {
                const hasAny = !!(measured.FL || measured.FR || measured.RL || measured.RR);
                if (!hasAny) return;
                const rf = Number(recFront);
                const rr = Number(recRear);
                const defF = isFinite(rf) ? rf : 2.3;
                const defR = isFinite(rr) ? rr : 2.1;
                const log: TirePressureLog = {
                  id: uuid(),
                  vehicleId,
                  date: new Date().toISOString(),
                  fl: measured.FL ? Number(measured.FL) : defF,
                  fr: measured.FR ? Number(measured.FR) : defF,
                  rl: measured.RL ? Number(measured.RL) : defR,
                  rr: measured.RR ? Number(measured.RR) : defR,
                };
                try { await repo.addTirePressureLog(log); } catch {}
                setMeasured({ FL: '', FR: '', RL: '', RR: '' });
              }}
              style={[styles.backBtn, { backgroundColor: '#10B98122', borderColor: '#10B98155', marginRight: 12 }]}
            >
              <Text style={[styles.backText, { color: '#A7F3D0' }]}>Guardar registro</Text>
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityRole='button'
              onPress={() => navigation.navigate('TirePressureHistory', { vehicleId })}
              style={[styles.backBtn, { backgroundColor: '#111827' }]}
            >
              <Text style={styles.backText}>Consultar histÃ³rico</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity onPress={() => setSub(null)} style={[styles.backBtn, { alignSelf: 'flex-start', marginTop: 12 }]}>
            <Text style={styles.backText}>AtrÃ¡s</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return <Text style={styles.selHint}>PrÃ³ximamente: {sub}</Text>;
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>AtrÃ¡s</Text>
        </TouchableOpacity>
        <Text style={styles.header}>{category}</Text>
        {category.toLowerCase().includes('neumatic') ? renderNeumaticos() : (
          <Text style={styles.selHint}>Selecciona una opciÃ³n (pendiente de implementar)</Text>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  scrollContent: { paddingBottom: 24 },
  header: { color: '#E5E7EB', fontSize: 16, fontWeight: '700', marginBottom: 8 },
  sub: { color: '#9CA3AF', marginTop: 4 },
  itemRow: { paddingVertical: 12, borderBottomColor: '#1F2937', borderBottomWidth: 1 },
  itemText: { color: '#E5E7EB', fontSize: 15 },
  selHint: { color: '#9CA3AF', marginTop: 8 },
  backBtn: { alignSelf: 'flex-start', backgroundColor: '#0B1020', borderColor: '#1F2937', borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, marginBottom: 8 },
  backText: { color: '#E5E7EB' },
  carCanvas: { marginTop: 12, height: 240, width: '100%', maxWidth: 360, alignSelf: 'center', borderColor: '#1F2937', borderWidth: 1, borderRadius: 12, position: 'relative', backgroundColor: '#0B1020' },
  carImage: { position: 'absolute', top: 8, left: 8, right: 8, bottom: 8, opacity: 0.98 },
  recBadge: { position: 'absolute', paddingHorizontal: 8, paddingVertical: 4, backgroundColor: '#111827', borderColor: '#1F2937', borderWidth: 1, borderRadius: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84, elevation: 3 },
  recText: { color: '#9CA3AF' },
  recTextStrong: { color: '#E5E7EB', fontWeight: '600' },
  editInputSmall: { minWidth: 64, backgroundColor: '#0B1020', color: '#E5E7EB', paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: '#374151', borderRadius: 6 },
  wheelHotspot: { position: 'absolute', width: 30, height: 30, borderRadius: 15, backgroundColor: '#2563EB33', borderColor: '#60A5FA', borderWidth: 2 },
  measureBadge: { position: 'absolute', flexDirection: 'row', alignItems: 'center', backgroundColor: '#111827', borderColor: '#1F2937', borderWidth: 1, paddingHorizontal: 8, paddingVertical: 6, borderRadius: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84, elevation: 3 },
  wheelHotspotWarn: { backgroundColor: '#DC262633', borderColor: '#F87171' },
});
