import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';

type Props = NativeStackScreenProps<RootStackParamList, 'AddMaintenance'>;

type Leaf = { label: string };
type Node = { label: string; children?: Leaf[] };

const MENU: Node[] = [
  { label: 'Neum�ticos', children: [
    { label: 'Comprobaci�n de presi�n' },
    { label: 'Comprobaci�n de neum�ticos' },
    { label: 'Cruce de neum�ticos' },
    { label: 'Sustituci�n de neum�ticos' },
  ]},
  { label: 'Filtros' },
  { label: 'Aceite' },
  { label: 'Frenos' },
  { label: 'L�quidos' },
  { label: 'Bater�a' },
  { label: 'Correa/Cadena de distribuci�n' },
  { label: 'Suspensi�n' },
  { label: 'Otros' },
];

