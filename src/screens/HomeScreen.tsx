import React, { useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { PieChart, BarChart } from 'react-native-gifted-charts';
import { colors, spacing, borderRadius, typography } from '../styles';
import { useAuthStore, useExpenseStore, useFriendStore } from '../store';
import { expensesApi, friendsApi } from '../api';

const HomeScreen: React.FC = () => {
  const { user } = useAuthStore();
  const { stats, isLoading, setStats, setLoading, setError, markFetched } = useExpenseStore();
  const { borrowings, setBorrowings } = useFriendStore();

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [statsData, borrowingsData] = await Promise.all([
        expensesApi.getStats('month'),
        friendsApi.getBorrowings(),
      ]);
      setStats(statsData);
      setBorrowings(borrowingsData);
      markFetched();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, [setLoading, setStats, setBorrowings, markFetched, setError]);

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
        <TouchableOpacity style={styles.notificationButton}>
          <Text style={styles.notificationIcon}>🔔</Text>
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

      {/* Monthly trend chart */}
      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>Monthly Trend</Text>
        <Text style={styles.chartSubtitle}>Your spending over time</Text>

        {barData.length > 0 ? (
          <View style={styles.barChartContainer}>
            <BarChart
              data={barData}
              barWidth={30}
              spacing={20}
              roundedTop
              roundedBottom
              hideRules
              xAxisThickness={0}
              yAxisThickness={0}
              yAxisTextStyle={styles.chartAxisText}
              xAxisLabelTextStyle={styles.chartAxisText}
              noOfSections={4}
              maxValue={Math.max(...barData.map((d) => d.value)) * 1.2}
              isAnimated
            />
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
  notificationButton: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationIcon: {
    fontSize: 20,
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
    alignItems: 'center',
  },
  chartAxisText: {
    color: colors.textSecondary,
    fontSize: 10,
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
});

export default HomeScreen;
