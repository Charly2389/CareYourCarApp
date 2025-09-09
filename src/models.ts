export type FuelType = 'gasolina' | 'diesel' | 'hibrido' | 'electrico';

export interface Vehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  // Año de primera matriculación (para normativa ITV)
  firstRegistrationYear?: number;
  plate?: string;
  vin?: string;
  mileage: number;
  fuelType: FuelType;
  // Recommended tyre pressures (bar)
  tirePressureFrontBar?: number;
  tirePressureRearBar?: number;
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

// Log of tyre pressure measurements per wheel (bar)
export interface TirePressureLog {
  id: string;
  vehicleId: string;
  date: string; // ISO date
  fl?: number; // Front Left
  fr?: number; // Front Right
  rl?: number; // Rear Left
  rr?: number; // Rear Right
}

// Basic local user profile to avoid re-asking data
export interface UserProfile {
  name: string;
  email?: string;
  createdAt: string; // ISO date
}

// Log of tyre wear measurements per wheel (mm of tread depth)
export interface TireWearLog {
  id: string;
  vehicleId: string;
  date: string; // ISO date
  fl?: number; // Front Left
  fr?: number; // Front Right
  rl?: number; // Rear Left
  rr?: number; // Rear Right
}
