import axios from 'axios';
import { signageStore } from '../store/store';
import { config } from '../config';

const apiBaseUrl = config.apiBaseUrl;

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
