import apiClient from './client';
import type { Notification, ApiResponse, PaginatedResponse } from '../types';

export const notificationsApi = {
  // Get user's notifications
  getNotifications: async (
    page: number = 1,
    limit: number = 20
  ): Promise<PaginatedResponse<Notification>> => {
    const response = await apiClient.get<PaginatedResponse<Notification>>(
      `/notifications?page=${page}&limit=${limit}`
    );
    return response.data;
  },

  // Mark notification as read
  markAsRead: async (notificationId: string): Promise<Notification> => {
    const response = await apiClient.patch<ApiResponse<Notification>>(
      `/notifications/${notificationId}/read`
    );
    return response.data.data;
  },

  // Mark all notifications as read
  markAllAsRead: async (): Promise<void> => {
    await apiClient.patch('/notifications/read-all');
  },

  // Delete notification
  deleteNotification: async (notificationId: string): Promise<void> => {
    await apiClient.delete(`/notifications/${notificationId}`);
  },

  // Get unread count
  getUnreadCount: async (): Promise<number> => {
    const response = await apiClient.get<ApiResponse<{ count: number }>>(
      '/notifications/unread-count'
    );
    return response.data.data.count;
  },
};
