import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type StatsPeriod = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';

export interface PriorityCategory {
  id: string;
  name: string;
  icon: string | null;
}

interface SettingsState {
  statsPeriod: StatsPeriod;
  monthlyIncome: number;
  notificationsEnabled: boolean;
  priorityCategories: PriorityCategory[];

  // Actions
  setStatsPeriod: (period: StatsPeriod) => void;
  setMonthlyIncome: (income: number) => void;
  setNotificationsEnabled: (enabled: boolean) => void;
  setPriorityCategories: (categories: PriorityCategory[]) => void;
  reset: () => void;
}

const initialState = {
  statsPeriod: 'monthly' as StatsPeriod,
  monthlyIncome: 0,
  notificationsEnabled: true,
  priorityCategories: [] as PriorityCategory[],
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...initialState,

      setStatsPeriod: (period) => set({ statsPeriod: period }),

      setMonthlyIncome: (income) => set({ monthlyIncome: income }),

      setNotificationsEnabled: (enabled) => set({ notificationsEnabled: enabled }),

      setPriorityCategories: (categories) => set({ priorityCategories: categories }),

      reset: () => set(initialState),
    }),
    {
      name: 'smile-settings',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
