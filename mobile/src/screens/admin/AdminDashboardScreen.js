import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../hooks/useAuth';
import apiClient from '../../api/client';
import { colors } from '../../utils/colors';
import { formatCurrency } from '../../utils/formatters';

const StatCard = ({ label, value, sub, color }) => (
  <View style={[styles.statCard, { borderTopColor: color || colors.primary }]}>
    <Text style={[styles.statValue, { color: color || colors.primary }]}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
    {sub ? <Text style={styles.statSub}>{sub}</Text> : null}
  </View>
);

const ActivityRow = ({ claim }) => {
  const statusColors = {
    approved: colors.success, paid: colors.primary,
    pending: colors.warning, denied: colors.error, partial: colors.accent,
  };
  return (
    <View style={styles.activityRow}>
      <View style={[styles.activityDot, { backgroundColor: statusColors[claim.status] || colors.border }]} />
      <View style={styles.activityInfo}>
        <Text style={styles.activityText} numberOfLines={1}>
          {claim.claim_number} — {claim.member_first_name} {claim.member_last_name}
        </Text>
        <Text style={styles.activitySub}>
          {claim.practice_name} · {formatCurrency(claim.total_billed)}
        </Text>
      </View>
      <View style={[styles.activityBadge, { backgroundColor: statusColors[claim.status] + '20' }]}>
        <Text style={[styles.activityBadgeText, { color: statusColors[claim.status] }]}>
          {claim.status.toUpperCase()}
        </Text>
      </View>
    </View>
  );
};

export default function AdminDashboardScreen({ navigation }) {
  const { user, logout } = useAuth();
  const insets = useSafeAreaInsets();
  const [stats, setStats] = useState(null);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const [statsRes, activityRes] = await Promise.all([
        apiClient.get('/admin/stats'),
        apiClient.get('/admin/claims/activity'),
      ]);
      const raw = statsRes.data.stats || {};
      setStats({
        total_users: raw.users?.total ?? 0,
        total_claims: raw.claims?.total ?? 0,
        total_paid: raw.claims?.total_plan_paid ?? 0,
        pending_claims: raw.claims?.pending ?? 0,
        active_plans: (raw.employers ?? 0) * 3,
        active_members: raw.members ?? 0,
      });
      setActivity(activityRes.data.activity || []);
    } catch (e) {
      console.error('Admin load error', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, []);

  const onRefresh = () => { setRefreshing(true); load(); };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View>
          <Text style={styles.headerSub}>Superuser Portal</Text>
          <Text style={styles.headerTitle}>Admin Dashboard</Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      {/* System Stats */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>System Overview</Text>
        <View style={styles.statsGrid}>
          <StatCard label="Total Users" value={stats?.total_users ?? '—'} color={colors.primary} />
          <StatCard label="Total Claims" value={stats?.total_claims ?? '—'} color={colors.primaryLight} />
          <StatCard
            label="Total Paid Out"
            value={formatCurrency(stats?.total_paid ?? 0)}
            color={colors.success}
          />
          <StatCard
            label="Pending Claims"
            value={stats?.pending_claims ?? '—'}
            sub="Needs review"
            color={colors.warning}
          />
          <StatCard label="Active Plans" value={stats?.active_plans ?? '—'} color={colors.accent} />
          <StatCard label="Active Members" value={stats?.active_members ?? '—'} color={colors.primary} />
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Manage</Text>
        <View style={styles.actionsRow}>
          {[
            { label: 'Users', icon: '👥' },
            { label: 'Claims', icon: '📋' },
            { label: 'Plans', icon: '🏥' },
            { label: 'Providers', icon: '🦷' },
          ].map((a) => (
            <TouchableOpacity
              key={a.label}
              style={styles.actionBtn}
              onPress={() => Alert.alert('Coming Soon', `${a.label} management panel coming in next release.`)}
              activeOpacity={0.7}
            >
              <Text style={styles.actionIcon}>{a.icon}</Text>
              <Text style={styles.actionLabel}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Recent Claim Activity */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Claim Activity</Text>
        <View style={styles.activityCard}>
          {activity.length === 0 ? (
            <Text style={styles.emptyText}>No recent activity</Text>
          ) : (
            activity.slice(0, 10).map((claim, i) => (
              <View key={claim.id}>
                <ActivityRow claim={claim} />
                {i < activity.length - 1 && <View style={styles.divider} />}
              </View>
            ))
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingBottom: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.6)', letterSpacing: 1, textTransform: 'uppercase' },
  headerTitle: { fontSize: 26, fontWeight: '800', color: colors.white, marginTop: 2 },
  logoutBtn: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  logoutText: { color: colors.white, fontSize: 13, fontWeight: '600' },
  section: { paddingHorizontal: 16, marginTop: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 12 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    width: '47%',
    borderTopWidth: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  statValue: { fontSize: 24, fontWeight: '800' },
  statLabel: { fontSize: 12, color: colors.textSecondary, marginTop: 4 },
  statSub: { fontSize: 11, color: colors.warning, marginTop: 2, fontWeight: '600' },
  actionsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  actionBtn: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    width: '23%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  actionIcon: { fontSize: 24, marginBottom: 6 },
  actionLabel: { fontSize: 11, fontWeight: '600', color: colors.text },
  activityCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  activityDot: { width: 10, height: 10, borderRadius: 5, marginRight: 12 },
  activityInfo: { flex: 1 },
  activityText: { fontSize: 13, fontWeight: '600', color: colors.text },
  activitySub: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  activityBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginLeft: 8 },
  activityBadgeText: { fontSize: 10, fontWeight: '700' },
  divider: { height: 1, backgroundColor: colors.border, marginLeft: 34 },
  emptyText: { padding: 20, textAlign: 'center', color: colors.textSecondary },
});
