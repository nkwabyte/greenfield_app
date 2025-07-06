import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { User } from '@/lib/types';

interface UsersState {
    data: User[];
    status: 'idle' | 'loading' | 'succeeded' | 'failed';
    error?: string;
}

const initialState: UsersState = {
    data: [],
    status: 'idle',
};

const usersSlice = createSlice({
    name: 'users',
    initialState,
    reducers: {
        setUsers(state, action: PayloadAction<User[]>) {
            state.data = action.payload;
            state.status = 'succeeded';
        },
        addUser(state, action: PayloadAction<User>) {
            state.data.unshift(action.payload);
        },
        updateUser(state, action: PayloadAction<User>) {
            const index = state.data.findIndex(f => f.uid === action.payload.uid);
            if (index !== -1) state.data[index] = action.payload;
        },
        deleteUser(state, action: PayloadAction<string>) {
            state.data = state.data.filter(f => f.uid !== action.payload);
        },
        setLoading(state) {
            state.status = 'loading';
        },
        setError(state, action: PayloadAction<string>) {
            state.status = 'failed';
            state.error = action.payload;
        },
    },
});

export const {
    setUsers,
    addUser,
    updateUser,
    deleteUser,
    setLoading,
    setError,
} = usersSlice.actions;

export default usersSlice.reducer;
