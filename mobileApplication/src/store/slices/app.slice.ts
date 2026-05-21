import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface AppState {
  isOnline: boolean;
  isBootstrapped: boolean;
  syncInProgress: boolean;
}

const initialState: AppState = {
  isOnline: true,
  isBootstrapped: false,
  syncInProgress: false
};

const appSlice = createSlice({
  name: 'app',
  initialState,
  reducers: {
    setOnlineStatus: (state, action: PayloadAction<boolean>) => {
      state.isOnline = action.payload;
    },
    setBootstrapped: (state, action: PayloadAction<boolean>) => {
      state.isBootstrapped = action.payload;
    },
    setSyncInProgress: (state, action: PayloadAction<boolean>) => {
      state.syncInProgress = action.payload;
    }
  }
});

export const { setOnlineStatus, setBootstrapped, setSyncInProgress } = appSlice.actions;
export default appSlice.reducer;
