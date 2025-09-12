import { MaintenanceRecord, Vehicle, TirePressureLog, TireWearLog, TireRotationLog, TireReplacementLog } from '../models';
// Expo SDK 53+: use top-level expo-sqlite import
import * as SQLite from 'expo-sqlite';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Ensure we always store a full ISO datetime string.
// - If input already includes time (contains 'T'), return as-is.
// - If input is a date-only (YYYY-MM-DD), attach current time-of-day.
// - If input is missing/invalid, use current datetime.
const ensureISODateTime = (input?: string): string => {
  try {
    const now = new Date();
    if (input && /\d{4}-\d{2}-\d{2}T/.test(input)) return input;
    if (input && /^\d{4}-\d{2}-\d{2}$/.test(input)) {
      const [y, m, d] = input.split('-').map((x) => Number(x));
      // Compose an ISO string using provided date and current time (UTC components)
      const dt = new Date(Date.UTC(y, (m as number) - 1, d as number, now.getUTCHours(), now.getUTCMinutes(), now.getUTCSeconds(), now.getUTCMilliseconds()));
      return dt.toISOString();
    }
    return now.toISOString();
  } catch {
    return new Date().toISOString();
  }
};

export interface Repo {
  // Vehicles
  listVehicles(): Promise<Vehicle[]>;
  getVehicle(id: string): Promise<Vehicle | undefined>;
  upsertVehicle(v: Vehicle): Promise<void>;
  deleteVehicle(id: string): Promise<void>;

  // Maintenance
  listMaintenance(vehicleId: string): Promise<MaintenanceRecord[]>;
  upsertMaintenance(r: MaintenanceRecord): Promise<void>;
  deleteMaintenance(id: string): Promise<void>;

  // Tire pressure logs
  addTirePressureLog(log: TirePressureLog): Promise<void>;
  listTirePressureLogs(vehicleId: string): Promise<TirePressureLog[]>;

  // Tire wear logs
  addTireWearLog(log: TireWearLog): Promise<void>;
  listTireWearLogs(vehicleId: string): Promise<TireWearLog[]>;

  // Tire rotation logs
  addTireRotationLog(log: TireRotationLog): Promise<void>;
  listTireRotationLogs(vehicleId: string): Promise<TireRotationLog[]>;

  // Tire replacement logs
  addTireReplacementLog(log: TireReplacementLog): Promise<void>;
  listTireReplacementLogs(vehicleId: string): Promise<TireReplacementLog[]>;
}

export class InMemoryRepo implements Repo {
  private vehicles = new Map<string, Vehicle>();
  private maintenance = new Map<string, MaintenanceRecord>();
  private pressureLogs: TirePressureLog[] = [];
  private wearLogs: TireWearLog[] = [];
  private rotationLogs: TireRotationLog[] = [];
  private replacementLogs: TireReplacementLog[] = [];

