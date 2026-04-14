/**
 * Dexie service for the admin-managed CocoaDistrict lookup table.
 * All writes go through syncService so they are queued to Supabase offline-first.
 */

import { db } from '@/lib/db/schema';
import { syncService } from '@/lib/db/sync';
import type { CocoaDistrict } from '@/lib/types';

// ─── Reads ───────────────────────────────────────────────────────────────────

/**
 * Returns all active (approved) cocoa districts, sorted by name.
 * Used by the farmer form combobox.
 */
export async function getActiveCocoaDistricts(): Promise<CocoaDistrict[]> {
    const all = await db.cocoaDistricts
        .filter(d => !d.deleted && d.isActive)
        .toArray();
    return all.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Returns every non-deleted cocoa district (active + pending).
 * Used by the admin management page.
 */
export async function getAllCocoaDistricts(): Promise<CocoaDistrict[]> {
    const all = await db.cocoaDistricts
        .filter(d => !d.deleted)
        .toArray();
    return all.sort((a, b) => a.name.localeCompare(b.name));
}

/** Returns a single district by id, or undefined. */
export async function getCocoaDistrict(id: string): Promise<CocoaDistrict | undefined> {
    return db.cocoaDistricts.get(id);
}

// ─── Writes ──────────────────────────────────────────────────────────────────

/** Add a new cocoa district and enqueue for Supabase sync. */
export async function addCocoaDistrict(data: {
    id: string;
    name: string;
    isActive: boolean;
    createdBy?: string;
}): Promise<void> {
    const now = new Date().toISOString();
    const district: CocoaDistrict = {
        id: data.id,
        name: data.name.trim(),
        isActive: data.isActive,
        createdBy: data.createdBy,
        createdAt: now,
        updatedAt: now,
        deleted: false,
    };

    await syncService.writeAndEnqueue(
        db.cocoaDistricts,
        async () => { await db.cocoaDistricts.add(district); },
        'cocoaDistrict' as any,
        'create',
        district.id,
        district
    );
}

/** Update an existing cocoa district and enqueue for Supabase sync. */
export async function updateCocoaDistrict(id: string, changes: Partial<Pick<CocoaDistrict, 'name' | 'isActive'>>): Promise<void> {
    const existing = await db.cocoaDistricts.get(id);
    if (!existing) return;

    const updated: CocoaDistrict = {
        ...existing,
        ...changes,
        updatedAt: new Date().toISOString(),
    };

    await syncService.writeAndEnqueue(
        db.cocoaDistricts,
        async () => { await db.cocoaDistricts.put(updated); },
        'cocoaDistrict' as any,
        'update',
        id,
        updated
    );
}

/** Soft-delete a cocoa district and enqueue for Supabase sync. */
export async function deleteCocoaDistrict(id: string): Promise<void> {
    const now = new Date().toISOString();
    await syncService.writeAndEnqueue(
        db.cocoaDistricts,
        async () => { await db.cocoaDistricts.update(id, { deleted: true, updatedAt: now }); },
        'cocoaDistrict' as any,
        'delete',
        id,
        { deleted: true }
    );
}
