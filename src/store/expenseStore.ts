import { create } from 'zustand';
import type { Expense, Category, ExpenseStats, CreateExpenseInput } from '../types';

interface ExpenseState {
  expenses: Expense[];
  categories: Category[];
  stats: ExpenseStats | null;
  isLoading: boolean;
  error: string | null;
  lastFetched: number | null;

  // Actions
  setExpenses: (expenses: Expense[]) => void;
  addExpense: (expense: Expense) => void;
  updateExpense: (id: string, updates: Partial<Expense>) => void;
  deleteExpense: (id: string) => void;
  setCategories: (categories: Category[]) => void;
  addCategory: (category: Category) => void;
  setStats: (stats: ExpenseStats) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  markFetched: () => void;
  shouldRefresh: () => boolean;
  reset: () => void;
}

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export const useExpenseStore = create<ExpenseState>((set, get) => ({
  expenses: [],
  categories: [],
  stats: null,
  isLoading: false,
  error: null,
  lastFetched: null,

  setExpenses: (expenses) => set({ expenses }),

  addExpense: (expense) =>
    set((state) => ({ expenses: [expense, ...state.expenses] })),

  updateExpense: (id, updates) =>
    set((state) => ({
      expenses: state.expenses.map((e) =>
        e.id === id ? { ...e, ...updates } : e
      ),
    })),

  deleteExpense: (id) =>
    set((state) => ({
      expenses: state.expenses.filter((e) => e.id !== id),
    })),

  setCategories: (categories) => set({ categories }),

  addCategory: (category) =>
    set((state) => ({ categories: [...state.categories, category] })),

  setStats: (stats) => set({ stats }),

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
      expenses: [],
      categories: [],
      stats: null,
      isLoading: false,
      error: null,
      lastFetched: null,
    }),
}));
