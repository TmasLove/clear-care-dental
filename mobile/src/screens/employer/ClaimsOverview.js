import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { employersAPI } from '../../api/employers';
import { colors } from '../../utils/colors';
import { formatCurrency } from '../../utils/formatters';
import ClaimCard from '../../components/claims/ClaimCard';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';

const ALL_STATUSES = ['All', 'Approved', 'Pending', 'Paid', 'Denied'];

const MOCK_CLAIMS = [
  { id: '1', procedureCode: 'D0120', procedureName: 'Periodic Oral Evaluation', status: 'approved', amountBilled: 89, amountApproved: 71, patientOwes: 0, serviceDate: '2026-03-20', patientName: 'Sarah Johnson' },
  { id: '2', procedureCode: 'D1110', procedureName: 'Adult Prophylaxis', status: 'paid', amountBilled: 145, amountApproved: 116, patientOwes: 29, serviceDate: '2026-03-18', patientName: 'Michael Chen' },
  { id: '3', procedureCode: 'D2140', procedureName: 'Amalgam Restoration', status: 'pending', amountBilled: 312, amountApproved: 0, patientOwes: 0, serviceDate: '2026-03-15', patientName: 'Emily Rodriguez' },
  { id: '4', procedureCode: 'D0210', procedureName: 'Full Mouth X-Rays', status: 'approved', amountBilled: 220, amountApproved: 176, patientOwes: 44, serviceDate: '2026-03-12', patientName: 'James Wilson' },
  { id: '5', procedureCode: 'D4341', procedureName: 'Periodontal Scaling', status: 'denied', amountBilled: 450, amountApproved: 0, patientOwes: 450, serviceDate: '2026-03-10', patientName: 'Amanda Davis' },
  { id: '6', procedureCode: 'D2750', procedureName: 'Crown - Porcelain/Ceramic', status: 'paid', amountBilled: 1200, amountApproved: 900, patientOwes: 300, serviceDate: '2026-03-08', patientName: 'Robert Martinez' },
  { id: '7', procedureCode: 'D7140', procedureName: 'Extraction', status: 'approved', amountBilled: 189, amountApproved: 151, patientOwes: 38, serviceDate: '2026-03-05', patientName: 'Sarah Johnson' },
];

const ClaimsOverview = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [claims, setClaims] = useState(MOCK_CLAIMS);
  const [filtered, setFiltered] = useState(MOCK_CLAIMS);
  const [search, setSearch] = useState('');
  const [activeStatus, setActiveStatus] = useState('All');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadClaims = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const data = await employersAPI.getClaims({ limit: 50 });
      const list = data?.claims || data || [];
      if (list.length > 0) {
        setClaims(list);
      }
    } catch {
      // Use mock data
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadClaims();
  }, [loadClaims]);

  useEffect(() => {
    let results = claims;
    if (activeStatus !== 'All') {
      results = results.filter(
        (c) => c.status?.toLowerCase() === activeStatus.toLowerCase()
      );
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      results = results.filter(
        (c) =>
          c.procedureName?.toLowerCase().includes(q) ||
          c.procedureCode?.toLowerCase().includes(q) ||
          c.patientName?.toLowerCase().includes(q)
      );
    }
    setFiltered(results);
  }, [claims, activeStatus, search]);

  const onRefresh = () => {
    setRefreshing(true);
    loadClaims(true);
  };

  const totalBilled = filtered.reduce((sum, c) => sum + (c.amountBilled || 0), 0);
  const totalApproved = filtered.reduce((sum, c) => sum + (c.amountApproved || 0), 0);

  if (loading) return <LoadingSpinner fullScreen message="Loading claims..." />;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Claims Overview</Text>

        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Search claims..."
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

        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={ALL_STATUSES}
          keyExtractor={(item) => item}
          contentContainerStyle={styles.filterList}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.filterChip, activeStatus === item && styles.filterChipActive]}
              onPress={() => setActiveStatus(item)}
            >
              <Text style={[styles.filterChipText, activeStatus === item && styles.filterChipTextActive]}>
                {item}
              </Text>
            </TouchableOpacity>
          )}
        />

        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Total Billed</Text>
            <Text style={styles.summaryValue}>{formatCurrency(totalBilled)}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Total Approved</Text>
            <Text style={[styles.summaryValue, { color: colors.success }]}>
              {formatCurrency(totalApproved)}
            </Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Claims</Text>
            <Text style={styles.summaryValue}>{filtered.length}</Text>
          </View>
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id?.toString()}
        renderItem={({ item }) => (
          <View style={styles.claimItem}>
            <ClaimCard
              claim={item}
              showPatient
              onPress={() => navigation.navigate('ClaimDetail', { claimId: item.id })}
            />
          </View>
        )}
        ListEmptyComponent={
          <EmptyState
            icon="📋"
            title="No Claims Found"
            subtitle="Try adjusting your search or filter."
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
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    marginBottom: 12,
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
  filterList: {
    paddingBottom: 12,
    gap: 8,
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
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  filterChipTextActive: {
    color: colors.white,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 8,
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
    marginBottom: 3,
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
  },
  summaryDivider: {
    width: 1,
    height: 28,
    backgroundColor: colors.border,
  },
  listContent: {
    padding: 20,
    paddingBottom: 100,
    flexGrow: 1,
  },
  claimItem: {},
});

export default ClaimsOverview;
