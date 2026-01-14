import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { Platform } from 'react-native';
import { useAuthStore } from '../store/authStore';
import type { ApiResponse } from '../types';

// Configure base URL
// Android emulator uses 10.0.2.2 to reach host machine's localhost
// iOS simulator can use localhost directly
const getBaseUrl = () => {
  if (__DEV__) {
    // Development mode
    if (Platform.OS === 'android') {
      return 'http://10.0.2.2:3000/api'; // Android emulator
    }
    return 'http://localhost:3000/api'; // iOS simulator
  }
  // Production - replace with your actual server URL
  return 'https://your-production-server.com/api';
};

const API_BASE_URL = getBaseUrl();
console.log('[API] Base URL:', API_BASE_URL);

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - add auth token and logging
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const tokens = useAuthStore.getState().tokens;
    if (tokens?.accessToken) {
      config.headers.Authorization = `Bearer ${tokens.accessToken}`;
    }
    console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('[API] Request error:', error);
    return Promise.reject(error);
  }
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