  async listVehicles(): Promise<Vehicle[]> {
    return Array.from(this.vehicles.values()).sort((a, b) => a.make.localeCompare(b.make));
  }
  async getVehicle(id: string): Promise<Vehicle | undefined> {
    return this.vehicles.get(id);
  }
  async upsertVehicle(v: Vehicle): Promise<void> {
    this.vehicles.set(v.id, v);
  }
  async deleteVehicle(id: string): Promise<void> {
    this.vehicles.delete(id);
    for (const r of Array.from(this.maintenance.values())) {
      if (r.vehicleId === id) this.maintenance.delete(r.id);
    }
  }
  async listMaintenance(vehicleId: string): Promise<MaintenanceRecord[]> {
    return Array.from(this.maintenance.values())
      .filter((m) => m.vehicleId === vehicleId)
      .sort((a, b) => b.date.localeCompare(a.date));
  }
  async upsertMaintenance(r: MaintenanceRecord): Promise<void> {
    const rec: MaintenanceRecord = { ...r, date: ensureISODateTime(r.date) };
    this.maintenance.set(rec.id, rec);
  }
  async deleteMaintenance(id: string): Promise<void> {
    this.maintenance.delete(id);
  }
  async addTirePressureLog(log: TirePressureLog): Promise<void> {
    const L: TirePressureLog = { ...log, date: ensureISODateTime(log.date) };
    const idx = this.pressureLogs.findIndex((x) => x.id === L.id);
    if (idx >= 0) this.pressureLogs[idx] = L; else this.pressureLogs.push(L);
  }
  async listTirePressureLogs(vehicleId: string): Promise<TirePressureLog[]> {
    return this.pressureLogs.filter((l) => l.vehicleId === vehicleId).sort((a, b) => b.date.localeCompare(a.date));
  }
  async addTireWearLog(log: TireWearLog): Promise<void> {
    const L: TireWearLog = { ...log, date: ensureISODateTime(log.date) };
    const idx = this.wearLogs.findIndex((x) => x.id === L.id);
    if (idx >= 0) this.wearLogs[idx] = L; else this.wearLogs.push(L);
  }
  async listTireWearLogs(vehicleId: string): Promise<TireWearLog[]> {
    return this.wearLogs.filter((l) => l.vehicleId === vehicleId).sort((a, b) => b.date.localeCompare(a.date));
  }
  async addTireRotationLog(log: TireRotationLog): Promise<void> {
    const L: TireRotationLog = { ...log, date: ensureISODateTime(log.date) };
    const idx = this.rotationLogs.findIndex((x) => x.id === L.id);
    if (idx >= 0) this.rotationLogs[idx] = L; else this.rotationLogs.push(L);
  }
  async listTireRotationLogs(vehicleId: string): Promise<TireRotationLog[]> {
    return this.rotationLogs.filter((l) => l.vehicleId === vehicleId).sort((a, b) => b.date.localeCompare(a.date));
  }
  async addTireReplacementLog(log: TireReplacementLog): Promise<void> {
    const L: TireReplacementLog = { ...log, date: ensureISODateTime(log.date) };
    const idx = this.replacementLogs.findIndex((x) => x.id === L.id);
    if (idx >= 0) this.replacementLogs[idx] = L; else this.replacementLogs.push(L);
  }
  async listTireReplacementLogs(vehicleId: string): Promise<TireReplacementLog[]> {
    return this.replacementLogs.filter((l) => l.vehicleId === vehicleId).sort((a, b) => b.date.localeCompare(a.date));
  }
}

// --- SQLite implementation ---
class SQLiteRepo implements Repo {
  private db: any;
  private initialized = false;

  constructor() {
    // Expo SDK 53 sqlite
    this.db = (SQLite as any).openDatabaseSync ? (SQLite as any).openDatabaseSync('careyourcar.db') : (SQLite as any).openDatabase('careyourcar.db');
  }

