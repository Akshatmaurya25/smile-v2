import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
} from 'react-native';
import { colors, spacing, borderRadius, typography } from '../styles';
import { useAuthStore, useExpenseStore } from '../store';
import { usersApi } from '../api';
import { CURRENCIES, Currency } from '../types';

const ProfileScreen: React.FC = () => {
  const { user, updateUser, logout } = useAuthStore();
  const { categories } = useExpenseStore();
  const [isEditing, setIsEditing] = useState(false);
  const [username, setUsername] = useState(user?.username || '');
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>(
    (user?.currency as Currency) || 'INR'
  );
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    try {
      setLoading(true);
      const updatedUser = await usersApi.updateProfile({
        username: username || undefined,
        displayName: displayName || undefined,
        currency: selectedCurrency,
      });
      updateUser(updatedUser);
      setIsEditing(false);
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to update profile');
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

  const customCategories = categories.filter((c) => !c.isDefault);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Profile header */}
      <View style={styles.profileHeader}>
        <TouchableOpacity style={styles.avatarContainer}>
          {user?.profileImage ? (
            <Image source={{ uri: user.profileImage }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>
                {user?.displayName?.[0] || user?.email?.[0] || '?'}
              </Text>
            </View>
          )}
          <View style={styles.editAvatarBadge}>
            <Text style={styles.editAvatarIcon}>📷</Text>
          </View>
        </TouchableOpacity>

        <Text style={styles.profileEmail}>{user?.email}</Text>
      </View>

      {/* Profile info */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Profile Information</Text>
          <TouchableOpacity onPress={() => setIsEditing(!isEditing)}>
            <Text style={styles.editButton}>{isEditing ? 'Cancel' : 'Edit'}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Username</Text>
          {isEditing ? (
            <TextInput
              style={styles.input}
              value={username}
              onChangeText={setUsername}
              placeholder="Enter username"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
            />
          ) : (
            <Text style={styles.inputValue}>{user?.username || 'Not set'}</Text>
          )}
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Display Name</Text>
          {isEditing ? (
            <TextInput
              style={styles.input}
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Enter display name"
              placeholderTextColor={colors.textMuted}
            />
          ) : (
            <Text style={styles.inputValue}>{user?.displayName || 'Not set'}</Text>
          )}
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Default Currency</Text>
          {isEditing ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.currencyScroll}>
              {CURRENCIES.map((currency) => (
                <TouchableOpacity
                  key={currency.code}
                  style={[
                    styles.currencyOption,
                    selectedCurrency === currency.code && styles.currencyOptionSelected,
                  ]}
                  onPress={() => setSelectedCurrency(currency.code)}
                >
                  <Text
                    style={[
                      styles.currencySymbol,
                      selectedCurrency === currency.code && styles.currencySymbolSelected,
                    ]}
                  >
                    {currency.symbol}
                  </Text>
                  <Text
                    style={[
                      styles.currencyCode,
                      selectedCurrency === currency.code && styles.currencyCodeSelected,
                    ]}
                  >
                    {currency.code}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : (
            <Text style={styles.inputValue}>
              {CURRENCIES.find((c) => c.code === user?.currency)?.name || 'Indian Rupee'}
            </Text>
          )}
        </View>

        {isEditing && (
          <TouchableOpacity
            style={[styles.saveButton, loading && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={loading}
          >
            <Text style={styles.saveButtonText}>
              {loading ? 'Saving...' : 'Save Changes'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Custom Categories */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>My Categories</Text>
          <TouchableOpacity>
            <Text style={styles.addButton}>+ Add</Text>
          </TouchableOpacity>
        </View>

        {customCategories.length > 0 ? (
          customCategories.map((category) => (
            <View key={category.id} style={styles.categoryItem}>
              <Text style={styles.categoryIcon}>{category.icon || '📁'}</Text>
              <Text style={styles.categoryName}>{category.name}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>No custom categories yet</Text>
        )}
      </View>

      {/* Account actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>

        <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
          <Text style={styles.menuIcon}>🚪</Text>
          <Text style={[styles.menuText, styles.logoutText]}>Logout</Text>
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
  profileHeader: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: spacing.md,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: colors.primary,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: colors.primary,
  },
  avatarText: {
    fontSize: 36,
    fontWeight: typography.weights.bold,
    color: colors.primary,
  },
  editAvatarBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editAvatarIcon: {
    fontSize: 14,
  },
  profileEmail: {
    fontSize: typography.sizes.md,
    color: colors.textSecondary,
  },
  section: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    color: colors.text,
  },
  editButton: {
    fontSize: typography.sizes.md,
    color: colors.primary,
  },
  addButton: {
    fontSize: typography.sizes.md,
    color: colors.primary,
  },
  inputGroup: {
    marginBottom: spacing.md,
  },
  inputLabel: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    color: colors.text,
    fontSize: typography.sizes.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  inputValue: {
    fontSize: typography.sizes.md,
    color: colors.text,
    paddingVertical: spacing.sm,
  },
  currencyScroll: {
    marginTop: spacing.sm,
  },
  currencyOption: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginRight: spacing.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  currencyOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(0, 255, 136, 0.1)',
  },
  currencySymbol: {
    fontSize: typography.sizes.lg,
    color: colors.text,
  },
  currencySymbolSelected: {
    color: colors.primary,
  },
  currencyCode: {
    fontSize: typography.sizes.xs,
    color: colors.textSecondary,
  },
  currencyCodeSelected: {
    color: colors.primary,
  },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: colors.textOnPrimary,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  categoryIcon: {
    fontSize: 20,
    marginRight: spacing.md,
  },
  categoryName: {
    fontSize: typography.sizes.md,
    color: colors.text,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: typography.sizes.sm,
    textAlign: 'center',
    paddingVertical: spacing.md,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  menuIcon: {
    fontSize: 20,
    marginRight: spacing.md,
  },
  menuText: {
    fontSize: typography.sizes.md,
    color: colors.text,
  },
  logoutText: {
    color: colors.error,
  },
});

export default ProfileScreen;
