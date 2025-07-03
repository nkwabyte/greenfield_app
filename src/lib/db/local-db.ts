// lib/db/local-db.ts
import Dexie, { Table } from 'dexie';
import type { Farmer } from '@/lib/types';

export const META_KEYS = {
    LAST_SYNC_TIME: 'lastSyncTime',
} as const;

type MetaKey = typeof META_KEYS[keyof typeof META_KEYS];

export interface Meta {
    key: MetaKey;
    value: string;
}

export interface LocalFarmer extends Omit<Farmer, 'id'> {
    id: string;
    synced: 0 | 1; // use 0 (false) and 1 (true) for indexed boolean
}

class FarmerDB extends Dexie {
    farmers!: Table<LocalFarmer, string>;
    meta!: Table<Meta, 'key'>;

    constructor() {
        super('FarmerDatabase');
        this.version(1).stores({
            farmers: '++id, name, region, district, synced, createdAt, updatedAt',
            meta: 'key',
        });
    }
}

export const localDb = new FarmerDB();
