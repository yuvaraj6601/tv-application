import axios from 'axios';
import { signageStore } from '../store/store';

const apiBaseUrl = process.env.API_BASE_URL || '';

export const mobileAxios = axios.create({
  baseURL: apiBaseUrl,
  timeout: 15000
});

mobileAxios.interceptors.request.use(config => {
  const token = signageStore.getState().device.deviceToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

mobileAxios.interceptors.response.use(
  response => response,
  error => {
    return Promise.reject(error);
  }
);
