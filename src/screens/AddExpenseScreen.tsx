import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Modal,
  FlatList,
  Platform,
} from 'react-native';
import { colors, spacing, borderRadius, typography } from '../styles';
import { useExpenseStore, useFriendStore, useAuthStore, useSettingsStore } from '../store';
import { expensesApi } from '../api';
import { Toast } from '../components';
import type { Category, Friend } from '../types';

interface AddExpenseScreenProps {
  navigation: {
    goBack: () => void;
  };
}

// Fallback default categories if no priority categories are set
const fallbackCategories = [
  { id: 'shopping', name: 'Shopping', icon: '🛍️', color: colors.accent },
  { id: 'food', name: 'Food & Dining', icon: '🍕', color: colors.secondary },
  { id: 'transport', name: 'Transportation', icon: '🚗', color: colors.primary },
  { id: 'bills', name: 'Bills & Utilities', icon: '💡', color: colors.error },
];

const AddExpenseScreen: React.FC<AddExpenseScreenProps> = ({ navigation }) => {
  const { user } = useAuthStore();
  const { categories, addExpense, setCategories, setStats } = useExpenseStore();
  const { friends } = useFriendStore();
  const { priorityCategories } = useSettingsStore();

  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showSplitModal, setShowSplitModal] = useState(false);
  const [selectedFriends, setSelectedFriends] = useState<{ friend: Friend; amount: number }[]>([]);
  const [splitType, setSplitType] = useState<'equal' | 'custom'>('equal');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' });

  useEffect(() => {
    const loadCategories = async () => {
      if (categories.length === 0) {
        try {
          const data = await expensesApi.getCategories();
          setCategories(data);
        } catch (err) {
          // Ignore
        }
      }
    };
    loadCategories();
  }, [categories.length, setCategories]);

  const handleAmountChange = (value: string) => {
    const cleanValue = value.replace(/[^0-9.]/g, '');
    setAmount(cleanValue);
  };

  const toggleFriendSelection = (friend: Friend) => {
    const existing = selectedFriends.find((f) => f.friend.id === friend.id);
    if (existing) {
      setSelectedFriends(selectedFriends.filter((f) => f.friend.id !== friend.id));
    } else {
      const splitAmount = splitType === 'equal' && amount
        ? parseFloat(amount) / (selectedFriends.length + 2)
        : 0;
      setSelectedFriends([...selectedFriends, { friend, amount: splitAmount }]);
    }
  };

  const calculateSplits = () => {
    if (!amount || selectedFriends.length === 0) return;
    const totalAmount = parseFloat(amount);
    const splitAmount = totalAmount / (selectedFriends.length + 1);
    setSelectedFriends(
      selectedFriends.map((f) => ({ ...f, amount: splitAmount }))
    );
  };

  const updateFriendAmount = (friendId: string, newAmount: string) => {
    const cleanAmount = parseFloat(newAmount) || 0;
    setSelectedFriends(
      selectedFriends.map((f) =>
        f.friend.id === friendId ? { ...f, amount: cleanAmount } : f
      )
    );
  };

  const handleSubmit = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      setToast({ visible: true, message: 'Please enter a valid amount', type: 'error' });
      return;
    }

    if (!selectedCategory) {
      setToast({ visible: true, message: 'Please select a category', type: 'error' });
      return;
    }

    try {
      setLoading(true);

      const expenseData = {
        amount: parseFloat(amount),
        currency: user?.currency as 'INR',
        description: description.trim() || selectedCategory.name,
        categoryId: selectedCategory.id,
        splits: selectedFriends.length > 0
          ? selectedFriends.map((f) => ({
              userId: f.friend.user.id,
              amount: f.amount,
            }))
          : undefined,
      };

      const expense = await expensesApi.createExpense(expenseData);
      addExpense(expense);

      expensesApi.getStats('month').then(setStats).catch(() => {});

      setToast({ visible: true, message: 'Expense added successfully!', type: 'success' });
      setTimeout(() => {
        navigation.goBack();
      }, 1500);
    } catch (err) {
      setToast({ visible: true, message: err instanceof Error ? err.message : 'Failed to add expense', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Get display categories - use user's priority categories if set, otherwise fallback
  const displayCategories = (() => {
    if (priorityCategories.length > 0) {
      // Use user's priority categories, find full category data from API
      return priorityCategories.map((priorityCat) => {
        const apiCat = categories.find((c) => c.id === priorityCat.id);
        return apiCat || { id: priorityCat.id, name: priorityCat.name, icon: priorityCat.icon, isDefault: true, userId: null };
      });
    }
    // Fallback to default categories, matching with API data
    return fallbackCategories.map((defaultCat) => {
      const apiCat = categories.find(
        (c) => c.name.toLowerCase() === defaultCat.name.toLowerCase()
      );
      return apiCat || { ...defaultCat, isDefault: true, userId: null };
    });
  })();

  // Category color mapping
  const categoryColors: { [key: string]: string } = {
    'Shopping': colors.accent,
    'Food & Dining': colors.secondary,
    'Transportation': colors.primary,
    'Bills & Utilities': colors.error,
    'Entertainment': colors.secondary,
    'Health': colors.primary,
    'Travel': '#9B59B6',
    'Education': '#3498DB',
    'Groceries': '#2ECC71',
  };

  const getCategoryColor = (cat: Category | { name: string }) => {
    return categoryColors[cat.name] || colors.textMuted;
  };

  const formatAmount = (value: string) => {
    if (!value) return '0.00';
    const num = parseFloat(value);
    return isNaN(num) ? '0.00' : num.toFixed(2);
  };

  const currentDate = new Date();
  const formattedDate = `Today, ${currentDate.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })}`;

  return (
    <View style={styles.container}>
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={() => setToast({ ...toast, visible: false })}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Amount Input Section */}
        <View style={styles.amountSection}>
          <Text style={styles.amountLabel}>ENTER AMOUNT</Text>
          <View style={styles.amountRow}>
            <Text style={styles.currencySymbol}>₹</Text>
            <TextInput
              style={styles.amountInput}
              value={amount}
              onChangeText={handleAmountChange}
              placeholder="0.00"
              placeholderTextColor={colors.primary}
              keyboardType="decimal-pad"
              autoFocus
            />
          </View>
        </View>

        {/* Category Selection */}
        <View style={styles.glassCard}>
          <Text style={styles.sectionLabel}>SELECT CATEGORY</Text>
          <View style={styles.categoryGrid}>
            {displayCategories.map((cat) => {
              const catColor = getCategoryColor(cat);
              const isSelected = selectedCategory?.name.toLowerCase() === cat.name.toLowerCase();

              return (
                <TouchableOpacity
                  key={cat.id}
                  style={styles.categoryItem}
                  onPress={() => setSelectedCategory(cat as Category)}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.categoryIcon,
                      {
                        backgroundColor: `${catColor}15`,
                        borderColor: isSelected ? catColor : `${catColor}40`,
                        borderWidth: isSelected ? 2 : 1,
                      },
                    ]}
                  >
                    <Text style={styles.categoryEmoji}>{cat.icon || '📁'}</Text>
                  </View>
                  <Text style={[styles.categoryName, isSelected && { color: catColor }]}>
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* More categories link */}
          <TouchableOpacity
            style={styles.moreCategoriesButton}
            onPress={() => setShowCategoryPicker(true)}
          >
            <Text style={styles.moreCategoriesText}>View all categories</Text>
          </TouchableOpacity>
        </View>

        {/* Description & Date Card */}
        <View style={styles.glassCard}>
          <View style={styles.inputRow}>
            <View style={styles.inputIconContainer}>
              <Text style={styles.inputIcon}>📝</Text>
            </View>
            <View style={styles.inputContent}>
              <Text style={styles.inputRowLabel}>DESCRIPTION</Text>
              <TextInput
                style={styles.inputRowValue}
                value={description}
                onChangeText={setDescription}
                placeholder="What was this for?"
                placeholderTextColor={colors.textMuted}
              />
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.inputRow}>
            <View style={styles.inputIconContainer}>
              <Text style={styles.inputIcon}>📅</Text>
            </View>
            <View style={styles.inputContent}>
              <Text style={styles.inputRowLabel}>DATE & TIME</Text>
              <Text style={styles.inputRowValueText}>{formattedDate}</Text>
            </View>
          </View>
        </View>

        {/* Split with Friends Card */}
        <TouchableOpacity
          style={styles.glassCard}
          onPress={() => setShowSplitModal(true)}
          activeOpacity={0.8}
        >
          <View style={styles.inputRow}>
            <View style={[styles.inputIconContainer, { backgroundColor: 'rgba(0, 212, 255, 0.1)', borderColor: 'rgba(0, 212, 255, 0.2)' }]}>
              <Text style={styles.inputIcon}>👥</Text>
            </View>
            <View style={styles.inputContent}>
              <Text style={styles.inputRowLabel}>SPLIT WITH FRIENDS</Text>
              <Text style={styles.inputRowValueText}>
                {selectedFriends.length > 0
                  ? `${selectedFriends.length} friend${selectedFriends.length > 1 ? 's' : ''} selected`
                  : 'Add friends to split'}
              </Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </View>
        </TouchableOpacity>

        {/* Split Summary */}
        {selectedFriends.length > 0 && (
          <View style={styles.splitSummaryCard}>
            {selectedFriends.map((f) => (
              <View key={f.friend.id} style={styles.splitItem}>
                <Text style={styles.splitName}>
                  {f.friend.user.displayName || f.friend.user.email}
                </Text>
                <Text style={styles.splitAmount}>₹{f.amount.toFixed(2)}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Submit Button */}
      <View style={styles.bottomContainer}>
        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
          activeOpacity={0.9}
        >
          <Text style={styles.submitButtonText}>
            {loading ? 'ADDING...' : 'ADD EXPENSE'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Category Picker Modal */}
      <Modal
        visible={showCategoryPicker}
        animationType="slide"
        transparent
        onRequestClose={() => setShowCategoryPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Category</Text>
              <TouchableOpacity onPress={() => setShowCategoryPicker(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <FlatList
              data={categories}
              keyExtractor={(item) => item.id}
              numColumns={3}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.modalCategoryItem,
                    selectedCategory?.id === item.id && styles.modalCategoryItemSelected,
                  ]}
                  onPress={() => {
                    setSelectedCategory(item);
                    setShowCategoryPicker(false);
                  }}
                >
                  <Text style={styles.modalCategoryIcon}>{item.icon || '📁'}</Text>
                  <Text style={styles.modalCategoryName}>{item.name}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* Split Modal */}
      <Modal
        visible={showSplitModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowSplitModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Split with Friends</Text>
              <TouchableOpacity onPress={() => setShowSplitModal(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.splitTypeContainer}>
              <TouchableOpacity
                style={[
                  styles.splitTypeButton,
                  splitType === 'equal' && styles.splitTypeButtonActive,
                ]}
                onPress={() => {
                  setSplitType('equal');
                  calculateSplits();
                }}
              >
                <Text
                  style={[
                    styles.splitTypeText,
                    splitType === 'equal' && styles.splitTypeTextActive,
                  ]}
                >
                  Equal Split
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.splitTypeButton,
                  splitType === 'custom' && styles.splitTypeButtonActive,
                ]}
                onPress={() => setSplitType('custom')}
              >
                <Text
                  style={[
                    styles.splitTypeText,
                    splitType === 'custom' && styles.splitTypeTextActive,
                  ]}
                >
                  Custom
                </Text>
              </TouchableOpacity>
            </View>

            <FlatList
              data={friends}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => {
                const isSelected = selectedFriends.some((f) => f.friend.id === item.id);
                const selectedFriend = selectedFriends.find((f) => f.friend.id === item.id);

                return (
                  <TouchableOpacity
                    style={[
                      styles.friendItem,
                      isSelected && styles.friendItemSelected,
                    ]}
                    onPress={() => toggleFriendSelection(item)}
                  >
                    <View style={styles.friendInfo}>
                      <View
                        style={[
                          styles.checkbox,
                          isSelected && styles.checkboxSelected,
                        ]}
                      >
                        {isSelected && <Text style={styles.checkmark}>✓</Text>}
                      </View>
                      <Text style={styles.friendName}>
                        {item.user.displayName || item.user.email}
                      </Text>
                    </View>

                    {isSelected && splitType === 'custom' && (
                      <TextInput
                        style={styles.customAmountInput}
                        value={selectedFriend?.amount.toString() || ''}
                        onChangeText={(value) => updateFriendAmount(item.id, value)}
                        keyboardType="decimal-pad"
                        placeholder="0"
                        placeholderTextColor={colors.textMuted}
                      />
                    )}
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <Text style={styles.emptyText}>No friends to split with</Text>
              }
            />

            <TouchableOpacity
              style={styles.doneButton}
              onPress={() => {
                if (splitType === 'equal') calculateSplits();
                setShowSplitModal(false);
              }}
            >
              <Text style={styles.doneButtonText}>Done</Text>
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
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 120,
  },
  // Amount Section
  amountSection: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
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
    justifyContent: 'center',
  },
  currencySymbol: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.primary,
    marginRight: spacing.sm,
    textShadowColor: 'rgba(0, 255, 136, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 15,
  },
  amountInput: {
    fontSize: 56,
    fontWeight: '900',
    color: colors.primary,
    textAlign: 'center',
    minWidth: 200,
    textShadowColor: 'rgba(0, 255, 136, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 15,
  },
  // Glass Card
  glassCard: {
    backgroundColor: 'rgba(30, 30, 30, 0.5)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 2,
    marginBottom: spacing.md,
  },
  // Category Grid
  categoryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  categoryItem: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  categoryIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryEmoji: {
    fontSize: 24,
  },
  categoryName: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMuted,
  },
  moreCategoriesButton: {
    marginTop: spacing.md,
    alignItems: 'center',
  },
  moreCategoriesText: {
    fontSize: 12,
    color: colors.secondary,
    fontWeight: '600',
  },
  // Input Rows
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  inputIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(100, 100, 100, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(100, 100, 100, 0.3)',
  },
  inputIcon: {
    fontSize: 18,
  },
  inputContent: {
    flex: 1,
  },
  inputRowLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 2,
    marginBottom: 2,
  },
  inputRowValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    padding: 0,
  },
  inputRowValueText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginVertical: spacing.md,
  },
  chevron: {
    fontSize: 24,
    color: colors.textMuted,
  },
  // Split Summary
  splitSummaryCard: {
    backgroundColor: 'rgba(30, 30, 30, 0.5)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 136, 0.2)',
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  splitItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  splitName: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
  },
  splitAmount: {
    fontSize: typography.sizes.sm,
    color: colors.primary,
    fontWeight: '700',
  },
  // Bottom Container
  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? 34 : spacing.lg,
    paddingTop: spacing.lg,
    backgroundColor: colors.background,
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
    elevation: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: colors.background,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 2,
  },
  // Modal Styles
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
    marginBottom: spacing.lg,
  },
  modalTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: '800',
    color: colors.text,
  },
  modalClose: {
    fontSize: 24,
    color: colors.textSecondary,
  },
  modalCategoryItem: {
    flex: 1,
    alignItems: 'center',
    padding: spacing.md,
    margin: spacing.xs,
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  modalCategoryItemSelected: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(0, 255, 136, 0.1)',
  },
  modalCategoryIcon: {
    fontSize: 28,
    marginBottom: spacing.xs,
  },
  modalCategoryName: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  splitTypeContainer: {
    flexDirection: 'row',
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  splitTypeButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
  },
  splitTypeButtonActive: {
    backgroundColor: colors.primary,
  },
  splitTypeText: {
    color: colors.textSecondary,
    fontWeight: '600',
  },
  splitTypeTextActive: {
    color: colors.background,
  },
  friendItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  friendItemSelected: {
    backgroundColor: 'rgba(0, 255, 136, 0.1)',
  },
  friendInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    marginRight: spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkmark: {
    color: colors.background,
    fontWeight: '800',
  },
  friendName: {
    fontSize: typography.sizes.md,
    color: colors.text,
  },
  customAmountInput: {
    backgroundColor: colors.card,
    borderRadius: 8,
    padding: spacing.sm,
    width: 80,
    textAlign: 'right',
    color: colors.text,
  },
  emptyText: {
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: spacing.lg,
  },
  doneButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  doneButtonText: {
    color: colors.background,
    fontSize: typography.sizes.md,
    fontWeight: '700',
  },
});

export default AddExpenseScreen;
