import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import VehicleListScreen from './src/screens/VehicleListScreen';
import AddEditVehicleScreen from './src/screens/AddEditVehicleScreen';
import VehicleDetailScreen from './src/screens/VehicleDetailScreen';
import AddEditMaintenanceScreen from './src/screens/AddEditMaintenanceScreen';

export type RootStackParamList = {
  Vehicles: undefined;
  AddVehicle: undefined;
  VehicleDetail: { vehicleId: string };
  AddMaintenance: { vehicleId: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <StatusBar style="light" />
        <Stack.Navigator
          screenOptions={{
            headerStyle: { backgroundColor: '#0F172A' },
            headerTintColor: '#fff',
            contentStyle: { backgroundColor: '#0B1020' },
          }}
        >
          <Stack.Screen name="Vehicles" component={VehicleListScreen} options={{ title: 'Mis Coches' }} />
          <Stack.Screen name="AddVehicle" component={AddEditVehicleScreen} options={{ title: 'Añadir/Editar Coche' }} />
          <Stack.Screen name="VehicleDetail" component={VehicleDetailScreen} options={{ title: 'Detalle del Coche' }} />
          <Stack.Screen name="AddMaintenance" component={AddEditMaintenanceScreen} options={{ title: 'Añadir Mantenimiento' }} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

