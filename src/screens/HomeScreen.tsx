import React, { useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Image,
  Dimensions,
} from 'react-native';
import Svg, { Path, Circle, G, Defs, ClipPath, Rect } from 'react-native-svg';
import { colors, spacing, borderRadius, typography } from '../styles';
import { useAuthStore, useExpenseStore, useFriendStore, useSettingsStore } from '../store';
import { expensesApi, friendsApi, incomeApi } from '../api';
import type { Income } from '../types';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.42;

const HomeScreen: React.FC = () => {
  const { user } = useAuthStore();
  const { expenses, stats, isLoading, setExpenses, setStats, setLoading, setError, markFetched } = useExpenseStore();
  const { borrowings, setBorrowings } = useFriendStore();
  const { statsPeriod, monthlyIncome } = useSettingsStore();
  const [recentIncomes, setRecentIncomes] = React.useState<Income[]>([]);

  const getApiPeriod = () => {
    switch (statsPeriod) {
      case 'daily':
      case 'weekly':
        return 'week';
      case 'monthly':
        return 'month';
      default:
        return 'month';
    }
  };

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const results = await Promise.allSettled([
        expensesApi.getStats(getApiPeriod()),
        friendsApi.getBorrowings(),
        expensesApi.getExpenses({ limit: 20 }),
        incomeApi.getIncomes({ limit: 10 }),
      ]);

      if (results[0].status === 'fulfilled') {
        setStats(results[0].value);
      }
      if (results[1].status === 'fulfilled') {
        setBorrowings(results[1].value);
      }
      if (results[2].status === 'fulfilled') {
        setExpenses(results[2].value.data || []);
      }
      if (results[3].status === 'fulfilled') {
        setRecentIncomes(results[3].value.data || []);
      }
      markFetched();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, [setLoading, setStats, setBorrowings, setExpenses, markFetched, setError]);

  useEffect(() => {
    fetchData();
  }, [fetchData, statsPeriod]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'GOOD MORNING';
    if (hour < 17) return 'GOOD AFTERNOON';
    return 'GOOD EVENING';
  };

  const formatCurrency = (amount: number) => {
    if (amount >= 100000) {
      return `₹${(amount / 1000).toFixed(1)}k`;
    }
    return `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
  };

  const formatFullCurrency = (amount: number) => {
    return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return `Today, ${date.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true }).toUpperCase()}`;
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return `${Math.floor((today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))} days ago`;
    }
  };

  // Prepare chart data
  const pieData = (stats?.expensesByCategory || []).slice(0, 4).map((cat, index) => ({
    value: cat.total || 0,
    percentage: cat.percentage || 0,
    color: [colors.primary, colors.secondary, colors.accent, '#888888'][index % 4],
    name: cat.categoryName || 'Other',
  }));

  const barData = (stats?.monthlyExpenses || []).slice(-7).map((month, index, arr) => ({
    value: month.total || 0,
    label: ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'][index % 7],
    isHighlighted: index === Math.floor(arr.length / 2),
  }));

  const totalExpenses = stats?.totalExpenses || 0;
  const income = stats?.totalIncome || monthlyIncome || 0;
  const savings = Math.max(0, income - totalExpenses);

  // Calculate percentages for donut chart
  const calculateStrokeDasharray = (percentage: number) => {
    return `${percentage}, ${100 - percentage}`;
  };

  const getCategoryIcon = (categoryName: string) => {
    const icons: { [key: string]: string } = {
      'Food & Dining': 'restaurant',
      'Transportation': 'commute',
      'Shopping': 'shopping_bag',
      'Entertainment': 'movie',
      'Bills': 'receipt',
      'Health': 'medical_services',
      'Income': 'account_balance',
    };
    return icons[categoryName] || 'category';
  };

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
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.avatarContainer}>
            {user?.profileImage ? (
              <Image source={{ uri: user.profileImage }} style={styles.avatar} />
            ) : (
              <Text style={styles.avatarText}>
                {(user?.displayName || 'U').charAt(0).toUpperCase()}
              </Text>
            )}
          </View>
          <View>
            <Text style={styles.greeting}>{getGreeting()}</Text>
            <Text style={styles.userName}>{user?.displayName || 'User'}</Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.headerButton}>
            <Text style={styles.headerButtonIcon}>🔔</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerButton}>
            <Text style={styles.headerButtonIcon}>🔍</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Stats Cards */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.statsScrollContainer}
      >
        {/* Income Card */}
        <View style={[styles.statCard, styles.incomeCard]}>
          <Text style={styles.statLabel}>INCOME</Text>
          <Text style={[styles.statValue, { color: colors.primary }]}>
            {formatCurrency(income)}
          </Text>
          <View style={styles.statTrend}>
            <Text style={[styles.trendIcon, { color: colors.primary }]}>↗</Text>
            <Text style={[styles.trendText, { color: colors.primary }]}>+12%</Text>
          </View>
        </View>

        {/* Expenses Card */}
        <View style={[styles.statCard, styles.expenseCard]}>
          <Text style={styles.statLabel}>EXPENSES</Text>
          <Text style={[styles.statValue, { color: colors.expense }]}>
            {formatCurrency(totalExpenses)}
          </Text>
          <View style={styles.statTrend}>
            <Text style={[styles.trendIcon, { color: colors.expense }]}>↘</Text>
            <Text style={[styles.trendText, { color: colors.expense }]}>-5%</Text>
          </View>
        </View>

        {/* Savings Card */}
        <View style={[styles.statCard, styles.savingsCard]}>
          <Text style={styles.statLabel}>SAVINGS</Text>
          <Text style={[styles.statValue, { color: colors.secondary }]}>
            {formatCurrency(savings)}
          </Text>
          <View style={styles.statTrend}>
            <Text style={[styles.trendIcon, { color: colors.secondary }]}>◎</Text>
            <Text style={[styles.trendText, { color: colors.secondary }]}>85% Goal</Text>
          </View>
        </View>
      </ScrollView>

      {/* Expense Breakdown */}
      <View style={[styles.chartCard, styles.breakdownCard]}>
        <View style={styles.chartHeader}>
          <Text style={styles.chartTitle}>Expense Breakdown</Text>
          <TouchableOpacity>
            <Text style={styles.chartAction}>DETAILS</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.breakdownContent}>
          {/* Donut Chart */}
          <View style={styles.donutContainer}>
            <Svg width={140} height={140} viewBox="0 0 36 36">
              <Circle
                cx="18"
                cy="18"
                r="15.9"
                fill="none"
                stroke="#333"
                strokeWidth="3"
              />
              {pieData.length > 0 && (
                <>
                  <Circle
                    cx="18"
                    cy="18"
                    r="15.9"
                    fill="none"
                    stroke={pieData[0]?.color || colors.primary}
                    strokeWidth="3.5"
                    strokeDasharray={calculateStrokeDasharray(pieData[0]?.percentage || 40)}
                    strokeLinecap="round"
                    transform="rotate(-90 18 18)"
                  />
                  {pieData[1] && (
                    <Circle
                      cx="18"
                      cy="18"
                      r="15.9"
                      fill="none"
                      stroke={pieData[1].color}
                      strokeWidth="3.5"
                      strokeDasharray={calculateStrokeDasharray(pieData[1].percentage || 25)}
                      strokeDashoffset={-(pieData[0]?.percentage || 40)}
                      strokeLinecap="round"
                      transform="rotate(-90 18 18)"
                    />
                  )}
                  {pieData[2] && (
                    <Circle
                      cx="18"
                      cy="18"
                      r="15.9"
                      fill="none"
                      stroke={pieData[2].color}
                      strokeWidth="3.5"
                      strokeDasharray={calculateStrokeDasharray(pieData[2].percentage || 20)}
                      strokeDashoffset={-((pieData[0]?.percentage || 40) + (pieData[1]?.percentage || 25))}
                      strokeLinecap="round"
                      transform="rotate(-90 18 18)"
                    />
                  )}
                </>
              )}
            </Svg>
            <View style={styles.donutCenter}>
              <Text style={styles.donutLabel}>TOTAL</Text>
              <Text style={styles.donutValue}>{formatCurrency(totalExpenses)}</Text>
            </View>
          </View>

          {/* Legend */}
          <View style={styles.legendContainer}>
            {(pieData.length > 0 ? pieData : [
              { name: 'Food', percentage: 40, color: colors.primary },
              { name: 'Transport', percentage: 25, color: colors.secondary },
              { name: 'Shopping', percentage: 20, color: colors.accent },
            ]).map((item, index) => (
              <View key={index} style={styles.legendItem}>
                <View style={styles.legendLeft}>
                  <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                  <Text style={styles.legendText}>{item.name}</Text>
                </View>
                <Text style={[styles.legendPercent, { color: item.color }]}>
                  {item.percentage.toFixed(0)}%
                </Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* Monthly Trend */}
      <View style={[styles.chartCard, styles.trendCard]}>
        <View style={styles.chartHeader}>
          <Text style={styles.chartTitle}>Weekly Spending</Text>
          <TouchableOpacity>
            <Text style={styles.chartAction}>THIS WEEK</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.barChartContainer}>
          {/* Bars */}
          <View style={styles.barsContainer}>
            {(() => {
              const weeklyData = stats?.weeklyExpenses || [];
              const maxValue = Math.max(...weeklyData.map(d => d.total), 1000);
              const barColors = [
                colors.secondary,
                colors.primary,
                colors.accent,
                colors.primary,
                colors.secondary,
                colors.accent,
                colors.secondary,
              ];
              const highestIndex = weeklyData.reduce((maxIdx, curr, idx, arr) =>
                curr.total > arr[maxIdx].total ? idx : maxIdx, 0);

              return weeklyData.map((item, index) => {
                const heightPercent = maxValue > 0
                  ? Math.max(Math.min((item.total / maxValue) * 100, 100), 8)
                  : 8;
                const isHighlighted = index === highestIndex && item.total > 0;
                return (
                  <View key={index} style={styles.barWrapper}>
                    <Text style={styles.barValue}>
                      {item.total >= 1000 ? `₹${(item.total / 1000).toFixed(1)}k` : `₹${item.total.toFixed(0)}`}
                    </Text>
                    <View style={styles.barTrack}>
                      <View
                        style={[
                          styles.bar,
                          {
                            height: `${heightPercent}%`,
                            backgroundColor: isHighlighted ? colors.primary : barColors[index],
                            shadowColor: isHighlighted ? colors.primary : barColors[index],
                            shadowOpacity: isHighlighted ? 0.6 : 0.3,
                            shadowRadius: 8,
                            shadowOffset: { width: 0, height: 0 },
                          },
                        ]}
                      />
                    </View>
                    <Text style={[
                      styles.barLabel,
                      isHighlighted && { color: colors.primary }
                    ]}>{item.dayName}</Text>
                  </View>
                );
              });
            })()}
          </View>
        </View>

        {/* Week Summary */}
        {(() => {
          const weeklyData = stats?.weeklyExpenses || [];
          const totals = weeklyData.map(d => d.total);
          const highest = weeklyData.reduce((max, curr) => curr.total > max.total ? curr : max, { dayName: '-', total: 0 });
          const lowest = weeklyData.filter(d => d.total > 0).reduce((min, curr) => curr.total < min.total ? curr : min, { dayName: '-', total: Infinity });
          const sum = totals.reduce((a, b) => a + b, 0);
          const average = weeklyData.length > 0 ? sum / weeklyData.length : 0;

          return (
            <View style={styles.weekSummary}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryItemLabel}>HIGHEST</Text>
                <Text style={[styles.summaryItemValue, { color: colors.error }]}>
                  {highest.dayName} {highest.total >= 1000 ? `₹${(highest.total / 1000).toFixed(1)}k` : `₹${highest.total.toFixed(0)}`}
                </Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Text style={styles.summaryItemLabel}>LOWEST</Text>
                <Text style={[styles.summaryItemValue, { color: colors.primary }]}>
                  {lowest.total === Infinity ? '-' : `${lowest.dayName} ${lowest.total >= 1000 ? `₹${(lowest.total / 1000).toFixed(1)}k` : `₹${lowest.total.toFixed(0)}`}`}
                </Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Text style={styles.summaryItemLabel}>AVERAGE</Text>
                <Text style={[styles.summaryItemValue, { color: colors.secondary }]}>
                  {average >= 1000 ? `₹${(average / 1000).toFixed(1)}k` : `₹${average.toFixed(0)}`}/day
                </Text>
              </View>
            </View>
          );
        })()}
      </View>

      {/* Recent Activity */}
      <View style={styles.activitySection}>
        <View style={styles.activityHeader}>
          <Text style={styles.chartTitle}>Recent Activity</Text>
          <TouchableOpacity>
            <Text style={styles.chartAction}>VIEW HISTORY</Text>
          </TouchableOpacity>
        </View>

        {(() => {
          // Combine expenses and incomes into a single activity list
          const activities = [
            ...expenses.map((expense) => {
              // Calculate user's actual portion: Total paid - What others owe (splits)
              const totalPaid = Number(expense.amount);
              const splitsTotal = (expense.splits || []).reduce(
                (sum, split) => sum + Number(split.amount),
                0
              );
              const userPortion = totalPaid - splitsTotal;

              return {
                id: expense.id,
                description: expense.description,
                amount: userPortion,
                category: expense.category?.name || 'Other',
                icon: expense.category?.icon || '💸',
                createdAt: expense.createdAt,
                type: 'expense' as const,
              };
            }),
            ...recentIncomes.map((income) => ({
              id: income.id,
              description: income.description,
              amount: Number(income.amount),
              category: income.source || 'Income',
              icon: '💰',
              createdAt: income.createdAt,
              type: 'income' as const,
            })),
          ]
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .slice(0, 5);

          if (activities.length === 0) {
            return (
              <View style={styles.emptyActivity}>
                <Text style={styles.emptyText}>No recent transactions</Text>
                <Text style={styles.emptySubtext}>Add your first expense to get started</Text>
              </View>
            );
          }

          return activities.map((activity, index) => {
            const isIncome = activity.type === 'income';

            return (
              <View
                key={activity.id || index}
                style={[
                  styles.activityCard,
                  { borderColor: isIncome ? colors.primaryGlow : 'rgba(255, 68, 68, 0.3)' },
                ]}
              >
                <View style={styles.activityLeft}>
                  <View
                    style={[
                      styles.activityIcon,
                      { backgroundColor: isIncome ? 'rgba(0, 255, 136, 0.1)' : 'rgba(255, 68, 68, 0.1)' },
                    ]}
                  >
                    <Text style={{ fontSize: 20 }}>
                      {activity.icon}
                    </Text>
                  </View>
                  <View>
                    <Text style={styles.activityTitle}>{activity.description}</Text>
                    <Text style={styles.activitySubtitle}>
                      {activity.category} • {formatDate(activity.createdAt)}
                    </Text>
                  </View>
                </View>
                <Text
                  style={[
                    styles.activityAmount,
                    { color: isIncome ? colors.primary : colors.expense },
                  ]}
                >
                  {isIncome ? '+' : '-'}{formatFullCurrency(activity.amount)}
                </Text>
              </View>
            );
          });
        })()}
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
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.lg,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatarContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    background: `linear-gradient(${colors.primary}, ${colors.secondary}, ${colors.accent})`,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  greeting: {
    fontSize: 10,
    fontWeight: typography.weights.bold,
    color: colors.textMuted,
    letterSpacing: 2,
  },
  userName: {
    fontSize: 20,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  headerRight: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  headerButtonIcon: {
    fontSize: 18,
  },
  statsScrollContainer: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  statCard: {
    width: CARD_WIDTH,
    padding: spacing.lg,
    borderRadius: 24,
    backgroundColor: colors.glass,
    borderWidth: 1,
  },
  incomeCard: {
    borderColor: colors.primaryGlow,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 15,
  },
  expenseCard: {
    borderColor: 'rgba(255, 68, 68, 0.3)',
    shadowColor: colors.expense,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 15,
  },
  savingsCard: {
    borderColor: colors.secondaryGlow,
    shadowColor: colors.secondary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 15,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: typography.weights.bold,
    color: colors.textMuted,
    letterSpacing: 1.5,
    marginBottom: spacing.xs,
  },
  statValue: {
    fontSize: 22,
    fontWeight: typography.weights.bold,
  },
  statTrend: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  trendIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  trendText: {
    fontSize: 10,
    fontWeight: typography.weights.bold,
  },
  chartCard: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    padding: spacing.lg,
    borderRadius: 32,
    backgroundColor: colors.glass,
    borderWidth: 1,
  },
  breakdownCard: {
    borderColor: colors.accentGlow,
  },
  trendCard: {
    borderColor: colors.secondaryGlow,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  chartAction: {
    fontSize: 10,
    fontWeight: typography.weights.bold,
    color: colors.accent,
    letterSpacing: 1.5,
  },
  breakdownContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  donutContainer: {
    width: 140,
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
  },
  donutCenter: {
    position: 'absolute',
    alignItems: 'center',
  },
  donutLabel: {
    fontSize: 8,
    fontWeight: typography.weights.bold,
    color: colors.textMuted,
    letterSpacing: 1.5,
  },
  donutValue: {
    fontSize: 14,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  legendContainer: {
    flex: 1,
    marginLeft: spacing.lg,
    gap: spacing.md,
  },
  legendItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  legendLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  legendPercent: {
    fontSize: 12,
    fontWeight: typography.weights.bold,
  },
  barChartContainer: {
    height: 160,
    marginTop: spacing.md,
  },
  barsContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xs,
  },
  barWrapper: {
    flex: 1,
    alignItems: 'center',
  },
  barValue: {
    fontSize: 9,
    fontWeight: typography.weights.bold,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  barTrack: {
    width: '65%',
    height: 100,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(50, 50, 50, 0.3)',
    borderRadius: 8,
    overflow: 'hidden',
  },
  bar: {
    width: '100%',
    borderRadius: 8,
    minHeight: 8,
  },
  barLabel: {
    fontSize: 10,
    fontWeight: typography.weights.bold,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
  weekSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryItemLabel: {
    fontSize: 8,
    fontWeight: typography.weights.bold,
    color: colors.textMuted,
    letterSpacing: 1,
  },
  summaryItemValue: {
    fontSize: 12,
    fontWeight: typography.weights.bold,
    marginTop: 4,
  },
  summaryDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  activitySection: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
  },
  activityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  activityCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: 24,
    backgroundColor: colors.glass,
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  activityLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  activityIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  activitySubtitle: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 2,
    textTransform: 'uppercase',
  },
  activityAmount: {
    fontSize: 14,
    fontWeight: typography.weights.bold,
  },
  emptyActivity: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  emptySubtext: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
});

export default HomeScreen;
