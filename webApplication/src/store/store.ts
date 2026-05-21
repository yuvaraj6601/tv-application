import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/auth.slice';
import devicesReducer from './slices/devices.slice';

export const dashboardStore = configureStore({
  reducer: {
    auth: authReducer,
    devices: devicesReducer
  }
});

export type RootState = ReturnType<typeof dashboardStore.getState>;
export type AppDispatch = typeof dashboardStore.dispatch;
