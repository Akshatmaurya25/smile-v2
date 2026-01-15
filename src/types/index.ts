// User types
export interface User {
  id: string;
  email: string;
  username: string | null;
  displayName: string | null;
  profileImage: string | null;
  googleId: string;
  currency: Currency;
  createdAt: string;
  updatedAt: string;
}

// Currency types
export type Currency = 'INR' | 'USD' | 'EUR' | 'GBP' | 'JPY' | 'AUD' | 'CAD' | 'CHF' | 'CNY' | 'SGD';

export const CURRENCIES: { code: Currency; symbol: string; name: string }[] = [
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc' },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar' },
];

// Category types
export interface Category {
  id: string;
  name: string;
  icon: string | null;
  isDefault: boolean;
  userId: string | null;
}

export const DEFAULT_CATEGORIES: Omit<Category, 'id' | 'userId'>[] = [
  { name: 'Food & Dining', icon: '🍕', isDefault: true },
  { name: 'Transportation', icon: '🚗', isDefault: true },
  { name: 'Shopping', icon: '🛍️', isDefault: true },
  { name: 'Entertainment', icon: '🎬', isDefault: true },
  { name: 'Bills & Utilities', icon: '💡', isDefault: true },
  { name: 'Health', icon: '🏥', isDefault: true },
  { name: 'Travel', icon: '✈️', isDefault: true },
  { name: 'Education', icon: '📚', isDefault: true },
  { name: 'Groceries', icon: '🛒', isDefault: true },
  { name: 'Other', icon: '📦', isDefault: true },
];

// Income types
export type IncomeSource = 'Salary' | 'Freelance' | 'Investment' | 'Gift' | 'Refund' | 'Bonus' | 'Other';

export interface Income {
  id: string;
  amount: number;
  currency: Currency;
  description: string;
  source?: IncomeSource;
  date: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateIncomeInput {
  amount: number;
  currency?: Currency;
  description: string;
  source?: IncomeSource;
  date?: string;
}

export interface IncomeStats {
  totalIncome: number;
  incomeBySource: { source: string; total: number; percentage: number }[];
  monthlyIncome: { month: string; total: number }[];
}

// Expense types
export interface Expense {
  id: string;
  amount: number;
  currency: Currency;
  description: string;
  categoryId: string;
  category: Category;
  paidById: string;
  paidBy: User;
  splits: ExpenseSplit[];
  createdAt: string;
}

export interface ExpenseSplit {
  id: string;
  expenseId: string;
  userId: string;
  user: User;
  amount: number;
  isPaid: boolean;
  paidAt: string | null;
  confirmedByPayer: boolean;
  confirmedByPayee: boolean;
}

export interface CreateExpenseInput {
  amount: number;
  currency: Currency;
  description: string;
  categoryId: string;
  splits?: { userId: string; amount: number }[];
}

// Friend types
export type FriendshipStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'pending' | 'accepted' | 'rejected';

export interface Friendship {
  id: string;
  userId: string;
  user: User;
  friendId: string;
  friend: User;
  status: FriendshipStatus;
  createdAt: string;
}

export interface Friend {
  id: string;
  friendshipId: string;
  user: User;
  status: FriendshipStatus;
  type?: 'sent' | 'received'; // For pending requests
}

// Notification types
export type NotificationType = 'bill_split' | 'payment_request' | 'payment_confirmed' | 'friend_request';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data: Record<string, unknown> | null;
  isRead: boolean;
  createdAt: string;
}

// Stats types
export interface WeeklyExpense {
  day: string;
  dayName: string;
  total: number;
}

export interface ExpenseStats {
  totalIncome: number;
  totalExpenses: number;
  totalBorrowings: number;
  expensesByCategory: { categoryId: string; categoryName: string; categoryIcon?: string; total: number; percentage: number }[];
  weeklyExpenses: WeeklyExpense[];
  monthlyExpenses: { month: string; total: number }[];
}

// Borrowing types
export type BorrowingType = 'owe' | 'lent';

export interface Borrowing {
  id: string;
  fromUser: User;
  toUser: User;
  amount: number;
  currency: Currency;
  expense: Expense;
  isPaid: boolean;
  confirmedByPayer: boolean;
  confirmedByPayee: boolean;
  type: BorrowingType;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// Auth types
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface GoogleAuthResponse {
  user: User;
  tokens: AuthTokens;
  isNewUser: boolean;
}
