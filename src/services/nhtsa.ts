export interface DecodedVin {
  make?: string;
  model?: string;
  year?: number;
  engine?: string;
  fuelType?: 'gasolina' | 'diesel' | 'hibrido' | 'electrico';
}

function mapFuelType(v?: string): DecodedVin['fuelType'] {
  const s = (v || '').toLowerCase();
  if (!s) return undefined;
  if (s.includes('diesel')) return 'diesel';
  if (s.includes('electric')) return 'electrico';
  if (s.includes('hybrid')) return 'hibrido';
  if (s.includes('gasoline') || s.includes('petrol') || s.includes('gas')) return 'gasolina';
  return undefined;
}

export async function decodeVin(vin: string): Promise<DecodedVin | undefined> {
  try {
    const url = `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVin/${encodeURIComponent(vin)}?format=json`;
    const res = await fetch(url);
    if (!res.ok) return undefined;
    const data = await res.json();
    const results = (data?.Results ?? []) as any[];
    const get = (name: string) => results.find((r) => (r.Variable || '').toLowerCase() === name.toLowerCase())?.Value;
    const out: DecodedVin = {
      make: get('Make') || undefined,
      model: get('Model') || undefined,
      year: Number(get('Model Year')) || undefined,
      engine: get('Engine Model') || get('Engine Configuration') || get('Engine Displacement (L)') || undefined,
      fuelType: mapFuelType(get('Fuel Type - Primary') || get('Fuel Type Primary')),
    };
    return out;
  } catch {
    return undefined;
  }
}

