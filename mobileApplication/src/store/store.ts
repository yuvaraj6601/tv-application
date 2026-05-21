import { configureStore } from '@reduxjs/toolkit';
import appReducer from './slices/app.slice';
import deviceReducer from './slices/device.slice';
import playlistReducer from './slices/playlist.slice';

export const signageStore = configureStore({
  reducer: {
    app: appReducer,
    device: deviceReducer,
    playlist: playlistReducer
  }
});

export type RootState = ReturnType<typeof signageStore.getState>;
export type AppDispatch = typeof signageStore.dispatch;
