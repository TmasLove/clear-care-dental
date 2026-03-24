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
import { colors } from '../../utils/colors';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';

const MOCK_PLANS = [
  {
    id: '1',
    name: 'Standard Dental Plan',
    type: 'PPO',
    membersCount: 187,
    status: 'active',
    monthlyPremium: 42.50,
    annualMax: 1500,
    deductible: 50,
    coveragePreventive: 100,
    coverageBasic: 80,
    coverageMajor: 50,
  },
  {
    id: '2',
    name: 'Premium Dental Plan',
    type: 'PPO',
    membersCount: 52,
    status: 'active',
    monthlyPremium: 68.00,
    annualMax: 2500,
    deductible: 0,
    coveragePreventive: 100,
    coverageBasic: 90,
    coverageMajor: 70,
  },
  {
    id: '3',
    name: 'Basic Dental Plan',
    type: 'HMO',
    membersCount: 8,
    status: 'inactive',
    monthlyPremium: 28.00,
    annualMax: 1000,
    deductible: 100,
    coveragePreventive: 100,
    coverageBasic: 70,
    coverageMajor: 40,
  },
];

const PlanCard = ({ plan, onPress, onEdit }) => (
  <Card style={styles.planCard} onPress={onPress}>
    <View style={styles.planHeader}>
      <View style={styles.planHeaderLeft}>
        <Text style={styles.planName}>{plan.name}</Text>
        <Text style={styles.planType}>{plan.type} Network</Text>
      </View>
      <Badge
        label={plan.status === 'active' ? 'Active' : 'Inactive'}
        variant={plan.status === 'active' ? 'success' : 'default'}
      />
    </View>

    <View style={styles.planStats}>
      <View style={styles.planStat}>
        <Text style={styles.planStatValue}>{plan.membersCount}</Text>
        <Text style={styles.planStatLabel}>Members</Text>
      </View>
      <View style={styles.planStatDivider} />
      <View style={styles.planStat}>
        <Text style={styles.planStatValue}>${plan.monthlyPremium}/mo</Text>
        <Text style={styles.planStatLabel}>Premium</Text>
      </View>
      <View style={styles.planStatDivider} />
      <View style={styles.planStat}>
        <Text style={styles.planStatValue}>${plan.annualMax?.toLocaleString()}</Text>
        <Text style={styles.planStatLabel}>Annual Max</Text>
      </View>
    </View>

    <View style={styles.coverageRow}>
      <View style={styles.coverageItem}>
        <Text style={styles.coveragePct}>{plan.coveragePreventive}%</Text>
        <Text style={styles.coverageLabel}>Preventive</Text>
      </View>
      <View style={styles.coverageItem}>
        <Text style={styles.coveragePct}>{plan.coverageBasic}%</Text>
        <Text style={styles.coverageLabel}>Basic</Text>
      </View>
      <View style={styles.coverageItem}>
        <Text style={styles.coveragePct}>{plan.coverageMajor}%</Text>
        <Text style={styles.coverageLabel}>Major</Text>
      </View>
    </View>

    <TouchableOpacity
      style={styles.editButton}
      onPress={onEdit}
    >
      <Text style={styles.editButtonText}>Edit Plan</Text>
    </TouchableOpacity>
  </Card>
);

const PlanManagement = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [plans, setPlans] = useState(MOCK_PLANS);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadPlans = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    try {
      const data = await employersAPI.getPlans();
      const list = data?.plans || data || [];
      if (list.length > 0) setPlans(list);
    } catch {
      // Use mock data
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadPlans();
  }, [loadPlans]);

  const onRefresh = () => {
    setRefreshing(true);
    loadPlans(true);
  };

  const handleDeletePlan = (plan) => {
    Alert.alert(
      'Delete Plan',
      `Are you sure you want to delete "${plan.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await employersAPI.deletePlan(plan.id);
              setPlans((prev) => prev.filter((p) => p.id !== plan.id));
            } catch {
              Alert.alert('Error', 'Failed to delete plan. Please try again.');
            }
          },
        },
      ]
    );
  };

  if (loading) return <LoadingSpinner fullScreen message="Loading plans..." />;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Plan Management</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate('CreatePlan')}
        >
          <Text style={styles.addButtonText}>+ New</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        showsVerticalScrollIndicator={false}
      >
        {plans.length === 0 ? (
          <EmptyState
            icon="📋"
            title="No Plans Yet"
            subtitle="Create your first dental plan to start enrolling members."
            actionLabel="Create Plan"
            onAction={() => navigation.navigate('CreatePlan')}
          />
        ) : (
          plans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              onPress={() => navigation.navigate('PlanDetail', { planId: plan.id })}
              onEdit={() => navigation.navigate('CreatePlan', { plan })}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
  },
  addButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 14,
  },
  content: {
    padding: 20,
    paddingBottom: 100,
  },
  planCard: {
    marginBottom: 16,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  planHeaderLeft: {
    flex: 1,
    marginRight: 8,
  },
  planName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 3,
  },
  planType: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  planStats: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
  },
  planStat: {
    flex: 1,
    alignItems: 'center',
  },
  planStatValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 3,
  },
  planStatLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  planStatDivider: {
    width: 1,
    height: 28,
    backgroundColor: colors.border,
    alignSelf: 'center',
  },
  coverageRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 14,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 12,
  },
  coverageItem: {
    alignItems: 'center',
  },
  coveragePct: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.secondary,
    marginBottom: 3,
  },
  coverageLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  editButton: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 12,
    alignItems: 'center',
  },
  editButtonText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '700',
  },
});

export default PlanManagement;
