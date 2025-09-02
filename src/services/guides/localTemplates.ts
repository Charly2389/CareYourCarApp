import type { FuelType } from '../../models';
import { decodeVin } from '../nhtsa';
import type { MaintenanceGuide, MaintenanceGuideItem, MaintenanceGuideProvider, ProviderInput } from './types';
import { getCommunityOverrides } from './communityOverrides';

const generic: Record<string, MaintenanceGuideItem> = {
  aceite: { type: 'aceite', intervalKm: 15000, intervalMonths: 12, notes: 'Usa aceite recomendado por fabricante.' },
  filtro_aire: { type: 'filtro_aire', intervalKm: 30000, intervalMonths: 24 },
  filtro_habitaculo: { type: 'filtro_habitaculo', intervalKm: 20000, intervalMonths: 12 },
  frenos: { type: 'frenos', intervalMonths: 24, notes: 'Cambio de líquido de frenos cada 2 años.' },
  bateria: { type: 'bateria', intervalMonths: 48 },
  neumaticos: { type: 'neumaticos', intervalKm: 40000 },
  correa_distribucion: { type: 'correa_distribucion', intervalKm: 100000, intervalMonths: 96, notes: 'Solo si el motor lleva correa (no cadena).' },
  itv: { type: 'itv', intervalMonths: 12 },
};

const brandOverrides: Record<string, Partial<Record<keyof typeof generic, MaintenanceGuideItem>>> = {
  toyota: { aceite: { type: 'aceite', intervalKm: 10000, intervalMonths: 12 } },
  volkswagen: { aceite: { type: 'aceite', intervalKm: 15000, intervalMonths: 12 } },
  bmw: { aceite: { type: 'aceite', intervalKm: 15000, intervalMonths: 12 } },
  renault: { aceite: { type: 'aceite', intervalKm: 15000, intervalMonths: 12 } },
  seat: { aceite: { type: 'aceite', intervalKm: 15000, intervalMonths: 12 } },
};

function filterByFuel(items: MaintenanceGuideItem[], fuel?: FuelType): MaintenanceGuideItem[] {
  if (!fuel) return items;
  const f = fuel;
  return items.filter((it) => {
    if (f === 'electrico') {
      // Eléctricos: sin aceite, sin correa de distribución, sin filtro de aire de motor, sin batería 12V
      return !['aceite', 'correa_distribucion', 'filtro_aire', 'bateria'].includes(it.type);
    }
    return true;
  });
}

export class LocalTemplatesProvider implements MaintenanceGuideProvider {
  async getGuide(input: ProviderInput): Promise<MaintenanceGuide> {
    let normalized = { make: input.make, model: input.model, year: input.year, fuelType: input.fuelType };
    // If VIN provided, enrich with NHTSA data
    if (input.vin && input.vin.trim().length >= 11) {
      const dec = await decodeVin(input.vin.trim());
      if (dec) {
        normalized = {
          make: dec.make || normalized.make,
          model: dec.model || normalized.model,
          year: dec.year || normalized.year,
          fuelType: dec.fuelType || normalized.fuelType,
        } as typeof normalized;
      }
    }

    const makeKey = (normalized.make || '').toLowerCase();
    const base: MaintenanceGuideItem[] = Object.values(generic);
    const overrides = brandOverrides[makeKey];
    const merged = overrides
      ? base.map((it) => overrides[it.type as keyof typeof generic] || it)
      : base;

    const filtered = filterByFuel(merged, normalized.fuelType);

    // Apply community overrides for this make/model/year, if any
    const community = await getCommunityOverrides(normalized.make, normalized.model, normalized.year);
    const withCommunity = filtered.map((it) => {
      const ov = community[it.type];
      if (!ov) return it;
      return {
        ...it,
        intervalKm: ov.intervalKm ?? it.intervalKm,
        intervalMonths: ov.intervalMonths ?? it.intervalMonths,
      } as MaintenanceGuideItem;
    });

    return { source: 'local', items: withCommunity, normalized };
  }
}
