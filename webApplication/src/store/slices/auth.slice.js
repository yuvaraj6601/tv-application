import { createSlice } from '@reduxjs/toolkit';
const storageKey = 'tv-signage-admin-session';
const readStoredSession = () => {
    try {
        const raw = window.localStorage.getItem(storageKey);
        if (!raw) {
            return {
                token: null,
                email: null
            };
        }
        const parsed = JSON.parse(raw);
        return {
            token: parsed.token || null,
            email: parsed.email || null
        };
    }
    catch (_error) {
        return {
            token: null,
            email: null
        };
    }
};
const initialState = {
    ...readStoredSession()
};
const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        setSession: (state, action) => {
            state.token = action.payload.token;
            state.email = action.payload.email;
            window.localStorage.setItem(storageKey, JSON.stringify(state));
        },
        clearSession: state => {
            state.token = null;
            state.email = null;
            window.localStorage.removeItem(storageKey);
        }
    }
});
export const { setSession, clearSession } = authSlice.actions;
export default authSlice.reducer;
