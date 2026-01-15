import apiClient from './client';
import type { User, ApiResponse } from '../types';

interface UpdateProfileInput {
  username?: string;
  displayName?: string;
  profileImage?: string;
  currency?: string;
  savingsGoal?: number | null;
}

export const usersApi = {
  // Update user profile
  updateProfile: async (data: UpdateProfileInput): Promise<User> => {
    const response = await apiClient.patch<ApiResponse<User>>(
      '/users/profile',
      data
    );
    return response.data.data;
  },

  // Search users by username or email
  searchUsers: async (query: string): Promise<User[]> => {
    const response = await apiClient.get<ApiResponse<User[]>>(
      `/users/search?q=${encodeURIComponent(query)}`
    );
    return response.data.data;
  },

  // Get user by ID
  getUserById: async (userId: string): Promise<User> => {
    const response = await apiClient.get<ApiResponse<User>>(
      `/users/${userId}`
    );
    return response.data.data;
  },

  // Upload profile image (returns URL)
  uploadProfileImage: async (imageUri: string): Promise<string> => {
    const formData = new FormData();
    formData.append('image', {
      uri: imageUri,
      type: 'image/jpeg',
      name: 'profile.jpg',
    } as unknown as Blob);

    const response = await apiClient.post<ApiResponse<{ url: string }>>(
      '/users/upload-image',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data.data.url;
  },
};
