import { supabase } from '@/lib/supabase/client';
import { syncFarmersFromSupabase } from './services/farmers';
import { syncEmployeesFromSupabase } from './services/employees';
import { syncSuppliersFromSupabase } from './services/suppliers';
import { syncProductsFromSupabase } from './services/products';
import { syncTransactionsFromSupabase } from './services/transactions';
import { syncFarmerGroupsFromSupabase } from './services/farmer-groups';
import { syncFarmerRequestsFromSupabase } from './services/farmer-requests';

let realtimeChannel: any = null;

export function startRealtimeSync() {
    if (realtimeChannel) return;

    realtimeChannel = supabase
        .channel('schema-db-changes')
        .on(
            'postgres_changes',
            { event: '*', schema: 'public' },
            async (payload) => {
                const table = payload.table;

                try {
                    switch (table) {
                        case 'farmers':
                            await syncFarmersFromSupabase();
                            break;
                        case 'employees':
                            await syncEmployeesFromSupabase();
                            break;
                        case 'suppliers':
                            await syncSuppliersFromSupabase();
                            break;
                        case 'products':
                            await syncProductsFromSupabase();
                            break;
                        case 'transactions':
                            await syncTransactionsFromSupabase();
                            break;
                        case 'farmer_groups':
                            await syncFarmerGroupsFromSupabase();
                            break;
                        case 'farmer_requests':
                            await syncFarmerRequestsFromSupabase();
                            break;
                        case 'users':
                            // Users are synced on app load/auth hook. 
                            // Could add a hook here for forced sign-out if disabled.
                            break;
                        default:
                            break;
                    }
                } catch (error) {
                    console.error(`[Realtime] Failed to sync after change on ${table}:`, error);
                }
            }
        )
        .subscribe();
}

export function stopRealtimeSync() {
    if (realtimeChannel) {
        supabase.removeChannel(realtimeChannel);
        realtimeChannel = null;
    }
}
