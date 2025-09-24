import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';

type Props = NativeStackScreenProps<RootStackParamList, 'AddMaintenance'>;

type Leaf = { label: string };
type Node = { label: string; children?: Leaf[] };

const MENU: Node[] = [
  { label: 'Neumáticos', children: [
    { label: 'Comprobación de presión' },
    { label: 'Comprobación de neumáticos' },
    { label: 'Cruce de neumáticos' },
    { label: 'Sustitución de neumáticos' },
  ]},
  { label: 'Filtros' },
  { label: 'Aceite' },
  { label: 'Frenos' },
  { label: 'Líquidos' },
  { label: 'Batería' },
  { label: 'Correa/Cadena de distribución' },
  { label: 'Suspensión' },
  { label: 'Otros' },
];

