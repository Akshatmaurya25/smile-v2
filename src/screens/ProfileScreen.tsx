import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Platform,
  Modal,
  FlatList,
} from 'react-native';
import { colors, spacing, borderRadius, typography } from '../styles';
import { useAuthStore, useExpenseStore, useSettingsStore } from '../store';
import { usersApi, expensesApi } from '../api';
import { CURRENCIES, Currency, Category } from '../types';

interface MenuItemProps {
  icon: string;
  iconColor: string;
  iconBg: string;
  label: string;
  onPress?: () => void;
  showBorder?: boolean;
}

const MenuItem: React.FC<MenuItemProps> = ({
  icon,
  iconColor,
  iconBg,
  label,
  onPress,
  showBorder = true,
}) => (
  <TouchableOpacity
    style={[styles.menuItem, !showBorder && styles.menuItemNoBorder]}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <View style={[styles.menuIcon, { backgroundColor: iconBg }]}>
      <Text style={[styles.menuIconText, { color: iconColor }]}>{icon}</Text>
    </View>
    <Text style={styles.menuLabel}>{label}</Text>
    <Text style={styles.menuChevron}>›</Text>
  </TouchableOpacity>
);

const ProfileScreen: React.FC = () => {
  const { user, updateUser, logout } = useAuthStore();
  const { categories, setCategories } = useExpenseStore();
  const { priorityCategories, setPriorityCategories } = useSettingsStore();
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>(
    (user?.currency as Currency) || 'INR'
  );
  const [loading, setLoading] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);

  // Fetch categories on mount
  const fetchCategories = useCallback(async () => {
    try {
      const cats = await expensesApi.getCategories();
      setCategories(cats);
    } catch (err) {
      // Silent fail
    }
  }, [setCategories]);

  useEffect(() => {
    if (categories.length === 0) {
      fetchCategories();
    }
  }, [categories.length, fetchCategories]);

  // Filter out Income category from selection (it's not an expense category)
  const expenseCategories = categories.filter(c => c.name !== 'Income');

  const toggleCategorySelection = (category: Category) => {
    const isSelected = priorityCategories.some(c => c.id === category.id);
    if (isSelected) {
      setPriorityCategories(priorityCategories.filter(c => c.id !== category.id));
    } else if (priorityCategories.length < 4) {
      setPriorityCategories([...priorityCategories, { id: category.id, name: category.name, icon: category.icon }]);
    }
  };

  const handleCurrencyChange = async (currency: Currency) => {
    setSelectedCurrency(currency);
    try {
      setLoading(true);
      const updatedUser = await usersApi.updateProfile({ currency });
      updateUser(updatedUser);
    } catch (err) {
      // Revert on error
      setSelectedCurrency((user?.currency as Currency) || 'INR');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: logout },
      ]
    );
  };

  const getInitials = (name?: string | null) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  };

  const currencyOptions = [
    { code: 'INR' as Currency, label: 'INR (₹)' },
    { code: 'USD' as Currency, label: 'USD ($)' },
    { code: 'EUR' as Currency, label: 'EUR (€)' },
  ];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Profile</Text>
        <TouchableOpacity style={styles.settingsButton}>
          <Text style={styles.settingsIcon}>⚙️</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Avatar Section */}
        <View style={styles.profileSection}>
          <View style={styles.avatarWrapper}>
            <View style={styles.avatarBorder}>
              {user?.profileImage ? (
                <Image source={{ uri: user.profileImage }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarIcon}>👤</Text>
                </View>
              )}
            </View>
            <TouchableOpacity style={styles.editAvatarBtn}>
              <Text style={styles.editAvatarIcon}>✏️</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.profileName}>
            {user?.displayName || user?.username || 'User'}
          </Text>
          <Text style={styles.profileBadge}>PREMIUM MEMBER</Text>
        </View>

        {/* Email Card */}
        <TouchableOpacity style={[styles.glassCard, styles.emailCard]} activeOpacity={0.8}>
          <View>
            <Text style={styles.cardLabel}>EMAIL ADDRESS</Text>
            <Text style={styles.cardValue}>{user?.email || 'Not set'}</Text>
          </View>
          <Text style={styles.cardChevron}>›</Text>
        </TouchableOpacity>

        {/* Currency Preference Card */}
        <View style={[styles.glassCard, styles.currencyCard]}>
          <Text style={styles.cardLabel}>CURRENCY PREFERENCE</Text>
          <View style={styles.currencyOptions}>
            {currencyOptions.map((option) => (
              <TouchableOpacity
                key={option.code}
                style={[
                  styles.currencyBtn,
                  selectedCurrency === option.code && styles.currencyBtnActive,
                ]}
                onPress={() => handleCurrencyChange(option.code)}
                disabled={loading}
              >
                <Text
                  style={[
                    styles.currencyBtnText,
                    selectedCurrency === option.code && styles.currencyBtnTextActive,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Priority Categories Card */}
        <TouchableOpacity
          style={[styles.glassCard, styles.priorityCard]}
          onPress={() => setShowCategoryModal(true)}
          activeOpacity={0.8}
        >
          <View style={styles.priorityHeader}>
            <View>
              <Text style={styles.cardLabel}>QUICK ADD CATEGORIES</Text>
              <Text style={styles.prioritySubtext}>Select up to 4 categories for quick access</Text>
            </View>
            <Text style={styles.cardChevron}>›</Text>
          </View>
          {priorityCategories.length > 0 ? (
            <View style={styles.selectedCategories}>
              {priorityCategories.map((cat) => (
                <View key={cat.id} style={styles.selectedCategoryChip}>
                  <Text style={styles.selectedCategoryIcon}>{cat.icon || '📁'}</Text>
                  <Text style={styles.selectedCategoryName}>{cat.name}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.noCategoriesText}>Tap to select categories</Text>
          )}
        </TouchableOpacity>

        {/* Account Management Section */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>ACCOUNT MANAGEMENT</Text>
          <View style={styles.menuCard}>
            <MenuItem
              icon="💳"
              iconColor={colors.accent}
              iconBg="rgba(255, 0, 255, 0.1)"
              label="Payment Methods"
            />
            <MenuItem
              icon="🔒"
              iconColor={colors.secondary}
              iconBg="rgba(0, 212, 255, 0.1)"
              label="Security & Privacy"
            />
            <MenuItem
              icon="🔔"
              iconColor={colors.primary}
              iconBg="rgba(0, 255, 136, 0.1)"
              label="Push Notifications"
            />
            <MenuItem
              icon="❓"
              iconColor={colors.textMuted}
              iconBg="rgba(100, 100, 100, 0.2)"
              label="Support Center"
              showBorder={false}
            />
          </View>
        </View>

        {/* Logout Button */}
        <View style={styles.logoutSection}>
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Text style={styles.logoutIcon}>🚪</Text>
            <Text style={styles.logoutText}>LOGOUT ACCOUNT</Text>
          </TouchableOpacity>
        </View>

        {/* Version */}
        <Text style={styles.versionText}>VERSION 2.4.0 • SMILE FINANCE</Text>
      </ScrollView>

      {/* Category Selection Modal */}
      <Modal
        visible={showCategoryModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowCategoryModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Categories</Text>
              <TouchableOpacity onPress={() => setShowCategoryModal(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle}>
              Choose up to 4 categories for quick access ({priorityCategories.length}/4 selected)
            </Text>
            <FlatList
              data={expenseCategories}
              keyExtractor={(item) => item.id}
              numColumns={2}
              contentContainerStyle={styles.categoryGrid}
              renderItem={({ item }) => {
                const isSelected = priorityCategories.some(c => c.id === item.id);
                const isDisabled = !isSelected && priorityCategories.length >= 4;
                return (
                  <TouchableOpacity
                    style={[
                      styles.categoryItem,
                      isSelected && styles.categoryItemSelected,
                      isDisabled && styles.categoryItemDisabled,
                    ]}
                    onPress={() => toggleCategorySelection(item)}
                    disabled={isDisabled}
                  >
                    <Text style={styles.categoryIcon}>{item.icon || '📁'}</Text>
                    <Text style={[
                      styles.categoryName,
                      isSelected && styles.categoryNameSelected,
                    ]}>{item.name}</Text>
                    {isSelected && (
                      <View style={styles.checkmark}>
                        <Text style={styles.checkmarkText}>✓</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              }}
            />
            <TouchableOpacity
              style={styles.doneButton}
              onPress={() => setShowCategoryModal(false)}
            >
              <Text style={styles.doneButtonText}>DONE</Text>
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
    paddingBottom: spacing.lg,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.5,
  },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsIcon: {
    fontSize: 18,
  },
  // Scroll View
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 100,
  },
  // Profile Section
  profileSection: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatarBorder: {
    width: 128,
    height: 128,
    borderRadius: 64,
    padding: 4,
    backgroundColor: colors.background,
    borderWidth: 3,
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 15,
    elevation: 10,
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: 60,
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 60,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.background,
  },
  avatarIcon: {
    fontSize: 48,
  },
  editAvatarBtn: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: colors.background,
  },
  editAvatarIcon: {
    fontSize: 14,
  },
  profileName: {
    fontSize: 24,
    fontWeight: '900',
    color: colors.text,
    marginTop: spacing.lg,
    letterSpacing: -0.5,
  },
  profileBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 3,
    marginTop: 4,
  },
  // Glass Card
  glassCard: {
    backgroundColor: 'rgba(20, 20, 20, 0.7)',
    borderRadius: 32,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
  },
  emailCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderColor: 'rgba(0, 255, 136, 0.3)',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
  },
  currencyCard: {
    borderColor: 'rgba(0, 212, 255, 0.3)',
    shadowColor: colors.secondary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  cardLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 2,
    marginBottom: 4,
  },
  cardValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  cardChevron: {
    fontSize: 20,
    color: colors.textMuted,
  },
  // Currency Options
  currencyOptions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  currencyBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: 16,
    backgroundColor: 'rgba(30, 30, 30, 0.5)',
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  currencyBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  currencyBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textMuted,
  },
  currencyBtnTextActive: {
    color: colors.background,
  },
  // Section
  section: {
    marginBottom: spacing.lg,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 2,
    marginBottom: spacing.sm,
    paddingHorizontal: 4,
  },
  menuCard: {
    backgroundColor: 'rgba(20, 20, 20, 0.7)',
    borderRadius: 40,
    borderWidth: 1,
    borderColor: 'rgba(100, 100, 100, 0.2)',
    overflow: 'hidden',
  },
  // Menu Item
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(100, 100, 100, 0.2)',
  },
  menuItemNoBorder: {
    borderBottomWidth: 0,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  menuIconText: {
    fontSize: 18,
  },
  menuLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  menuChevron: {
    fontSize: 20,
    color: colors.textMuted,
  },
  // Logout Section
  logoutSection: {
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: 'rgba(255, 68, 68, 0.3)',
    backgroundColor: 'rgba(255, 68, 68, 0.05)',
  },
  logoutIcon: {
    fontSize: 18,
  },
  logoutText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.error,
    letterSpacing: 2,
  },
  // Version
  versionText: {
    textAlign: 'center',
    fontSize: 10,
    fontWeight: '500',
    color: colors.textMuted,
    letterSpacing: 2,
    marginTop: spacing.xl,
  },
  // Priority Categories
  priorityCard: {
    borderColor: 'rgba(255, 0, 255, 0.3)',
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  priorityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  prioritySubtext: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  selectedCategories: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  selectedCategoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 0, 255, 0.1)',
    borderRadius: 20,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: 'rgba(255, 0, 255, 0.3)',
  },
  selectedCategoryIcon: {
    fontSize: 14,
  },
  selectedCategoryName: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
  noCategoriesText: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: spacing.md,
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
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
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
  modalSubtitle: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: spacing.lg,
  },
  categoryGrid: {
    paddingBottom: spacing.md,
  },
  categoryItem: {
    flex: 1,
    alignItems: 'center',
    padding: spacing.md,
    margin: spacing.xs,
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
  },
  categoryItemSelected: {
    borderColor: colors.accent,
    backgroundColor: 'rgba(255, 0, 255, 0.1)',
  },
  categoryItemDisabled: {
    opacity: 0.4,
  },
  categoryIcon: {
    fontSize: 28,
    marginBottom: spacing.xs,
  },
  categoryName: {
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  categoryNameSelected: {
    color: colors.accent,
    fontWeight: '700',
  },
  checkmark: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmarkText: {
    color: colors.background,
    fontSize: 12,
    fontWeight: '800',
  },
  doneButton: {
    backgroundColor: colors.accent,
    borderRadius: 16,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    marginTop: spacing.md,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 15,
  },
  doneButtonText: {
    color: colors.background,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 2,
  },
});

export default ProfileScreen;
