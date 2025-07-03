import { localDb } from '@/lib/db/local-db';
import { addFirebaseFarmersBatch } from '@/lib/firebase/services/farmers';

const SYNC_KEY = 'lastSyncTime';
const DAILY_WRITE_LIMIT = 10000;

export const syncFarmersToFirebase = async () => {
    const lastSync = await localDb.meta.get({ key: SYNC_KEY });
    const now = new Date();

    if (lastSync) {
        const lastSyncTime = new Date(lastSync.value);
        const hoursSinceLastSync = (now.getTime() - lastSyncTime.getTime()) / (1000 * 60 * 60);

        if (hoursSinceLastSync < 24) {
            console.log('Skipping sync: Last sync was within 24 hours.');
            return;
        }
    }

    const unsyncedFarmers = await localDb.farmers
        .where('synced')
        .equals(0)
        .limit(DAILY_WRITE_LIMIT)
        .toArray();

    if (unsyncedFarmers.length === 0) {
        console.log('No unsynced farmers found.');
        return;
    }

    const chunkSize = 100;
    for (let i = 0; i < unsyncedFarmers.length; i += chunkSize) {
        const chunk = unsyncedFarmers.slice(i, i + chunkSize);
        await addFirebaseFarmersBatch(chunk);

        const idsToUpdate = chunk.map(f => f.id).filter((id): id is string => !!id);
        await localDb.farmers.where('id').anyOf(idsToUpdate).modify({ synced: 1 });
    }

    // Record new sync time
    await localDb.meta.put({ key: SYNC_KEY, value: now.toISOString() });

    console.log(`Synced ${unsyncedFarmers.length} farmers to Firebase.`);
};
