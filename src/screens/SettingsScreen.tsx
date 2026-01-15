import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Linking,
  Modal,
  TextInput,
  Platform,
  Alert,
} from 'react-native';
import { colors, spacing, borderRadius, typography } from '../styles';
import { useSettingsStore, StatsPeriod, useAuthStore } from '../store';
import { usersApi } from '../api';

const STATS_PERIODS: { value: StatsPeriod; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' },
];

interface SettingRowProps {
  icon: string;
  iconColor: string;
  iconBg: string;
  label: string;
  sublabel?: string;
  value?: string;
  valueColor?: string;
  onPress?: () => void;
  showChevron?: boolean;
  rightElement?: React.ReactNode;
  showBorder?: boolean;
}

const SettingRow: React.FC<SettingRowProps> = ({
  icon,
  iconColor,
  iconBg,
  label,
  sublabel,
  value,
  valueColor = colors.primary,
  onPress,
  showChevron = true,
  rightElement,
  showBorder = true,
}) => (
  <TouchableOpacity
    style={[styles.settingRow, !showBorder && styles.settingRowNoBorder]}
    onPress={onPress}
    disabled={!onPress}
    activeOpacity={onPress ? 0.7 : 1}
  >
    <View style={styles.settingLeft}>
      <View style={[styles.settingIcon, { backgroundColor: iconBg }]}>
        <Text style={[styles.settingIconText, { color: iconColor }]}>{icon}</Text>
      </View>
      <View>
        <Text style={styles.settingLabel}>{label}</Text>
        {sublabel && <Text style={styles.settingSublabel}>{sublabel}</Text>}
      </View>
    </View>
    {rightElement || (
      <View style={styles.settingRight}>
        {value && <Text style={[styles.settingValue, { color: valueColor }]}>{value}</Text>}
        {showChevron && <Text style={styles.chevron}>›</Text>}
      </View>
    )}
  </TouchableOpacity>
);

