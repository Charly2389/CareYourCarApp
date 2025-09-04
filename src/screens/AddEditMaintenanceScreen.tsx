import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';

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
  { label: 'Filtros' },
  { label: 'Aceite' },
  { label: 'Frenos' },
  { label: 'Liquidos' },
  { label: 'Bateria' },
  { label: 'Correa/Cadena distribucion' },
  { label: 'Suspension' },
  { label: 'Otros' },
];

export default function AddEditMaintenanceScreen({ route, navigation }: Props) {
  const { vehicleId } = route.params;
  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.header}>Añadir mantenimiento</Text>
        <Text style={styles.sub}>Elige una categoría</Text>
        <View style={{ marginTop: 12 }}>
          {MENU.map((item) => (
            <View key={item.label} style={styles.group}>
              <TouchableOpacity style={styles.row} onPress={() => navigation.navigate('MaintenanceCategory', { vehicleId, category: item.label })}>
                <Text style={styles.rowText}>{item.label}</Text>
                <Text style={styles.rowText}>{'>'}</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
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
});
