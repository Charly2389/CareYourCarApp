import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';
import { saveUserProfile, setOnboardingDone, getUserProfile } from '../services/storage';

type Props = NativeStackScreenProps<RootStackParamList, 'Onboarding'>;

export default function OnboardingScreen({ navigation }: Props) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getUserProfile().then((p) => {
      if (p) {
        setName(p.name);
        setEmail(p.email ?? '');
      }
      setLoading(false);
    });
  }, []);

  const onSave = async () => {
    const profile = { name: name.trim() || 'Usuario', email: email.trim() || undefined, createdAt: new Date().toISOString() };
    await saveUserProfile(profile);
    await setOnboardingDone(true);
    navigation.reset({ index: 0, routes: [{ name: 'Vehicles' }] });
  };

  if (loading) return null;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.select({ ios: 'padding', default: undefined })}>
      <View style={styles.container}>
        <Text style={styles.title}>Bienvenido a CareYourCar</Text>
        <Text style={styles.subtitle}>Guarda el mantenimiento de tus vehículos y recibe recordatorios.</Text>

        <Text style={styles.label}>Tu nombre</Text>
        <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Ej: Ana García" placeholderTextColor="#6B7280" />

        <Text style={styles.label}>Email (opcional)</Text>
        <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="ana@mail.com" placeholderTextColor="#6B7280" keyboardType="email-address" />

        <TouchableOpacity style={styles.button} onPress={onSave}>
          <Text style={styles.buttonText}>Guardar y continuar</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.reset({ index: 0, routes: [{ name: 'Vehicles' }] })}>
          <Text style={styles.skip}>Omitir por ahora</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, justifyContent: 'center' },
  title: { color: '#E5E7EB', fontSize: 24, fontWeight: '800', textAlign: 'center' },
  subtitle: { color: '#9CA3AF', textAlign: 'center', marginTop: 6, marginBottom: 18 },
  label: { color: '#9CA3AF', marginTop: 12 },
  input: {
    backgroundColor: '#111827',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#E5E7EB',
    marginTop: 6,
    borderColor: '#1F2937',
    borderWidth: 1,
  },
  button: { backgroundColor: '#2563EB', padding: 14, borderRadius: 12, marginTop: 24, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '600' },
  skip: { color: '#9CA3AF', textAlign: 'center', marginTop: 14 },
});

