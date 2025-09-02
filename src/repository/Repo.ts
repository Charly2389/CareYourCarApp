import { MaintenanceRecord, Vehicle } from '../models';
import * as SQLite from 'expo-sqlite';

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
}

export class InMemoryRepo implements Repo {
  private vehicles = new Map<string, Vehicle>();
  private maintenance = new Map<string, MaintenanceRecord>();

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
    this.maintenance.set(r.id, r);
  }
  async deleteMaintenance(id: string): Promise<void> {
    this.maintenance.delete(id);
  }
}

// --- SQLite implementation ---
class SQLiteRepo implements Repo {
  private db: SQLite.SQLiteDatabase;
  private initialized = false;

  constructor() {
    // Expo classic API
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore - typings differ across versions but openDatabase exists
    this.db = SQLite.openDatabase('careyourcar.db');
  }

  private async init(): Promise<void> {
    if (this.initialized) return;
    await this.execBatch([
      ['PRAGMA foreign_keys = ON;', []],
      [
        'CREATE TABLE IF NOT EXISTS vehicles (\n          id TEXT PRIMARY KEY NOT NULL,\n          make TEXT NOT NULL,\n          model TEXT NOT NULL,\n          year INTEGER NOT NULL,\n          plate TEXT,\n          vin TEXT,\n          mileage INTEGER NOT NULL,\n          fuelType TEXT NOT NULL,\n          photoUri TEXT,\n          createdAt TEXT NOT NULL\n        );',
        [],
      ],
      [
        'CREATE TABLE IF NOT EXISTS maintenance (\n          id TEXT PRIMARY KEY NOT NULL,\n          vehicleId TEXT NOT NULL,\n          type TEXT NOT NULL,\n          date TEXT NOT NULL,\n          mileageAtService INTEGER NOT NULL,\n          cost REAL,\n          notes TEXT,\n          workshop TEXT,\n          nextDueDate TEXT,\n          nextDueMileage INTEGER,\n          createdAt TEXT NOT NULL,\n          FOREIGN KEY(vehicleId) REFERENCES vehicles(id) ON DELETE CASCADE\n        );',
        [],
      ],
      // Optional index for faster lookups
      ['CREATE INDEX IF NOT EXISTS idx_maint_vehicle ON maintenance(vehicleId);', []],
      ['CREATE INDEX IF NOT EXISTS idx_maint_date ON maintenance(date);', []],
    ]);
    // Lightweight migration: ensure photoUri column exists
    try {
      const info = await this.exec("PRAGMA table_info(vehicles)");
      let hasPhoto = false;
      for (let i = 0; i < info.rows.length; i++) {
        const row = info.rows.item(i) as any;
        if (row.name === 'photoUri') { hasPhoto = true; break; }
      }
      if (!hasPhoto) {
        await this.exec('ALTER TABLE vehicles ADD COLUMN photoUri TEXT');
      }
    } catch { /* ignore */ }
    this.initialized = true;
  }

  private exec<T = any>(sql: string, params: any[] = []): Promise<SQLite.SQLResultSet> {
    return new Promise((resolve, reject) => {
      this.db.readTransaction?.((tx) => {
        tx.executeSql(
          sql,
          params,
          (_tx, result) => resolve(result),
          (_tx, err) => {
            reject(err);
            return false;
          }
        );
      }) ||
        // fallback when readTransaction not available
        this.db.transaction((tx) => {
          tx.executeSql(
            sql,
            params,
            (_tx, result) => resolve(result),
            (_tx, err) => {
              reject(err);
              return false;
            }
          );
        });
    });
  }

  private execBatch(statements: [string, any[]][]): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.transaction((tx) => {
        for (const [sql, params] of statements) {
          tx.executeSql(sql, params);
        }
      }, reject, resolve);
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
      `INSERT OR REPLACE INTO vehicles (id, make, model, year, plate, vin, mileage, fuelType, photoUri, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [v.id, v.make, v.model, v.year, v.plate ?? null, v.vin ?? null, v.mileage, v.fuelType, v.photoUri ?? null, v.createdAt]
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
    await this.exec(
      `INSERT OR REPLACE INTO maintenance (id, vehicleId, type, date, mileageAtService, cost, notes, workshop, nextDueDate, nextDueMileage, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        r.id,
        r.vehicleId,
        r.type,
        r.date,
        r.mileageAtService,
        r.cost ?? null,
        r.notes ?? null,
        r.workshop ?? null,
        r.nextDueDate ?? null,
        r.nextDueMileage ?? null,
        r.createdAt,
      ]
    );
  }
  async deleteMaintenance(id: string): Promise<void> {
    await this.init();
    await this.exec('DELETE FROM maintenance WHERE id = ?', [id]);
  }
}

// Prefer SQLite; fall back to in-memory if something goes wrong at runtime
let repoImpl: Repo;
try {
  repoImpl = new SQLiteRepo();
} catch (_e) {
  repoImpl = new InMemoryRepo();
}

export const repo: Repo = repoImpl;
