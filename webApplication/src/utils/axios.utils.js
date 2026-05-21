import axios from 'axios';
import { dashboardStore } from '../store/store';
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
export const dashboardAxios = axios.create({
    baseURL: apiBaseUrl,
    timeout: 15000
});
dashboardAxios.interceptors.request.use(config => {
    const token = dashboardStore.getState().auth.token;
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});
