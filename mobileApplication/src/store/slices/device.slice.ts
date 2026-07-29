import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { DeviceOrientation, DeviceStateModel } from '../../types/app.types';

const initialState: DeviceStateModel = {
  deviceId: null,
  deviceUniqueId: null,
  pairingCode: null,
  isPaired: false,
  deviceToken: null,
  orientation: 'PORTRAIT'
};

const deviceSlice = createSlice({
  name: 'device',
  initialState,
  reducers: {
    setDeviceIdentity: (state, action: PayloadAction<{ deviceId: string; deviceUniqueId: string }>) => {
      state.deviceId = action.payload.deviceId;
      state.deviceUniqueId = action.payload.deviceUniqueId;
    },
    setPairingCode: (state, action: PayloadAction<string | null>) => {
      state.pairingCode = action.payload;
    },
    setDeviceToken: (state, action: PayloadAction<string>) => {
      state.deviceToken = action.payload;
    },
    setPaired: (state, action: PayloadAction<boolean>) => {
      state.isPaired = action.payload;
    },
    setOrientation: (state, action: PayloadAction<DeviceOrientation>) => {
      state.orientation = action.payload;
    }
  }
});

export const { setDeviceIdentity, setPairingCode, setDeviceToken, setPaired, setOrientation } = deviceSlice.actions;
export default deviceSlice.reducer;
