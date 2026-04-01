'use client';

import { useAuth } from '@/hooks/use-auth';

export function AppInitializer() {
  /// Initialize authentication state
  // This hook will check if the user is authenticated and set the auth state accordingly
  useAuth();

  // Data loading is now handled by InitialSyncProvider and Dexie hooks
  // No need to load into Redux anymore

  return null;
}
