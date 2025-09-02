import AsyncStorage from '@react-native-async-storage/async-storage';
import { repo } from '../../repository/Repo';
import { applyCommunityOverride } from './communityOverrides';
import { loadCustomPlan } from './store';
import { notify } from '../notify';

export type ConsensusField = 'intervalKm' | 'intervalMonths';

export interface ConsensusKey {
  make: string;
  model?: string;
  year: number;
  type: string; // maintenance type
  field: ConsensusField;
}

export interface ConsensusResult {
  value?: number;
  votes: number;
}

export interface ConsensusProvider {
  submitEdit(key: ConsensusKey, value: number | undefined): Promise<void>;
  fetchConsensus(key: ConsensusKey): Promise<ConsensusResult | undefined>;
}

// Local fallback consensus (device only). Useful to test flow; not multiusuario real.
class LocalConsensusProvider implements ConsensusProvider {
  private k(key: ConsensusKey) {
    const mk = key.make.toLowerCase();
    const md = (key.model || '').toLowerCase();
    return `cyc/consensus/${mk}/${md}/${key.year}/${key.type}/${key.field}`;
  }

  async submitEdit(key: ConsensusKey, value: number | undefined): Promise<void> {
    try {
      const k = this.k(key);
      const raw = await AsyncStorage.getItem(k);
      const map = raw ? (JSON.parse(raw) as Record<string, number>) : {};
      if (value === undefined) return; // don't count undefined
      const v = String(value);
      map[v] = (map[v] || 0) + 1;
      await AsyncStorage.setItem(k, JSON.stringify(map));
    } catch {}
  }

  async fetchConsensus(key: ConsensusKey): Promise<ConsensusResult | undefined> {
    try {
      const raw = await AsyncStorage.getItem(this.k(key));
      if (!raw) return undefined;
      const map = JSON.parse(raw) as Record<string, number>;
      let maxV = 0;
      let maxK: string | undefined;
      for (const [k, n] of Object.entries(map)) {
        if (n > maxV) {
          maxV = n;
          maxK = k;
        }
      }
      if (maxV >= 3 && maxK !== undefined) {
        return { value: Number(maxK), votes: maxV };
      }
      return { votes: maxV };
    } catch {
      return undefined;
    }
  }
}

let provider: ConsensusProvider = new LocalConsensusProvider();

export function setConsensusProvider(p: ConsensusProvider) {
  provider = p;
}

export { HttpConsensusProvider } from './remoteConsensus';

export async function submitUserEdit(key: ConsensusKey, value: number | undefined): Promise<void> {
  await provider.submitEdit(key, value);
}

export async function checkAndApplyConsensus(key: ConsensusKey): Promise<number | undefined> {
  const res = await provider.fetchConsensus(key);
  if (res && res.value !== undefined && res.votes >= 3) {
    await applyCommunityOverride(key.make, key.model, key.year, key.type, key.field, res.value);
    await notifyAffectedVehicles(key, res.value);
    return res.value;
  }
  return undefined;
}

async function notifyAffectedVehicles(key: ConsensusKey, newValue: number) {
  // Inform users with matching vehicles; do not modify per-vehicle overrides; just notify
  try {
    const vehicles = await repo.listVehicles();
    const matches = vehicles.filter(
      (v) => v.make.toLowerCase() === key.make.toLowerCase() && v.model.toLowerCase() === (key.model || '').toLowerCase() && v.year === key.year,
    );
    for (const v of matches) {
      const plan = await loadCustomPlan(v.id);
      const overridden = plan?.find((p) => p.type === key.type && (key.field === 'intervalKm' ? p.intervalKm !== undefined : p.intervalMonths !== undefined));
      const changedByUser = !!overridden;
      const title = changedByUser ? 'Actualización de plan (informativo)' : 'Actualización de plan aplicada';
      const fieldLabel = key.field === 'intervalKm' ? 'km' : 'meses';
      const body = changedByUser
        ? `Se ha propuesto un nuevo valor comunitario para ${key.type} (${fieldLabel}: ${newValue}). Conservamos tu ajuste personalizado.`
        : `Se ha actualizado el valor de ${key.type} (${fieldLabel}) a ${newValue} según consenso de la comunidad.`;
      await notify(title, body);
    }
  } catch {
    // ignore
  }
}
