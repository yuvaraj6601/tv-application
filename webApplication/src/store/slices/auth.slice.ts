import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface AuthState {
  token: string | null;
  email: string | null;
}

const storageKey = 'tv-signage-admin-session';

const readStoredSession = (): AuthState => {
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) {
      return {
        token: null,
        email: null
      };
    }

    const parsed = JSON.parse(raw) as AuthState;
    return {
      token: parsed.token || null,
      email: parsed.email || null
    };
  } catch (_error) {
    return {
      token: null,
      email: null
    };
  }
};

const initialState: AuthState = {
  ...readStoredSession()
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setSession: (state, action: PayloadAction<{ token: string; email: string }>) => {
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
