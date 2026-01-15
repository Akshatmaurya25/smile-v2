import apiClient from './client';
import type {
  Income,
  IncomeStats,
  CreateIncomeInput,
  ApiResponse,
  PaginatedResponse,
  IncomeSource,
} from '../types';

interface GetIncomeParams {
  page?: number;
  limit?: number;
  source?: IncomeSource;
  startDate?: string;
  endDate?: string;
}

export const incomeApi = {
  // Get user's income entries
  getIncomes: async (params: GetIncomeParams = {}): Promise<PaginatedResponse<Income>> => {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.source) queryParams.append('source', params.source);
    if (params.startDate) queryParams.append('startDate', params.startDate);
    if (params.endDate) queryParams.append('endDate', params.endDate);

    const response = await apiClient.get<PaginatedResponse<Income>>(
      `/income?${queryParams.toString()}`
    );
    return response.data;
  },

  // Get single income entry
  getIncomeById: async (incomeId: string): Promise<Income> => {
    const response = await apiClient.get<ApiResponse<Income>>(
      `/income/${incomeId}`
    );
    return response.data.data;
  },

  // Create new income entry
  createIncome: async (data: CreateIncomeInput): Promise<Income> => {
    const response = await apiClient.post<ApiResponse<Income>>(
      '/income',
      data
    );
    return response.data.data;
  },

  // Update income entry
  updateIncome: async (
    incomeId: string,
    data: Partial<CreateIncomeInput>
  ): Promise<Income> => {
    const response = await apiClient.patch<ApiResponse<Income>>(
      `/income/${incomeId}`,
      data
    );
    return response.data.data;
  },

  // Delete income entry
  deleteIncome: async (incomeId: string): Promise<void> => {
    await apiClient.delete(`/income/${incomeId}`);
  },

  // Get income statistics
  getStats: async (period?: 'week' | 'month' | 'year'): Promise<IncomeStats> => {
    const url = period ? `/income/stats?period=${period}` : '/income/stats';
    const response = await apiClient.get<ApiResponse<IncomeStats>>(url);
    return response.data.data;
  },

  // Get available income sources
  getSources: async (): Promise<IncomeSource[]> => {
    const response = await apiClient.get<ApiResponse<IncomeSource[]>>('/income/sources');
    return response.data.data;
  },
};
