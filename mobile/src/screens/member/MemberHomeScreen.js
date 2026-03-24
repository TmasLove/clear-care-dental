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
import { membersAPI } from '../../api/members';
import { useAuth } from '../../hooks/useAuth';
import { getGreeting, formatCurrency } from '../../utils/formatters';
import { colors } from '../../utils/colors';
import Card from '../../components/common/Card';
import BenefitMeter from '../../components/plan/BenefitMeter';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const MOCK_PLAN = {
  name: 'Standard Dental Plan',
  type: 'PPO',
  memberId: 'CC-1001',
  coveragePreventive: 100,
  coverageBasic: 80,
  coverageMajor: 50,
  annualMax: 1500,
  deductible: 50,
  deductibleMet: 50,
  annualUsed: 340,
  networkName: 'Clear Care PPO Network',
};

const QuickAction = ({ icon, label, onPress, color }) => (
  <TouchableOpacity style={qaStyles.action} onPress={onPress} activeOpacity={0.8}>
    <View style={[qaStyles.iconBox, { backgroundColor: color }]}>
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
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  icon: {
    fontSize: 24,
  },
  label: {
    fontSize: 12,
    color: colors.text,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 16,
  },
});

const MemberHomeScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [plan, setPlan] = useState(MOCK_PLAN);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const firstName = user?.firstName || user?.first_name || 'there';
  const greeting = getGreeting();

  const loadData = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      // Fetch member profile by user_id via /me route
      const meData = await membersAPI.getMemberById('me');
      const member = meData?.member;
      if (member) {
        const memberId = member.id;
        const [usageData] = await Promise.allSettled([
          membersAPI.getMemberBenefits(memberId),
        ]);

        setPlan((prev) => ({
          ...prev,
          name: member.plan_name || prev.name,
          memberId: member.member_id || prev.memberId,
          coveragePreventive: parseFloat(member.coverage_preventive) || prev.coveragePreventive,
          coverageBasic: parseFloat(member.coverage_basic) || prev.coverageBasic,
          coverageMajor: parseFloat(member.coverage_major) || prev.coverageMajor,
          annualMax: parseFloat(member.annual_maximum) || prev.annualMax,
          deductible: parseFloat(member.deductible_individual) || prev.deductible,
        }));

        if (usageData.status === 'fulfilled' && usageData.value?.benefits) {
          const b = usageData.value.benefits;
          setPlan((prev) => ({
            ...prev,
            annualUsed: parseFloat(b.annual_maximum_used) || prev.annualUsed,
            deductibleMet: parseFloat(b.deductible_met) || prev.deductibleMet,
            annualMax: parseFloat(b.annual_maximum) || prev.annualMax,
            deductible: parseFloat(b.deductible_individual) || prev.deductible,
          }));
        }
      }
    } catch {
      // Use mock data on error
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData(true);
  };

  if (loading) return <LoadingSpinner fullScreen message="Loading your plan..." />;

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
          <TouchableOpacity onPress={() => navigation.navigate('Profile')} activeOpacity={0.8}>
            <View style={styles.avatarButton}>
              <Text style={styles.avatarText}>{firstName.charAt(0).toUpperCase()}</Text>
            </View>
          </TouchableOpacity>
          <View style={styles.greetingBlock}>
            <Text style={styles.greeting}>{greeting},</Text>
            <Text style={styles.userName}>{firstName}! 👋</Text>
          </View>
          <TouchableOpacity onPress={() => navigation.navigate('Notifications')}>
            <View style={styles.notifButton}>
              <Text style={styles.notifIcon}>🔔</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Plan card */}
        <View style={styles.planCard}>
          <View style={styles.planCardHeader}>
            <View>
              <Text style={styles.planLabel}>Your Plan</Text>
              <Text style={styles.planName}>{plan.name}</Text>
              <Text style={styles.planType}>{plan.type} Network</Text>
            </View>
            <View style={styles.memberIdContainer}>
              <Text style={styles.memberIdLabel}>Member ID</Text>
              <Text style={styles.memberId}>{plan.memberId || user?.memberId || 'CC-0000'}</Text>
            </View>
          </View>

          <View style={styles.coverageRow}>
            {[
              { label: 'Prev', value: plan.coveragePreventive },
              { label: 'Basic', value: plan.coverageBasic },
              { label: 'Major', value: plan.coverageMajor },
            ].map((item) => (
              <View key={item.label} style={styles.coverageItem}>
                <Text style={styles.coveragePct}>{item.value}%</Text>
                <Text style={styles.coverageLabel}>{item.label}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* Benefits Usage */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Benefits Usage</Text>
        <Card>
          <BenefitMeter
            label="Annual Maximum"
            used={plan.annualUsed || 0}
            total={plan.annualMax || 1500}
            color={colors.primary}
          />
          <BenefitMeter
            label="Deductible"
            used={plan.deductibleMet || 0}
            total={plan.deductible || 50}
            color={colors.secondary}
          />
          <View style={styles.remainingNote}>
            <Text style={styles.remainingNoteText}>
              Remaining benefit: {formatCurrency((plan.annualMax || 1500) - (plan.annualUsed || 0))}
            </Text>
          </View>
        </Card>
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <Card>
          <View style={styles.actionsRow}>
            <QuickAction
              icon="🔍"
              label="Find Dentist"
              onPress={() => navigation.navigate('FindDentist')}
              color={colors.primary}
            />
            <QuickAction
              icon="📋"
              label="My Claims"
              onPress={() => navigation.navigate('Claims')}
              color={colors.primaryLight}
            />
            <QuickAction
              icon="📤"
              label="Share Plan"
              onPress={() => navigation.navigate('SharePlan')}
              color={colors.secondary}
            />
            <QuickAction
              icon="🎧"
              label="Support"
              onPress={() => navigation.navigate('Support')}
              color={colors.accent}
            />
          </View>
        </Card>
      </View>

      {/* Plan Details Link */}
      <View style={styles.section}>
        <TouchableOpacity
          style={styles.planDetailsButton}
          onPress={() => navigation.navigate('PlanDetails')}
          activeOpacity={0.85}
        >
          <View>
            <Text style={styles.planDetailsTitle}>View Full Plan Details</Text>
            <Text style={styles.planDetailsSubtitle}>Coverage, network, deductibles & more</Text>
          </View>
          <Text style={styles.planDetailsChevron}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Network Info */}
      <View style={styles.section}>
        <Card style={styles.networkCard}>
          <View style={styles.networkRow}>
            <Text style={styles.networkIcon}>🌐</Text>
            <View style={styles.networkInfo}>
              <Text style={styles.networkLabel}>Your Network</Text>
              <Text style={styles.networkName}>{plan.networkName || 'Clear Care PPO Network'}</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.findNetworkButton}
            onPress={() => navigation.navigate('FindDentist', { filter: 'in-network' })}
          >
            <Text style={styles.findNetworkText}>Find In-Network Dentists →</Text>
          </TouchableOpacity>
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
    paddingBottom: 28,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.white,
  },
  greetingBlock: {
    flex: 1,
    marginLeft: 12,
  },
  greeting: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.75)',
    fontWeight: '400',
  },
  userName: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.white,
  },
  notifButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  notifIcon: {
    fontSize: 20,
  },
  planCard: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  planCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  planLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  planName: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.white,
    marginBottom: 3,
  },
  planType: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
  },
  memberIdContainer: {
    alignItems: 'flex-end',
  },
  memberIdLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 3,
    letterSpacing: 0.5,
  },
  memberId: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.white,
  },
  coverageRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.15)',
  },
  coverageItem: {
    alignItems: 'center',
  },
  coveragePct: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.white,
    marginBottom: 3,
  },
  coverageLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
  },
  section: {
    paddingHorizontal: 20,
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 14,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 8,
  },
  remainingNote: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: 4,
  },
  remainingNoteText: {
    fontSize: 13,
    color: colors.success,
    fontWeight: '700',
    textAlign: 'center',
  },
  planDetailsButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  planDetailsTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 3,
  },
  planDetailsSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  planDetailsChevron: {
    fontSize: 24,
    color: colors.textSecondary,
    fontWeight: '300',
  },
  networkCard: {
    marginBottom: 8,
  },
  networkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  networkIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  networkInfo: {
    flex: 1,
  },
  networkLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  networkName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  findNetworkButton: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  findNetworkText: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '700',
    textAlign: 'center',
  },
});

export default MemberHomeScreen;