const SettingsScreen: React.FC = () => {
  const { logout, user, setUser } = useAuthStore();
  const {
    statsPeriod,
    monthlyIncome,
    notificationsEnabled,
    setStatsPeriod,
    setMonthlyIncome,
    setNotificationsEnabled,
  } = useSettingsStore();

  const [showPeriodModal, setShowPeriodModal] = useState(false);
  const [showIncomeModal, setShowIncomeModal] = useState(false);
  const [showSavingsGoalModal, setShowSavingsGoalModal] = useState(false);
  const [incomeInput, setIncomeInput] = useState(monthlyIncome.toString());
  const [savingsGoalInput, setSavingsGoalInput] = useState('');
  const [savingsGoal, setSavingsGoal] = useState<number | null>(null);
  const [biometricsEnabled, setBiometricsEnabled] = useState(true);
  const [cloudBackupEnabled, setCloudBackupEnabled] = useState(false);

  useEffect(() => {
    if (user?.savingsGoal) {
      setSavingsGoal(user.savingsGoal);
      setSavingsGoalInput(user.savingsGoal.toString());
    }
  }, [user?.savingsGoal]);

  const handleSaveIncome = () => {
    const income = parseFloat(incomeInput) || 0;
    setMonthlyIncome(income);
    setShowIncomeModal(false);
  };

  const handleSaveSavingsGoal = async () => {
    const goal = parseFloat(savingsGoalInput) || 0;
    try {
      const updatedUser = await usersApi.updateProfile({ savingsGoal: goal > 0 ? goal : null });
      setSavingsGoal(goal > 0 ? goal : null);
      if (setUser) setUser(updatedUser);
      setShowSavingsGoalModal(false);
    } catch (err) {
      Alert.alert('Error', 'Failed to update savings goal');
    }
  };

  const formatCurrency = (amount: number) => {
    if (amount === 0) return 'Not set';
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  const getPeriodLabel = () => {
    return STATS_PERIODS.find((p) => p.value === statsPeriod)?.label || 'Monthly';
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: logout },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity style={styles.backButton}>
            <Text style={styles.backIcon}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Settings</Text>
        </View>
        <TouchableOpacity>
          <Text style={styles.saveText}>SAVE</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Personalization Section */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>PERSONALIZATION</Text>
          <View style={[styles.glassCard, styles.greenCard]}>
            <SettingRow
              icon="💰"
              iconColor={colors.primary}
              iconBg="rgba(0, 255, 136, 0.1)"
              label="Monthly Income"
              sublabel="PRIMARY BUDGET BASE"
              value={formatCurrency(monthlyIncome)}
              onPress={() => {
                setIncomeInput(monthlyIncome.toString());
                setShowIncomeModal(true);
              }}
            />
            <SettingRow
              icon="🎯"
              iconColor={colors.secondary}
              iconBg="rgba(0, 212, 255, 0.1)"
              label="Savings Goal"
              sublabel="MONTHLY TARGET"
              value={savingsGoal ? formatCurrency(savingsGoal) : 'Not set'}
              valueColor={colors.secondary}
              onPress={() => {
                setSavingsGoalInput(savingsGoal?.toString() || '');
                setShowSavingsGoalModal(true);
              }}
            />
            <SettingRow
              icon="📅"
              iconColor={colors.accent}
              iconBg="rgba(255, 0, 255, 0.1)"
              label="Stats Period"
              sublabel="DEFAULT DASHBOARD VIEW"
              value={getPeriodLabel()}
              valueColor={colors.accent}
              onPress={() => setShowPeriodModal(true)}
              showBorder={false}
            />
          </View>
        </View>

        {/* Preferences Section */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>PREFERENCES</Text>
          <View style={[styles.glassCard, styles.whiteCard]}>
            <SettingRow
              icon="🔔"
              iconColor={colors.accent}
              iconBg="rgba(255, 0, 255, 0.1)"
              label="Push Notifications"
              showChevron={false}
              rightElement={
                <Switch
                  value={notificationsEnabled}
                  onValueChange={setNotificationsEnabled}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor={colors.text}
                  ios_backgroundColor={colors.border}
                />
              }
            />
            <SettingRow
              icon="👆"
              iconColor={colors.primary}
              iconBg="rgba(0, 255, 136, 0.1)"
              label="Face ID / Biometrics"
              showChevron={false}
              rightElement={
                <Switch
                  value={biometricsEnabled}
                  onValueChange={setBiometricsEnabled}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor={colors.text}
                  ios_backgroundColor={colors.border}
                />
              }
            />
            <SettingRow
              icon="☁️"
              iconColor={colors.error}
              iconBg="rgba(255, 68, 68, 0.1)"
              label="Cloud Backup"
              showChevron={false}
              showBorder={false}
              rightElement={
                <Switch
                  value={cloudBackupEnabled}
                  onValueChange={setCloudBackupEnabled}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor={colors.text}
                  ios_backgroundColor={colors.border}
                />
              }
            />
          </View>
        </View>

        {/* About Section */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>ABOUT</Text>
          <View style={[styles.glassCard, styles.cyanCard]}>
            <SettingRow
              icon="📄"
              iconColor={colors.secondary}
              iconBg="rgba(0, 212, 255, 0.1)"
              label="Terms of Service"
              showChevron={false}
              onPress={() => Linking.openURL('https://example.com/terms')}
              rightElement={<Text style={styles.externalIcon}>↗</Text>}
            />
            <SettingRow
              icon="🔒"
              iconColor={colors.secondary}
              iconBg="rgba(0, 212, 255, 0.1)"
              label="Privacy Policy"
              showChevron={false}
              onPress={() => Linking.openURL('https://example.com/privacy')}
              rightElement={<Text style={styles.externalIcon}>↗</Text>}
            />
            <SettingRow
              icon="ℹ️"
              iconColor={colors.secondary}
              iconBg="rgba(0, 212, 255, 0.1)"
              label="App Version"
              sublabel="BUILD 2.4.0 (NEON STABLE)"
              showChevron={false}
              showBorder={false}
            />
          </View>
        </View>

        {/* Sign Out Button */}
        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Text style={styles.signOutText}>SIGN OUT</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Stats Period Modal */}
      <Modal
        visible={showPeriodModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowPeriodModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Stats Period</Text>
              <TouchableOpacity onPress={() => setShowPeriodModal(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            {STATS_PERIODS.map((period) => (
              <TouchableOpacity
                key={period.value}
                style={[
                  styles.periodOption,
                  statsPeriod === period.value && styles.periodOptionSelected,
                ]}
                onPress={() => {
                  setStatsPeriod(period.value);
                  setShowPeriodModal(false);
                }}
              >
                <Text
                  style={[
                    styles.periodLabel,
                    statsPeriod === period.value && styles.periodLabelSelected,
                  ]}
                >
                  {period.label}
                </Text>
                {statsPeriod === period.value && (
                  <Text style={styles.checkmark}>✓</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      {/* Income Modal */}
      <Modal
        visible={showIncomeModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowIncomeModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Monthly Income</Text>
              <TouchableOpacity onPress={() => setShowIncomeModal(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.incomeDescription}>
              Set your expected monthly income to track savings
            </Text>

            <View style={styles.incomeInputContainer}>
              <Text style={styles.currencySymbol}>₹</Text>
              <TextInput
                style={styles.incomeInput}
                value={incomeInput}
                onChangeText={setIncomeInput}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor={colors.textMuted}
                autoFocus
              />
            </View>

            <TouchableOpacity style={styles.saveButton} onPress={handleSaveIncome}>
              <Text style={styles.saveButtonText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Savings Goal Modal */}
      <Modal
        visible={showSavingsGoalModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowSavingsGoalModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Savings Goal</Text>
              <TouchableOpacity onPress={() => setShowSavingsGoalModal(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.incomeDescription}>
              Set a monthly savings target to track your progress
            </Text>

            <View style={styles.incomeInputContainer}>
              <Text style={[styles.currencySymbol, { color: colors.secondary }]}>₹</Text>
              <TextInput
                style={[styles.incomeInput, { color: colors.secondary }]}
                value={savingsGoalInput}
                onChangeText={setSavingsGoalInput}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor={colors.textMuted}
                autoFocus
              />
            </View>

            <TouchableOpacity
              style={[styles.saveButton, { backgroundColor: colors.secondary }]}
              onPress={handleSaveSavingsGoal}
            >
              <Text style={styles.saveButtonText}>Save Goal</Text>
            </TouchableOpacity>

            {savingsGoal && savingsGoal > 0 && (
              <TouchableOpacity
                style={styles.clearGoalButton}
                onPress={() => {
                  setSavingsGoalInput('0');
                  handleSaveSavingsGoal();
                }}
              >
                <Text style={styles.clearGoalText}>Clear Goal</Text>
              </TouchableOpacity>
            )}
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
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    fontSize: 24,
    color: colors.textMuted,
    marginLeft: -2,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.5,
  },
  saveText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 2,
  },
  // Scroll View
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 100,
  },
  // Section
  section: {
    marginBottom: spacing.lg,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 3,
    marginBottom: spacing.sm,
    paddingHorizontal: 4,
  },
  // Glass Card
  glassCard: {
    backgroundColor: 'rgba(20, 20, 20, 0.7)',
    borderRadius: 32,
    borderWidth: 1,
    overflow: 'hidden',
  },
  greenCard: {
    borderColor: 'rgba(0, 255, 136, 0.4)',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  whiteCard: {
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  cyanCard: {
    borderColor: 'rgba(0, 212, 255, 0.4)',
    shadowColor: colors.secondary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  // Setting Row
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  settingRowNoBorder: {
    borderBottomWidth: 0,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingIconText: {
    fontSize: 18,
  },
  settingLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  settingSublabel: {
    fontSize: 10,
    fontWeight: '500',
    color: colors.textMuted,
    letterSpacing: 1,
    marginTop: 2,
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  settingValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  chevron: {
    fontSize: 18,
    color: colors.textMuted,
  },
  externalIcon: {
    fontSize: 16,
    color: colors.secondary,
  },
  // Sign Out Button
  signOutButton: {
    paddingVertical: spacing.lg,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 68, 68, 0.4)',
    backgroundColor: 'rgba(255, 68, 68, 0.1)',
    alignItems: 'center',
    marginTop: spacing.md,
  },
  signOutText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.error,
    letterSpacing: 2,
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
    marginBottom: spacing.lg,
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
  periodOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.xs,
  },
  periodOptionSelected: {
    backgroundColor: 'rgba(0, 255, 136, 0.1)',
  },
  periodLabel: {
    fontSize: 15,
    color: colors.text,
  },
  periodLabelSelected: {
    color: colors.primary,
    fontWeight: '700',
  },
  checkmark: {
    fontSize: 18,
    color: colors.primary,
    fontWeight: '700',
  },
  incomeDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  incomeInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
  },
  currencySymbol: {
    fontSize: 36,
    color: colors.primary,
    marginRight: spacing.sm,
    fontWeight: '700',
  },
  incomeInput: {
    fontSize: 48,
    color: colors.text,
    fontWeight: '800',
    minWidth: 150,
    textAlign: 'center',
  },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  saveButtonText: {
    color: colors.background,
    fontSize: 15,
    fontWeight: '700',
  },
  clearGoalButton: {
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  clearGoalText: {
    color: colors.error,
    fontSize: 14,
    fontWeight: '600',
  },
});

export default SettingsScreen;
