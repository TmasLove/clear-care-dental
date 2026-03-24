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
import { dentistsAPI } from '../../api/dentists';
import { formatDate } from '../../utils/formatters';
import { dentistColors as colors } from '../../utils/dentistColors';
import Badge from '../../components/common/Badge';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';

const MOCK_PATIENTS = [
  { id: '1', firstName: 'Sarah', lastName: 'Johnson', memberId: 'CC-1001', planName: 'Standard Dental', lastVisit: '2026-03-20', status: 'active' },
  { id: '2', firstName: 'Michael', lastName: 'Chen', memberId: 'CC-1002', planName: 'Premium Dental', lastVisit: '2026-03-18', status: 'active' },
  { id: '3', firstName: 'Emily', lastName: 'Rodriguez', memberId: 'CC-1003', planName: 'Standard Dental', lastVisit: '2026-02-28', status: 'active' },
  { id: '4', firstName: 'James', lastName: 'Wilson', memberId: 'CC-1004', planName: 'Standard Dental', lastVisit: '2026-01-15', status: 'active' },
  { id: '5', firstName: 'Amanda', lastName: 'Davis', memberId: 'CC-1005', planName: 'Premium Dental', lastVisit: '2025-12-10', status: 'active' },
  { id: '6', firstName: 'Robert', lastName: 'Martinez', memberId: 'CC-1006', planName: 'Basic Dental', lastVisit: '2025-11-22', status: 'inactive' },
];

const PatientRow = ({ patient, onVerify, onSubmitClaim }) => (
  <View style={styles.patientRow}>
    <View style={styles.patientAvatar}>
      <Text style={styles.patientAvatarText}>
        {patient.firstName?.charAt(0)}{patient.lastName?.charAt(0)}
      </Text>
    </View>
    <View style={styles.patientInfo}>
      <Text style={styles.patientName}>{patient.firstName} {patient.lastName}</Text>
      <Text style={styles.patientPlan}>{patient.planName}</Text>
      <Text style={styles.patientId}>{patient.memberId}</Text>
    </View>
    <View style={styles.patientRight}>
      <Badge
        label={patient.status === 'active' ? 'Active' : 'Inactive'}
        variant={patient.status === 'active' ? 'success' : 'default'}
        size="small"
      />
      {patient.lastVisit && (
        <Text style={styles.lastVisit}>{formatDate(patient.lastVisit)}</Text>
      )}
      <View style={styles.patientActions}>
        <TouchableOpacity style={styles.actionBtn} onPress={onVerify}>
          <Text style={styles.actionBtnText}>Verify</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, styles.claimBtn]} onPress={onSubmitClaim}>
          <Text style={[styles.actionBtnText, { color: colors.teal }]}>Claim</Text>
        </TouchableOpacity>
      </View>
    </View>
  </View>
);

const InsuredPatientsScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [patients, setPatients] = useState(MOCK_PATIENTS);
  const [filtered, setFiltered] = useState(MOCK_PATIENTS);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadPatients = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const data = await dentistsAPI.getDentistPatients();
      const raw = data?.patients || data || [];
      if (raw.length > 0) {
        const normalized = raw.map(p => ({
          ...p,
          firstName: p.firstName || p.first_name || p.name?.split(' ')[0] || '',
          lastName: p.lastName || p.last_name || p.name?.split(' ').slice(1).join(' ') || '',
        }));
        setPatients(normalized);
        setFiltered(normalized);
      }
    } catch {
      // Use mock data
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadPatients();
  }, [loadPatients]);

  useEffect(() => {
    if (!search.trim()) {
      setFiltered(patients);
    } else {
      const q = search.toLowerCase();
      setFiltered(
        patients.filter(
          (p) =>
            `${p.firstName} ${p.lastName}`.toLowerCase().includes(q) ||
            p.memberId?.toLowerCase().includes(q) ||
            p.planName?.toLowerCase().includes(q)
        )
      );
    }
  }, [search, patients]);

  const onRefresh = () => {
    setRefreshing(true);
    loadPatients(true);
  };

  if (loading) return <LoadingSpinner fullScreen message="Loading patients..." />;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Insured Patients</Text>
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Search by name or member ID..."
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
        <Text style={styles.countText}>
          {filtered.length} patient{filtered.length !== 1 ? 's' : ''}
        </Text>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id?.toString()}
        renderItem={({ item }) => (
          <PatientRow
            patient={item}
            onVerify={() => navigation.navigate('PatientEligibility', { memberId: item.memberId, patientName: `${item.firstName} ${item.lastName}` })}
            onSubmitClaim={() => navigation.navigate('SubmitClaim', { memberId: item.memberId, patientName: `${item.firstName} ${item.lastName}` })}
          />
        )}
        ListEmptyComponent={
          <EmptyState
            icon="👥"
            title="No Patients Found"
            subtitle={search ? 'Try a different search term.' : 'Patients who have insurance through this network will appear here.'}
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
    paddingBottom: 14,
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
    marginBottom: 8,
  },
  searchIcon: {
    fontSize: 15,
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
  countText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  listContent: {
    paddingBottom: 100,
    flexGrow: 1,
  },
  patientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  patientAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  patientAvatarText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.white,
  },
  patientInfo: {
    flex: 1,
  },
  patientName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 2,
  },
  patientPlan: {
    fontSize: 12,
    color: colors.primaryLight,
    fontWeight: '500',
    marginBottom: 1,
  },
  patientId: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  patientRight: {
    alignItems: 'flex-end',
    marginLeft: 8,
  },
  lastVisit: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 4,
    marginBottom: 8,
  },
  patientActions: {
    flexDirection: 'row',
    gap: 6,
  },
  actionBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  claimBtn: {
    borderColor: colors.teal,
  },
  actionBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  separator: {
    height: 1,
    backgroundColor: colors.border,
    marginLeft: 76,
  },
});

export default InsuredPatientsScreen;
