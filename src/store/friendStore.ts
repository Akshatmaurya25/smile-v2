import { create } from 'zustand';
import type { Friend, Borrowing, User } from '../types';

interface FriendState {
  friends: Friend[];
  pendingRequests: Friend[];
  borrowings: Borrowing[];
  searchResults: User[];
  isLoading: boolean;
  error: string | null;
  lastFetched: number | null;

  // Actions
  setFriends: (friends: Friend[]) => void;
  addFriend: (friend: Friend) => void;
  removeFriend: (id: string) => void;
  updateFriendStatus: (id: string, status: Friend['status']) => void;
  setPendingRequests: (requests: Friend[]) => void;
  addPendingRequest: (request: Friend) => void;
  removePendingRequest: (id: string) => void;
  setBorrowings: (borrowings: Borrowing[]) => void;
  updateBorrowing: (id: string, updates: Partial<Borrowing>) => void;
  setSearchResults: (results: User[]) => void;
  clearSearchResults: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  markFetched: () => void;
  shouldRefresh: () => boolean;
  reset: () => void;
}

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export const useFriendStore = create<FriendState>((set, get) => ({
  friends: [],
  pendingRequests: [],
  borrowings: [],
  searchResults: [],
  isLoading: false,
  error: null,
  lastFetched: null,

  setFriends: (friends) => set({ friends }),

  addFriend: (friend) =>
    set((state) => ({ friends: [...state.friends, friend] })),

  removeFriend: (id) =>
    set((state) => ({
      friends: state.friends.filter((f) => f.id !== id),
    })),

  updateFriendStatus: (id, status) =>
    set((state) => ({
      friends: state.friends.map((f) =>
        f.id === id ? { ...f, status } : f
      ),
    })),

  setPendingRequests: (pendingRequests) => set({ pendingRequests }),

  addPendingRequest: (request) =>
    set((state) => ({
      pendingRequests: [...state.pendingRequests, request],
    })),

  removePendingRequest: (id) =>
    set((state) => ({
      pendingRequests: state.pendingRequests.filter((r) => r.id !== id),
    })),

  setBorrowings: (borrowings) => set({ borrowings }),

  updateBorrowing: (id, updates) =>
    set((state) => ({
      borrowings: state.borrowings.map((b) =>
        b.id === id ? { ...b, ...updates } : b
      ),
    })),

  setSearchResults: (searchResults) => set({ searchResults }),

  clearSearchResults: () => set({ searchResults: [] }),

  setLoading: (isLoading) => set({ isLoading }),

  setError: (error) => set({ error }),

  markFetched: () => set({ lastFetched: Date.now() }),

  shouldRefresh: () => {
    const { lastFetched } = get();
    if (!lastFetched) return true;
    return Date.now() - lastFetched > CACHE_DURATION;
  },

  reset: () =>
    set({
      friends: [],
      pendingRequests: [],
      borrowings: [],
      searchResults: [],
      isLoading: false,
      error: null,
      lastFetched: null,
    }),
}));
