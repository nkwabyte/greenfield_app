import { localDb } from '@/lib/db/local-db';

export const handleResetLocalDb = async () => {
    if (confirm("Are you sure you want to reset the local database? This cannot be undone.")) {
        await localDb.delete();
        await localDb.open();
        // toast({ title: 'Local DB Reset', description: 'Local database has been cleared.' });
    }
};
