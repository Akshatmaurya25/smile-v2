import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '../store/authStore';
import type { ApiResponse } from '../types';

// Configure base URL - will be set from environment
const API_BASE_URL = process.env.API_URL || 'http://localhost:3000/api';

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - add auth token
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const tokens = useAuthStore.getState().tokens;
    if (tokens?.accessToken) {
      config.headers.Authorization = `Bearer ${tokens.accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle errors and token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiResponse<null>>) => {
    const originalRequest = error.config;

    // Handle 401 - token expired
    if (error.response?.status === 401 && originalRequest) {
      const tokens = useAuthStore.getState().tokens;

      if (tokens?.refreshToken) {
        try {
          // Attempt to refresh token
          const response = await axios.post<ApiResponse<{ accessToken: string }>>(
            `${API_BASE_URL}/auth/refresh`,
            { refreshToken: tokens.refreshToken }
          );

          if (response.data.success) {
            const newAccessToken = response.data.data.accessToken;

            // Update tokens in store
            useAuthStore.getState().setTokens({
              ...tokens,
              accessToken: newAccessToken,
            });

            // Retry original request
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
            return apiClient(originalRequest);
          }
        } catch (refreshError) {
          // Refresh failed - logout user
          useAuthStore.getState().logout();
        }
      } else {
        // No refresh token - logout user
        useAuthStore.getState().logout();
      }
    }

    // Extract error message
    const errorMessage =
      error.response?.data?.message ||
      error.message ||
      'An unexpected error occurred';

    return Promise.reject(new Error(errorMessage));
  }
);

export default apiClient;

// Helper function for making typed requests
export async function apiRequest<T>(
  method: 'get' | 'post' | 'put' | 'patch' | 'delete',
  url: string,
  data?: unknown
): Promise<T> {
  const response = await apiClient.request<ApiResponse<T>>({
    method,
    url,
    data,
  });
  return response.data.data;
}
