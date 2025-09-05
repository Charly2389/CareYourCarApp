import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function MaintenancePlanScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Plan de mantenimiento</Text>
      <Text style={styles.subtitle}>Esta sección estará disponible próximamente.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, alignItems: 'center', justifyContent: 'center' },
  title: { color: '#E5E7EB', fontSize: 18, fontWeight: '700' },
  subtitle: { color: '#9CA3AF', marginTop: 8 },
});