  private async init(): Promise<void> {
    if (this.initialized) return;
    await this.execBatch([
      ['PRAGMA foreign_keys = ON;', []],
      [
        'CREATE TABLE IF NOT EXISTS vehicles (\n          id TEXT PRIMARY KEY NOT NULL,\n          make TEXT NOT NULL,\n          model TEXT NOT NULL,\n          year INTEGER NOT NULL,\n          firstRegistrationYear INTEGER,\n          plate TEXT,\n          vin TEXT,\n          mileage INTEGER NOT NULL,\n          fuelType TEXT NOT NULL,\n          photoUri TEXT,\n          tireSizeSpec TEXT,\n          tirePressureFrontBar REAL,\n          tirePressureRearBar REAL,\n          createdAt TEXT NOT NULL\n        );',
        [],
      ],
      [
        'CREATE TABLE IF NOT EXISTS maintenance (\n          id TEXT PRIMARY KEY NOT NULL,\n          vehicleId TEXT NOT NULL,\n          type TEXT NOT NULL,\n          date TEXT NOT NULL,\n          mileageAtService INTEGER NOT NULL,\n          cost REAL,\n          notes TEXT,\n          workshop TEXT,\n          nextDueDate TEXT,\n          nextDueMileage INTEGER,\n          createdAt TEXT NOT NULL,\n          FOREIGN KEY(vehicleId) REFERENCES vehicles(id) ON DELETE CASCADE\n        );',
        [],
      ],
      // Optional index for faster lookups
      ['CREATE INDEX IF NOT EXISTS idx_maint_vehicle ON maintenance(vehicleId);', []],
      ['CREATE INDEX IF NOT EXISTS idx_maint_date ON maintenance(date);', []],
      [
        'CREATE TABLE IF NOT EXISTS tire_pressure_logs (\n          id TEXT PRIMARY KEY NOT NULL,\n          vehicleId TEXT NOT NULL,\n          date TEXT NOT NULL,\n          fl REAL,\n          fr REAL,\n          rl REAL,\n          rr REAL,\n          FOREIGN KEY(vehicleId) REFERENCES vehicles(id) ON DELETE CASCADE\n        );',
        [],
      ],
      ['CREATE INDEX IF NOT EXISTS idx_tpl_vehicle ON tire_pressure_logs(vehicleId);', []],
      ['CREATE INDEX IF NOT EXISTS idx_tpl_date ON tire_pressure_logs(date);', []],
      [
        'CREATE TABLE IF NOT EXISTS tire_wear_logs (\n          id TEXT PRIMARY KEY NOT NULL,\n          vehicleId TEXT NOT NULL,\n          date TEXT NOT NULL,\n          fl REAL,\n          fr REAL,\n          rl REAL,\n          rr REAL,\n          FOREIGN KEY(vehicleId) REFERENCES vehicles(id) ON DELETE CASCADE\n        );',
        [],
      ],
      ['CREATE INDEX IF NOT EXISTS idx_twl_vehicle ON tire_wear_logs(vehicleId);', []],
      ['CREATE INDEX IF NOT EXISTS idx_twl_date ON tire_wear_logs(date);', []],
      [
        'CREATE TABLE IF NOT EXISTS tire_rotation_logs (\n          id TEXT PRIMARY KEY NOT NULL,\n          vehicleId TEXT NOT NULL,\n          date TEXT NOT NULL,\n          mileage INTEGER NOT NULL,\n          FOREIGN KEY(vehicleId) REFERENCES vehicles(id) ON DELETE CASCADE\n        );',
        [],
      ],
      ['CREATE INDEX IF NOT EXISTS idx_trl_vehicle ON tire_rotation_logs(vehicleId);', []],
      ['CREATE INDEX IF NOT EXISTS idx_trl_date ON tire_rotation_logs(date);', []],
      [
        'CREATE TABLE IF NOT EXISTS tire_replacement_logs (\n          id TEXT PRIMARY KEY NOT NULL,\n          vehicleId TEXT NOT NULL,\n          date TEXT NOT NULL,\n          mileage INTEGER NOT NULL,\n          tireType TEXT,\n          FOREIGN KEY(vehicleId) REFERENCES vehicles(id) ON DELETE CASCADE\n        );',
        [],
      ],
      ['CREATE INDEX IF NOT EXISTS idx_trepl_vehicle ON tire_replacement_logs(vehicleId);', []],
      ['CREATE INDEX IF NOT EXISTS idx_trepl_date ON tire_replacement_logs(date);', []],
    ]);
    // Lightweight migrations: ensure new columns exist
    try {
      const info = await this.exec("PRAGMA table_info(vehicles)");
      let hasPhoto = false;
      let hasFirstReg = false;
      let hasTireFront = false;
      let hasTireRear = false;
      let hasTireSizeSpec = false;
      for (let i = 0; i < info.rows.length; i++) {
        const row = info.rows.item(i) as any;
        if (row.name === 'photoUri') { hasPhoto = true; }
        if (row.name === 'firstRegistrationYear') { hasFirstReg = true; }
        if (row.name === 'tirePressureFrontBar') { hasTireFront = true; }
        if (row.name === 'tirePressureRearBar') { hasTireRear = true; }
        if (row.name === 'tireSizeSpec') { hasTireSizeSpec = true; }
      }
      if (!hasPhoto) {
        await this.exec('ALTER TABLE vehicles ADD COLUMN photoUri TEXT');
      }
      if (!hasFirstReg) {
        await this.exec('ALTER TABLE vehicles ADD COLUMN firstRegistrationYear INTEGER');
      }
      if (!hasTireFront) {
        await this.exec('ALTER TABLE vehicles ADD COLUMN tirePressureFrontBar REAL');
      }
      if (!hasTireRear) {
        await this.exec('ALTER TABLE vehicles ADD COLUMN tirePressureRearBar REAL');
      }
      if (!hasTireSizeSpec) {
        await this.exec('ALTER TABLE vehicles ADD COLUMN tireSizeSpec TEXT');
      }
    } catch { /* ignore */ }
    // Normalize existing dates to include time
    try {
      // Prefer createdAt time when available (maintenance)
      await this.exec("UPDATE maintenance SET date = createdAt WHERE instr(date,'T') = 0 AND createdAt IS NOT NULL AND instr(createdAt,'T') > 0");
      // Fallback: attach midnight UTC when only date present
      await this.exec("UPDATE maintenance SET date = substr(date,1,10) || 'T12:00:00.000Z' WHERE instr(date,'T') = 0 AND date IS NOT NULL AND length(date) >= 10");
      await this.exec("UPDATE tire_pressure_logs SET date = substr(date,1,10) || 'T12:00:00.000Z' WHERE instr(date,'T') = 0 AND date IS NOT NULL AND length(date) >= 10");
      await this.exec("UPDATE tire_wear_logs SET date = substr(date,1,10) || 'T12:00:00.000Z' WHERE instr(date,'T') = 0 AND date IS NOT NULL AND length(date) >= 10");
      await this.exec("UPDATE tire_rotation_logs SET date = substr(date,1,10) || 'T12:00:00.000Z' WHERE instr(date,'T') = 0 AND date IS NOT NULL AND length(date) >= 10");
      await this.exec("UPDATE tire_replacement_logs SET date = substr(date,1,10) || 'T12:00:00.000Z' WHERE instr(date,'T') = 0 AND date IS NOT NULL AND length(date) >= 10");
    } catch { /* ignore */ }
    this.initialized = true;
  }

