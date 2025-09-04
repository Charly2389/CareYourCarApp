import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Text, TouchableOpacity } from 'react-native';
import VehicleListScreen from './src/screens/VehicleListScreen';
import AddEditVehicleScreen from './src/screens/AddEditVehicleScreen';
import VehicleDetailScreen from './src/screens/VehicleDetailScreen';
import AddEditMaintenanceScreen from './src/screens/AddEditMaintenanceScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import { getOnboardingDone, getUserProfile } from './src/services/storage';
import MaintenancePlanScreen from './src/screens/MaintenancePlanScreen';
import type { MaintenanceType } from './src/models';
import Banner from './src/components/Banner';
import OptionsScreen from './src/screens/OptionsScreen';
import { checkKmReminderOnAppOpen } from './src/services/reminders/kmUpdate';
import UpdateMileageScreen from './src/screens/UpdateMileageScreen';

export type RootStackParamList = {
  Onboarding: undefined;
  Vehicles: undefined;
  AddVehicle: undefined;
  VehicleDetail: { vehicleId: string };
  AddMaintenance: { vehicleId: string; presetType?: MaintenanceType; presetLabel?: string };
  MaintenancePlan: { vehicleId: string };
  Options: undefined;
  UpdateMileage: { inboxId?: string; vehicleId?: string } | undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  const [loaded, setLoaded] = useState(false);
  const [onboarded, setOnboarded] = useState<boolean>(false);

  useEffect(() => {
    Promise.all([getOnboardingDone(), getUserProfile()]).then(([flag, profile]) => {
      setOnboarded(flag || !!profile);
      setLoaded(true);
    });
  }, []);

  useEffect(() => {
    checkKmReminderOnAppOpen();
  }, []);

  if (!loaded) return null;

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Banner />
        <StatusBar style="light" />
        <Stack.Navigator
          initialRouteName={onboarded ? 'Vehicles' : 'Onboarding'}
          screenOptions={{
            headerStyle: { backgroundColor: '#0F172A' },
            headerTintColor: '#fff',
            contentStyle: { backgroundColor: '#0B1020' },
          }}
        >
          <Stack.Screen name="Onboarding" component={OnboardingScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Vehicles" component={VehicleListScreen} options={({ navigation }) => ({
            title: 'Mis Coches',
            headerRight: () => (
              <TouchableOpacity onPress={() => navigation.navigate('Options')}>
                <Text style={{ color: '#60A5FA', fontWeight: '600' }}>Opciones</Text>
              </TouchableOpacity>
            ),
          })} />
          <Stack.Screen name="AddVehicle" component={AddEditVehicleScreen} options={{ title: 'Añadir/Editar Coche' }} />
          <Stack.Screen
            name="VehicleDetail"
            component={VehicleDetailScreen}
            options={({ navigation, route }) => ({
              title: 'Detalle del Coche',
              headerRight: () => (
                <TouchableOpacity onPress={() => navigation.navigate('MaintenancePlan', { vehicleId: (route as any).params.vehicleId })}>
                  <Text style={{ color: '#60A5FA', fontWeight: '600' }}>Plan de mantenimiento</Text>
                </TouchableOpacity>
              ),
            })}
          />
          <Stack.Screen name="AddMaintenance" component={AddEditMaintenanceScreen} options={{ title: 'Añadir Mantenimiento' }} />
          <Stack.Screen name="MaintenancePlan" component={MaintenancePlanScreen} options={{ title: 'Plan de mantenimiento' }} />
          <Stack.Screen name="Options" component={OptionsScreen} options={{ title: 'Opciones' }} />
          <Stack.Screen name="UpdateMileage" component={UpdateMileageScreen} options={{ title: 'Actualizar km' }} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

