import apiClient from './client';
import type {
  Expense,
  Category,
  ExpenseStats,
  CreateExpenseInput,
  ApiResponse,
  PaginatedResponse,
} from '../types';

interface GetExpensesParams {
  page?: number;
  limit?: number;
  categoryId?: string;
  startDate?: string;
  endDate?: string;
}

export const expensesApi = {
  // Get user's expenses with optional filters
  getExpenses: async (params: GetExpensesParams = {}): Promise<PaginatedResponse<Expense>> => {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.categoryId) queryParams.append('categoryId', params.categoryId);
    if (params.startDate) queryParams.append('startDate', params.startDate);
    if (params.endDate) queryParams.append('endDate', params.endDate);

    const response = await apiClient.get<PaginatedResponse<Expense>>(
      `/expenses?${queryParams.toString()}`
    );
    return response.data;
  },

  // Get single expense by ID
  getExpenseById: async (expenseId: string): Promise<Expense> => {
    const response = await apiClient.get<ApiResponse<Expense>>(
      `/expenses/${expenseId}`
    );
    return response.data.data;
  },

  // Create new expense (with optional splits)
  createExpense: async (data: CreateExpenseInput): Promise<Expense> => {
    const response = await apiClient.post<ApiResponse<Expense>>(
      '/expenses',
      data
    );
    return response.data.data;
  },

  // Update expense
  updateExpense: async (
    expenseId: string,
    data: Partial<CreateExpenseInput>
  ): Promise<Expense> => {
    const response = await apiClient.patch<ApiResponse<Expense>>(
      `/expenses/${expenseId}`,
      data
    );
    return response.data.data;
  },

  // Delete expense
  deleteExpense: async (expenseId: string): Promise<void> => {
    await apiClient.delete(`/expenses/${expenseId}`);
  },

  // Get expense statistics for charts
  getStats: async (period?: 'week' | 'month' | 'year'): Promise<ExpenseStats> => {
    const url = period ? `/expenses/stats?period=${period}` : '/expenses/stats';
    const response = await apiClient.get<ApiResponse<ExpenseStats>>(url);
    return response.data.data;
  },

  // Get all categories (default + user's custom)
  getCategories: async (): Promise<Category[]> => {
    const response = await apiClient.get<ApiResponse<Category[]>>('/categories');
    return response.data.data;
  },

  // Create custom category
  createCategory: async (data: { name: string; icon?: string }): Promise<Category> => {
    const response = await apiClient.post<ApiResponse<Category>>(
      '/categories',
      data
    );
    return response.data.data;
  },

  // Delete custom category
  deleteCategory: async (categoryId: string): Promise<void> => {
    await apiClient.delete(`/categories/${categoryId}`);
  },
};
