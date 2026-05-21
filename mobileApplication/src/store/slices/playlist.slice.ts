import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { PlaylistItemModel } from '../../types/app.types';

interface PlaylistState {
  items: PlaylistItemModel[];
  currentIndex: number;
}

const initialState: PlaylistState = {
  items: [],
  currentIndex: 0
};

const playlistSlice = createSlice({
  name: 'playlist',
  initialState,
  reducers: {
    setPlaylist: (state, action: PayloadAction<PlaylistItemModel[]>) => {
      state.items = [...action.payload].sort((a, b) => a.order - b.order);
      state.currentIndex = 0;
    },
    setCurrentIndex: (state, action: PayloadAction<number>) => {
      state.currentIndex = action.payload;
    },
    moveNext: state => {
      if (state.items.length === 0) {
        state.currentIndex = 0;
        return;
      }

      state.currentIndex = (state.currentIndex + 1) % state.items.length;
    }
  }
});

export const { setPlaylist, setCurrentIndex, moveNext } = playlistSlice.actions;
export default playlistSlice.reducer;
