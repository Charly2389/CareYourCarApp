import type { MaintenanceGuideProvider, ProviderInput, MaintenanceGuide } from './types';
import { LocalTemplatesProvider } from './localTemplates';
import { CarMDScheduleProvider } from './carmd';

let currentProvider: MaintenanceGuideProvider = new LocalTemplatesProvider();

export function useLocalGuides(): void {
  currentProvider = new LocalTemplatesProvider();
}

export function useCarMD(apiKey: string, partnerToken: string): void {
  currentProvider = new CarMDScheduleProvider(apiKey, partnerToken);
}

export async function getMaintenanceGuide(input: ProviderInput): Promise<MaintenanceGuide> {
  return currentProvider.getGuide(input);
}

export * from './types';

