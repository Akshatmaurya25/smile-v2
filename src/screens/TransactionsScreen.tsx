import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Modal,
  TextInput,
  Platform,
  ScrollView,
} from 'react-native';
import { colors, spacing, typography } from '../styles';
import { useExpenseStore, useAuthStore } from '../store';
import { expensesApi, incomeApi } from '../api';
import { Toast } from '../components';
import type { Income, IncomeSource } from '../types';

type FilterType = 'all' | 'income' | 'expense';

interface Transaction {
  id: string;
  amount: number;
  description: string;
  category?: {
    id: string;
    name: string;
    icon?: string;
  };
  createdAt: string;
  type: 'income' | 'expense';
}

const INCOME_SOURCES: IncomeSource[] = ['Salary', 'Freelance', 'Investment', 'Gift', 'Refund', 'Bonus', 'Other'];

const TransactionsScreen: React.FC = () => {
  const { user } = useAuthStore();
  const { expenses, setExpenses, setStats } = useExpenseStore();

  const [filter, setFilter] = useState<FilterType>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [showAddIncomeModal, setShowAddIncomeModal] = useState(false);
  const [incomeAmount, setIncomeAmount] = useState('');
  const [incomeDescription, setIncomeDescription] = useState('');
  const [selectedSource, setSelectedSource] = useState<IncomeSource>('Other');
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' });

  const fetchTransactions = useCallback(async () => {
    try {
      setIsLoading(true);
      const [expensesResult, incomesResult] = await Promise.all([
        expensesApi.getExpenses({ limit: 50 }),
        incomeApi.getIncomes({ limit: 50 }),
      ]);
      setExpenses(expensesResult.data || []);
      setIncomes(incomesResult.data || []);
    } catch (err) {
      // Silent fail
    } finally {
      setIsLoading(false);
    }
  }, [setExpenses]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  // Combine incomes and expenses into transactions
  const transactions: Transaction[] = [
    // Map incomes
    ...incomes.map((income) => ({
      id: income.id,
      amount: Number(income.amount),
      description: income.description,
      category: { id: 'income', name: income.source || 'Income', icon: '💰' },
      createdAt: income.createdAt,
      type: 'income' as const,
    })),
    // Map expenses - calculate user's actual portion
    ...expenses.map((expense) => {
      // User's portion = Total paid - What others owe (splits)
      const totalPaid = Number(expense.amount);
      const splitsTotal = (expense.splits || []).reduce(
        (sum, split) => sum + Number(split.amount),
        0
      );
      const userPortion = totalPaid - splitsTotal;

      return {
        id: expense.id,
        amount: userPortion,
        description: expense.description,
        category: expense.category,
        createdAt: expense.createdAt,
        type: 'expense' as const,
      };
    }),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // Filter transactions
  const filteredTransactions = transactions.filter((t) => {
    if (filter === 'all') return true;
    return t.type === filter;
  });

  // Group transactions by date
  const groupedTransactions = filteredTransactions.reduce((groups, transaction) => {
    const date = new Date(transaction.createdAt).toDateString();
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(transaction);
    return groups;
  }, {} as Record<string, Transaction[]>);

  const groupedData = Object.entries(groupedTransactions).map(([date, items]) => ({
    date,
    data: items,
    total: items.reduce((sum, item) => {
      return item.type === 'income' ? sum + item.amount : sum - item.amount;
    }, 0),
  }));

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const formatCurrency = (amount: number) => {
    return `₹${Math.abs(amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-IN', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).toUpperCase();
  };

  const handleAddIncome = async () => {
    const amount = parseFloat(incomeAmount);
    if (!amount || amount <= 0) {
      setToast({ visible: true, message: 'Please enter a valid amount', type: 'error' });
      return;
    }

    try {
      // Create income entry using the Income API
      const incomeData = {
        amount,
        currency: (user?.currency || 'INR') as 'INR',
        description: incomeDescription || 'Income',
        source: selectedSource,
      };

      const newIncome = await incomeApi.createIncome(incomeData);
      setIncomes(prev => [newIncome, ...prev]);

      // Refresh stats
      expensesApi.getStats('month').then(setStats).catch(() => {});

      setShowAddIncomeModal(false);
      setIncomeAmount('');
      setIncomeDescription('');
      setSelectedSource('Other');
      setToast({ visible: true, message: 'Income added successfully!', type: 'success' });
    } catch (err) {
      setToast({
        visible: true,
        message: err instanceof Error ? err.message : 'Failed to add income',
        type: 'error'
      });
    }
  };

  const getTotalIncome = () => {
    return transactions
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
  };

  const getTotalExpense = () => {
    return transactions
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
  };

  const renderTransaction = ({ item }: { item: Transaction }) => {
    const isIncome = item.type === 'income';

    return (
      <View style={[
        styles.transactionCard,
        { borderColor: isIncome ? 'rgba(0, 255, 136, 0.3)' : 'rgba(255, 68, 68, 0.3)' }
      ]}>
        <View style={styles.transactionLeft}>
          <View style={[
            styles.transactionIcon,
            { backgroundColor: isIncome ? 'rgba(0, 255, 136, 0.1)' : 'rgba(255, 68, 68, 0.1)' }
          ]}>
            <Text style={styles.iconText}>{item.category?.icon || (isIncome ? '💰' : '💸')}</Text>
          </View>
          <View style={styles.transactionInfo}>
            <Text style={styles.transactionTitle}>{item.description}</Text>
            <Text style={styles.transactionSubtitle}>
              {item.category?.name || 'Other'} • {formatTime(item.createdAt)}
            </Text>
          </View>
        </View>
        <Text style={[
          styles.transactionAmount,
          { color: isIncome ? colors.primary : colors.error }
        ]}>
          {isIncome ? '+' : '-'}{formatCurrency(item.amount)}
        </Text>
      </View>
    );
  };

  const renderDateGroup = ({ item }: { item: typeof groupedData[0] }) => (
    <View style={styles.dateGroup}>
      <View style={styles.dateHeader}>
        <Text style={styles.dateText}>{formatDate(item.date)}</Text>
        <Text style={[
          styles.dateTotalText,
          { color: item.total >= 0 ? colors.primary : colors.error }
        ]}>
          {item.total >= 0 ? '+' : ''}{formatCurrency(item.total)}
        </Text>
      </View>
      {item.data.map((transaction) => (
        <View key={transaction.id}>
          {renderTransaction({ item: transaction })}
        </View>
      ))}
    </View>
  );

  return (
    <View style={styles.container}>
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={() => setToast({ ...toast, visible: false })}
      />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Transactions</Text>
        <TouchableOpacity
          style={styles.addIncomeButton}
          onPress={() => setShowAddIncomeModal(true)}
        >
          <Text style={styles.addIncomeText}>+ Add Income</Text>
        </TouchableOpacity>
      </View>

      {/* Summary Cards */}
      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, styles.incomeCard]}>
          <Text style={styles.summaryLabel}>TOTAL INCOME</Text>
          <Text style={[styles.summaryValue, { color: colors.primary }]}>
            {formatCurrency(getTotalIncome())}
          </Text>
        </View>
        <View style={[styles.summaryCard, styles.expenseCard]}>
          <Text style={styles.summaryLabel}>TOTAL EXPENSES</Text>
          <Text style={[styles.summaryValue, { color: colors.error }]}>
            {formatCurrency(getTotalExpense())}
          </Text>
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        {(['all', 'income', 'expense'] as FilterType[]).map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterTab, filter === f && styles.filterTabActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Transactions List */}
      <FlatList
        data={groupedData}
        keyExtractor={(item) => item.date}
        renderItem={renderDateGroup}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={fetchTransactions}
            tintColor={colors.primary}
          />
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyText}>No transactions yet</Text>
            <Text style={styles.emptySubtext}>
              Add income or expenses to see them here
            </Text>
          </View>
        }
      />

      {/* Add Income Modal */}
      <Modal
        visible={showAddIncomeModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowAddIncomeModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Income</Text>
              <TouchableOpacity onPress={() => setShowAddIncomeModal(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.amountSection}>
              <Text style={styles.amountLabel}>AMOUNT</Text>
              <View style={styles.amountRow}>
                <Text style={styles.currencySymbol}>₹</Text>
                <TextInput
                  style={styles.amountInput}
                  value={incomeAmount}
                  onChangeText={setIncomeAmount}
                  placeholder="0.00"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="decimal-pad"
                  autoFocus
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>SOURCE</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.sourceContainer}
              >
                {INCOME_SOURCES.map((source) => (
                  <TouchableOpacity
                    key={source}
                    style={[
                      styles.sourceChip,
                      selectedSource === source && styles.sourceChipActive,
                    ]}
                    onPress={() => setSelectedSource(source)}
                  >
                    <Text
                      style={[
                        styles.sourceChipText,
                        selectedSource === source && styles.sourceChipTextActive,
                      ]}
                    >
                      {source}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>DESCRIPTION (OPTIONAL)</Text>
              <TextInput
                style={styles.textInput}
                value={incomeDescription}
                onChangeText={setIncomeDescription}
                placeholder="e.g., Monthly salary, Project payment"
                placeholderTextColor={colors.textMuted}
              />
            </View>

            <TouchableOpacity style={styles.submitButton} onPress={handleAddIncome}>
              <Text style={styles.submitButtonText}>ADD INCOME</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: Platform.OS === 'ios' ? 60 : spacing.xl,
    paddingBottom: spacing.md,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.5,
  },
  addIncomeButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
  },
  addIncomeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.background,
  },
  // Summary
  summaryRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: 'rgba(25, 25, 25, 0.7)',
    borderRadius: 20,
    padding: spacing.md,
    borderWidth: 1,
  },
  incomeCard: {
    borderColor: 'rgba(0, 255, 136, 0.3)',
  },
  expenseCard: {
    borderColor: 'rgba(255, 68, 68, 0.3)',
  },
  summaryLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 1,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '800',
    marginTop: 4,
  },
  // Filter
  filterContainer: {
    flexDirection: 'row',
    marginHorizontal: spacing.lg,
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 4,
    marginBottom: spacing.md,
  },
  filterTab: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: 10,
  },
  filterTabActive: {
    backgroundColor: colors.primary,
  },
  filterText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 1,
  },
  filterTextActive: {
    color: colors.background,
  },
  // List
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 100,
  },
  dateGroup: {
    marginBottom: spacing.lg,
  },
  dateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  dateText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 1,
  },
  dateTotalText: {
    fontSize: 12,
    fontWeight: '700',
  },
  // Transaction Card
  transactionCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(25, 25, 25, 0.7)',
    borderRadius: 20,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  transactionIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  iconText: {
    fontSize: 20,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  transactionSubtitle: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 2,
    textTransform: 'uppercase',
  },
  transactionAmount: {
    fontSize: 14,
    fontWeight: '800',
  },
  // Empty State
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
  },
  modalClose: {
    fontSize: 24,
    color: colors.textSecondary,
  },
  amountSection: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  amountLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 2,
    marginBottom: spacing.sm,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  currencySymbol: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.primary,
    marginRight: spacing.sm,
  },
  amountInput: {
    fontSize: 48,
    fontWeight: '900',
    color: colors.primary,
    minWidth: 150,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: spacing.lg,
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 2,
    marginBottom: spacing.sm,
  },
  textInput: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: spacing.md,
    color: colors.text,
    fontSize: 14,
  },
  submitButton: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 15,
  },
  submitButtonText: {
    color: colors.background,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 2,
  },
  // Source selector
  sourceContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  sourceChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  sourceChipActive: {
    backgroundColor: 'rgba(0, 255, 136, 0.15)',
    borderColor: colors.primary,
  },
  sourceChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
  },
  sourceChipTextActive: {
    color: colors.primary,
  },
});

export default TransactionsScreen;
