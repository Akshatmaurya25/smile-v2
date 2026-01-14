import React, { useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Image,
} from 'react-native';
import { PieChart } from 'react-native-gifted-charts';
import { colors, spacing, borderRadius, typography } from '../styles';
import { useAuthStore, useExpenseStore, useFriendStore } from '../store';
import { expensesApi, friendsApi } from '../api';

const HomeScreen: React.FC = () => {
  const { user } = useAuthStore();
  const { expenses, stats, isLoading, setExpenses, setStats, setLoading, setError, markFetched } = useExpenseStore();
  const { borrowings, setBorrowings } = useFriendStore();

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [statsData, borrowingsData, expensesResponse] = await Promise.all([
        expensesApi.getStats('month'),
        friendsApi.getBorrowings(),
        expensesApi.getExpenses({ limit: 20 }),
      ]);
      setStats(statsData);
      setBorrowings(borrowingsData);
      setExpenses(expensesResponse.data || []);
      markFetched();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, [setLoading, setStats, setBorrowings, setExpenses, markFetched, setError]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    }
  };

  // Prepare pie chart data
  const pieData = stats?.expensesByCategory.slice(0, 5).map((cat, index) => ({
    value: cat.total,
    color: ['#00FF88', '#00D4FF', '#FF00FF', '#FFD700', '#FF4444'][index % 5],
    text: `${cat.percentage.toFixed(0)}%`,
    label: cat.categoryName,
  })) || [];

  // Prepare bar chart data
  const barData = stats?.monthlyExpenses.map((month) => ({
    value: month.total,
    label: month.month.split('-')[1],
    frontColor: colors.primary,
  })) || [];

  const totalBorrowings = borrowings
    .filter((b) => b.type === 'owe' && !b.isPaid)
    .reduce((sum, b) => sum + b.amount, 0);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl
          refreshing={isLoading}
          onRefresh={fetchData}
          tintColor={colors.primary}
          colors={[colors.primary]}
        />
      }
    >
      {/* Header with greeting */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>{getGreeting()},</Text>
          <Text style={styles.userName}>
            {user?.displayName || user?.username || 'User'}
          </Text>
        </View>
        <TouchableOpacity style={styles.profileButton}>
          {user?.profileImage ? (
            <Image
              source={{ uri: user.profileImage }}
              style={styles.profileImage}
            />
          ) : (
            <View style={styles.profilePlaceholder}>
              <Text style={styles.profileInitial}>
                {(user?.displayName || user?.email || 'U').charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Main stats cards */}
      <View style={styles.statsContainer}>
        <View style={[styles.statCard, styles.incomeCard]}>
          <Text style={styles.statLabel}>Income</Text>
          <Text style={[styles.statValue, styles.incomeValue]}>
            {formatCurrency(stats?.totalIncome || 0)}
          </Text>
          <Text style={styles.statSubtext}>This month</Text>
        </View>

        <View style={[styles.statCard, styles.expenseCard]}>
          <Text style={styles.statLabel}>Expenses</Text>
          <Text style={[styles.statValue, styles.expenseValue]}>
            {formatCurrency(stats?.totalExpenses || 0)}
          </Text>
          <Text style={styles.statSubtext}>This month</Text>
        </View>

        <View style={[styles.statCard, styles.borrowingCard]}>
          <Text style={styles.statLabel}>Borrowings</Text>
          <Text style={[styles.statValue, styles.borrowingValue]}>
            {formatCurrency(totalBorrowings)}
          </Text>
          <Text style={styles.statSubtext}>You owe</Text>
        </View>
      </View>

      {/* Expense breakdown chart */}
      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>Expense Breakdown</Text>
        <Text style={styles.chartSubtitle}>This month by category</Text>

        {pieData.length > 0 ? (
          <View style={styles.pieChartContainer}>
            <PieChart
              data={pieData}
              donut
              radius={80}
              innerRadius={50}
              innerCircleColor={colors.card}
              centerLabelComponent={() => (
                <View style={styles.pieCenter}>
                  <Text style={styles.pieCenterAmount}>
                    {formatCurrency(stats?.totalExpenses || 0)}
                  </Text>
                  <Text style={styles.pieCenterLabel}>Total</Text>
                </View>
              )}
            />
            <View style={styles.legendContainer}>
              {pieData.map((item, index) => (
                <View key={index} style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                  <Text style={styles.legendText}>{item.label}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : (
          <View style={styles.emptyChart}>
            <Text style={styles.emptyChartText}>No expenses this month</Text>
          </View>
        )}
      </View>

      {/* Monthly trend chart - Custom simple bar chart */}
      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>Monthly Trend</Text>
        <Text style={styles.chartSubtitle}>Your spending over time</Text>

        {barData.length > 0 ? (
          <View style={styles.barChartContainer}>
            {(() => {
              const maxVal = Math.max(...barData.map((d) => d.value), 1);
              return barData.map((item, index) => (
                <View key={index} style={styles.barItem}>
                  <View style={styles.barWrapper}>
                    <View
                      style={[
                        styles.bar,
                        {
                          height: `${(item.value / maxVal) * 100}%`,
                          backgroundColor: item.frontColor,
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.barLabel}>{item.label}</Text>
                </View>
              ));
            })()}
          </View>
        ) : (
          <View style={styles.emptyChart}>
            <Text style={styles.emptyChartText}>No data available</Text>
          </View>
        )}
      </View>

      {/* Quick actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionIcon}>➕</Text>
          <Text style={styles.actionText}>Add Expense</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionIcon}>👥</Text>
          <Text style={styles.actionText}>Split Bill</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionIcon}>📈</Text>
          <Text style={styles.actionText}>View Reports</Text>
        </TouchableOpacity>
      </View>

      {/* Recent Transactions - Show all expenses */}
      <View style={styles.transactionsCard}>
        <Text style={styles.chartTitle}>Recent Transactions</Text>
        <Text style={styles.chartSubtitle}>All your expenses</Text>

        {expenses.length > 0 ? (
          <View style={styles.transactionsList}>
            {expenses.map((expense) => (
              <View key={expense.id} style={styles.transactionItem}>
                <View style={styles.transactionLeft}>
                  <View style={[styles.transactionIcon, { backgroundColor: expense.category?.color || colors.primary }]}>
                    <Text style={styles.transactionEmoji}>{expense.category?.icon || '📦'}</Text>
                  </View>
                  <View style={styles.transactionInfo}>
                    <Text style={styles.transactionDescription}>{expense.description}</Text>
                    <Text style={styles.transactionCategory}>{expense.category?.name || 'Uncategorized'}</Text>
                  </View>
                </View>
                <View style={styles.transactionRight}>
                  <Text style={styles.transactionAmount}>-{formatCurrency(Number(expense.amount))}</Text>
                  <Text style={styles.transactionDate}>{formatDate(expense.createdAt)}</Text>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.emptyTransactions}>
            <Text style={styles.emptyTransactionsText}>No transactions yet</Text>
            <Text style={styles.emptyTransactionsSubtext}>Add your first expense to get started</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentContainer: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xxl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  greeting: {
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
  },
  userName: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  profileButton: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  profileImage: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.full,
  },
  profilePlaceholder: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInitial: {
    fontSize: 18,
    fontWeight: typography.weights.bold,
    color: colors.background,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginHorizontal: spacing.xs,
  },
  incomeCard: {
    borderLeftWidth: 3,
    borderLeftColor: colors.income,
  },
  expenseCard: {
    borderLeftWidth: 3,
    borderLeftColor: colors.expense,
  },
  borrowingCard: {
    borderLeftWidth: 3,
    borderLeftColor: colors.borrowing,
  },
  statLabel: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  statValue: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
  },
  incomeValue: {
    color: colors.income,
  },
  expenseValue: {
    color: colors.expense,
  },
  borrowingValue: {
    color: colors.borrowing,
  },
  statSubtext: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  chartCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  chartTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  chartSubtitle: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  pieChartContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pieCenter: {
    alignItems: 'center',
  },
  pieCenterAmount: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  pieCenterLabel: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
  },
  legendContainer: {
    flex: 1,
    marginLeft: spacing.lg,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing.sm,
  },
  legendText: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
  },
  barChartContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    height: 150,
    paddingTop: spacing.md,
  },
  barItem: {
    alignItems: 'center',
    flex: 1,
  },
  barWrapper: {
    height: 120,
    width: 30,
    justifyContent: 'flex-end',
  },
  bar: {
    width: '100%',
    borderRadius: 4,
    minHeight: 4,
  },
  barLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  emptyChart: {
    height: 150,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyChartText: {
    color: colors.textMuted,
    fontSize: typography.sizes.sm,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginHorizontal: spacing.xs,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionIcon: {
    fontSize: 24,
    marginBottom: spacing.xs,
  },
  actionText: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
  },
  transactionsCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginTop: spacing.md,
  },
  transactionsList: {
    marginTop: spacing.sm,
  },
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  transactionEmoji: {
    fontSize: 18,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionDescription: {
    fontSize: typography.sizes.md,
    color: colors.text,
    fontWeight: typography.weights.medium,
  },
  transactionCategory: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  transactionRight: {
    alignItems: 'flex-end',
  },
  transactionAmount: {
    fontSize: typography.sizes.md,
    color: colors.expense,
    fontWeight: typography.weights.semibold,
  },
  transactionDate: {
    fontSize: typography.sizes.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
  emptyTransactions: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  emptyTransactionsText: {
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  emptyTransactionsSubtext: {
    fontSize: typography.sizes.sm,
    color: colors.textMuted,
  },
});

export default HomeScreen;
