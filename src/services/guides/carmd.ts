import type { MaintenanceGuide, MaintenanceGuideProvider, ProviderInput } from './types';

export class CarMDScheduleProvider implements MaintenanceGuideProvider {
  constructor(private apiKey?: string, private partnerToken?: string) {}

  // Placeholder: wire actual CarMD API when credentials are available
  async getGuide(_input: ProviderInput): Promise<MaintenanceGuide> {
    throw new Error('CarMD provider no configurado. Añade API keys para activar.');
  }
}

