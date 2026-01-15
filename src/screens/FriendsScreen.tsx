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
  ScrollView,
  Platform,
} from 'react-native';
import { colors, spacing, borderRadius, typography } from '../styles';
import { useFriendStore } from '../store';
import { friendsApi, usersApi } from '../api';
import type { User, Borrowing } from '../types';

type TabType = 'friends' | 'history';

const FriendsScreen: React.FC = () => {
  const {
    friends,
    pendingRequests,
    borrowings,
    searchResults,
    isLoading,
    setFriends,
    setPendingRequests,
    setBorrowings,
    setSearchResults,
    clearSearchResults,
    setLoading,
    addFriend,
    addPendingRequest,
    removePendingRequest,
  } = useFriendStore();

  const [activeTab, setActiveTab] = useState<TabType>('friends');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [borrowingHistory, setBorrowingHistory] = useState<Borrowing[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const fetchFriends = useCallback(async () => {
    try {
      setLoading(true);
      const [friendsData, pendingData, borrowingsData] = await Promise.all([
        friendsApi.getFriends(),
        friendsApi.getPendingRequests(),
        friendsApi.getBorrowings(),
      ]);
      setFriends(friendsData);
      setPendingRequests([...pendingData.received, ...pendingData.sent]);
      setBorrowings(borrowingsData);
    } catch (err) {
      // Silent fail
    } finally {
      setLoading(false);
    }
  }, [setLoading, setFriends, setPendingRequests, setBorrowings]);

  const fetchHistory = useCallback(async () => {
    try {
      setHistoryLoading(true);
      const result = await friendsApi.getBorrowingHistory(1, 50);
      setBorrowingHistory(result.data);
    } catch (err) {
      // Silent fail
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFriends();
  }, [fetchFriends]);

  useEffect(() => {
    if (activeTab === 'history') {
      fetchHistory();
    }
  }, [activeTab, fetchHistory]);

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
      // Add to pending requests since it's a sent request (not yet accepted)
      addPendingRequest({ ...friendship, type: 'sent' });
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

  const handleConfirmPayment = async (borrowingId: string) => {
    try {
      setConfirmingId(borrowingId);
      await friendsApi.confirmPayment(borrowingId);
      // Refresh borrowings to get updated state
      const updatedBorrowings = await friendsApi.getBorrowings();
      setBorrowings(updatedBorrowings);
      Alert.alert('Success', 'Payment confirmed! Waiting for other party to confirm.');
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to confirm payment');
    } finally {
      setConfirmingId(null);
    }
  };

  const handleRemind = (borrowing: typeof borrowings[0]) => {
    const userName = borrowing.fromUser?.displayName || borrowing.fromUser?.email || 'User';
    Alert.alert(
      'Send Reminder',
      `Send a reminder to ${userName} about ₹${borrowing.amount.toLocaleString()}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send',
          onPress: async () => {
            try {
              const result = await friendsApi.sendReminder(borrowing.id);
              Alert.alert('Reminder Sent', result.message);
            } catch (error: unknown) {
              const errorMessage = error instanceof Error ? error.message : 'Failed to send reminder';
              Alert.alert('Error', errorMessage);
            }
          },
        },
      ]
    );
  };

  const receivedRequests = pendingRequests.filter((r) => r.type === 'received');
  const sentRequests = pendingRequests.filter((r) => r.type === 'sent');

  // Calculate borrowings summary from real data
  const borrowingsSummary = {
    youOwe: {
      amount: borrowings
        .filter((b) => b.type === 'owe' && !b.isPaid)
        .reduce((sum, b) => sum + b.amount, 0),
      people: new Set(
        borrowings
          .filter((b) => b.type === 'owe' && !b.isPaid)
          .map((b) => b.toUser?.id)
      ).size,
    },
    owedToYou: {
      amount: borrowings
        .filter((b) => b.type === 'lent' && !b.isPaid)
        .reduce((sum, b) => sum + b.amount, 0),
      people: new Set(
        borrowings
          .filter((b) => b.type === 'lent' && !b.isPaid)
          .map((b) => b.fromUser?.id)
      ).size,
    },
  };

  // Get active (unpaid) dues
  const activeDues = borrowings.filter((b) => !b.isPaid);

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString()}`;
  };

  const getInitials = (name: string | null | undefined) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Social</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => setShowAddModal(true)}
          >
            <Text style={styles.headerButtonIcon}>+</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Tab Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'friends' && styles.tabActive]}
          onPress={() => setActiveTab('friends')}
        >
          <Text style={[styles.tabText, activeTab === 'friends' && styles.tabTextActive]}>
            FRIENDS
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'history' && styles.tabActive]}
          onPress={() => setActiveTab('history')}
        >
          <Text style={[styles.tabText, activeTab === 'history' && styles.tabTextActive]}>
            HISTORY
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={activeTab === 'friends' ? isLoading : historyLoading}
            onRefresh={activeTab === 'friends' ? fetchFriends : fetchHistory}
            tintColor={colors.primary}
          />
        }
      >
        {activeTab === 'friends' ? (
          <>
        {/* Summary Cards */}
        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, styles.oweCard]}>
            <Text style={styles.summaryLabel}>YOU OWE</Text>
            <Text style={[styles.summaryAmount, { color: colors.error }]}>
              {formatCurrency(borrowingsSummary.youOwe.amount)}
            </Text>
            <Text style={styles.summarySubtext}>
              To {borrowingsSummary.youOwe.people} people
            </Text>
          </View>
          <View style={[styles.summaryCard, styles.owedCard]}>
            <Text style={styles.summaryLabel}>OWED TO YOU</Text>
            <Text style={[styles.summaryAmount, { color: colors.secondary }]}>
              {formatCurrency(borrowingsSummary.owedToYou.amount)}
            </Text>
            <Text style={styles.summarySubtext}>
              From {borrowingsSummary.owedToYou.people} people
            </Text>
          </View>
        </View>

        {/* Pending Requests (Received) */}
        {receivedRequests.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Friend Requests</Text>
              <Text style={styles.sectionBadge}>{receivedRequests.length}</Text>
            </View>
            {receivedRequests.map((request) => (
              <View key={request.friendshipId} style={[styles.glassCard, styles.pendingCard]}>
                <View style={styles.cardRow}>
                  <View style={styles.avatarContainer}>
                    <View style={styles.avatarPlaceholder}>
                      <Text style={styles.avatarText}>
                        {getInitials(request.user.displayName || request.user.email)}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.cardInfo}>
                    <Text style={styles.cardName}>
                      {request.user.displayName || request.user.email}
                    </Text>
                    <Text style={styles.cardSubtext}>WANTS TO CONNECT</Text>
                  </View>
                  <View style={styles.pendingActions}>
                    <TouchableOpacity
                      style={styles.acceptBtn}
                      onPress={() => handleAcceptRequest(request.friendshipId)}
                    >
                      <Text style={styles.acceptBtnText}>ACCEPT</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.rejectBtn}
                      onPress={() => handleRejectRequest(request.friendshipId)}
                    >
                      <Text style={styles.rejectBtnText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Sent Requests (Pending) */}
        {sentRequests.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Sent Requests</Text>
              <Text style={[styles.sectionBadge, styles.sentBadge]}>{sentRequests.length}</Text>
            </View>
            {sentRequests.map((request) => (
              <View key={request.friendshipId || request.id} style={[styles.glassCard, styles.sentCard]}>
                <View style={styles.cardRow}>
                  <View style={styles.avatarContainer}>
                    <View style={[styles.avatarPlaceholder, { backgroundColor: 'rgba(255, 215, 0, 0.2)' }]}>
                      <Text style={[styles.avatarText, { color: colors.warning }]}>
                        {getInitials(request.user.displayName || request.user.email)}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.cardInfo}>
                    <Text style={styles.cardName}>
                      {request.user.displayName || request.user.username || request.user.email}
                    </Text>
                    <Text style={[styles.cardSubtext, { color: colors.warning }]}>REQUEST PENDING</Text>
                  </View>
                  <View style={styles.pendingStatusContainer}>
                    <Text style={styles.pendingStatusIcon}>⏳</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Active Dues */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Active Dues</Text>
            {activeDues.length > 3 && (
              <TouchableOpacity>
                <Text style={styles.viewAllText}>VIEW ALL</Text>
              </TouchableOpacity>
            )}
          </View>
          {activeDues.length > 0 ? (
            activeDues.slice(0, 5).map((due) => {
              const isOwe = due.type === 'owe';
              const otherUser = isOwe ? due.toUser : due.fromUser;
              const userName = otherUser?.displayName || otherUser?.email || 'Unknown';
              const userAvatar = otherUser?.profileImage;
              const description = due.expense?.description || 'Expense';
              const isConfirming = confirmingId === due.id;

              // Your confirmation status
              const youConfirmed = isOwe ? due.confirmedByPayee : due.confirmedByPayer;
              // Other party's confirmation status
              const otherConfirmed = isOwe ? due.confirmedByPayer : due.confirmedByPayee;

              // Determine button action and text
              const getButtonConfig = () => {
                if (youConfirmed && otherConfirmed) {
                  return { text: 'COMPLETED', disabled: true, action: () => {} };
                }
                if (youConfirmed) {
                  return { text: 'WAITING', disabled: true, action: () => {} };
                }
                if (otherConfirmed) {
                  return { text: 'CONFIRM', disabled: false, action: () => handleConfirmPayment(due.id) };
                }
                // Neither confirmed
                if (isOwe) {
                  return { text: 'MARK PAID', disabled: false, action: () => handleConfirmPayment(due.id) };
                }
                return { text: 'REMIND', disabled: false, action: () => handleRemind(due) };
              };
              const buttonConfig = getButtonConfig();

              return (
                <View
                  key={due.id}
                  style={[
                    styles.glassCard,
                    isOwe ? styles.dueCardOwe : styles.dueCardOwed,
                  ]}
                >
                  <View style={styles.cardRow}>
                    <View style={styles.avatarContainer}>
                      {userAvatar ? (
                        <Image source={{ uri: userAvatar }} style={styles.avatar} />
                      ) : (
                        <View style={[
                          styles.avatarPlaceholder,
                          { backgroundColor: isOwe ? 'rgba(255, 68, 68, 0.2)' : 'rgba(0, 212, 255, 0.2)' }
                        ]}>
                          <Text style={[
                            styles.avatarText,
                            { color: isOwe ? colors.error : colors.secondary }
                          ]}>
                            {getInitials(userName)}
                          </Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.cardInfo}>
                      <Text style={styles.cardName}>{userName}</Text>
                      <Text style={styles.cardSubtext}>
                        {isOwe ? 'YOU OWE' : 'OWES YOU'} • {description.toUpperCase().slice(0, 20)}
                      </Text>
                      {/* Show confirmation status */}
                      {youConfirmed && (
                        <Text style={styles.confirmationStatus}>✓ You confirmed</Text>
                      )}
                      {otherConfirmed && !youConfirmed && (
                        <Text style={styles.otherConfirmedStatus}>✓ {userName.split(' ')[0]} confirmed</Text>
                      )}
                    </View>
                    <View style={styles.dueRight}>
                      <Text style={[
                        styles.dueAmount,
                        { color: isOwe ? colors.error : colors.secondary }
                      ]}>
                        {isOwe ? '-' : '+'}₹{due.amount.toLocaleString()}
                      </Text>
                      <TouchableOpacity
                        style={[
                          styles.dueActionBtn,
                          otherConfirmed && !youConfirmed ? styles.confirmBtn : (isOwe ? styles.markPaidBtn : styles.remindBtn),
                          (isConfirming || buttonConfig.disabled) && styles.dueActionBtnDisabled,
                        ]}
                        onPress={buttonConfig.action}
                        disabled={isConfirming || buttonConfig.disabled}
                      >
                        <Text style={[
                          styles.dueActionText,
                          otherConfirmed && !youConfirmed ? styles.confirmText : (isOwe ? styles.markPaidText : styles.remindText),
                        ]}>
                          {isConfirming ? '...' : buttonConfig.text}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            })
          ) : (
            <View style={styles.emptyDuesContainer}>
              <Text style={styles.emptyDuesIcon}>✓</Text>
              <Text style={styles.emptyDuesText}>All settled up!</Text>
              <Text style={styles.emptyDuesSubtext}>No pending dues with friends</Text>
            </View>
          )}
        </View>

        {/* Friends List */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Friends</Text>
            <TouchableOpacity>
              <Text style={styles.sortText}>A-Z</Text>
            </TouchableOpacity>
          </View>
          {friends.length > 0 ? (
            friends.map((friend) => {
              // Determine status display based on friendship status
              const getStatusDisplay = () => {
                const status = friend.status?.toLowerCase();
                if (status === 'pending') {
                  return { text: 'PENDING', color: colors.warning };
                } else if (status === 'accepted') {
                  // TODO: Check borrowings to show actual balance
                  return { text: 'SETTLED UP', color: colors.primary };
                }
                return { text: 'CONNECTED', color: colors.textMuted };
              };
              const statusDisplay = getStatusDisplay();

              return (
                <TouchableOpacity key={friend.id} style={styles.friendCard}>
                  <View style={styles.cardRow}>
                    <View style={styles.avatarContainer}>
                      {friend.user.profileImage ? (
                        <Image
                          source={{ uri: friend.user.profileImage }}
                          style={styles.avatar}
                        />
                      ) : (
                        <View style={styles.avatarPlaceholder}>
                          <Text style={styles.avatarText}>
                            {getInitials(friend.user.displayName || friend.user.email)}
                          </Text>
                        </View>
                      )}
                      {friend.status?.toLowerCase() === 'accepted' && <View style={styles.onlineIndicator} />}
                    </View>
                    <View style={styles.cardInfo}>
                      <Text style={styles.cardName}>
                        {friend.user.displayName || friend.user.username || 'Unknown'}
                      </Text>
                      <Text style={[styles.cardSubtext, { color: statusDisplay.color }]}>
                        {statusDisplay.text}
                      </Text>
                    </View>
                    <View style={styles.chevronContainer}>
                      <Text style={styles.chevron}>›</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>👥</Text>
              <Text style={styles.emptyText}>No friends yet</Text>
              <Text style={styles.emptySubtext}>
                Add friends to split expenses with them
              </Text>
            </View>
          )}
        </View>
          </>
        ) : (
          <>
            {/* History View */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Payment History</Text>
              </View>
              {borrowingHistory.length > 0 ? (
                borrowingHistory.map((item) => {
                  const isOwe = item.type === 'owe';
                  const otherUser = isOwe ? item.toUser : item.fromUser;
                  const userName = otherUser?.displayName || otherUser?.email || 'Unknown';
                  const userAvatar = otherUser?.profileImage;
                  const description = item.expense?.description || 'Payment';
                  const paidDate = item.paidAt ? new Date(item.paidAt).toLocaleDateString() : '';

                  return (
                    <View
                      key={item.id}
                      style={[styles.glassCard, styles.historyCard]}
                    >
                      <View style={styles.cardRow}>
                        <View style={styles.avatarContainer}>
                          {userAvatar ? (
                            <Image source={{ uri: userAvatar }} style={styles.avatar} />
                          ) : (
                            <View style={[styles.avatarPlaceholder, styles.historyAvatarPlaceholder]}>
                              <Text style={[styles.avatarText, { color: colors.primary }]}>
                                {getInitials(userName)}
                              </Text>
                            </View>
                          )}
                          <View style={styles.completedIndicator}>
                            <Text style={styles.completedIcon}>✓</Text>
                          </View>
                        </View>
                        <View style={styles.cardInfo}>
                          <Text style={styles.cardName}>{userName}</Text>
                          <Text style={styles.cardSubtext}>
                            {isOwe ? 'YOU PAID' : 'PAID YOU'} • {description.toUpperCase().slice(0, 20)}
                          </Text>
                          {paidDate && (
                            <Text style={styles.historyDate}>Cleared on {paidDate}</Text>
                          )}
                        </View>
                        <View style={styles.historyRight}>
                          <Text style={[
                            styles.historyAmount,
                            { color: isOwe ? colors.error : colors.primary }
                          ]}>
                            {isOwe ? '-' : '+'}₹{item.amount.toLocaleString()}
                          </Text>
                          <View style={styles.clearedBadge}>
                            <Text style={styles.clearedText}>CLEARED</Text>
                          </View>
                        </View>
                      </View>
                    </View>
                  );
                })
              ) : (
                <View style={styles.emptyHistoryContainer}>
                  <Text style={styles.emptyHistoryIcon}>📜</Text>
                  <Text style={styles.emptyHistoryText}>No history yet</Text>
                  <Text style={styles.emptyHistorySubtext}>
                    Cleared payments will appear here
                  </Text>
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>

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
                          {getInitials(item.displayName || item.email)}
                        </Text>
                      </View>
                    )}
                    <View style={styles.searchResultInfo}>
                      <Text style={styles.searchResultName}>
                        {item.displayName || item.username || 'Unknown'}
                      </Text>
                      <Text style={styles.searchResultEmail}>{item.email}</Text>
                    </View>
                    <View style={styles.addIconContainer}>
                      <Text style={styles.addIcon}>+</Text>
                    </View>
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
  headerActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerButtonIcon: {
    fontSize: 18,
    color: colors.textMuted,
  },
  // Tab Bar
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginHorizontal: spacing.lg,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: colors.primary,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 2,
  },
  tabTextActive: {
    color: colors.primary,
  },
  // Scroll View
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: 100,
  },
  // Summary Cards
  summaryRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: 'rgba(25, 25, 25, 0.7)',
    borderRadius: 24,
    padding: spacing.lg,
    borderWidth: 1,
  },
  oweCard: {
    borderColor: 'rgba(255, 68, 68, 0.4)',
    shadowColor: colors.error,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
  },
  owedCard: {
    borderColor: 'rgba(0, 212, 255, 0.4)',
    shadowColor: colors.secondary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
  },
  summaryLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 1,
    marginBottom: 4,
  },
  summaryAmount: {
    fontSize: 22,
    fontWeight: '800',
  },
  summarySubtext: {
    fontSize: 9,
    fontWeight: '500',
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
  // Section
  section: {
    marginBottom: spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  sectionBadge: {
    backgroundColor: colors.primary,
    color: colors.background,
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  viewAllText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 1,
  },
  sortText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 1,
  },
  // Glass Card
  glassCard: {
    backgroundColor: 'rgba(25, 25, 25, 0.7)',
    borderRadius: 24,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
  },
  pendingCard: {
    borderColor: 'rgba(255, 0, 255, 0.3)',
  },
  sentCard: {
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  sentBadge: {
    backgroundColor: colors.warning,
  },
  pendingStatusContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingStatusIcon: {
    fontSize: 14,
  },
  dueCardOwe: {
    borderColor: 'rgba(255, 68, 68, 0.4)',
    shadowColor: colors.error,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  dueCardOwed: {
    borderColor: 'rgba(0, 212, 255, 0.4)',
    shadowColor: colors.secondary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(100, 100, 100, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.background,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  cardInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  cardName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  cardSubtext: {
    fontSize: 10,
    fontWeight: '500',
    color: colors.textMuted,
    marginTop: 2,
    letterSpacing: 0.5,
  },
  // Pending Actions
  pendingActions: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  acceptBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  acceptBtnText: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.background,
    letterSpacing: 0.5,
  },
  rejectBtn: {
    backgroundColor: 'rgba(255, 68, 68, 0.2)',
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rejectBtnText: {
    fontSize: 12,
    color: colors.error,
  },
  // Due Right
  dueRight: {
    alignItems: 'flex-end',
  },
  dueAmount: {
    fontSize: 14,
    fontWeight: '700',
  },
  dueActionBtn: {
    marginTop: spacing.xs,
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  markPaidBtn: {
    backgroundColor: colors.secondary,
    shadowColor: colors.secondary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
  },
  remindBtn: {
    borderWidth: 1,
    borderColor: colors.secondary,
  },
  dueActionText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  markPaidText: {
    color: colors.background,
  },
  remindText: {
    color: colors.secondary,
  },
  dueActionBtnDisabled: {
    opacity: 0.5,
  },
  confirmationStatus: {
    fontSize: 9,
    color: colors.primary,
    marginTop: 2,
    fontWeight: '600',
  },
  otherConfirmedStatus: {
    fontSize: 9,
    color: colors.warning,
    marginTop: 2,
    fontWeight: '600',
  },
  confirmBtn: {
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
  },
  confirmText: {
    color: colors.background,
  },
  emptyDuesContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    backgroundColor: 'rgba(0, 255, 136, 0.05)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 136, 0.2)',
  },
  emptyDuesIcon: {
    fontSize: 32,
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  emptyDuesText: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: '700',
  },
  emptyDuesSubtext: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  // Friend Card
  friendCard: {
    backgroundColor: 'rgba(25, 25, 25, 0.7)',
    borderRadius: 24,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  chevronContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(100, 100, 100, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chevron: {
    fontSize: 18,
    color: colors.textMuted,
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
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
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
  searchInput: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: spacing.md,
    color: colors.text,
    fontSize: 14,
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
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  searchResultInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  searchResultName: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '600',
  },
  searchResultEmail: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  addIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 255, 136, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addIcon: {
    fontSize: 18,
    color: colors.primary,
    fontWeight: '700',
  },
  noResultsText: {
    color: colors.textMuted,
    textAlign: 'center',
    paddingVertical: spacing.lg,
  },
  // History Styles
  historyCard: {
    borderColor: 'rgba(0, 255, 136, 0.3)',
  },
  historyAvatarPlaceholder: {
    backgroundColor: 'rgba(0, 255, 136, 0.15)',
  },
  completedIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.background,
  },
  completedIcon: {
    fontSize: 8,
    color: colors.background,
    fontWeight: '800',
  },
  historyDate: {
    fontSize: 9,
    color: colors.textMuted,
    marginTop: 2,
  },
  historyRight: {
    alignItems: 'flex-end',
  },
  historyAmount: {
    fontSize: 14,
    fontWeight: '700',
  },
  clearedBadge: {
    marginTop: spacing.xs,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 255, 136, 0.15)',
  },
  clearedText: {
    fontSize: 8,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 0.5,
  },
  emptyHistoryContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    backgroundColor: 'rgba(100, 100, 100, 0.1)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(100, 100, 100, 0.2)',
  },
  emptyHistoryIcon: {
    fontSize: 32,
    marginBottom: spacing.sm,
  },
  emptyHistoryText: {
    fontSize: 16,
    color: colors.textMuted,
    fontWeight: '700',
  },
  emptyHistorySubtext: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
});

export default FriendsScreen;
