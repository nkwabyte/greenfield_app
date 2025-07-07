import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { User } from '@/lib/types';
import type { User as FirebaseUser } from 'firebase/auth';

interface AuthState {
    user: User | null;
    firebaseUser: FirebaseUser | null;
    isAuthenticated: boolean;
    isLoading: boolean;
}

const initialState: AuthState = {
    user: null,
    firebaseUser: null,
    isAuthenticated: false,
    isLoading: true,
};

const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        setFirebaseUser(state, action: PayloadAction<FirebaseUser | null>) {
            state.firebaseUser = action.payload;
        },
        setUser(state, action: PayloadAction<User | null>) {
            state.user = action.payload;
            state.isAuthenticated = !!action.payload;
        },
        setLoading(state, action: PayloadAction<boolean>) {
            state.isLoading = action.payload;
        },
        logout(state) {
            state.user = null;
            state.firebaseUser = null;
            state.isAuthenticated = false;
        },
    },
});

export const { setUser, setFirebaseUser, setLoading, logout } = authSlice.actions;
export default authSlice.reducer;
