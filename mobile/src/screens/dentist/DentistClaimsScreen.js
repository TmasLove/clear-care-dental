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
import { dentistsAPI } from '../../api/dentists';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { dentistColors as colors } from '../../utils/dentistColors';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import Badge from '../../components/common/Badge';

const MOCK_CLAIMS = [
  { id: '1', claimNumber: 'CLM-001', patientName: 'Sarah Johnson', memberId: 'CC-1001', procedureCode: 'D0120', procedureName: 'Periodic Oral Evaluation', amountBilled: 89, amountApproved: 71, insurancePays: 71, patientOwes: 0, status: 'paid', serviceDate: '2026-03-20' },
  { id: '2', claimNumber: 'CLM-002', patientName: 'Michael Chen', memberId: 'CC-1002', procedureCode: 'D2750', procedureName: 'Crown - Porcelain fused to metal', amountBilled: 1100, amountApproved: 880, insurancePays: 880, patientOwes: 220, status: 'paid', serviceDate: '2026-03-21' },
  { id: '3', claimNumber: 'CLM-003', patientName: 'Emily Rodriguez', memberId: 'CC-1003', procedureCode: 'D1110', procedureName: 'Adult Prophylaxis', amountBilled: 145, amountApproved: 116, insurancePays: 87, patientOwes: 29, status: 'approved', serviceDate: '2026-03-18' },
  { id: '4', claimNumber: 'CLM-004', patientName: 'James Wilson', memberId: 'CC-1004', procedureCode: 'D2150', procedureName: 'Amalgam, 2 surfaces', amountBilled: 265, amountApproved: 0, insurancePays: 0, patientOwes: 0, status: 'pending', serviceDate: '2026-03-22' },
  { id: '5', claimNumber: 'CLM-005', patientName: 'Amanda Davis', memberId: 'CC-1005', procedureCode: 'D0210', procedureName: 'Full Mouth X-Rays', amountBilled: 220, amountApproved: 176, insurancePays: 132, patientOwes: 44, status: 'approved', serviceDate: '2026-03-15' },
  { id: '6', claimNumber: 'CLM-006', patientName: 'Robert Martinez', memberId: 'CC-1006', procedureCode: 'D4341', procedureName: 'Periodontal Scaling', amountBilled: 450, amountApproved: 360, insurancePays: 360, patientOwes: 0, status: 'paid', serviceDate: '2026-03-10' },
  { id: '7', claimNumber: 'CLM-007', patientName: 'Sarah Johnson', memberId: 'CC-1001', procedureCode: 'D3330', procedureName: 'Root Canal - Molar', amountBilled: 1350, amountApproved: 0, insurancePays: 0, patientOwes: 0, status: 'denied', serviceDate: '2026-03-05' },
];

const FILTERS = ['All', 'Pending', 'Approved', 'Paid', 'Denied'];

const statusVariant = (status) => ({
  pending: 'pending',
  approved: 'success',
  paid: 'info',
  denied: 'error',
}[status?.toLowerCase()] || 'default');

