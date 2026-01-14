import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Modal,
  FlatList,
} from 'react-native';
import { colors, spacing, borderRadius, typography } from '../styles';
import { useExpenseStore, useFriendStore, useAuthStore } from '../store';
import { expensesApi } from '../api';
import type { Category, Friend } from '../types';

interface AddExpenseScreenProps {
  navigation: {
    goBack: () => void;
  };
}

const AddExpenseScreen: React.FC<AddExpenseScreenProps> = ({ navigation }) => {
  const { user } = useAuthStore();
  const { categories, addExpense, setCategories } = useExpenseStore();
  const { friends } = useFriendStore();

  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showSplitModal, setShowSplitModal] = useState(false);
  const [selectedFriends, setSelectedFriends] = useState<{ friend: Friend; amount: number }[]>([]);
  const [splitType, setSplitType] = useState<'equal' | 'custom'>('equal');
  const [loading, setLoading] = useState(false);

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
    // Only allow numbers and decimal point
    const cleanValue = value.replace(/[^0-9.]/g, '');
    setAmount(cleanValue);
  };

  const toggleFriendSelection = (friend: Friend) => {
    const existing = selectedFriends.find((f) => f.friend.id === friend.id);
    if (existing) {
      setSelectedFriends(selectedFriends.filter((f) => f.friend.id !== friend.id));
    } else {
      const splitAmount = splitType === 'equal' && amount
        ? parseFloat(amount) / (selectedFriends.length + 2) // +2 for self and new friend
        : 0;
      setSelectedFriends([...selectedFriends, { friend, amount: splitAmount }]);
    }
  };

  const calculateSplits = () => {
    if (!amount || selectedFriends.length === 0) return;

    const totalAmount = parseFloat(amount);
    const splitAmount = totalAmount / (selectedFriends.length + 1); // +1 for self

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
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    if (!description.trim()) {
      Alert.alert('Error', 'Please enter a description');
      return;
    }

    if (!selectedCategory) {
      Alert.alert('Error', 'Please select a category');
      return;
    }

    try {
      setLoading(true);

      const expenseData = {
        amount: parseFloat(amount),
        currency: user?.currency as 'INR',
        description: description.trim(),
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

      Alert.alert('Success', 'Expense added successfully', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to add expense');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.contentContainer}>
        {/* Amount input */}
        <View style={styles.amountContainer}>
          <Text style={styles.currencySymbol}>₹</Text>
          <TextInput
            style={styles.amountInput}
            value={amount}
            onChangeText={handleAmountChange}
            placeholder="0"
            placeholderTextColor={colors.textMuted}
            keyboardType="decimal-pad"
            autoFocus
          />
        </View>

        {/* Description */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Description</Text>
          <TextInput
            style={styles.input}
            value={description}
            onChangeText={setDescription}
            placeholder="What was this expense for?"
            placeholderTextColor={colors.textMuted}
          />
        </View>

        {/* Category picker */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Category</Text>
          <TouchableOpacity
            style={styles.pickerButton}
            onPress={() => setShowCategoryPicker(true)}
          >
            {selectedCategory ? (
              <View style={styles.selectedCategory}>
                <Text style={styles.categoryIcon}>{selectedCategory.icon || '📁'}</Text>
                <Text style={styles.categoryName}>{selectedCategory.name}</Text>
              </View>
            ) : (
              <Text style={styles.placeholderText}>Select a category</Text>
            )}
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Split expense */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Split with friends</Text>
          <TouchableOpacity
            style={styles.pickerButton}
            onPress={() => setShowSplitModal(true)}
          >
            {selectedFriends.length > 0 ? (
              <Text style={styles.selectedText}>
                Split with {selectedFriends.length} friend{selectedFriends.length > 1 ? 's' : ''}
              </Text>
            ) : (
              <Text style={styles.placeholderText}>Add friends to split</Text>
            )}
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>

          {/* Split summary */}
          {selectedFriends.length > 0 && (
            <View style={styles.splitSummary}>
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
        </View>
      </ScrollView>

      {/* Submit button */}
      <View style={styles.bottomContainer}>
        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          <Text style={styles.submitButtonText}>
            {loading ? 'Adding...' : 'Add Expense'}
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
                    styles.categoryItem,
                    selectedCategory?.id === item.id && styles.categoryItemSelected,
                  ]}
                  onPress={() => {
                    setSelectedCategory(item);
                    setShowCategoryPicker(false);
                  }}
                >
                  <Text style={styles.categoryItemIcon}>{item.icon || '📁'}</Text>
                  <Text style={styles.categoryItemName}>{item.name}</Text>
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

            {/* Split type toggle */}
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
  contentContainer: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xxl,
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
  },
  currencySymbol: {
    fontSize: 48,
    color: colors.primary,
    marginRight: spacing.sm,
  },
  amountInput: {
    fontSize: 64,
    color: colors.text,
    fontWeight: typography.weights.bold,
    minWidth: 100,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: spacing.lg,
  },
  inputLabel: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    color: colors.text,
    fontSize: typography.sizes.md,
  },
  pickerButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  selectedCategory: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryIcon: {
    fontSize: 20,
    marginRight: spacing.sm,
  },
  categoryName: {
    fontSize: typography.sizes.md,
    color: colors.text,
  },
  selectedText: {
    fontSize: typography.sizes.md,
    color: colors.text,
  },
  placeholderText: {
    fontSize: typography.sizes.md,
    color: colors.textMuted,
  },
  chevron: {
    fontSize: 24,
    color: colors.textMuted,
  },
  splitSummary: {
    marginTop: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
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
    fontWeight: typography.weights.semibold,
  },
  bottomContainer: {
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  submitButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: colors.textOnPrimary,
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
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
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  modalClose: {
    fontSize: 24,
    color: colors.textSecondary,
  },
  categoryItem: {
    flex: 1,
    alignItems: 'center',
    padding: spacing.md,
    margin: spacing.xs,
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  categoryItemSelected: {
    borderColor: colors.primary,
  },
  categoryItemIcon: {
    fontSize: 28,
    marginBottom: spacing.xs,
  },
  categoryItemName: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  splitTypeContainer: {
    flexDirection: 'row',
    marginBottom: spacing.lg,
  },
  splitTypeButton: {
    flex: 1,
    padding: spacing.sm,
    alignItems: 'center',
    backgroundColor: colors.card,
    marginHorizontal: spacing.xs,
    borderRadius: borderRadius.md,
  },
  splitTypeButtonActive: {
    backgroundColor: colors.primary,
  },
  splitTypeText: {
    color: colors.textSecondary,
    fontWeight: typography.weights.medium,
  },
  splitTypeTextActive: {
    color: colors.textOnPrimary,
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
    color: colors.textOnPrimary,
    fontWeight: typography.weights.bold,
  },
  friendName: {
    fontSize: typography.sizes.md,
    color: colors.text,
  },
  customAmountInput: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.sm,
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
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  doneButtonText: {
    color: colors.textOnPrimary,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
  },
});

export default AddExpenseScreen;
