import type { FuelType, MaintenanceType } from '../../models';

export interface MaintenanceGuideItem {
  type: MaintenanceType;
  intervalKm?: number;
  intervalMonths?: number;
  notes?: string;
  label?: string; // Nombre mostrado; por defecto, capitalizar tipo
  disabled?: boolean; // Si true, oculta este ítem desde la plantilla base
  
  reliability?: 'default' | 'verified';
  userVerified?: boolean; // Marcado por el usuario como contrastado localmente
}

export interface MaintenanceGuide {
  source: 'local' | 'carmd';
  items: MaintenanceGuideItem[];
  normalized?: { make?: string; model?: string; year?: number; fuelType?: FuelType };
}

export interface ProviderInput {
  make: string;
  model?: string;
  year: number;
  fuelType?: FuelType;
  vin?: string;
}

export interface MaintenanceGuideProvider {
  getGuide(input: ProviderInput): Promise<MaintenanceGuide>;
}
