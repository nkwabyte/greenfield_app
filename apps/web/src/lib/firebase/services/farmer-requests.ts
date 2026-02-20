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
import type { FarmerRequest } from '@/lib/types';

const COLLECTION_NAME = 'farmerRequests';

export async function getFirebaseFarmerRequests(lastSyncTime?: number): Promise<FarmerRequest[]> {
    try {
        const requestsRef = collection(db, COLLECTION_NAME);
        let q = query(requestsRef);

        if (lastSyncTime) {
            const latestDateStr = new Date(lastSyncTime).toISOString();
            q = query(requestsRef, where('updatedAt', '>=', latestDateStr));
        }

        const snapshot = await getDocs(q);

        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as FarmerRequest[];
    } catch (error) {
        console.error('Error fetching farmer requests from Firebase:', error);
        throw error;
    }
}

export async function addFirebaseFarmerRequest(requestId: string, requestData: Partial<FarmerRequest>): Promise<void> {
    try {
        const docRef = doc(db, COLLECTION_NAME, requestId);
        await setDoc(docRef, { ...requestData, id: requestId });
    } catch (error) {
        console.error('Error adding farmer request to Firebase:', error);
        throw error;
    }
}

export async function updateFirebaseFarmerRequest(requestId: string, updates: Partial<FarmerRequest>): Promise<void> {
    try {
        const docRef = doc(db, COLLECTION_NAME, requestId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            await updateDoc(docRef, updates);
        } else {
            await setDoc(docRef, { ...updates, id: requestId });
        }
    } catch (error) {
        console.error(`Error updating farmer request ${requestId} in Firebase:`, error);
        throw error;
    }
}

export async function deleteFirebaseFarmerRequest(requestId: string): Promise<void> {
    try {
        const docRef = doc(db, COLLECTION_NAME, requestId);
        await updateDoc(docRef, { deleted: true, updatedAt: new Date().toISOString() });
    } catch (error) {
        console.error(`Error deleting farmer request ${requestId} in Firebase:`, error);
        throw error;
    }
}

export async function syncFarmerRequestsBatch(operations: { id: string, type: 'create' | 'update' | 'delete', data?: any }[]): Promise<void> {
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
        console.error('Error in batch sync of farmer requests:', error);
        throw error;
    }
}
