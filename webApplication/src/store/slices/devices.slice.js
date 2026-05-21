import { createSlice } from '@reduxjs/toolkit';
const initialState = {
    list: []
};
const devicesSlice = createSlice({
    name: 'devices',
    initialState,
    reducers: {
        setDevices: (state, action) => {
            state.list = action.payload;
        }
    }
});
export const { setDevices } = devicesSlice.actions;
export default devicesSlice.reducer;