const ClaimRow = ({ claim, onPress }) => {
  const billed = parseFloat(claim.amountBilled || claim.amount_billed || claim.total_billed || 0);
  const pays = parseFloat(claim.insurancePays || claim.plan_paid || claim.amount_approved || 0);
  const owes = parseFloat(claim.patientOwes || claim.patient_owes || claim.member_responsibility || 0);

  return (
    <TouchableOpacity style={styles.claimRow} onPress={onPress} activeOpacity={0.8}>
      <View style={[styles.statusStripe, { backgroundColor: {
        pending: colors.pending,
        approved: colors.approved,
        paid: colors.paid,
        denied: colors.denied,
      }[claim.status?.toLowerCase()] || colors.border }]} />
      <View style={styles.claimContent}>
        <View style={styles.claimTop}>
          <View style={styles.claimLeft}>
            <Text style={styles.claimCode}>{claim.procedureCode || claim.claim_number || 'N/A'}</Text>
            <Text style={styles.claimPatient} numberOfLines={1}>{claim.patientName || claim.patient_name}</Text>
            <Text style={styles.claimProcedure} numberOfLines={1}>{claim.procedureName || claim.procedure_name || 'Dental Service'}</Text>
          </View>
          <View style={styles.claimRight}>
            <Badge label={claim.status} variant={statusVariant(claim.status)} size="small" />
            <Text style={styles.claimDate}>{formatDate(claim.serviceDate || claim.service_date)}</Text>
          </View>
        </View>
        <View style={styles.claimAmounts}>
          <View style={styles.amountBlock}>
            <Text style={styles.amountLabel}>Billed</Text>
            <Text style={styles.amountValue}>{formatCurrency(billed)}</Text>
          </View>
          <View style={styles.amountDivider} />
          <View style={styles.amountBlock}>
            <Text style={styles.amountLabel}>Plan Pays</Text>
            <Text style={[styles.amountValue, { color: colors.success }]}>{formatCurrency(pays)}</Text>
          </View>
          <View style={styles.amountDivider} />
          <View style={styles.amountBlock}>
            <Text style={styles.amountLabel}>Pt Owes</Text>
            <Text style={styles.amountValue}>{formatCurrency(owes)}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const DentistClaimsScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [claims, setClaims] = useState(MOCK_CLAIMS);
  const [activeFilter, setActiveFilter] = useState('All');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadClaims = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const data = await claimsAPI.getClaims({ limit: 50 });
      const list = data?.claims || data || [];
      if (list.length > 0) setClaims(list);
    } catch {
      // Use mock data
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadClaims(); }, [loadClaims]);

  const onRefresh = () => { setRefreshing(true); loadClaims(true); };

  const filtered = activeFilter === 'All'
    ? claims
    : claims.filter((c) => c.status?.toLowerCase() === activeFilter.toLowerCase());

  const totalBilled = filtered.reduce((s, c) => s + parseFloat(c.amountBilled || c.amount_billed || c.total_billed || 0), 0);
  const totalPays = filtered.reduce((s, c) => s + parseFloat(c.insurancePays || c.plan_paid || c.amount_approved || 0), 0);

  if (loading) return <LoadingSpinner fullScreen message="Loading claims..." />;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>Claims</Text>
          <TouchableOpacity
            style={styles.submitBtn}
            onPress={() => navigation.navigate('SubmitClaimMain')}
          >
            <Text style={styles.submitBtnText}>+ Submit</Text>
          </TouchableOpacity>
        </View>

        {/* Summary */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Total Billed</Text>
            <Text style={styles.summaryValue}>{formatCurrency(totalBilled)}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Plan Pays</Text>
            <Text style={[styles.summaryValue, { color: colors.success }]}>{formatCurrency(totalPays)}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Claims</Text>
            <Text style={styles.summaryValue}>{filtered.length}</Text>
          </View>
        </View>

        {/* Filter chips */}
        <View style={styles.filterRow}>
          {FILTERS.map((f) => (
            <TouchableOpacity
              key={f}
              style={[styles.filterChip, activeFilter === f && styles.filterChipActive]}
              onPress={() => setActiveFilter(f)}
            >
              <Text style={[styles.filterText, activeFilter === f && styles.filterTextActive]}>{f}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id?.toString()}
        renderItem={({ item }) => (
          <ClaimRow
            claim={item}
            onPress={() => navigation.navigate('ClaimDetail', { claimId: item.id, claim: item })}
          />
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          <EmptyState
            icon="📋"
            title="No Claims"
            subtitle={activeFilter === 'All' ? 'Submit your first claim to get started.' : `No ${activeFilter.toLowerCase()} claims found.`}
            actionLabel={activeFilter !== 'All' ? 'Show All' : 'Submit a Claim'}
            onAction={activeFilter !== 'All' ? () => setActiveFilter('All') : () => navigation.navigate('SubmitClaimMain')}
          />
        }
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
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
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
  },
  submitBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  submitBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.white,
  },
  summaryRow: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
    marginBottom: 4,
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
    alignSelf: 'center',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 6,
    paddingBottom: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  filterChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  filterText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  filterTextActive: {
    color: colors.white,
  },
  listContent: {
    paddingBottom: 100,
    flexGrow: 1,
  },
  separator: {
    height: 1,
    backgroundColor: colors.border,
  },
  claimRow: {
    flexDirection: 'row',
    backgroundColor: colors.white,
  },
  statusStripe: {
    width: 4,
  },
  claimContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  claimTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  claimLeft: {
    flex: 1,
    marginRight: 8,
  },
  claimCode: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  claimPatient: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 2,
  },
  claimProcedure: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  claimRight: {
    alignItems: 'flex-end',
  },
  claimDate: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 6,
  },
  claimAmounts: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 10,
  },
  amountBlock: {
    flex: 1,
    alignItems: 'center',
  },
  amountLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    marginBottom: 2,
    fontWeight: '500',
  },
  amountValue: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  amountDivider: {
    width: 1,
    height: 24,
    backgroundColor: colors.border,
  },
});

export default DentistClaimsScreen;
