import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Modal,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { dentistColors as colors } from '../../utils/dentistColors';
import Badge from '../../components/common/Badge';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';

const MOCK_ESTIMATES = [
  {
    id: '1', patientName: 'Sarah Johnson', memberId: 'CC-1001',
    date: '2026-03-20', status: 'pending', expiresDate: '2026-04-20',
    procedures: [
      { code: 'D2740', name: 'Crown - Porcelain/Ceramic', billed: 1200, planPays: 600, patientOwes: 600 },
      { code: 'D0210', name: 'Full Mouth X-Rays', billed: 220, planPays: 176, patientOwes: 44 },
    ],
    totalBilled: 1420, totalPlanPays: 776, totalPatientOwes: 644,
  },
  {
    id: '2', patientName: 'Michael Chen', memberId: 'CC-1002',
    date: '2026-03-15', status: 'accepted', expiresDate: '2026-04-15',
    procedures: [
      { code: 'D3330', name: 'Root Canal - Molar', billed: 1350, planPays: 675, patientOwes: 675 },
    ],
    totalBilled: 1350, totalPlanPays: 675, totalPatientOwes: 675,
  },
  {
    id: '3', patientName: 'Emily Rodriguez', memberId: 'CC-1003',
    date: '2026-02-28', status: 'pending', expiresDate: '2026-03-28',
    procedures: [
      { code: 'D4341', name: 'Periodontal Scaling', billed: 450, planPays: 360, patientOwes: 90 },
      { code: 'D1110', name: 'Adult Prophylaxis', billed: 145, planPays: 116, patientOwes: 29 },
    ],
    totalBilled: 595, totalPlanPays: 476, totalPatientOwes: 119,
  },
  {
    id: '4', patientName: 'James Wilson', memberId: 'CC-1004',
    date: '2026-02-10', status: 'declined', expiresDate: '2026-03-10',
    procedures: [
      { code: 'D6010', name: 'Implant Fixture', billed: 2500, planPays: 0, patientOwes: 2500 },
    ],
    totalBilled: 2500, totalPlanPays: 0, totalPatientOwes: 2500,
  },
  {
    id: '5', patientName: 'Amanda Davis', memberId: 'CC-1005',
    date: '2026-01-20', status: 'accepted', expiresDate: '2026-02-20',
    procedures: [
      { code: 'D2750', name: 'Crown - PFM', billed: 1100, planPays: 550, patientOwes: 550 },
      { code: 'D0120', name: 'Periodic Oral Evaluation', billed: 89, planPays: 71, patientOwes: 18 },
    ],
    totalBilled: 1189, totalPlanPays: 621, totalPatientOwes: 568,
  },
];

const STATUS_FILTERS = ['All', 'Pending', 'Accepted', 'Declined'];

const statusVariant = (s) => ({
  pending: 'pending', accepted: 'success', declined: 'error',
}[s?.toLowerCase()] || 'default');

const EstimateDetailModal = ({ estimate, visible, onClose, onSubmitClaim }) => {
  if (!estimate) return null;
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={modalStyles.container}>
        <View style={modalStyles.header}>
          <TouchableOpacity onPress={onClose}>
            <Text style={modalStyles.close}>‹ Back</Text>
          </TouchableOpacity>
          <Text style={modalStyles.title}>Treatment Estimate</Text>
          <View style={{ width: 60 }} />
        </View>
        <ScrollView contentContainerStyle={modalStyles.content}>
          <View style={modalStyles.patientRow}>
            <View style={modalStyles.avatar}>
              <Text style={modalStyles.avatarText}>{estimate.patientName?.charAt(0)}</Text>
            </View>
            <View style={modalStyles.patientInfo}>
              <Text style={modalStyles.patientName}>{estimate.patientName}</Text>
              <Text style={modalStyles.patientId}>{estimate.memberId}</Text>
            </View>
            <Badge label={estimate.status} variant={statusVariant(estimate.status)} />
          </View>

          <View style={modalStyles.dateRow}>
            <Text style={modalStyles.dateLabel}>Created: {formatDate(estimate.date)}</Text>
            <Text style={modalStyles.dateLabel}>Expires: {formatDate(estimate.expiresDate)}</Text>
          </View>

          <Card style={modalStyles.section}>
            <Text style={modalStyles.sectionTitle}>Procedures</Text>
            {estimate.procedures.map((p, i) => (
              <View key={i} style={[modalStyles.procedureRow, i === estimate.procedures.length - 1 && { borderBottomWidth: 0 }]}>
                <View style={modalStyles.procLeft}>
                  <Text style={modalStyles.procCode}>{p.code}</Text>
                  <Text style={modalStyles.procName}>{p.name}</Text>
                </View>
                <View style={modalStyles.procAmounts}>
                  <Text style={modalStyles.procBilled}>{formatCurrency(p.billed)}</Text>
                  <Text style={modalStyles.procNote}>Billed</Text>
                </View>
              </View>
            ))}
          </Card>

          <Card style={modalStyles.section}>
            <Text style={modalStyles.sectionTitle}>Summary</Text>
            {[
              { label: 'Total Billed', value: estimate.totalBilled, color: colors.text },
              { label: 'Plan Pays', value: estimate.totalPlanPays, color: colors.success },
              { label: 'Patient Owes', value: estimate.totalPatientOwes, color: colors.primary },
            ].map((row) => (
              <View key={row.label} style={modalStyles.summaryRow}>
                <Text style={modalStyles.summaryLabel}>{row.label}</Text>
                <Text style={[modalStyles.summaryValue, { color: row.color }]}>{formatCurrency(row.value)}</Text>
              </View>
            ))}
          </Card>

          {estimate.status === 'pending' && (
            <Button
              title="Submit Claim for This Patient"
              onPress={() => { onClose(); onSubmitClaim(estimate); }}
              size="large"
              style={modalStyles.claimBtn}
            />
          )}
        </ScrollView>
      </View>
    </Modal>
  );
};

const modalStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 14,
    backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  close: { fontSize: 16, color: colors.primary, fontWeight: '600', width: 60 },
  title: { fontSize: 17, fontWeight: '700', color: colors.text },
  content: { padding: 20, paddingBottom: 60 },
  patientRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarText: { fontSize: 18, fontWeight: '700', color: colors.white },
  patientInfo: { flex: 1 },
  patientName: { fontSize: 16, fontWeight: '700', color: colors.text },
  patientId: { fontSize: 13, color: colors.textSecondary },
  dateRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  dateLabel: { fontSize: 12, color: colors.textSecondary, fontWeight: '500' },
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 12 },
  procedureRow: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  procLeft: { flex: 1, marginRight: 8 },
  procCode: { fontSize: 12, fontWeight: '700', color: colors.primary, marginBottom: 2 },
  procName: { fontSize: 13, color: colors.text },
  procAmounts: { alignItems: 'flex-end' },
  procBilled: { fontSize: 14, fontWeight: '700', color: colors.text },
  procNote: { fontSize: 11, color: colors.textSecondary },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: colors.border },
  summaryLabel: { fontSize: 14, color: colors.textSecondary, fontWeight: '500' },
  summaryValue: { fontSize: 15, fontWeight: '800' },
  claimBtn: { marginTop: 8 },
});

const EstimatesScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [estimates, setEstimates] = useState(MOCK_ESTIMATES);
  const [filtered, setFiltered] = useState(MOCK_ESTIMATES);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    setTimeout(() => setLoading(false), 600);
  }, []);

  useEffect(() => {
    let result = estimates;
    if (activeFilter !== 'All') result = result.filter(e => e.status?.toLowerCase() === activeFilter.toLowerCase());
    if (search.trim()) result = result.filter(e => e.patientName?.toLowerCase().includes(search.toLowerCase()) || e.memberId?.toLowerCase().includes(search.toLowerCase()));
    setFiltered(result);
  }, [estimates, activeFilter, search]);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  };

  if (loading) return <LoadingSpinner fullScreen message="Loading estimates..." />;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Estimates</Text>
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Search patient name..."
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
        <View style={styles.filterRow}>
          {STATUS_FILTERS.map((f) => (
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
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.estimateRow} onPress={() => setSelected(item)} activeOpacity={0.8}>
            <View style={styles.estimateLeft}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{item.patientName?.charAt(0)}</Text>
              </View>
              <View style={styles.estimateInfo}>
                <Text style={styles.patientName}>{item.patientName}</Text>
                <Text style={styles.estimateDate}>{formatDate(item.date)}</Text>
                <Text style={styles.estimateProcCount}>{item.procedures.length} procedure{item.procedures.length !== 1 ? 's' : ''}</Text>
              </View>
            </View>
            <View style={styles.estimateRight}>
              <Badge label={item.status} variant={statusVariant(item.status)} size="small" />
              <Text style={styles.estimateTotal}>{formatCurrency(item.totalBilled)}</Text>
              <Text style={styles.patientOwes}>Pt owes {formatCurrency(item.totalPatientOwes)}</Text>
            </View>
          </TouchableOpacity>
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          <EmptyState
            icon="📄"
            title="No Estimates"
            subtitle={search || activeFilter !== 'All' ? 'Try adjusting your search or filter.' : 'Create treatment estimates for patients here.'}
          />
        }
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      <EstimateDetailModal
        estimate={selected}
        visible={!!selected}
        onClose={() => setSelected(null)}
        onSubmitClaim={(est) => navigation.navigate('SubmitClaim', { memberId: est.memberId, patientName: est.patientName })}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    backgroundColor: colors.white,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: colors.text, marginBottom: 12 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.background, borderRadius: 10,
    borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: 12, marginBottom: 10,
  },
  searchIcon: { fontSize: 14, marginRight: 8 },
  searchInput: { flex: 1, paddingVertical: 9, fontSize: 14, color: colors.text },
  clearSearch: { fontSize: 14, color: colors.textSecondary, padding: 4 },
  filterRow: { flexDirection: 'row', gap: 6 },
  filterChip: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, borderWidth: 1.5, borderColor: colors.border },
  filterChipActive: { borderColor: colors.primary, backgroundColor: colors.primary },
  filterText: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
  filterTextActive: { color: colors.white },
  listContent: { paddingBottom: 100, flexGrow: 1 },
  separator: { height: 1, backgroundColor: colors.border },
  estimateRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: colors.white, paddingHorizontal: 20, paddingVertical: 14,
  },
  estimateLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarText: { fontSize: 16, fontWeight: '700', color: colors.white },
  estimateInfo: { flex: 1 },
  patientName: { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 2 },
  estimateDate: { fontSize: 12, color: colors.textSecondary, marginBottom: 1 },
  estimateProcCount: { fontSize: 11, color: colors.primaryLight, fontWeight: '500' },
  estimateRight: { alignItems: 'flex-end', marginLeft: 8 },
  estimateTotal: { fontSize: 14, fontWeight: '800', color: colors.text, marginTop: 5 },
  patientOwes: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
});

export default EstimatesScreen;
