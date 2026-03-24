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
import { appointmentsAPI } from '../../api/appointments';
import { formatDate } from '../../utils/formatters';
import { dentistColors as colors } from '../../utils/dentistColors';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';

const MOCK_APPOINTMENTS = [
  { id: '1', patientName: 'Sarah Johnson', memberId: 'CC-1001', time: '9:00 AM', date: '2026-03-23', procedure: 'Cleaning & Exam', status: 'confirmed', notes: 'First visit this year' },
  { id: '2', patientName: 'Michael Chen', memberId: 'CC-1002', time: '10:30 AM', date: '2026-03-23', procedure: 'Crown Preparation', status: 'confirmed' },
  { id: '3', patientName: 'Emily Rodriguez', memberId: 'CC-1003', time: '1:00 PM', date: '2026-03-23', procedure: 'X-Rays & Evaluation', status: 'pending' },
  { id: '4', patientName: 'James Wilson', memberId: 'CC-1004', time: '2:30 PM', date: '2026-03-23', procedure: 'Amalgam Filling', status: 'confirmed' },
  { id: '5', patientName: 'Amanda Davis', memberId: 'CC-1005', time: '10:00 AM', date: '2026-03-24', procedure: 'Prophylaxis', status: 'confirmed' },
  { id: '6', patientName: 'Robert Martinez', memberId: 'CC-1006', time: '11:30 AM', date: '2026-03-24', procedure: 'Crown Delivery', status: 'confirmed' },
];

const AppointmentCard = ({ appt, onVerify, onSubmitClaim, onCheckout }) => (
  <Card style={styles.apptCard}>
    <View style={styles.apptHeader}>
      <View style={{ flex: 1, marginRight: 8 }}>
        <Text style={styles.apptTime}>{appt.time} — {formatDate(appt.date)}</Text>
        <Text style={styles.apptPatient}>{appt.patientName}</Text>
        <Text style={styles.apptProcedure}>{appt.procedure}</Text>
      </View>
      <Badge
        label={appt.status === 'confirmed' ? 'Confirmed' : 'Pending'}
        variant={appt.status === 'confirmed' ? 'success' : 'pending'}
      />
    </View>

    {appt.notes && (
      <Text style={styles.apptNotes}>Note: {appt.notes}</Text>
    )}

    <View style={styles.apptActions}>
      <TouchableOpacity style={styles.apptActionBtn} onPress={onVerify}>
        <Text style={styles.apptActionText}>Verify</Text>
      </TouchableOpacity>
      <View style={styles.apptActionDivider} />
      <TouchableOpacity style={styles.apptActionBtn} onPress={onSubmitClaim}>
        <Text style={[styles.apptActionText, { color: colors.secondary }]}>Claim</Text>
      </TouchableOpacity>
      <View style={styles.apptActionDivider} />
      <TouchableOpacity style={[styles.apptActionBtn, styles.checkoutBtn]} onPress={onCheckout}>
        <Text style={styles.checkoutBtnText}>Checkout →</Text>
      </TouchableOpacity>
    </View>
  </Card>
);

const AppointmentsScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [appointments, setAppointments] = useState(MOCK_APPOINTMENTS);
  const [activeDay, setActiveDay] = useState('today');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

  const loadAppointments = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const data = await appointmentsAPI.getAppointments({ limit: 30 });
      const list = data?.appointments || data || [];
      if (list.length > 0) setAppointments(list);
    } catch {
      // Use mock data
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadAppointments();
  }, [loadAppointments]);

  const onRefresh = () => {
    setRefreshing(true);
    loadAppointments(true);
  };

  const filteredAppts = activeDay === 'today'
    ? appointments.filter((a) => a.date === today || a.date === '2026-03-23')
    : appointments.filter((a) => a.date === tomorrow || a.date === '2026-03-24');

  if (loading) return <LoadingSpinner fullScreen message="Loading appointments..." />;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Appointments</Text>
        <View style={styles.dayTabs}>
          <TouchableOpacity
            style={[styles.dayTab, activeDay === 'today' && styles.dayTabActive]}
            onPress={() => setActiveDay('today')}
          >
            <Text style={[styles.dayTabText, activeDay === 'today' && styles.dayTabTextActive]}>
              Today
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.dayTab, activeDay === 'tomorrow' && styles.dayTabActive]}
            onPress={() => setActiveDay('tomorrow')}
          >
            <Text style={[styles.dayTabText, activeDay === 'tomorrow' && styles.dayTabTextActive]}>
              Tomorrow
            </Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.countText}>
          {filteredAppts.length} appointment{filteredAppts.length !== 1 ? 's' : ''}
        </Text>
      </View>

      <FlatList
        data={filteredAppts}
        keyExtractor={(item) => item.id?.toString()}
        renderItem={({ item }) => (
          <AppointmentCard
            appt={item}
            onVerify={() => navigation.navigate('PatientEligibility', { memberId: item.memberId, patientName: item.patientName })}
            onSubmitClaim={() => navigation.navigate('SubmitClaim', { memberId: item.memberId, patientName: item.patientName })}
            onCheckout={() => navigation.navigate('SubmitClaim', { memberId: item.memberId, patientName: item.patientName, isCheckout: true })}
          />
        )}
        ListEmptyComponent={
          <EmptyState
            icon="📅"
            title="No Appointments"
            subtitle={`No appointments scheduled for ${activeDay}.`}
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
    marginBottom: 14,
  },
  dayTabs: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: 10,
    padding: 3,
    marginBottom: 10,
  },
  dayTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  dayTabActive: {
    backgroundColor: colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  dayTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  dayTabTextActive: {
    color: colors.primary,
  },
  countText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  listContent: {
    padding: 20,
    paddingBottom: 100,
    flexGrow: 1,
  },
  apptCard: {
    marginBottom: 12,
    paddingBottom: 0,
  },
  apptHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  apptTime: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
    marginBottom: 3,
  },
  apptPatient: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 2,
  },
  apptProcedure: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  apptNotes: {
    fontSize: 12,
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginBottom: 10,
    backgroundColor: colors.background,
    padding: 8,
    borderRadius: 6,
  },
  apptActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: 8,
  },
  apptActionBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  apptActionDivider: {
    width: 1,
    backgroundColor: colors.border,
  },
  apptActionText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  checkoutBtn: {
    backgroundColor: colors.primary + '10',
  },
  checkoutBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
});

export default AppointmentsScreen;
