import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  Image,
  RefreshControl,
  Alert,
} from 'react-native';
import { colors, spacing, borderRadius, typography } from '../styles';
import { useFriendStore } from '../store';
import { friendsApi, usersApi } from '../api';
import type { User } from '../types';

const FriendsScreen: React.FC = () => {
  const {
    friends,
    pendingRequests,
    searchResults,
    isLoading,
    setFriends,
    setPendingRequests,
    setSearchResults,
    clearSearchResults,
    setLoading,
    addFriend,
    removePendingRequest,
  } = useFriendStore();

  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);

  const fetchFriends = useCallback(async () => {
    try {
      setLoading(true);
      const [friendsData, pendingData] = await Promise.all([
        friendsApi.getFriends(),
        friendsApi.getPendingRequests(),
      ]);
      setFriends(friendsData);
      setPendingRequests([...pendingData.received, ...pendingData.sent]);
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to fetch friends');
    } finally {
      setLoading(false);
    }
  }, [setLoading, setFriends, setPendingRequests]);

  useEffect(() => {
    fetchFriends();
  }, [fetchFriends]);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.length < 2) {
      clearSearchResults();
      return;
    }

    try {
      setSearching(true);
      const results = await usersApi.searchUsers(query);
      setSearchResults(results);
    } catch (err) {
      // Ignore search errors
    } finally {
      setSearching(false);
    }
  };

  const handleSendRequest = async (user: User) => {
    try {
      const friendship = await friendsApi.sendFriendRequest(user.id);
      addFriend(friendship);
      setShowAddModal(false);
      setSearchQuery('');
      clearSearchResults();
      Alert.alert('Success', `Friend request sent to ${user.displayName || user.email}`);
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to send request');
    }
  };

  const handleAcceptRequest = async (friendshipId: string) => {
    try {
      const friendship = await friendsApi.acceptFriendRequest(friendshipId);
      addFriend(friendship);
      removePendingRequest(friendshipId);
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to accept request');
    }
  };

  const handleRejectRequest = async (friendshipId: string) => {
    try {
      await friendsApi.rejectFriendRequest(friendshipId);
      removePendingRequest(friendshipId);
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to reject request');
    }
  };

  const receivedRequests = pendingRequests.filter((r) => r.type === 'received');

  const renderFriendItem = ({ item }: { item: typeof friends[0] }) => (
    <TouchableOpacity style={styles.friendItem}>
      {item.user.profileImage ? (
        <Image source={{ uri: item.user.profileImage }} style={styles.friendAvatar} />
      ) : (
        <View style={styles.friendAvatarPlaceholder}>
          <Text style={styles.friendAvatarText}>
            {item.user.displayName?.[0] || item.user.email?.[0] || '?'}
          </Text>
        </View>
      )}
      <View style={styles.friendInfo}>
        <Text style={styles.friendName}>
          {item.user.displayName || item.user.username || 'Unknown'}
        </Text>
        <Text style={styles.friendEmail}>{item.user.email}</Text>
      </View>
      <TouchableOpacity style={styles.friendAction}>
        <Text style={styles.friendActionIcon}>💬</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Friends</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowAddModal(true)}
        >
          <Text style={styles.addButtonText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      {/* Pending requests */}
      {receivedRequests.length > 0 && (
        <View style={styles.pendingSection}>
          <Text style={styles.pendingTitle}>Pending Requests</Text>
          {receivedRequests.map((request) => (
            <View key={request.friendshipId} style={styles.pendingItem}>
              <View style={styles.pendingInfo}>
                <Text style={styles.pendingName}>
                  {request.user.displayName || request.user.email}
                </Text>
              </View>
              <View style={styles.pendingActions}>
                <TouchableOpacity
                  style={styles.acceptButton}
                  onPress={() => handleAcceptRequest(request.friendshipId)}
                >
                  <Text style={styles.acceptButtonText}>Accept</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.rejectButton}
                  onPress={() => handleRejectRequest(request.friendshipId)}
                >
                  <Text style={styles.rejectButtonText}>Reject</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Friends list */}
      <FlatList
        data={friends}
        keyExtractor={(item) => item.id}
        renderItem={renderFriendItem}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={fetchFriends}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>👥</Text>
            <Text style={styles.emptyText}>No friends yet</Text>
            <Text style={styles.emptySubtext}>
              Add friends to split expenses with them
            </Text>
          </View>
        }
        contentContainerStyle={friends.length === 0 ? styles.emptyList : undefined}
      />

      {/* Add Friend Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Friend</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.searchInput}
              placeholder="Search by username or email"
              placeholderTextColor={colors.textMuted}
              value={searchQuery}
              onChangeText={handleSearch}
              autoCapitalize="none"
            />

            {searching ? (
              <Text style={styles.searchingText}>Searching...</Text>
            ) : (
              <FlatList
                data={searchResults}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.searchResultItem}
                    onPress={() => handleSendRequest(item)}
                  >
                    {item.profileImage ? (
                      <Image source={{ uri: item.profileImage }} style={styles.searchResultAvatar} />
                    ) : (
                      <View style={styles.searchResultAvatarPlaceholder}>
                        <Text style={styles.searchResultAvatarText}>
                          {item.displayName?.[0] || item.email?.[0]}
                        </Text>
                      </View>
                    )}
                    <View style={styles.searchResultInfo}>
                      <Text style={styles.searchResultName}>
                        {item.displayName || item.username || 'Unknown'}
                      </Text>
                      <Text style={styles.searchResultEmail}>{item.email}</Text>
                    </View>
                    <Text style={styles.addIcon}>+</Text>
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  searchQuery.length >= 2 ? (
                    <Text style={styles.noResultsText}>No users found</Text>
                  ) : null
                }
              />
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
  },
  title: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.bold,
    color: colors.text,
  },
  addButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
  },
  addButtonText: {
    color: colors.textOnPrimary,
    fontWeight: typography.weights.semibold,
  },
  pendingSection: {
    backgroundColor: colors.card,
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  pendingTitle: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  pendingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  pendingInfo: {
    flex: 1,
  },
  pendingName: {
    fontSize: typography.sizes.md,
    color: colors.text,
  },
  pendingActions: {
    flexDirection: 'row',
  },
  acceptButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.sm,
    marginRight: spacing.xs,
  },
  acceptButtonText: {
    color: colors.textOnPrimary,
    fontSize: typography.sizes.sm,
  },
  rejectButton: {
    backgroundColor: colors.surface,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.sm,
  },
  rejectButtonText: {
    color: colors.textSecondary,
    fontSize: typography.sizes.sm,
  },
  friendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  friendAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  friendAvatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  friendAvatarText: {
    fontSize: 18,
    fontWeight: typography.weights.bold,
    color: colors.primary,
  },
  friendInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  friendName: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.medium,
    color: colors.text,
  },
  friendEmail: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
  },
  friendAction: {
    padding: spacing.sm,
  },
  friendActionIcon: {
    fontSize: 20,
  },
  emptyList: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: spacing.md,
  },
  emptyText: {
    fontSize: typography.sizes.lg,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  emptySubtext: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
    textAlign: 'center',
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
  searchInput: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    color: colors.text,
    fontSize: typography.sizes.md,
    marginBottom: spacing.md,
  },
  searchingText: {
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: spacing.lg,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  searchResultAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  searchResultAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchResultAvatarText: {
    fontSize: 16,
    fontWeight: typography.weights.bold,
    color: colors.primary,
  },
  searchResultInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  searchResultName: {
    fontSize: typography.sizes.md,
    color: colors.text,
  },
  searchResultEmail: {
    fontSize: typography.sizes.sm,
    color: colors.textSecondary,
  },
  addIcon: {
    fontSize: 24,
    color: colors.primary,
    fontWeight: typography.weights.bold,
  },
  noResultsText: {
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: spacing.lg,
  },
});

export default FriendsScreen;