  private exec<T = any>(sql: string, params: any[] = []): Promise<any> {
    return new Promise((resolve, reject) => {
      this.db.transaction((tx: any) => {
        tx.executeSql(
          sql,
          params,
          (_tx: any, result: any) => resolve(result),
          (_tx: any, err: any) => {
            reject(err);
            return false;
          }
        );
      });
    });
  }

  private execBatch(statements: [string, any[]][]): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.transaction((tx: any) => {
        for (const [sql, params] of statements) {
          tx.executeSql(sql, params);
        }
      }, reject as any, resolve as any);
    });
  }

  // Vehicles
  async listVehicles(): Promise<Vehicle[]> {
    await this.init();
    const res = await this.exec('SELECT * FROM vehicles ORDER BY make ASC');
    const out: Vehicle[] = [];
    for (let i = 0; i < res.rows.length; i++) out.push(res.rows.item(i) as Vehicle);
    return out;
  }
  async getVehicle(id: string): Promise<Vehicle | undefined> {
    await this.init();
    const res = await this.exec('SELECT * FROM vehicles WHERE id = ? LIMIT 1', [id]);
    if (res.rows.length === 0) return undefined;
    return res.rows.item(0) as Vehicle;
  }
  async upsertVehicle(v: Vehicle): Promise<void> {
    await this.init();
    await this.exec(
      `INSERT OR REPLACE INTO vehicles (id, make, model, year, firstRegistrationYear, plate, vin, mileage, fuelType, photoUri, tirePressureFrontBar, tirePressureRearBar, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        v.id,
        v.make,
        v.model,
        v.year,
        v.firstRegistrationYear ?? null,
        v.plate ?? null,
        v.vin ?? null,
        v.mileage,
        v.fuelType,
        v.photoUri ?? null,
        v.tirePressureFrontBar ?? null,
        v.tirePressureRearBar ?? null,
        v.createdAt,
      ]
    );
  }
  async deleteVehicle(id: string): Promise<void> {
    await this.init();
    // Rely on cascade but also clean explicitly for robustness
    await this.exec('DELETE FROM maintenance WHERE vehicleId = ?', [id]);
    await this.exec('DELETE FROM vehicles WHERE id = ?', [id]);
  }

  // Maintenance
  async listMaintenance(vehicleId: string): Promise<MaintenanceRecord[]> {
    await this.init();
    const res = await this.exec('SELECT * FROM maintenance WHERE vehicleId = ? ORDER BY date DESC', [vehicleId]);
    const out: MaintenanceRecord[] = [];
    for (let i = 0; i < res.rows.length; i++) out.push(res.rows.item(i) as MaintenanceRecord);
    return out;
  }
  async upsertMaintenance(r: MaintenanceRecord): Promise<void> {
    await this.init();
    const rec: MaintenanceRecord = { ...r, date: ensureISODateTime(r.date) };
    await this.exec(
      `INSERT OR REPLACE INTO maintenance (id, vehicleId, type, date, mileageAtService, cost, notes, workshop, nextDueDate, nextDueMileage, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        rec.id,
        rec.vehicleId,
        rec.type,
        rec.date,
        rec.mileageAtService,
        rec.cost ?? null,
        rec.notes ?? null,
        rec.workshop ?? null,
        rec.nextDueDate ?? null,
        rec.nextDueMileage ?? null,
        rec.createdAt,
      ]
    );
  }
  async deleteMaintenance(id: string): Promise<void> {
    await this.init();
    await this.exec('DELETE FROM maintenance WHERE id = ?', [id]);
  }
  async addTirePressureLog(log: TirePressureLog): Promise<void> {
    await this.init();
    const L: TirePressureLog = { ...log, date: ensureISODateTime(log.date) };
    await this.exec(
      `INSERT OR REPLACE INTO tire_pressure_logs (id, vehicleId, date, fl, fr, rl, rr)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [L.id, L.vehicleId, L.date, L.fl ?? null, L.fr ?? null, L.rl ?? null, L.rr ?? null]
    );
  }
  async listTirePressureLogs(vehicleId: string): Promise<TirePressureLog[]> {
    await this.init();
    const res = await this.exec('SELECT * FROM tire_pressure_logs WHERE vehicleId = ? ORDER BY date DESC', [vehicleId]);
    const out: TirePressureLog[] = [];
    for (let i = 0; i < res.rows.length; i++) out.push(res.rows.item(i) as TirePressureLog);
    return out;
  }
  async addTireWearLog(log: TireWearLog): Promise<void> {
    await this.init();
    const L: TireWearLog = { ...log, date: ensureISODateTime(log.date) };
    await this.exec(
      `INSERT OR REPLACE INTO tire_wear_logs (id, vehicleId, date, fl, fr, rl, rr)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [L.id, L.vehicleId, L.date, L.fl ?? null, L.fr ?? null, L.rl ?? null, L.rr ?? null]
    );
  }
  async listTireWearLogs(vehicleId: string): Promise<TireWearLog[]> {
    await this.init();
    const res = await this.exec('SELECT * FROM tire_wear_logs WHERE vehicleId = ? ORDER BY date DESC', [vehicleId]);
    const out: TireWearLog[] = [];
    for (let i = 0; i < res.rows.length; i++) out.push(res.rows.item(i) as TireWearLog);
    return out;
  }
  async addTireRotationLog(log: TireRotationLog): Promise<void> {
    await this.init();
    const L: TireRotationLog = { ...log, date: ensureISODateTime(log.date) };
    await this.exec(
      `INSERT OR REPLACE INTO tire_rotation_logs (id, vehicleId, date, mileage)
       VALUES (?, ?, ?, ?)`,
      [L.id, L.vehicleId, L.date, L.mileage]
    );
  }
  async listTireRotationLogs(vehicleId: string): Promise<TireRotationLog[]> {
    await this.init();
    const res = await this.exec('SELECT * FROM tire_rotation_logs WHERE vehicleId = ? ORDER BY date DESC', [vehicleId]);
    const out: TireRotationLog[] = [];
    for (let i = 0; i < res.rows.length; i++) out.push(res.rows.item(i) as TireRotationLog);
    return out;
  }
  async addTireReplacementLog(log: TireReplacementLog): Promise<void> {
    await this.init();
    const L: TireReplacementLog = { ...log, date: ensureISODateTime(log.date) };
    await this.exec(
      `INSERT OR REPLACE INTO tire_replacement_logs (id, vehicleId, date, mileage, tireType)
       VALUES (?, ?, ?, ?, ?)`,
      [L.id, L.vehicleId, L.date, L.mileage, L.tireType ?? null]
    );
  }
  async listTireReplacementLogs(vehicleId: string): Promise<TireReplacementLog[]> {
    await this.init();
    const res = await this.exec('SELECT * FROM tire_replacement_logs WHERE vehicleId = ? ORDER BY date DESC', [vehicleId]);
    const out: TireReplacementLog[] = [];
    for (let i = 0; i < res.rows.length; i++) out.push(res.rows.item(i) as TireReplacementLog);
    return out;
  }
}

