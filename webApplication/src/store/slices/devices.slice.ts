import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface DeviceSummary {
  id: string;
  deviceName: string;
  status: 'ONLINE' | 'OFFLINE';
  isPaired: boolean;
  lastSeen: string | null;
  contentCount: number;
  lastHeartbeatAt: string | null;
  appVersion: string | null;
}

interface DeviceState {
  list: DeviceSummary[];
}

const initialState: DeviceState = {
  list: []
};

const devicesSlice = createSlice({
  name: 'devices',
  initialState,
  reducers: {
    setDevices: (state, action: PayloadAction<DeviceSummary[]>) => {
      state.list = action.payload;
    }
  }
});

export const { setDevices } = devicesSlice.actions;
export default devicesSlice.reducer;
