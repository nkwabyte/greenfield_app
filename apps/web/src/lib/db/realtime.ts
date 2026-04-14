import { supabase } from '@/lib/supabase/client';
import { syncFarmersFromSupabase } from './services/farmers';
import { syncEmployeesFromSupabase } from './services/employees';
import { syncSuppliersFromSupabase } from './services/suppliers';
import { syncProductsFromSupabase } from './services/products';
import { syncTransactionsFromSupabase } from './services/transactions';
import { syncFarmerGroupsFromSupabase } from './services/farmer-groups';
import { syncFarmerRequestsFromSupabase } from './services/farmer-requests';
import { syncCocoaDistrictsFromSupabase } from '@/lib/supabase/services/cocoa-districts';
import { store } from '@/lib/store/store';
import { setUser } from '@/lib/store/slices/authSlice';

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
                        case 'cocoa_districts':
                            await syncCocoaDistrictsFromSupabase();
                            break;
                        case 'users': {
                            // If the current user's own profile row changed (e.g. role
                            // promotion or account disabled), re-fetch it and push the
                            // update into Redux immediately — no hard refresh needed.
                            const currentUid = store.getState().auth.user?.uid;
                            const changedUid = (payload.new as any)?.id ?? (payload.old as any)?.id;
                            if (!currentUid || changedUid !== currentUid) break;

                            const { data: profile } = await supabase
                                .from('users')
                                .select('role, status, name, phone, job_title, avatar_url, gemini_api_key, preferred_model')
                                .eq('id', currentUid)
                                .single();

                            if (profile) {
                                store.dispatch(setUser({
                                    ...store.getState().auth.user!,
                                    role: profile.role,
                                    status: profile.status,
                                    name: profile.name,
                                    phone: profile.phone ?? undefined,
                                    jobTitle: profile.job_title ?? undefined,
                                    avatarUrl: profile.avatar_url ?? undefined,
                                    geminiApiKey: profile.gemini_api_key ?? undefined,
                                    preferredModel: profile.preferred_model ?? undefined,
                                }));
                            }
                            break;
                        }
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
