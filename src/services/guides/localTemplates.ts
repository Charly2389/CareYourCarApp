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
    let withCommunity = filtered.map((it) => {
      const ov = community[it.type];
      const mergedItem: MaintenanceGuideItem = {
        ...it,
        intervalKm: ov?.intervalKm ?? it.intervalKm,
        intervalMonths: ov?.intervalMonths ?? it.intervalMonths,
      };
      // reliability: verified if admin or community verified
      mergedItem.reliability = ov && (ov.verified || ov.source === 'admin') ? 'verified' : 'default';
      return mergedItem;
    });

    // Tesla Model Y (2020-2024) specific plan
    const isTeslaY = (normalized.make || '').toLowerCase() === 'tesla'
      && (normalized.model || '').toLowerCase() === 'model y'
      && typeof normalized.year === 'number'
      && normalized.year >= 2020 && normalized.year <= 2024;
    if (isTeslaY) {
      withCommunity = [
        {
          type: 'frenos',
          intervalMonths: 48,
          notes:
            'Revisión del estado del líquido de frenos cada 4 años (cambiar si es necesario). *El uso intensivo de los frenos puede requerir comprobaciones y cambios más frecuentes.',
          reliability: 'verified',
        },
        {
          type: 'filtro_habitaculo',
          intervalMonths: 24,
          reliability: 'verified',
        },
        {
          type: 'otros',
          label: 'Sustitución de los filtros HEPA (2) y los filtros de carbono (2)',
          intervalMonths: 36,
          reliability: 'verified',
        },
        {
          type: 'otros',
          label: 'Sustitución de la escobilla del limpiaparabrisas',
          intervalMonths: 12,
          reliability: 'verified',
        },
        {
          type: 'otros',
          label: 'Limpieza y lubricación de las pinzas de freno',
          intervalMonths: 12,
          intervalKm: 20000,
          notes:
            'Si circulas en zonas con sal en carretera durante el invierno, realizar cada año o cada 20.000 km (lo que ocurra primero).',
          reliability: 'verified',
        },
        {
          type: 'neumaticos',
          intervalKm: 10000,
          notes:
            'Rotación cada 10.000 km o si la diferencia de la banda de rodadura es ≥ 1,5 mm (lo que ocurra primero).',
          reliability: 'verified',
        },
      ];
    }

    return { source: 'local', items: withCommunity, normalized };
  }
}
