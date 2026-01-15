import apiClient from './client';
import type { Friend, Borrowing, ApiResponse } from '../types';

interface PendingRequestsResponse {
  received: (Friend & { type: 'received' })[];
  sent: (Friend & { type: 'sent' })[];
}

export const friendsApi = {
  // Get all friends
  getFriends: async (): Promise<Friend[]> => {
    const response = await apiClient.get<ApiResponse<Friend[]>>('/friends');
    return response.data.data;
  },

  // Get pending friend requests
  getPendingRequests: async (): Promise<PendingRequestsResponse> => {
    const response = await apiClient.get<ApiResponse<PendingRequestsResponse>>(
      '/friends/pending'
    );
    return response.data.data;
  },

  // Send friend request
  sendFriendRequest: async (userId: string): Promise<Friend> => {
    const response = await apiClient.post<ApiResponse<Friend>>(
      '/friends/request',
      { userId }
    );
    return response.data.data;
  },

  // Accept friend request
  acceptFriendRequest: async (friendshipId: string): Promise<Friend> => {
    const response = await apiClient.post<ApiResponse<Friend>>(
      `/friends/accept/${friendshipId}`
    );
    return response.data.data;
  },

  // Reject friend request
  rejectFriendRequest: async (friendshipId: string): Promise<void> => {
    await apiClient.post(`/friends/reject/${friendshipId}`);
  },

  // Remove friend
  removeFriend: async (friendshipId: string): Promise<void> => {
    await apiClient.delete(`/friends/${friendshipId}`);
  },

  // Get borrowings summary
  getBorrowings: async (): Promise<Borrowing[]> => {
    const response = await apiClient.get<ApiResponse<Borrowing[]>>('/borrowings');
    return response.data.data;
  },

  // Confirm payment (mark as paid)
  confirmPayment: async (borrowingId: string): Promise<Borrowing> => {
    const response = await apiClient.post<ApiResponse<Borrowing>>(
      `/borrowings/${borrowingId}/confirm`
    );
    return response.data.data;
  },

  // Get borrowings with a specific friend
  getBorrowingsWithFriend: async (friendId: string): Promise<Borrowing[]> => {
    const response = await apiClient.get<ApiResponse<Borrowing[]>>(
      `/borrowings/friend/${friendId}`
    );
    return response.data.data;
  },

  // Get borrowing history (cleared/paid)
  getBorrowingHistory: async (
    page: number = 1,
    limit: number = 20
  ): Promise<{ data: Borrowing[]; total: number; hasMore: boolean }> => {
    const response = await apiClient.get<{
      success: boolean;
      data: Borrowing[];
      total: number;
      page: number;
      limit: number;
      hasMore: boolean;
    }>(`/borrowings/history?page=${page}&limit=${limit}`);
    return {
      data: response.data.data,
      total: response.data.total,
      hasMore: response.data.hasMore,
    };
  },

  // Send payment reminder
  sendReminder: async (borrowingId: string): Promise<{ message: string }> => {
    const response = await apiClient.post<ApiResponse<{ message: string }>>(
      `/borrowings/${borrowingId}/remind`
    );
    return { message: response.data.message || 'Reminder sent' };
  },
};
