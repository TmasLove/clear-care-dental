import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { claimsAPI } from '../../api/claims';
import { membersAPI } from '../../api/members';
import { useAuth } from '../../hooks/useAuth';
import { formatCurrency } from '../../utils/formatters';
import { colors } from '../../utils/colors';
import ClaimCard from '../../components/claims/ClaimCard';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';

const MOCK_CLAIMS = [
  { id: '1', procedureCode: 'D0120', procedureName: 'Periodic Oral Evaluation', status: 'approved', amountBilled: 89, amountApproved: 71, patientOwes: 0, serviceDate: '2026-03-20' },
  { id: '2', procedureCode: 'D1110', procedureName: 'Adult Prophylaxis (Cleaning)', status: 'paid', amountBilled: 145, amountApproved: 116, patientOwes: 29, serviceDate: '2026-03-18' },
  { id: '3', procedureCode: 'D2140', procedureName: 'Amalgam Restoration', status: 'pending', amountBilled: 312, amountApproved: 0, patientOwes: 0, serviceDate: '2026-03-15' },
  { id: '4', procedureCode: 'D0210', procedureName: 'Full Mouth X-Rays', status: 'approved', amountBilled: 220, amountApproved: 176, patientOwes: 44, serviceDate: '2026-02-28' },
  { id: '5', procedureCode: 'D1110', procedureName: 'Adult Prophylaxis', status: 'paid', amountBilled: 145, amountApproved: 116, patientOwes: 29, serviceDate: '2025-09-12' },
  { id: '6', procedureCode: 'D0120', procedureName: 'Periodic Oral Evaluation', status: 'paid', amountBilled: 89, amountApproved: 71, patientOwes: 0, serviceDate: '2025-09-12' },
];

const STATUS_FILTERS = ['All', 'Approved', 'Paid', 'Pending', 'Denied'];

const ClaimsHistoryScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [claims, setClaims] = useState(MOCK_CLAIMS);
  const [filtered, setFiltered] = useState(MOCK_CLAIMS);
  const [activeFilter, setActiveFilter] = useState('All');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadClaims = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      // Get the actual member UUID via /members/me
      const meData = await membersAPI.getMemberById('me');
      const memberId = meData?.member?.id;
      const data = memberId
        ? await claimsAPI.getMemberClaims(memberId, { limit: 50 })
        : await claimsAPI.getClaims({ limit: 50 });
      const list = data?.claims || data || [];
      if (list.length > 0) setClaims(list);
    } catch {
      // Use mock data
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    loadClaims();
  }, [loadClaims]);

  useEffect(() => {
    if (activeFilter === 'All') {
      setFiltered(claims);
    } else {
      setFiltered(claims.filter((c) => c.status?.toLowerCase() === activeFilter.toLowerCase()));
    }
  }, [claims, activeFilter]);

  const onRefresh = () => {
    setRefreshing(true);
    loadClaims(true);
  };

  const totalBilled = filtered.reduce((s, c) => s + parseFloat(c.amountBilled || c.amount_billed || c.total_billed || 0), 0);
  const totalOwed = filtered.reduce((s, c) => s + parseFloat(c.patientOwes || c.patient_owes || c.member_responsibility || 0), 0);
  const totalSaved = totalBilled - totalOwed;

  if (loading) return <LoadingSpinner fullScreen message="Loading claims..." />;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Claims</Text>

        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={STATUS_FILTERS}
          keyExtractor={(item) => item}
          contentContainerStyle={styles.filterList}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.filterChip, activeFilter === item && styles.filterChipActive]}
              onPress={() => setActiveFilter(item)}
            >
              <Text
                style={[styles.filterText, activeFilter === item && styles.filterTextActive]}
              >
                {item}
              </Text>
            </TouchableOpacity>
          )}
        />

        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Billed</Text>
            <Text style={styles.summaryValue}>{formatCurrency(totalBilled)}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>You Saved</Text>
            <Text style={[styles.summaryValue, { color: colors.success }]}>
              {formatCurrency(totalSaved)}
            </Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>You Paid</Text>
            <Text style={styles.summaryValue}>{formatCurrency(totalOwed)}</Text>
          </View>
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id?.toString()}
        renderItem={({ item }) => (
          <View style={styles.claimWrapper}>
            <ClaimCard
              claim={item}
              onPress={() => navigation.navigate('ClaimDetail', { claimId: item.id, claim: item })}
            />
          </View>
        )}
        ListEmptyComponent={
          <EmptyState
            icon="📋"
            title="No Claims Yet"
            subtitle={
              activeFilter === 'All'
                ? "Your claims will appear here once a dentist submits them."
                : `No ${activeFilter.toLowerCase()} claims found.`
            }
            actionLabel={activeFilter !== 'All' ? 'Show All Claims' : null}
            onAction={activeFilter !== 'All' ? () => setActiveFilter('All') : null}
          />
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
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
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 12,
  },
  filterList: {
    gap: 8,
    paddingBottom: 12,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  filterChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  filterText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  filterTextActive: {
    color: colors.white,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 4,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 2,
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
  },
  summaryDivider: {
    width: 1,
    height: 24,
    backgroundColor: colors.border,
  },
  listContent: {
    padding: 20,
    paddingBottom: 100,
    flexGrow: 1,
  },
  claimWrapper: {},
});

export default ClaimsHistoryScreen;
