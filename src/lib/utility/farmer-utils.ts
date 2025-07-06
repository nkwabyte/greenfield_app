import { localDb } from '@/lib/db/local-db';
import { deleteFirebaseFarmer } from '../firebase/services/farmers';


export const handleResetLocalDb = async () => {
    if (confirm("Are you sure you want to reset the local database? This cannot be undone.")) {
        await localDb.delete();
        await localDb.open();
        // toast({ title: 'Local DB Reset', description: 'Local database has been cleared.' });
    }
};


export async function deleteFarmerEverywhere(localId: string, firebaseId?: string) {
    // 1. Delete from local DB
    await localDb.farmers.delete(localId);

    // 2. If synced and Firebase ID is known, delete from cloud
    if (firebaseId) {
        try {
            await deleteFirebaseFarmer(firebaseId);
            return { local: true, cloud: true };
        } catch (err) {
            console.warn('Local deleted, but cloud deletion failed:', err);
            return { local: true, cloud: false };
        }
    }

    return { local: true, cloud: null }; // cloud unknown
}