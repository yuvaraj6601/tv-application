import { dashboardAxios } from '../utils/axios.utils';
export const authService = {
    login: async (payload) => {
        const response = await dashboardAxios.post('/api/v1/auth/login', payload);
        return response.data.data;
    }
};
