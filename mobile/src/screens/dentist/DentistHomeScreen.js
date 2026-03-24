import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { appointmentsAPI } from '../../api/appointments';
import { dentistsAPI } from '../../api/dentists';
import { claimsAPI } from '../../api/claims';
import { useAuth } from '../../hooks/useAuth';
import { formatCurrency, formatDate, formatDateTime, getGreeting } from '../../utils/formatters';
import { dentistColors as colors } from '../../utils/dentistColors';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const MOCK_APPOINTMENTS = [
  { id: '1', patientName: 'Sarah Johnson', time: '9:00 AM', procedure: 'Cleaning & Exam', status: 'confirmed' },
  { id: '2', patientName: 'Michael Chen', time: '10:30 AM', procedure: 'Crown Preparation', status: 'confirmed' },
  { id: '3', patientName: 'Emily Rodriguez', time: '1:00 PM', procedure: 'X-Rays', status: 'pending' },
  { id: '4', patientName: 'James Wilson', time: '2:30 PM', procedure: 'Filling', status: 'confirmed' },
];

const MOCK_PAYMENTS = [
  { id: '1', patientName: 'Robert Martinez', amount: 760, date: '2026-03-22', procedure: 'Crown', status: 'paid' },
  { id: '2', patientName: 'Amanda Davis', amount: 116, date: '2026-03-21', procedure: 'Cleaning', status: 'paid' },
  { id: '3', patientName: 'Sarah Johnson', amount: 71, date: '2026-03-20', procedure: 'Exam', status: 'paid' },
];

const AppointmentRow = ({ appt, onPress }) => (
  <TouchableOpacity style={apptStyles.row} onPress={onPress} activeOpacity={0.85}>
    <View style={apptStyles.timeBlock}>
      <Text style={apptStyles.time}>{appt.time}</Text>
    </View>
    <View style={apptStyles.info}>
      <Text style={apptStyles.patientName}>{appt.patientName}</Text>
      <Text style={apptStyles.procedure}>{appt.procedure}</Text>
    </View>
    <Badge
      label={appt.status === 'confirmed' ? 'Confirmed' : 'Pending'}
      variant={appt.status === 'confirmed' ? 'success' : 'pending'}
      size="small"
    />
  </TouchableOpacity>
);

const apptStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  timeBlock: {
    width: 70,
  },
  time: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.teal,
  },
  info: {
    flex: 1,
  },
  patientName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 2,
  },
  procedure: {
    fontSize: 12,
    color: colors.textSecondary,
  },
});

const DentistHomeScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [appointments, setAppointments] = useState(MOCK_APPOINTMENTS);
  const [recentPayments, setRecentPayments] = useState(MOCK_PAYMENTS);
  const [stats, setStats] = useState({ pendingClaims: 4, monthlyEarnings: 8420 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const firstName = user?.firstName || user?.first_name || 'Doctor';
  const greeting = getGreeting();
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  const loadData = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const [apptData, statsData, paymentsData] = await Promise.allSettled([
        appointmentsAPI.getTodayAppointments(),
        claimsAPI.getClaimsStats(),
        dentistsAPI.getDentistPayments({ limit: 3 }),
      ]);

      if (apptData.status === 'fulfilled') {
        const list = apptData.value?.appointments || apptData.value || [];
        if (list.length > 0) setAppointments(list);
      }
      if (statsData.status === 'fulfilled') {
        const s = statsData.value;
        if (s) setStats((prev) => ({ ...prev, ...s }));
      }
      if (paymentsData.status === 'fulfilled') {
        const list = paymentsData.value?.payments || paymentsData.value || [];
        if (list.length > 0) setRecentPayments(list);
      }
    } catch {
      // Use mock data
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData(true);
  };

  if (loading) return <LoadingSpinner fullScreen message="Loading your dashboard..." />;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 100 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.white} />}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.greeting}>{greeting},</Text>
            <Text style={styles.doctorName}>Dr. {firstName}</Text>
            <Text style={styles.dateText}>{today}</Text>
          </View>
          <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{firstName.charAt(0)}</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{appointments.length}</Text>
            <Text style={styles.statLabel}>Today's Appts</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.pendingClaims}</Text>
            <Text style={styles.statLabel}>Pending Claims</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: '#90EE90' }]}>
              {formatCurrency(stats.monthlyEarnings)}
            </Text>
            <Text style={styles.statLabel}>This Month</Text>
          </View>
        </View>
      </View>

      {/* Submit Claim CTA */}
      <TouchableOpacity
        style={styles.submitClaimBanner}
        onPress={() => navigation.navigate('SubmitClaim')}
        activeOpacity={0.9}
      >
        <View>
          <Text style={styles.submitClaimTitle}>Submit a New Claim</Text>
          <Text style={styles.submitClaimSubtitle}>Instant adjudication • Get paid fast</Text>
        </View>
        <Text style={styles.submitClaimArrow}>→</Text>
      </TouchableOpacity>

      {/* Today's Appointments */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Today's Schedule</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Appointments')}>
            <Text style={styles.seeAll}>View All</Text>
          </TouchableOpacity>
        </View>
        <Card>
          {appointments.length === 0 ? (
            <Text style={styles.emptyText}>No appointments scheduled for today.</Text>
          ) : (
            appointments.slice(0, 4).map((appt, i) => (
              <AppointmentRow
                key={appt.id}
                appt={appt}
                onPress={() => navigation.navigate('PatientEligibility', { patientName: appt.patientName })}
              />
            ))
          )}
        </Card>
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.quickAction}
            onPress={() => navigation.navigate('PatientEligibility')}
          >
            <Text style={styles.quickActionIcon}>🔍</Text>
            <Text style={styles.quickActionLabel}>Eligibility</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickAction}
            onPress={() => navigation.navigate('SubmitClaimMain')}
          >
            <Text style={styles.quickActionIcon}>📋</Text>
            <Text style={styles.quickActionLabel}>Submit Claim</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickAction}
            onPress={() => navigation.navigate('Estimates')}
          >
            <Text style={styles.quickActionIcon}>📄</Text>
            <Text style={styles.quickActionLabel}>Estimates</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickAction}
            onPress={() => navigation.navigate('Reports')}
          >
            <Text style={styles.quickActionIcon}>📊</Text>
            <Text style={styles.quickActionLabel}>Reports</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Recent Payments */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Payments</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Payments')}>
            <Text style={styles.seeAll}>View All</Text>
          </TouchableOpacity>
        </View>
        <Card>
          {recentPayments.map((payment, i) => (
            <View
              key={payment.id}
              style={[styles.paymentRow, i === recentPayments.length - 1 && { borderBottomWidth: 0 }]}
            >
              <View style={styles.paymentLeft}>
                <Text style={styles.paymentPatient}>{payment.patientName}</Text>
                <Text style={styles.paymentProcedure}>{payment.procedure}</Text>
              </View>
              <View style={styles.paymentRight}>
                <Text style={styles.paymentAmount}>{formatCurrency(payment.amount)}</Text>
                <Text style={styles.paymentDate}>{formatDate(payment.date)}</Text>
              </View>
            </View>
          ))}
        </Card>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  greeting: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 2,
  },
  doctorName: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.white,
    marginBottom: 4,
  },
  dateText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.65)',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.white,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 14,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.white,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500',
    textAlign: 'center',
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignSelf: 'center',
  },
  submitClaimBanner: {
    backgroundColor: colors.teal,
    marginHorizontal: 20,
    marginTop: -12,
    borderRadius: 14,
    padding: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: colors.teal,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  submitClaimTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.white,
    marginBottom: 3,
  },
  submitClaimSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.85)',
  },
  submitClaimArrow: {
    fontSize: 28,
    color: colors.white,
    fontWeight: '300',
  },
  section: {
    paddingHorizontal: 20,
    marginTop: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 14,
  },
  seeAll: {
    fontSize: 14,
    color: colors.teal,
    fontWeight: '600',
    marginBottom: 14,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: 16,
  },
  quickActions: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    justifyContent: 'space-around',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  quickAction: {
    alignItems: 'center',
    flex: 1,
  },
  quickActionIcon: {
    fontSize: 26,
    marginBottom: 6,
  },
  quickActionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
    lineHeight: 14,
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  paymentLeft: {
    flex: 1,
  },
  paymentPatient: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 2,
  },
  paymentProcedure: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  paymentRight: {
    alignItems: 'flex-end',
  },
  paymentAmount: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.success,
    marginBottom: 2,
  },
  paymentDate: {
    fontSize: 11,
    color: colors.textSecondary,
  },
});

export default DentistHomeScreen;