// --- AsyncStorage implementation (for web or fallback) ---
class AsyncStorageRepo implements Repo {
  private VKEY = 'cyc/vehicles';
  private MKEY = 'cyc/maintenance';
  private TPLKEY = 'cyc/tire_pressure_logs';
  private TWLKEY = 'cyc/tire_wear_logs';
  private TRLKEY = 'cyc/tire_rotation_logs';
  private TRPLKEY = 'cyc/tire_replacement_logs';

  private async loadVehicles(): Promise<Vehicle[]> {
    try {
      const raw = await AsyncStorage.getItem(this.VKEY);
      return raw ? (JSON.parse(raw) as Vehicle[]) : [];
    } catch {
      return [];
    }
  }
  private async saveVehicles(list: Vehicle[]): Promise<void> {
    try { await AsyncStorage.setItem(this.VKEY, JSON.stringify(list)); } catch {}
  }
  private async loadMaintenance(): Promise<MaintenanceRecord[]> {
    try {
      const raw = await AsyncStorage.getItem(this.MKEY);
      const list: MaintenanceRecord[] = raw ? (JSON.parse(raw) as MaintenanceRecord[]) : [];
      let changed = false;
      const fixed = list.map((r) => {
        const hasT = r?.date && r.date.includes('T');
        if (hasT) return r;
        const useCreated = r?.createdAt && r.createdAt.includes('T');
        const newDate = useCreated ? r.createdAt : (r?.date && /^\d{4}-\d{2}-\d{2}$/.test(r.date) ? `${r.date}T12:00:00.000Z` : ensureISODateTime(r?.date));
        if (newDate !== r.date) { changed = true; return { ...r, date: newDate }; }
        return r;
      });
      if (changed) { try { await AsyncStorage.setItem(this.MKEY, JSON.stringify(fixed)); } catch {} }
      return fixed;
    } catch {
      return [];
    }
  }
  private async saveMaintenance(list: MaintenanceRecord[]): Promise<void> {
    try { await AsyncStorage.setItem(this.MKEY, JSON.stringify(list)); } catch {}
  }
  private async loadTPL(): Promise<TirePressureLog[]> {
    try {
      const raw = await AsyncStorage.getItem(this.TPLKEY);
      const list: TirePressureLog[] = raw ? (JSON.parse(raw) as TirePressureLog[]) : [];
      let changed = false;
      const fixed = list.map((l) => {
        if (l?.date && l.date.includes('T')) return l;
        const nd = l?.date && /^\d{4}-\d{2}-\d{2}$/.test(l.date) ? `${l.date}T12:00:00.000Z` : ensureISODateTime(l?.date);
        if (nd !== l.date) { changed = true; return { ...l, date: nd }; }
        return l;
      });
      if (changed) { try { await AsyncStorage.setItem(this.TPLKEY, JSON.stringify(fixed)); } catch {} }
      return fixed;
    } catch {
      return [];
    }
  }
  private async saveTPL(list: TirePressureLog[]): Promise<void> {
    try { await AsyncStorage.setItem(this.TPLKEY, JSON.stringify(list)); } catch {}
  }
  private async loadTWL(): Promise<TireWearLog[]> {
    try {
      const raw = await AsyncStorage.getItem(this.TWLKEY);
      const list: TireWearLog[] = raw ? (JSON.parse(raw) as TireWearLog[]) : [];
      let changed = false;
      const fixed = list.map((l) => {
        if (l?.date && l.date.includes('T')) return l;
        const nd = l?.date && /^\d{4}-\d{2}-\d{2}$/.test(l.date) ? `${l.date}T12:00:00.000Z` : ensureISODateTime(l?.date);
        if (nd !== l.date) { changed = true; return { ...l, date: nd }; }
        return l;
      });
      if (changed) { try { await AsyncStorage.setItem(this.TWLKEY, JSON.stringify(fixed)); } catch {} }
      return fixed;
    } catch {
      return [];
    }
  }
  private async saveTWL(list: TireWearLog[]): Promise<void> {
    try { await AsyncStorage.setItem(this.TWLKEY, JSON.stringify(list)); } catch {}
  }
  private async loadTRL(): Promise<TireRotationLog[]> {
    try {
      const raw = await AsyncStorage.getItem(this.TRLKEY);
      const list: TireRotationLog[] = raw ? (JSON.parse(raw) as TireRotationLog[]) : [];
      let changed = false;
      const fixed = list.map((l) => {
        if (l?.date && l.date.includes('T')) return l;
        const nd = l?.date && /^\d{4}-\d{2}-\d{2}$/.test(l.date) ? `${l.date}T12:00:00.000Z` : ensureISODateTime(l?.date);
        if (nd !== l.date) { changed = true; return { ...l, date: nd }; }
        return l;
      });
      if (changed) { try { await AsyncStorage.setItem(this.TRLKEY, JSON.stringify(fixed)); } catch {} }
      return fixed;
    } catch {
      return [];
    }
  }
  private async saveTRL(list: TireRotationLog[]): Promise<void> {
    try { await AsyncStorage.setItem(this.TRLKEY, JSON.stringify(list)); } catch {}
  }
  private async loadTRPL(): Promise<TireReplacementLog[]> {
    try {
      const raw = await AsyncStorage.getItem(this.TRPLKEY);
      const list: TireReplacementLog[] = raw ? (JSON.parse(raw) as TireReplacementLog[]) : [];
      let changed = false;
      const fixed = list.map((l) => {
        if (l?.date && l.date.includes('T')) return l;
        const nd = l?.date && /^\d{4}-\d{2}-\d{2}$/.test(l.date) ? `${l.date}T12:00:00.000Z` : ensureISODateTime(l?.date);
        if (nd !== l.date) { changed = true; return { ...l, date: nd }; }
        return l;
      });
      if (changed) { try { await AsyncStorage.setItem(this.TRPLKEY, JSON.stringify(fixed)); } catch {} }
      return fixed;
    } catch {
      return [];
    }
  }
  private async saveTRPL(list: TireReplacementLog[]): Promise<void> {
    try { await AsyncStorage.setItem(this.TRPLKEY, JSON.stringify(list)); } catch {}
  }

