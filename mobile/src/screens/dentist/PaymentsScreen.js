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
import { dentistsAPI } from '../../api/dentists';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { dentistColors as colors } from '../../utils/dentistColors';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';

const MOCK_PAYMENTS = [
  { id: '1', patientName: 'Sarah Johnson', procedure: 'Periodic Oral Evaluation', procedureCode: 'D0120', amount: 71, date: '2026-03-22', status: 'paid', isNew: true },
  { id: '2', patientName: 'Michael Chen', procedure: 'Crown - Porcelain/Ceramic', procedureCode: 'D2750', amount: 880, date: '2026-03-21', status: 'paid', isNew: true },
  { id: '3', patientName: 'Emily Rodriguez', procedure: 'Adult Prophylaxis', procedureCode: 'D1110', amount: 116, date: '2026-03-20', status: 'paid', isNew: false },
  { id: '4', patientName: 'James Wilson', procedure: 'Amalgam, 2 surfaces', procedureCode: 'D2150', amount: 212, date: '2026-03-19', status: 'paid', isNew: false },
  { id: '5', patientName: 'Amanda Davis', procedure: 'Full Mouth X-Rays', procedureCode: 'D0210', amount: 176, date: '2026-03-18', status: 'paid', isNew: false },
  { id: '6', patientName: 'Robert Martinez', procedure: 'Root Canal - Molar', procedureCode: 'D3330', amount: 1080, date: '2026-03-15', status: 'paid', isNew: false },
  { id: '7', patientName: 'Sarah Johnson', procedure: 'Periodontal Scaling', procedureCode: 'D4341', amount: 360, date: '2026-03-10', status: 'pending', isNew: false },
];

const PaymentCard = ({ payment }) => (
  <View style={styles.paymentCard}>
    {payment.isNew && (
      <View style={styles.newBanner}>
        <Text style={styles.newBannerText}>YOU JUST GOT PAID! 💸</Text>
      </View>
    )}
    <View style={styles.paymentContent}>
      <View style={styles.paymentHeader}>
        <View style={styles.paymentLeft}>
          <Text style={styles.paymentPatient}>{payment.patientName}</Text>
          <Text style={styles.paymentProcedure}>{payment.procedure}</Text>
          <Text style={styles.paymentCode}>{payment.procedureCode}</Text>
        </View>
        <View style={styles.paymentRight}>
          <Text style={[
            styles.paymentAmount,
            { color: payment.status === 'paid' ? colors.success : colors.warning }
          ]}>
            {formatCurrency(payment.amount)}
          </Text>
          <Badge
            label={payment.status === 'paid' ? 'Paid' : 'Pending'}
            variant={payment.status === 'paid' ? 'success' : 'pending'}
            size="small"
            style={styles.paymentBadge}
          />
          <Text style={styles.paymentDate}>{formatDate(payment.date)}</Text>
        </View>
      </View>
    </View>
  </View>
);

const PaymentsScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [payments, setPayments] = useState(MOCK_PAYMENTS);
  const [stats, setStats] = useState({ monthlyTotal: 8420, pendingTotal: 360, totalPaid: 2895 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('All');

  const loadPayments = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const [paymentsData, statsData] = await Promise.allSettled([
        dentistsAPI.getDentistPayments({ limit: 50 }),
        dentistsAPI.getDentistPaymentStats(),
      ]);

      if (paymentsData.status === 'fulfilled') {
        const list = paymentsData.value?.payments || paymentsData.value || [];
        if (list.length > 0) setPayments(list);
      }
      if (statsData.status === 'fulfilled') {
        const s = statsData.value;
        if (s) setStats((prev) => ({ ...prev, ...s }));
      }
    } catch {
      // Use mock data
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadPayments();
  }, [loadPayments]);

  const onRefresh = () => {
    setRefreshing(true);
    loadPayments(true);
  };

  const filtered = activeFilter === 'All'
    ? payments
    : payments.filter((p) => p.status?.toLowerCase() === activeFilter.toLowerCase());

  if (loading) return <LoadingSpinner fullScreen message="Loading payments..." />;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Payments</Text>

        {/* Monthly stats */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>This Month</Text>
            <Text style={[styles.statValue, { color: colors.success }]}>
              {formatCurrency(stats.monthlyTotal)}
            </Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Pending</Text>
            <Text style={[styles.statValue, { color: colors.warning }]}>
              {formatCurrency(stats.pendingTotal)}
            </Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Recent</Text>
            <Text style={[styles.statValue, { color: colors.primary }]}>
              {formatCurrency(stats.totalPaid)}
            </Text>
          </View>
        </View>

        <View style={styles.filterRow}>
          {['All', 'Paid', 'Pending'].map((f) => (
            <TouchableOpacity
              key={f}
              style={[styles.filterChip, activeFilter === f && styles.filterChipActive]}
              onPress={() => setActiveFilter(f)}
            >
              <Text style={[styles.filterText, activeFilter === f && styles.filterTextActive]}>
                {f}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id?.toString()}
        renderItem={({ item }) => <PaymentCard payment={item} />}
        ListEmptyComponent={
          <EmptyState
            icon="💰"
            title="No Payments Yet"
            subtitle="Payments will appear here after claims are processed."
          />
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
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
    marginBottom: 14,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: 10,
    padding: 14,
    marginBottom: 14,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
    marginBottom: 5,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '800',
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: colors.border,
    alignSelf: 'center',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.border,
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
  listContent: {
    paddingBottom: 100,
    flexGrow: 1,
  },
  paymentCard: {
    backgroundColor: colors.white,
    overflow: 'hidden',
  },
  newBanner: {
    backgroundColor: '#EAFAF1',
    paddingVertical: 6,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.success + '40',
  },
  newBannerText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.success,
    letterSpacing: 0.5,
  },
  paymentContent: {
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  paymentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  paymentLeft: {
    flex: 1,
  },
  paymentPatient: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 3,
  },
  paymentProcedure: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  paymentCode: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
  },
  paymentRight: {
    alignItems: 'flex-end',
    marginLeft: 12,
  },
  paymentAmount: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 6,
  },
  paymentBadge: {
    marginBottom: 4,
  },
  paymentDate: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  separator: {
    height: 1,
    backgroundColor: colors.border,
    marginLeft: 20,
  },
});

export default PaymentsScreen;
