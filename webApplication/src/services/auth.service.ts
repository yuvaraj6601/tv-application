import { dashboardAxios } from '../utils/axios.utils';

interface LoginPayload {
  email: string;
  password: string;
}

interface RegisterPayload {
  email: string;
  password: string;
  confirmPassword: string;
}

interface LoginResponse {
  token: string;
  email: string;
}

interface LoginApiResponse {
  status: boolean;
  message: string;
  data: LoginResponse;
}

export const authService = {
  login: async (payload: LoginPayload): Promise<LoginResponse> => {
    const response = await dashboardAxios.post<LoginApiResponse>('/api/v1/auth/login', payload);
    return response.data.data;
  },
  register: async (payload: RegisterPayload): Promise<LoginResponse> => {
    const response = await dashboardAxios.post<LoginApiResponse>('/api/v1/auth/register', payload);
    return response.data.data;
  }
};