  async listVehicles(): Promise<Vehicle[]> {
    const list = await this.loadVehicles();
    return list.sort((a, b) => a.make.localeCompare(b.make));
  }
  async getVehicle(id: string): Promise<Vehicle | undefined> {
    const list = await this.loadVehicles();
    return list.find((v) => v.id === id);
  }
  async upsertVehicle(v: Vehicle): Promise<void> {
    const list = await this.loadVehicles();
    const idx = list.findIndex((x) => x.id === v.id);
    if (idx >= 0) list[idx] = v; else list.push(v);
    await this.saveVehicles(list);
  }
  async deleteVehicle(id: string): Promise<void> {
    const vlist = (await this.loadVehicles()).filter((v) => v.id !== id);
    await this.saveVehicles(vlist);
    const mlist = (await this.loadMaintenance()).filter((m) => m.vehicleId !== id);
    await this.saveMaintenance(mlist);
  }
  async listMaintenance(vehicleId: string): Promise<MaintenanceRecord[]> {
    const list = await this.loadMaintenance();
    return list.filter((m) => m.vehicleId === vehicleId).sort((a, b) => b.date.localeCompare(a.date));
  }
  async upsertMaintenance(r: MaintenanceRecord): Promise<void> {
    const list = await this.loadMaintenance();
    const rec: MaintenanceRecord = { ...r, date: ensureISODateTime(r.date) };
    const idx = list.findIndex((x) => x.id === rec.id);
    if (idx >= 0) list[idx] = rec; else list.push(rec);
    await this.saveMaintenance(list);
  }
  async deleteMaintenance(id: string): Promise<void> {
    const list = (await this.loadMaintenance()).filter((m) => m.id !== id);
    await this.saveMaintenance(list);
  }
  async addTirePressureLog(log: TirePressureLog): Promise<void> {
    const list = await this.loadTPL();
    const L: TirePressureLog = { ...log, date: ensureISODateTime(log.date) };
    const idx = list.findIndex((x) => x.id === L.id);
    if (idx >= 0) list[idx] = L; else list.unshift(L);
    await this.saveTPL(list);
  }
  async listTirePressureLogs(vehicleId: string): Promise<TirePressureLog[]> {
    const list = await this.loadTPL();
    return list.filter((l) => l.vehicleId === vehicleId).sort((a, b) => b.date.localeCompare(a.date));
  }
  async addTireWearLog(log: TireWearLog): Promise<void> {
    const list = await this.loadTWL();
    const L: TireWearLog = { ...log, date: ensureISODateTime(log.date) };
    const idx = list.findIndex((x) => x.id === L.id);
    if (idx >= 0) list[idx] = L; else list.unshift(L);
    await this.saveTWL(list);
  }
  async listTireWearLogs(vehicleId: string): Promise<TireWearLog[]> {
    const list = await this.loadTWL();
    return list.filter((l) => l.vehicleId === vehicleId).sort((a, b) => b.date.localeCompare(a.date));
  }
  async addTireRotationLog(log: TireRotationLog): Promise<void> {
    const list = await this.loadTRL();
    const L: TireRotationLog = { ...log, date: ensureISODateTime(log.date) };
    const idx = list.findIndex((x) => x.id === L.id);
    if (idx >= 0) list[idx] = L; else list.unshift(L);
    await this.saveTRL(list);
  }
  async listTireRotationLogs(vehicleId: string): Promise<TireRotationLog[]> {
    const list = await this.loadTRL();
    return list.filter((l) => l.vehicleId === vehicleId).sort((a, b) => b.date.localeCompare(a.date));
  }
  async addTireReplacementLog(log: TireReplacementLog): Promise<void> {
    const list = await this.loadTRPL();
    const L: TireReplacementLog = { ...log, date: ensureISODateTime(log.date) };
    const idx = list.findIndex((x) => x.id === L.id);
    if (idx >= 0) list[idx] = L; else list.unshift(L);
    await this.saveTRPL(list);
  }
  async listTireReplacementLogs(vehicleId: string): Promise<TireReplacementLog[]> {
    const list = await this.loadTRPL();
    return list.filter((l) => l.vehicleId === vehicleId).sort((a, b) => b.date.localeCompare(a.date));
  }
}

// Prefer SQLite (native); use AsyncStorage on web or if something fails
let repoImpl: Repo;
if (Platform.OS === 'web') {
  repoImpl = new AsyncStorageRepo();
} else {
  try {
    repoImpl = new SQLiteRepo();
  } catch (_e) {
    repoImpl = new AsyncStorageRepo();
  }
}

export const repo: Repo = repoImpl;
