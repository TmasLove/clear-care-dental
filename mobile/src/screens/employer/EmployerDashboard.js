import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { employersAPI } from '../../api/employers';
import { useAuth } from '../../hooks/useAuth';
import { formatCurrency, formatCurrencyShort, formatDate } from '../../utils/formatters';
import { colors } from '../../utils/colors';
import Card from '../../components/common/Card';
import ClaimCard from '../../components/claims/ClaimCard';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const MOCK_STATS = {
  savings: 104236,
  savingsPercent: 14.7,
  claimsProcessed: 1482,
  membersEnrolled: 247,
  plansActive: 3,
};

const MOCK_CLAIMS = [
  { id: '1', procedureCode: 'D0120', procedureName: 'Periodic Oral Evaluation', status: 'approved', amountBilled: 89, amountApproved: 71, patientOwes: 0, serviceDate: '2026-03-20' },
  { id: '2', procedureCode: 'D1110', procedureName: 'Adult Prophylaxis', status: 'paid', amountBilled: 145, amountApproved: 116, patientOwes: 29, serviceDate: '2026-03-18' },
  { id: '3', procedureCode: 'D2140', procedureName: 'Amalgam Restoration', status: 'pending', amountBilled: 312, amountApproved: 0, patientOwes: 0, serviceDate: '2026-03-15' },
  { id: '4', procedureCode: 'D0210', procedureName: 'Full Mouth X-Rays', status: 'approved', amountBilled: 220, amountApproved: 176, patientOwes: 44, serviceDate: '2026-03-12' },
  { id: '5', procedureCode: 'D4341', procedureName: 'Periodontal Scaling', status: 'denied', amountBilled: 450, amountApproved: 0, patientOwes: 450, serviceDate: '2026-03-10' },
];

const StatCard = ({ label, value, subtitle, color }) => (
  <View style={statStyles.card}>
    <Text style={[statStyles.value, color && { color }]}>{value}</Text>
    <Text style={statStyles.label}>{label}</Text>
    {subtitle && <Text style={statStyles.subtitle}>{subtitle}</Text>}
  </View>
);

const statStyles = StyleSheet.create({
  card: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  value: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 4,
  },
  label: {
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: 'center',
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 2,
  },
});

const QuickAction = ({ icon, label, onPress, color }) => (
  <TouchableOpacity style={qaStyles.action} onPress={onPress} activeOpacity={0.8}>
    <View style={[qaStyles.iconBox, { backgroundColor: color || colors.primary }]}>
      <Text style={qaStyles.icon}>{icon}</Text>
    </View>
    <Text style={qaStyles.label}>{label}</Text>
  </TouchableOpacity>
);

const qaStyles = StyleSheet.create({
  action: {
    alignItems: 'center',
    flex: 1,
  },
  iconBox: {
    width: 52,
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  icon: {
    fontSize: 22,
  },
  label: {
    fontSize: 12,
    color: colors.text,
    fontWeight: '600',
    textAlign: 'center',
  },
});

const EmployerDashboard = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const [stats, setStats] = useState(MOCK_STATS);
  const [recentClaims, setRecentClaims] = useState(MOCK_CLAIMS);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const [statsData, claimsData] = await Promise.allSettled([
        employersAPI.getEmployerStats(),
        employersAPI.getClaims({ limit: 5, sort: 'createdAt', order: 'desc' }),
      ]);

      if (statsData.status === 'fulfilled') {
        setStats(statsData.value || MOCK_STATS);
      }
      if (claimsData.status === 'fulfilled') {
        const list = claimsData.value?.claims || claimsData.value || [];
        if (list.length > 0) setRecentClaims(list);
      }
    } catch {
      // Use mock data on error
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

  if (loading) return <LoadingSpinner fullScreen message="Loading dashboard..." />;

  const companyName = user?.companyName || user?.company_name || 'Your Company';
  const firstName = user?.firstName || user?.first_name || 'Admin';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 100 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      showsVerticalScrollIndicator={false}
    >
      {/* Top Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View>
          <Text style={styles.companyName}>{companyName}</Text>
          <Text style={styles.welcomeText}>Welcome back, {firstName}</Text>
        </View>
        <TouchableOpacity
          style={styles.avatarButton}
          onPress={() => navigation.navigate('Profile')}
        >
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{firstName.charAt(0)}</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Savings Banner */}
      <View style={styles.savingsBanner}>
        <View style={styles.savingsLeft}>
          <Text style={styles.savingsLabel}>Total Savings This Year</Text>
          <Text style={styles.savingsAmount}>{formatCurrency(stats.savings)}</Text>
          <Text style={styles.savingsPercent}>
            {stats.savingsPercent}% below market rates
          </Text>
        </View>
        <Text style={styles.savingsEmoji}>💰</Text>
      </View>

      {/* Stats Row */}
      <Card style={styles.statsCard} noBorder>
        <View style={styles.statsRow}>
          <StatCard
            label="Claims Processed"
            value={stats.claimsProcessed?.toLocaleString() || '0'}
            color={colors.primary}
          />
          <View style={styles.statDivider} />
          <StatCard
            label="Members Enrolled"
            value={stats.membersEnrolled?.toLocaleString() || '0'}
            color={colors.primaryLight}
          />
          <View style={styles.statDivider} />
          <StatCard
            label="Active Plans"
            value={stats.plansActive || '0'}
            color={colors.secondary}
          />
        </View>
      </Card>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <Card style={styles.actionsCard}>
          <View style={styles.actionsRow}>
            <QuickAction
              icon="➕"
              label="Invite Member"
              onPress={() => navigation.navigate('InviteMember')}
              color={colors.secondary}
            />
            <QuickAction
              icon="📋"
              label="Manage Plans"
              onPress={() => navigation.navigate('Plans')}
              color={colors.primary}
            />
            <QuickAction
              icon="📊"
              label="All Claims"
              onPress={() => navigation.navigate('Claims')}
              color={colors.primaryLight}
            />
            <QuickAction
              icon="👥"
              label="Members"
              onPress={() => navigation.navigate('Members')}
              color={colors.accent}
            />
          </View>
        </Card>
      </View>

      {/* Recent Claims */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Claims</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Claims')}>
            <Text style={styles.seeAll}>See All</Text>
          </TouchableOpacity>
        </View>

        {recentClaims.map((claim) => (
          <ClaimCard
            key={claim.id}
            claim={claim}
            onPress={() => navigation.navigate('ClaimDetail', { claimId: claim.id })}
          />
        ))}
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  companyName: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.white,
    marginBottom: 3,
  },
  welcomeText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.75)',
  },
  avatarButton: {
    marginTop: 2,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  avatarText: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.white,
  },
  savingsBanner: {
    backgroundColor: colors.secondary,
    marginHorizontal: 20,
    marginTop: -12,
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: colors.secondary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  savingsLeft: {
    flex: 1,
  },
  savingsLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '500',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  savingsAmount: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.white,
    marginBottom: 4,
  },
  savingsPercent: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '500',
  },
  savingsEmoji: {
    fontSize: 40,
    marginLeft: 12,
  },
  statsCard: {
    marginHorizontal: 20,
    marginTop: 16,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.border,
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
    color: colors.primaryLight,
    fontWeight: '600',
    marginBottom: 14,
  },
  actionsCard: {
    paddingVertical: 20,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
});

export default EmployerDashboard;
