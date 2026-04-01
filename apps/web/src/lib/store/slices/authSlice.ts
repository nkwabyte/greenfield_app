
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { User } from '@/lib/types';

const LOCAL_STORAGE_USER_KEY = 'greenfield_user_session';

export type SerializableAuthUser = {
    id: string;
    email: string | null;
    phone: string | null;
    emailConfirmedAt: string | null;
    lastSignInAt: string | null;
};

export interface AuthState {
    user: User | null;
    supabaseUser: SerializableAuthUser | null;
    isAuthenticated: boolean;
    isLoading: boolean;
}

/**
 * Attempt to restore user session from localStorage for offline-first support.
 * This allows the app to show the user as logged in immediately on load,
 * even before Supabase auth state resolves or when offline.
 */
function getPersistedUser(): User | null {
    if (typeof window === 'undefined') return null;
    try {
        const stored = localStorage.getItem(LOCAL_STORAGE_USER_KEY);
        if (stored) {
            return JSON.parse(stored) as User;
        }
    } catch {
        // Corrupted data — ignore
    }
    return null;
}

const persistedUser = getPersistedUser();

export const initialState: AuthState = {
    user: persistedUser,
    supabaseUser: null,
    isAuthenticated: !!persistedUser,
    // If we already have a cached user, show the app immediately while we
    // verify the session in the background. This prevents the freeze on refresh.
    isLoading: !persistedUser,
};

const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        setSupabaseUser(state, action: PayloadAction<SerializableAuthUser | null>) {
            state.supabaseUser = action.payload;
        },
        setUser(state, action: PayloadAction<User | null>) {
            state.user = action.payload;
            state.isAuthenticated = !!action.payload;

            // Persist user session to localStorage for offline-first access
            if (typeof window !== 'undefined') {
                if (action.payload) {
                    localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(action.payload));
                } else {
                    localStorage.removeItem(LOCAL_STORAGE_USER_KEY);
                }
            }
        },
        setLoading(state, action: PayloadAction<boolean>) {
            state.isLoading = action.payload;
        },
        logout(state) {
            state.user = null;
            state.supabaseUser = null;
            state.isAuthenticated = false;

            // Clear persisted session
            if (typeof window !== 'undefined') {
                localStorage.removeItem(LOCAL_STORAGE_USER_KEY);
            }
        },
    },
});

export const { setUser, setSupabaseUser, setLoading, logout } = authSlice.actions;
export default authSlice.reducer;
