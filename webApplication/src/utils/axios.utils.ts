import axios from 'axios';
import { dashboardStore } from '../store/store';

export const apiBaseUrl = "https://api-spatiabox.alterside.io";

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
