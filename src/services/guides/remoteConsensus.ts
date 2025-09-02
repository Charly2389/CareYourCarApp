import type { ConsensusKey, ConsensusProvider, ConsensusResult } from './community';

export class HttpConsensusProvider implements ConsensusProvider {
  constructor(private baseUrl: string, private authToken?: string) {}

  private headers() {
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.authToken) h['Authorization'] = `Bearer ${this.authToken}`;
    return h;
  }

  async submitEdit(key: ConsensusKey, value: number | undefined): Promise<void> {
    try {
      await fetch(`${this.baseUrl.replace(/\/$/, '')}/consensus`, {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify({ key, value }),
      });
    } catch {}
  }

  async fetchConsensus(key: ConsensusKey): Promise<ConsensusResult | undefined> {
    try {
      const qs = new URLSearchParams({
        make: key.make,
        model: key.model || '',
        year: String(key.year),
        type: key.type,
        field: key.field,
      });
      const res = await fetch(`${this.baseUrl.replace(/\/$/, '')}/consensus?${qs.toString()}`);
      if (!res.ok) return undefined;
      const data = (await res.json()) as ConsensusResult;
      return data;
    } catch {
      return undefined;
    }
  }
}

