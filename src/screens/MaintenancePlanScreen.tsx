import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, FlatList, TextInput, Alert, Platform } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';
import { repo } from '../repository/Repo';
import type { Vehicle, MaintenanceType } from '../models';
import { getMaintenanceGuide, MaintenanceGuideItem } from '../services/guides';
import { loadCustomPlan, saveCustomPlan } from '../services/guides/store';
import { submitUserEdit, checkAndApplyConsensus } from '../services/guides/community';

import TickIcon from '../components/TickIcon';

type Props = NativeStackScreenProps<RootStackParamList, 'MaintenancePlan'>;

const typeOptions: MaintenanceType[] = ['aceite','neumaticos','filtro_aire','filtro_habitaculo','correa_distribucion','frenos','bateria','itv','otros'];

export default function MaintenancePlanScreen({ navigation, route }: Props) {
  const { vehicleId } = route.params;
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [baseItems, setBaseItems] = useState<MaintenanceGuideItem[]>([]);
  const [items, setItems] = useState<MaintenanceGuideItem[]>([]);
    const [draft, setDraft] = useState<MaintenanceGuideItem[]>([]);
  const [editing, setEditing] = useState(false);
  
  
  const [legendTip, setLegendTip] = useState<'verified' | 'default' | 'custom' | null>(null);

function computeItvIntervalMonths(vehicleYear: number): number | undefined {
  const nowYear = new Date().getFullYear();
  const age = Math.max(0, nowYear - vehicleYear);
  if (age < 4) return undefined;
  if (age < 10) return 24;
  return 12;
}
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const v = await repo.getVehicle(vehicleId);
        if (!mounted) return;
        if (!v) {
          setError('Veh?culo no encontrado');
          setLoading(false);
          return;
        }
        setVehicle(v);
        const guide = await getMaintenanceGuide({
          make: v.make,
          model: v.model,
          year: v.year,
          fuelType: v.fuelType,
          vin: v.vin,
        });
        if (!mounted) return;
        setBaseItems(guide.items);
        const custom = await loadCustomPlan(vehicleId);
        let merged: MaintenanceGuideItem[] = guide.items;
        if (custom) {
          merged = merged.filter((it) => !custom.find((c) => c.type === it.type && c.disabled));
          merged = merged.map((it) => {
            const ov = custom.find((c) => c.type === it.type && !c.disabled);
            return ov ? { ...it, intervalKm: ov.intervalKm ?? it.intervalKm, intervalMonths: ov.intervalMonths ?? it.intervalMonths, label: ov.label ?? it.label, userVerified: (ov.userVerified ?? (it as any).userVerified) } : it;
          });
          for (const ov of custom) {
            if (ov.disabled) continue;
            const exists = merged.find((m) => m.type === ov.type && (ov.label ? (m.label || m.type) === ov.label : false));
            if (!exists && (ov.label || ov.intervalKm || ov.intervalMonths || (ov as any).userVerified !== undefined)) merged.push(ov);
          }
        }
        // Ajuste ITV Espa?a seg?n antig?edad\n        merged = merged.map((it) => it.type === 'itv' ? { ...it, intervalMonths: computeItvIntervalMonths(v.firstRegistrationYear ?? v.year) } : it);\n        setItems(merged);
      } catch (e: any) {
        setError(e?.message || 'No se pudieron cargar las sugerencias');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [vehicleId]);

  useEffect(() => {
    (async () => {
      if (!vehicle || items.length === 0) return;
      for (const it of items) {
        await checkAndApplyConsensus({ make: vehicle.make, model: vehicle.model, year: vehicle.year, type: it.type, field: 'intervalKm' });
        await checkAndApplyConsensus({ make: vehicle.make, model: vehicle.model, year: vehicle.year, type: it.type, field: 'intervalMonths' });
      }
    })();
  }, [vehicle, items]);

  const onEdit = () => {
    setDraft(items.map((i) => ({ ...i })));
    setEditing(true);
  };

  const onCancel = () => {
    setEditing(false);
    setDraft([]);
  };

  const onSave = async () => {
    const payload: MaintenanceGuideItem[] = draft.map((d) => ({ type: d.type, intervalKm: d.intervalKm, intervalMonths: d.intervalMonths, label: d.label, userVerified: (d as any).userVerified }));
    for (const base of baseItems) {
      const stillThere = draft.find((d) => d.type === base.type);
      if (!stillThere) payload.push({ type: base.type, disabled: true } as MaintenanceGuideItem);
    }
    await saveCustomPlan(vehicleId, payload);
    setItems(draft.map((d) => ({ ...d })));
    setEditing(false);
    if (vehicle) {
      for (let i = 0; i < draft.length; i++) {
        const before = items[i];
        const after = draft[i];
        if (!before || !after || before.type !== after.type) continue;
        if (before.intervalKm !== after.intervalKm) {
          await submitUserEdit({ make: vehicle.make, model: vehicle.model, year: vehicle.year, type: after.type, field: 'intervalKm' }, after.intervalKm);
          await checkAndApplyConsensus({ make: vehicle.make, model: vehicle.model, year: vehicle.year, type: after.type, field: 'intervalKm' });
        }
        if (before.intervalMonths !== after.intervalMonths) {
          await submitUserEdit({ make: vehicle.make, model: vehicle.model, year: vehicle.year, type: after.type, field: 'intervalMonths' }, after.intervalMonths);
          await checkAndApplyConsensus({ make: vehicle.make, model: vehicle.model, year: vehicle.year, type: after.type, field: 'intervalMonths' });
        }
      }
    }
  };

  const updateDraft = (index: number, patch: Partial<MaintenanceGuideItem>) => {
    setDraft((prev) => prev.map((d, i) => (i === index ? { ...d, ...patch } : d)));
  };

  const addTask = () => {
    setDraft((prev) => [{ type: 'otros', label: '', intervalKm: undefined, intervalMonths: undefined, userVerified: false } as any, ...prev]);
  };

  const removeTask = (index: number) => {
    const perform = () => setDraft((prev) => prev.filter((_, i) => i !== index));
    if (Platform.OS === 'web') {
      // @ts-ignore
      const ok = (typeof window !== 'undefined' && window.confirm) ? window.confirm('?Seguro que deseas eliminar esta tarea del plan?') : true;
      if (ok) perform();
    } else {
      Alert.alert(
        'Eliminar tarea',
        '?Seguro que deseas eliminar esta tarea del plan?',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Eliminar', style: 'destructive', onPress: perform },
        ]
      );
    }
  };

  // Determine if an item is customized by the user (added or modified vs base template)
  const isCustom = (it: MaintenanceGuideItem): boolean => {
    // Some templates include multiple items of the same type (e.g., "otros") but with different labels.
    // Prefer matching by both type and label to avoid false positives.
    const candidates = baseItems.filter((b) => b.type === it.type);
    if (candidates.length === 0) return true; // user-added (no base items for this type)
    const norm = (s?: string) => (s || '').trim().toLowerCase();
    const base = candidates.find((b) => norm(b.label) === norm(it.label)) || candidates[0];
    const sameKm = (base.intervalKm ?? undefined) === (it.intervalKm ?? undefined);
    const sameMonths = (base.intervalMonths ?? undefined) === (it.intervalMonths ?? undefined);
    const sameLabel = norm(base.label) === norm(it.label);
    return !(sameKm && sameMonths && sameLabel);
  };

    const getTickStyle = (it: MaintenanceGuideItem) => {
    if ((it as any).userVerified) return { color: '#10B981', tick: styles.tickGreen, text: styles.tickGreenText, label: 'contrastado por ti' } as const;
    if (it.reliability === 'verified') return { color: '#10B981', tick: styles.tickGreen, text: styles.tickGreenText, label: 'verificado por la comunidad' } as const;
    if (isCustom(it)) return { color: '#FDE047', tick: styles.tickYellow, text: styles.tickYellowText, label: 'mantenimiento personalizado' } as const;
    return { color: '#F59E0B', tick: styles.tickOrange, text: styles.tickOrangeText, label: 'mantenimiento por defecto' } as const;
  };

  if (loading) {
    return (
      <View style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator />
        <Text style={{ color: '#9CA3AF', marginTop: 8 }}>Cargando plan de mantenimiento?</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={{ color: '#FCA5A5' }}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>{vehicle?.make} {vehicle?.model} ? {vehicle?.year}</Text>
      <Text style={styles.sub}>Sugerencias basadas en plantillas locales{vehicle?.vin ? ' y VIN' : ''}.</Text>

      {/* Leyenda de ticks para clarificar el significado de cada color */}
      <View style={styles.legend}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Tick verde verificado"
          accessibilityHint="Muestra explicaci?n del tick verde"
          onPress={() => setLegendTip((v) => (v === 'verified' ? null : 'verified'))}
          style={styles.legendItem}
        >
          <TickIcon size={18} color="#10B981" />
          <Text style={[styles.legendText, styles.tickGreenText]}>Verificado</Text>
          {legendTip === 'verified' ? (
            <View style={[styles.tooltip, Platform.OS === 'android' ? { elevation: 2 } : null]}>
              <Text style={styles.tooltipText}>
                Tick verde: mantenimiento contrastado con el libro de mantenimiento oficial del veh?culo o verificado por la comunidad de CareYourCar (m?s de 3 usuarios con esta marca/modelo/versi?n han coincidido en los kms/tiempos).
              </Text>
              <View style={styles.tooltipArrow} />
            </View>
          ) : null}
        </TouchableOpacity>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Tick naranja por defecto"
          accessibilityHint="Muestra explicaci?n del tick naranja"
          onPress={() => setLegendTip((v) => (v === 'default' ? null : 'default'))}
          style={styles.legendItem}
        >
          <TickIcon size={18} color="#F59E0B" />
          <Text style={[styles.legendText, styles.tickOrangeText]}>Por defecto</Text>
          {legendTip === 'default' ? (
            <View style={[styles.tooltip, Platform.OS === 'android' ? { elevation: 2 } : null]}>
              <Text style={styles.tooltipText}>
                Tick naranja: CareYourCarApp tiene predefinidos una serie de mantenimientos gen?ricos. Cada marca/modelo y versi?n es diferente, por eso te recomendamos que consultes el libro de mantenimiento de tu veh?culo y adaptes los kilometrajes/tiempos a lo recomendado por el fabricante.
              </Text>
              <View style={styles.tooltipArrow} />
            </View>
          ) : null}
        </TouchableOpacity>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Tick amarillo personalizado"
          accessibilityHint="Muestra explicaci?n del tick amarillo"
          onPress={() => setLegendTip((v) => (v === 'custom' ? null : 'custom'))}
          style={styles.legendItem}
        >
          <TickIcon size={18} color="#FDE047" />
          <Text style={[styles.legendText, styles.tickYellowText]}>Personalizado</Text>
          {legendTip === 'custom' ? (
            <View style={[styles.tooltip, Platform.OS === 'android' ? { elevation: 2 } : null]}>
              <Text style={styles.tooltipText}>
                Tick amarillo: mantenimiento modificado o creado por ti, pero no contrastado con el libro de mantenimiento oficial del veh?culo.
              </Text>
              <View style={styles.tooltipArrow} />
            </View>
          ) : null}
        </TouchableOpacity>
      </View>
      <View style={styles.warning}>
        <Text style={styles.warningTitle}>Aviso</Text>
        <Text style={styles.warningText}>Este plan es orientativo. Consulta el Libro de mantenimiento del fabricante y ajusta los valores si es necesario.</Text>
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 8 }}>
        {!editing ? (
          <TouchableOpacity style={styles.btnSecondary} onPress={onEdit}>
            <Text style={styles.btnSecondaryText}>Editar</Text>
          </TouchableOpacity>
        ) : (
          <>
            <TouchableOpacity style={[styles.btnSecondary, { marginRight: 8 }]} onPress={addTask}>
              <Text style={styles.btnSecondaryText}>{'A\u00f1adir Mantenimiento'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btnSecondary, { marginRight: 8 }]} onPress={onCancel}>
              <Text style={styles.btnSecondaryText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.btn} onPress={onSave}>
              <Text style={styles.btnText}>Guardar cambios</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      <FlatList
        data={editing ? draft : items}
        keyExtractor={(_, idx) => String(idx)}
        renderItem={({ item, index }) => (
          <View style={styles.card}>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={styles.statusCol}>
                {(() => { const s = getTickStyle(item); return (
                  <>
                    <TickIcon size={20} color={s.color} />
                    <Text style={[styles.tickLabel, s.text]}>{s.label}</Text>
                  </>
                ); })()}
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={styles.title}>{labelFor(item)}</Text>
                  {editing ? (
                    <TouchableOpacity onPress={() => removeTask(index)}>
                      <Text style={{ color: '#FCA5A5', fontWeight: '600' }}>Eliminar</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
                {!editing ? (
                  <>
                    <Text style={styles.meta}>{fmtInterval(item)}</Text>
                    {item.notes ? <Text style={styles.notes}>{item.notes}</Text> : null}
                    <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
                      <TouchableOpacity style={styles.btn} onPress={() => navigation.navigate('AddMaintenance', { vehicleId, presetType: item.type, presetLabel: item.label })}>
                        <Text style={styles.btnText}>Registrar ahora</Text>
                      </TouchableOpacity>
                    </View>
                  </>
                ) : (
                  <>
                    <Text style={styles.inputLabel}>Nombre</Text>
                    <TextInput
                      style={styles.input}
                      value={item.label ?? (item.type.charAt(0).toUpperCase() + item.type.slice(1))}
                      onChangeText={(t) => updateDraft(index, { label: t })}
                      placeholder="Ej: Revisi?n presi?n neum?ticos"
                      placeholderTextColor="#6B7280"
                    />
                    <View style={styles.segmentWrap}>
                      {typeOptions.map((t) => (
                        <TouchableOpacity key={t} style={[styles.segmentItem, item.type === t && styles.segmentItemActive]} onPress={() => updateDraft(index, { type: t })}>
                          <Text style={[styles.segmentText, item.type === t && styles.segmentTextActive]}>{t}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    <View style={{ flexDirection: 'row', gap: 12 }}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.inputLabel}>Cada (km)</Text>
                        <TextInput style={styles.input} keyboardType="numeric" value={item.intervalKm ? String(item.intervalKm) : ''} onChangeText={(t) => updateDraft(index, { intervalKm: t ? Number(t) : undefined })} placeholder="15000" placeholderTextColor="#6B7280" />
                      </View>
                      <View style={{ width: 120 }}>
                        <Text style={styles.inputLabel}>Cada (a?os)</Text>
                        <TextInput style={styles.input} keyboardType="numeric" value={item.intervalMonths ? String(Math.round(item.intervalMonths / 12)) : ''} onChangeText={(t) => updateDraft(index, { intervalMonths: t ? Number(t) * 12 : undefined })} placeholder="1" placeholderTextColor="#6B7280" />
                      </View>
                    </View>
                    <View style={styles.verifyRow}>
                      <TouchableOpacity
                        accessibilityRole='checkbox'
                        accessibilityLabel='Mantenimiento contrastado con Libro oficial'
                        accessibilityState={{ checked: !!(item as any).userVerified }}
                        onPress={() => updateDraft(index, { userVerified: !(item as any).userVerified })}
                        style={[styles.checkbox, (item as any).userVerified && styles.checkboxChecked]}
                      >
                        {(item as any).userVerified ? <TickIcon size={14} color='#10B981' /> : null}
                      </TouchableOpacity>
                      <Text style={styles.verifyLabel}>Mantenimiento contrastado con Libro oficial</Text>
                    </View>
                    {item.notes ? <Text style={styles.notes}>{item.notes}</Text> : null}
                  </>
                )}
              </View>
            </View>
          </View>
        )}
        contentContainerStyle={{ paddingBottom: 24 }}
      />
    </View>
  );
}

function fmtInterval(it: MaintenanceGuideItem): string {
  const parts: string[] = [];
  if (it.intervalKm) parts.push(`${it.intervalKm.toLocaleString()} km`);
  if (it.intervalMonths) parts.push(`${it.intervalMonths} meses`);
  if (parts.length === 0) return it.type === 'itv' ? 'Exento hasta los 4 años desde primera matriculación' : 'Revisar periódicamente';
  return `Cada ${parts.join(' o ')}`;
}

function labelFor(it: MaintenanceGuideItem) {
  return it.label && it.label.trim() ? it.label : it.type.charAt(0).toUpperCase() + it.type.slice(1);
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  header: { color: '#E5E7EB', fontSize: 16, fontWeight: '700', marginBottom: 4 },
  sub: { color: '#9CA3AF', marginBottom: 12 },
  legend: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 12 , position: 'relative', zIndex: 50 },
  legendItem: { flexDirection: 'row', alignItems: 'center', position: 'relative' , zIndex: 60 },
  legendText: { fontSize: 12, marginLeft: 6 },
  tooltip: { position: 'absolute', top: '100%', left: 0, marginTop: 6, backgroundColor: '#111827', borderColor: '#374151', borderWidth: 1, borderRadius: 8, padding: 10, maxWidth: 320, zIndex: 9999 },
  tooltipText: { color: '#E5E7EB', fontSize: 12, lineHeight: 16 },
  tooltipArrow: { position: 'absolute', top: -5, left: 12, width: 10, height: 10, backgroundColor: '#111827', borderLeftColor: '#374151', borderTopColor: '#374151', borderLeftWidth: 1, borderTopWidth: 1, transform: [{ rotate: '45deg' }] },
  verifyRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  checkbox: { width: 18, height: 18, borderWidth: 1, borderColor: '#374151', borderRadius: 4, backgroundColor: '#0B1020', alignItems: 'center', justifyContent: 'center' },
  checkboxChecked: { borderColor: '#10B981', backgroundColor: '#0B1020' },
  verifyLabel: { color: '#E5E7EB', marginLeft: 8, fontSize: 12 },
  warning: { backgroundColor: '#1F2937', borderColor: '#374151', borderWidth: 1, padding: 12, borderRadius: 10, marginBottom: 12 },
  warningTitle: { color: '#FBBF24', fontWeight: '700' },
  warningText: { color: '#E5E7EB', marginTop: 4 },
  card: { backgroundColor: '#111827', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#1F2937', marginBottom: 12 },
  title: { color: '#E5E7EB', fontSize: 16, fontWeight: '600' },
  meta: { color: '#9CA3AF', marginTop: 4 },
  notes: { color: '#9CA3AF', marginTop: 6, fontStyle: 'italic' },
  btn: { backgroundColor: '#2563EB', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, marginTop: 10 },
  btnText: { color: '#fff', fontWeight: '600' },
  btnSecondary: { backgroundColor: '#0B1020', borderColor: '#1F2937', borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  btnSecondaryText: { color: '#E5E7EB', fontWeight: '600' },
  inputLabel: { color: '#9CA3AF', marginTop: 6 },
  input: { backgroundColor: '#0B1020', borderRadius: 8, borderWidth: 1, borderColor: '#1F2937', paddingHorizontal: 10, paddingVertical: 8, color: '#E5E7EB', marginTop: 6 },
  segmentWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  segmentItem: { paddingHorizontal: 10, paddingVertical: 8, backgroundColor: '#0B1020', borderRadius: 8, borderWidth: 1, borderColor: '#1F2937' },
  segmentItemActive: { backgroundColor: '#1F2937', borderColor: '#2563EB' },
  segmentText: { color: '#9CA3AF', fontSize: 12 },
  segmentTextActive: { color: '#E5E7EB', fontWeight: '600' },
  statusCol: { width: 120, alignItems: 'center', justifyContent: 'center' },
  tick: { fontSize: 20, fontWeight: '900' },
  tickGreen: { color: '#10B981' },
  tickOrange: { color: '#F59E0B' },
  tickYellow: { color: '#FDE047' },
  tickLabel: { marginTop: 4, fontSize: 10, textAlign: 'center' },
  tickGreenText: { color: '#A7F3D0' },
  tickOrangeText: { color: '#FDE68A' },
  tickYellowText: { color: '#FEF08A' },
});



















