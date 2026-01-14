import apiClient from './client';
import type { User, GoogleAuthResponse, ApiResponse } from '../types';

export const authApi = {
  // Authenticate with Google OAuth token
  googleAuth: async (idToken: string): Promise<GoogleAuthResponse> => {
    const response = await apiClient.post<ApiResponse<GoogleAuthResponse>>(
      '/auth/google',
      { idToken }
    );
    return response.data.data;
  },

  // Get current authenticated user
  getCurrentUser: async (): Promise<User> => {
    const response = await apiClient.get<ApiResponse<User>>('/auth/me');
    return response.data.data;
  },

  // Refresh access token
  refreshToken: async (refreshToken: string): Promise<{ accessToken: string }> => {
    const response = await apiClient.post<ApiResponse<{ accessToken: string }>>(
      '/auth/refresh',
      { refreshToken }
    );
    return response.data.data;
  },

  // Logout - invalidate tokens on server
  logout: async (): Promise<void> => {
    await apiClient.post('/auth/logout');
  },
};
