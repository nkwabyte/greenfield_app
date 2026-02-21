/**
 * Media Sync Service
 *
 * Architecture:
 *
 * 1. CAPTURE: When a user selects an image in any form, we:
 *    a. Convert the File to an ArrayBuffer
 *    b. Save it to Dexie `mediaStore` with status='pending'
 *    c. Show the image immediately from a local ObjectURL (no network needed)
 *
 * 2. SYNC: When the device comes online (or app initialises), we:
 *    a. Query all `mediaStore` records with status='pending'
 *    b. Upload each ArrayBuffer as a Blob to Supabase Storage
 *    c. On success: update the entity (farmer, employee, etc.) with the public URL
 *       and mark the media record as status='uploaded'
 *    d. On failure: increment retryCount and mark status='error' if max retries exceeded
 */

import { db, type MediaItem } from './schema';
import { supabase } from '@/lib/supabase/client';
import { connectivityService } from './connectivity';
import { v4 as uuidv4 } from 'uuid';

const MAX_RETRY_COUNT = 3;
const STORAGE_BUCKET = 'greenfield-media';

// ------------------------------------------------------------
// Public API
// ------------------------------------------------------------

/**
 * Save an image to the offline store.
 * Call this immediately when the user selects a file — no network needed.
 * Returns the local media item ID and an ObjectURL you can display right away.
 */
export async function saveMediaOffline(
    entityType: string,
    entityId: string,
    fieldName: string,
    file: File
): Promise<{ id: string; localUrl: string }> {
    const arrayBuffer = await file.arrayBuffer();
    const id = `${entityType}_${entityId}_${fieldName}_${uuidv4()}`;
    const now = new Date().toISOString();

    const mediaItem: MediaItem = {
        id,
        entityType,
        entityId,
        fieldName,
        mimeType: file.type || 'image/jpeg',
        data: arrayBuffer,
        status: 'pending',
        retryCount: 0,
        createdAt: now,
        updatedAt: now,
    };

    await db.mediaStore.put(mediaItem);

    // ObjectURL lives in-memory for immediate display
    const localUrl = URL.createObjectURL(new Blob([arrayBuffer], { type: mediaItem.mimeType }));
    return { id, localUrl };
}

/**
 * Upload all pending media items to Supabase Storage.
 * Call this on app start and whenever connectivity is restored.
 */
export async function syncPendingMedia(): Promise<{ uploaded: number; failed: number }> {
    if (!connectivityService.isOnline()) return { uploaded: 0, failed: 0 };

    const pendingItems = await db.mediaStore
        .where('status')
        .anyOf(['pending', 'error'])
        .and(item => (item.retryCount ?? 0) < MAX_RETRY_COUNT)
        .toArray();

    let uploaded = 0;
    let failed = 0;

    for (const item of pendingItems) {
        try {
            const remoteUrl = await uploadToStorage(item);

            // Update the origin entity with the new URL
            await updateEntityWithUrl(item.entityType, item.entityId, item.fieldName, remoteUrl);

            await db.mediaStore.update(item.id, {
                status: 'uploaded',
                remoteUrl,
                errorMessage: undefined,
                updatedAt: new Date().toISOString(),
            });
            uploaded++;

        } catch (err: any) {
            const newRetryCount = (item.retryCount ?? 0) + 1;
            await db.mediaStore.update(item.id, {
                status: newRetryCount >= MAX_RETRY_COUNT ? 'error' : 'pending',
                retryCount: newRetryCount,
                errorMessage: err?.message ?? 'Upload failed',
                updatedAt: new Date().toISOString(),
            });
            failed++;
        }
    }

    return { uploaded, failed };
}

/**
 * Get a URL to display for an entity's image field.
 * Falls back to the remote URL when already uploaded, otherwise creates a local ObjectURL.
 */
export async function getDisplayUrl(
    entityType: string,
    entityId: string,
    fieldName: string,
    fallbackRemoteUrl?: string
): Promise<string | undefined> {
    const localMedia = await db.mediaStore
        .where('entityId').equals(entityId)
        .and(m => m.entityType === entityType && m.fieldName === fieldName)
        .first();

    if (localMedia && localMedia.status !== 'uploaded') {
        return URL.createObjectURL(new Blob([localMedia.data], { type: localMedia.mimeType }));
    }

    return localMedia?.remoteUrl ?? fallbackRemoteUrl;
}

/**
 * Delete a media item from local store (and optionally from remote storage).
 */
export async function deleteMedia(mediaId: string, deleteRemote = false): Promise<void> {
    const item = await db.mediaStore.get(mediaId);
    if (!item) return;

    if (deleteRemote && item.remoteUrl) {
        // Extract the storage path from the URL
        const urlParts = item.remoteUrl.split(`/${STORAGE_BUCKET}/`);
        if (urlParts.length === 2) {
            await supabase.storage.from(STORAGE_BUCKET).remove([urlParts[1]]);
        }
    }

    await db.mediaStore.delete(mediaId);
}

// ------------------------------------------------------------
// Internal helpers
// ------------------------------------------------------------

async function uploadToStorage(item: MediaItem): Promise<string> {
    const blob = new Blob([item.data], { type: item.mimeType });
    const extension = item.mimeType.split('/')[1] || 'jpg';
    const storagePath = `${item.entityType}/${item.entityId}/${item.fieldName}.${extension}`;

    const { error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(storagePath, blob, {
            contentType: item.mimeType,
            upsert: true, // Overwrite if the image changes
        });

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(storagePath);

    return publicUrl;
}

async function updateEntityWithUrl(
    entityType: string,
    entityId: string,
    fieldName: string,
    url: string
): Promise<void> {
    // Update the local Dexie record with the remote URL
    switch (entityType) {
        case 'farmer':
            await db.farmers.update(entityId, { [fieldName]: url, updatedAt: new Date().toISOString() });
            break;
        case 'employee':
            await db.employees.update(entityId, { [fieldName]: url, updatedAt: new Date().toISOString() });
            break;
        // Extend here for other entity types as needed
        default:
            console.warn(`[MediaSync] Unknown entity type: ${entityType}`);
    }

    // The entity's sync queue will handle pushing the URL update to Supabase
    // as a normal 'update' operation via syncService.addToQueue
}
