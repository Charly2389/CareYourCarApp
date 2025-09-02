export type FuelType = 'gasolina' | 'diesel' | 'hibrido' | 'electrico';

export interface Vehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  plate?: string;
  vin?: string;
  mileage: number;
  fuelType: FuelType;
  // Local URI to a photo stored on device or cache
  photoUri?: string;
  createdAt: string; // ISO date
}

export type MaintenanceType =
  | 'aceite'
  | 'neumaticos'
  | 'filtro_aire'
  | 'filtro_habitaculo'
  | 'correa_distribucion'
  | 'frenos'
  | 'bateria'
  | 'itv'
  | 'otros';

export interface MaintenanceRecord {
  id: string;
  vehicleId: string;
  type: MaintenanceType;
  date: string; // ISO date
  mileageAtService: number;
  cost?: number;
  notes?: string;
  workshop?: string;
  nextDueDate?: string; // ISO date
  nextDueMileage?: number;
  createdAt: string; // ISO date
}

// Basic local user profile to avoid re-asking data
export interface UserProfile {
  name: string;
  email?: string;
  createdAt: string; // ISO date
}
