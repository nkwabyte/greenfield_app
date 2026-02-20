import {
    collection,
    doc,
    getDocs,
    setDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    getDoc,
    writeBatch
} from 'firebase/firestore';
import { db } from '../config';
import type { FarmerGroup } from '@/lib/types';

const COLLECTION_NAME = 'farmerGroups';

/**
 * Get all farmer groups from Firebase
 * Optionally filter by lastSyncTime for incremental updates
 */
export async function getFirebaseFarmerGroups(lastSyncTime?: number): Promise<FarmerGroup[]> {
    try {
        const groupsRef = collection(db, COLLECTION_NAME);
        let q = query(groupsRef);

        if (lastSyncTime) {
            // Filter approach: sync by updatedAt timestamp or fetch all non-deleted
            const latestDateStr = new Date(lastSyncTime).toISOString();
            q = query(groupsRef, where('updatedAt', '>=', latestDateStr));
        }

        const snapshot = await getDocs(q);

        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as FarmerGroup[];
    } catch (error) {
        console.error('Error fetching farmer groups from Firebase:', error);
        throw error;
    }
}

/**
 * Add a new farmer group to Firebase
 */
export async function addFirebaseFarmerGroup(groupId: string, groupData: Partial<FarmerGroup>): Promise<void> {
    try {
        const docRef = doc(db, COLLECTION_NAME, groupId);
        await setDoc(docRef, {
            ...groupData,
            id: groupId
        });
    } catch (error) {
        console.error('Error adding farmer group to Firebase:', error);
        throw error;
    }
}

/**
 * Update a farmer group in Firebase
 */
export async function updateFirebaseFarmerGroup(groupId: string, updates: Partial<FarmerGroup>): Promise<void> {
    try {
        const docRef = doc(db, COLLECTION_NAME, groupId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            await updateDoc(docRef, updates);
        } else {
            await setDoc(docRef, { ...updates, id: groupId });
        }
    } catch (error) {
        console.error(`Error updating farmer group ${groupId} in Firebase:`, error);
        throw error;
    }
}

/**
 * Delete a farmer group from Firebase (soft delete)
 */
export async function deleteFirebaseFarmerGroup(groupId: string): Promise<void> {
    try {
        const docRef = doc(db, COLLECTION_NAME, groupId);
        await updateDoc(docRef, { deleted: true, updatedAt: new Date().toISOString() });
    } catch (error) {
        console.error(`Error deleting farmer group ${groupId} in Firebase:`, error);
        throw error;
    }
}

/**
 * Sync offline batch farmer group updates to Firebase
 */
export async function syncFarmerGroupsBatch(operations: { id: string, type: 'create' | 'update' | 'delete', data?: any }[]): Promise<void> {
    try {
        const batch = writeBatch(db);

        for (const op of operations) {
            const docRef = doc(db, COLLECTION_NAME, op.id);

            if (op.type === 'delete') {
                batch.update(docRef, { deleted: true, updatedAt: new Date().toISOString() });
            } else if (op.type === 'create') {
                batch.set(docRef, { ...op.data, id: op.id });
            } else if (op.type === 'update' && op.data) {
                batch.update(docRef, op.data);
            }
        }

        await batch.commit();
    } catch (error) {
        console.error('Error in batch sync of farmer groups:', error);
        throw error;
    }
}
