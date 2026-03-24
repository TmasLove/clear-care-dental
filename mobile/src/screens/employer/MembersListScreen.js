import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Alert,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { employersAPI } from '../../api/employers';
import { colors } from '../../utils/colors';
import Badge from '../../components/common/Badge';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';

const MOCK_MEMBERS = [
  { id: '1', firstName: 'Sarah', lastName: 'Johnson', email: 'sarah.j@company.com', memberId: 'CC-1001', planName: 'Standard Dental', status: 'active', enrolledDate: '2025-01-15' },
  { id: '2', firstName: 'Michael', lastName: 'Chen', email: 'mchen@company.com', memberId: 'CC-1002', planName: 'Premium Dental', status: 'active', enrolledDate: '2025-01-15' },
  { id: '3', firstName: 'Emily', lastName: 'Rodriguez', email: 'emily.r@company.com', memberId: 'CC-1003', planName: 'Standard Dental', status: 'active', enrolledDate: '2025-02-01' },
  { id: '4', firstName: 'James', lastName: 'Wilson', email: 'jwilson@company.com', memberId: 'CC-1004', planName: 'Standard Dental', status: 'pending', enrolledDate: '2026-03-01' },
  { id: '5', firstName: 'Amanda', lastName: 'Davis', email: 'adavis@company.com', memberId: 'CC-1005', planName: 'Premium Dental', status: 'active', enrolledDate: '2025-03-10' },
  { id: '6', firstName: 'Robert', lastName: 'Martinez', email: 'rmartinez@company.com', memberId: 'CC-1006', planName: 'Basic Dental', status: 'inactive', enrolledDate: '2024-12-01' },
];

const MemberRow = ({ member, onPress }) => (
  <TouchableOpacity style={styles.memberRow} onPress={onPress} activeOpacity={0.8}>
    <View style={styles.memberAvatar}>
      <Text style={styles.memberAvatarText}>
        {member.firstName?.charAt(0)}{member.lastName?.charAt(0)}
      </Text>
    </View>
    <View style={styles.memberInfo}>
      <Text style={styles.memberName}>
        {member.firstName} {member.lastName}
      </Text>
      <Text style={styles.memberEmail}>{member.email}</Text>
      <Text style={styles.memberPlan}>{member.planName}</Text>
    </View>
    <View style={styles.memberRight}>
      <Badge
        label={member.status === 'active' ? 'Active' : member.status === 'pending' ? 'Pending' : 'Inactive'}
        variant={member.status === 'active' ? 'success' : member.status === 'pending' ? 'pending' : 'default'}
        size="small"
      />
      <Text style={styles.memberId}>{member.memberId}</Text>
    </View>
  </TouchableOpacity>
);

const MembersListScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [members, setMembers] = useState(MOCK_MEMBERS);
  const [filtered, setFiltered] = useState(MOCK_MEMBERS);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadMembers = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const data = await employersAPI.getMembers();
      const list = data?.members || data || [];
      if (list.length > 0) {
        setMembers(list);
        setFiltered(list);
      }
    } catch {
      // Use mock data
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  useEffect(() => {
    if (!search.trim()) {
      setFiltered(members);
    } else {
      const q = search.toLowerCase();
      setFiltered(
        members.filter(
          (m) =>
            `${m.firstName} ${m.lastName}`.toLowerCase().includes(q) ||
            m.email?.toLowerCase().includes(q) ||
            m.memberId?.toLowerCase().includes(q)
        )
      );
    }
  }, [search, members]);

  const onRefresh = () => {
    setRefreshing(true);
    loadMembers(true);
  };

  if (loading) return <LoadingSpinner fullScreen message="Loading members..." />;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>Members</Text>
          <TouchableOpacity
            style={styles.inviteButton}
            onPress={() => navigation.navigate('InviteMember')}
          >
            <Text style={styles.inviteButtonText}>+ Invite</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Search by name, email, or ID..."
            placeholderTextColor={colors.textSecondary}
            autoCorrect={false}
            autoCapitalize="none"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Text style={styles.clearSearch}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
        <Text style={styles.memberCount}>{filtered.length} member{filtered.length !== 1 ? 's' : ''}</Text>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id?.toString()}
        renderItem={({ item }) => (
          <MemberRow
            member={item}
            onPress={() => navigation.navigate('MemberDetail', { memberId: item.id })}
          />
        )}
        ListEmptyComponent={
          <EmptyState
            icon="👥"
            title="No Members Found"
            subtitle={search ? 'Try a different search term.' : 'Invite your team members to get started.'}
            actionLabel={search ? null : 'Invite Member'}
            onAction={search ? null : () => navigation.navigate('InviteMember')}
          />
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.white,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
  },
  inviteButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
  },
  inviteButtonText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 14,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.text,
  },
  clearSearch: {
    fontSize: 14,
    color: colors.textSecondary,
    padding: 4,
  },
  memberCount: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  listContent: {
    paddingBottom: 100,
    flexGrow: 1,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  memberAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  memberAvatarText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.white,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 2,
  },
  memberEmail: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  memberPlan: {
    fontSize: 12,
    color: colors.primaryLight,
    fontWeight: '500',
  },
  memberRight: {
    alignItems: 'flex-end',
    gap: 6,
  },
  memberId: {
    fontSize: 11,
    color: colors.textSecondary,
    fontFamily: Platform?.OS === 'ios' ? 'Courier' : 'monospace',
  },
  separator: {
    height: 1,
    backgroundColor: colors.border,
    marginLeft: 78,
  },
});

export default MembersListScreen;
