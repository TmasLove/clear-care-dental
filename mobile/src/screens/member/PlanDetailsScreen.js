import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Share,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { membersAPI } from '../../api/members';
import { useAuth } from '../../hooks/useAuth';
import { formatCurrency } from '../../utils/formatters';
import { colors } from '../../utils/colors';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import BenefitMeter from '../../components/plan/BenefitMeter';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const MOCK_PLAN = {
  name: 'Standard Dental Plan',
  type: 'PPO',
  memberId: 'CC-1001',
  groupNumber: 'GRP-4892',
  effectiveDate: '2025-01-01',
  renewalDate: '2025-12-31',
  coveragePreventive: 100,
  coverageBasic: 80,
  coverageMajor: 50,
  coverageOrtho: 50,
  annualMax: 1500,
  deductible: 50,
  deductibleMet: 50,
  orthoLifetimeMax: 1500,
  annualUsed: 340,
  networkName: 'Clear Care PPO Network',
  insurerName: 'Clear Care Dental Insurance',
};

const CoverageRow = ({ label, percent, description }) => (
  <View style={covStyles.row}>
    <View style={covStyles.left}>
      <Text style={covStyles.label}>{label}</Text>
      {description && <Text style={covStyles.description}>{description}</Text>}
    </View>
    <View style={covStyles.right}>
      <Text style={covStyles.percent}>{percent}%</Text>
      <Text style={covStyles.covered}>covered</Text>
    </View>
  </View>
);

const covStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  left: {
    flex: 1,
    marginRight: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  description: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  right: {
    alignItems: 'flex-end',
  },
  percent: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.primary,
  },
  covered: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
  },
});

const PlanDetailsScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [plan, setPlan] = useState(MOCK_PLAN);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPlan = async () => {
      try {
        const memberId = user?.memberId || user?.id;
        if (memberId) {
          const data = await membersAPI.getMemberPlan(memberId);
          if (data) setPlan({ ...MOCK_PLAN, ...(data?.plan || data) });
        }
      } catch {
        // Use mock data
      } finally {
        setLoading(false);
      }
    };
    loadPlan();
  }, [user]);

  const handleShareWithDentist = async () => {
    try {
      await Share.share({
        message: `Clear Care Dental Insurance\nMember: ${user?.firstName} ${user?.lastName}\nMember ID: ${plan.memberId}\nGroup #: ${plan.groupNumber}\nPlan: ${plan.name}\n\nInsurer: ${plan.insurerName}\nNetwork: ${plan.networkName}`,
        title: 'My Dental Insurance Info',
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to share plan details.');
    }
  };

  if (loading) return <LoadingSpinner fullScreen message="Loading plan details..." />;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Plan Details</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Plan ID card */}
        <View style={styles.idCard}>
          <View style={styles.idCardHeader}>
            <Text style={styles.idCardTitle}>{plan.insurerName}</Text>
            <Text style={styles.idCardSubtitle}>{plan.name}</Text>
          </View>
          <View style={styles.idCardBody}>
            <View style={styles.idRow}>
              <Text style={styles.idLabel}>Member ID</Text>
              <Text style={styles.idValue}>{plan.memberId}</Text>
            </View>
            <View style={styles.idRow}>
              <Text style={styles.idLabel}>Group #</Text>
              <Text style={styles.idValue}>{plan.groupNumber}</Text>
            </View>
            <View style={styles.idRow}>
              <Text style={styles.idLabel}>Plan Type</Text>
              <Text style={styles.idValue}>{plan.type}</Text>
            </View>
            <View style={styles.idRow}>
              <Text style={styles.idLabel}>Effective</Text>
              <Text style={styles.idValue}>{plan.effectiveDate}</Text>
            </View>
            <View style={[styles.idRow, { borderBottomWidth: 0 }]}>
              <Text style={styles.idLabel}>Network</Text>
              <Text style={styles.idValue}>{plan.networkName}</Text>
            </View>
          </View>
        </View>

        {/* Coverage */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Coverage Breakdown</Text>
          <CoverageRow
            label="Preventive Care"
            percent={plan.coveragePreventive}
            description="Cleanings, exams, X-rays"
          />
          <CoverageRow
            label="Basic Restorative"
            percent={plan.coverageBasic}
            description="Fillings, extractions, emergency"
          />
          <CoverageRow
            label="Major Restorative"
            percent={plan.coverageMajor}
            description="Crowns, bridges, dentures"
          />
          <View style={[covStyles.row, { borderBottomWidth: 0 }]}>
            <View style={covStyles.left}>
              <Text style={covStyles.label}>Orthodontia</Text>
              <Text style={covStyles.description}>
                Lifetime max: {formatCurrency(plan.orthoLifetimeMax)}
              </Text>
            </View>
            <View style={covStyles.right}>
              <Text style={covStyles.percent}>{plan.coverageOrtho}%</Text>
              <Text style={covStyles.covered}>covered</Text>
            </View>
          </View>
        </Card>

        {/* Financial info */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Financial Details</Text>
          <View style={styles.finRow}>
            <View style={styles.finItem}>
              <Text style={styles.finLabel}>Annual Maximum</Text>
              <Text style={styles.finValue}>{formatCurrency(plan.annualMax)}</Text>
            </View>
            <View style={styles.finItem}>
              <Text style={styles.finLabel}>Annual Deductible</Text>
              <Text style={styles.finValue}>{formatCurrency(plan.deductible)}</Text>
            </View>
          </View>
        </Card>

        {/* Benefits usage */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Benefits Used This Year</Text>
          <BenefitMeter
            label="Annual Maximum"
            used={plan.annualUsed || 0}
            total={plan.annualMax || 1500}
          />
          <BenefitMeter
            label="Deductible Met"
            used={plan.deductibleMet || 0}
            total={plan.deductible || 50}
            color={colors.secondary}
          />
        </Card>

        <Button
          title="Share with Dentist"
          onPress={handleShareWithDentist}
          variant="outline"
          size="large"
          style={styles.shareButton}
        />

        <Button
          title="View as QR Code"
          onPress={() => navigation.navigate('SharePlan')}
          size="large"
          style={styles.qrButton}
        />
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
    paddingVertical: 14,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: '600',
    width: 60,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
  },
  content: {
    padding: 20,
    paddingBottom: 60,
  },
  idCard: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 20,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  idCardHeader: {
    padding: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.2)',
  },
  idCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  idCardSubtitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.white,
  },
  idCardBody: {
    padding: 20,
    paddingTop: 14,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  idRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  idLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.65)',
    fontWeight: '500',
  },
  idValue: {
    fontSize: 13,
    color: colors.white,
    fontWeight: '700',
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  finRow: {
    flexDirection: 'row',
    gap: 16,
  },
  finItem: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  finLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
    marginBottom: 6,
    textAlign: 'center',
  },
  finValue: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.primary,
  },
  shareButton: {
    marginBottom: 12,
  },
  qrButton: {
    marginBottom: 8,
  },
});

export default PlanDetailsScreen;
