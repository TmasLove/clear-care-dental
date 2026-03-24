import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { dentistsAPI } from '../../api/dentists';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { dentistColors as colors } from '../../utils/dentistColors';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';

const PatientEligibilityScreen = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const { memberId: prefillId, patientName: prefillName } = route?.params || {};
  const [memberId, setMemberId] = useState(prefillId || '');
  const [loading, setLoading] = useState(false);
  const [eligibility, setEligibility] = useState(null);
  const [error, setError] = useState('');

  const handleVerify = async () => {
    if (!memberId.trim()) {
      setError('Please enter a Member ID');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const data = await dentistsAPI.verifyPatientEligibility(memberId.trim());
      setEligibility(data?.eligibility || data);
    } catch {
      setEligibility(null);
      setError('Unable to verify eligibility. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={[styles.navHeader, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Verify Eligibility</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Card style={styles.searchCard}>
          <Text style={styles.searchTitle}>Patient Lookup</Text>
          <Text style={styles.searchSubtitle}>
            Enter the patient's Member ID to verify their dental benefits in real-time.
          </Text>

          <Input
            label="Member ID"
            value={memberId}
            onChangeText={(v) => { setMemberId(v); setError(''); setEligibility(null); }}
            placeholder="e.g. CC-1001"
            autoCapitalize="characters"
            autoCorrect={false}
            error={error}
            returnKeyType="search"
            onSubmitEditing={handleVerify}
          />

          <Button
            title="Verify Eligibility"
            onPress={handleVerify}
            loading={loading}
            disabled={loading}
            size="large"
          />
        </Card>

        {eligibility && (
          <>
            {/* Status Banner */}
            <View style={[styles.statusBanner, eligibility.isEligible ? styles.eligibleBanner : styles.notEligibleBanner]}>
              <Text style={styles.statusIcon}>{eligibility.isEligible ? '✅' : '❌'}</Text>
              <View>
                <Text style={styles.statusTitle}>
                  {eligibility.isEligible ? 'Eligible for Coverage' : 'Not Eligible'}
                </Text>
                <Text style={styles.statusMember}>{eligibility.memberName}</Text>
              </View>
            </View>

            {/* Member Details */}
            <Card style={styles.section}>
              <Text style={styles.sectionTitle}>Member Information</Text>
              <View style={styles.infoGrid}>
                {[
                  { label: 'Member ID', value: eligibility.memberId },
                  { label: 'Plan', value: eligibility.planName },
                  { label: 'Group #', value: eligibility.groupNumber },
                  { label: 'Effective Date', value: formatDate(eligibility.effectiveDate) },
                  { label: 'Renewal Date', value: formatDate(eligibility.renewalDate) },
                  { label: 'Network', value: eligibility.networkName },
                ].map((item) => (
                  <View key={item.label} style={styles.infoRow}>
                    <Text style={styles.infoLabel}>{item.label}</Text>
                    <Text style={styles.infoValue}>{item.value}</Text>
                  </View>
                ))}
              </View>
            </Card>

            {/* Coverage */}
            <Card style={styles.section}>
              <Text style={styles.sectionTitle}>Coverage</Text>
              <View style={styles.coverageGrid}>
                {[
                  { label: 'Preventive', pct: eligibility.coveragePreventive },
                  { label: 'Basic', pct: eligibility.coverageBasic },
                  { label: 'Major', pct: eligibility.coverageMajor },
                ].map((c) => (
                  <View key={c.label} style={styles.coverageItem}>
                    <Text style={styles.coveragePct}>{c.pct}%</Text>
                    <Text style={styles.coverageLabel}>{c.label}</Text>
                  </View>
                ))}
              </View>
            </Card>

            {/* Benefits Remaining */}
            <Card style={styles.section}>
              <Text style={styles.sectionTitle}>Benefits Remaining</Text>
              <View style={styles.benefitRow}>
                <View style={styles.benefitItem}>
                  <Text style={styles.benefitLabel}>Annual Max</Text>
                  <Text style={styles.benefitValue}>{formatCurrency(eligibility.annualMax)}</Text>
                </View>
                <View style={styles.benefitItem}>
                  <Text style={styles.benefitLabel}>Used</Text>
                  <Text style={[styles.benefitValue, { color: colors.warning }]}>
                    {formatCurrency(eligibility.annualUsed)}
                  </Text>
                </View>
                <View style={styles.benefitItem}>
                  <Text style={styles.benefitLabel}>Remaining</Text>
                  <Text style={[styles.benefitValue, { color: colors.success }]}>
                    {formatCurrency(eligibility.remainingBenefit)}
                  </Text>
                </View>
              </View>
              <View style={styles.deductibleRow}>
                <Text style={styles.deductibleLabel}>
                  Deductible: {formatCurrency(eligibility.deductibleMet)} of {formatCurrency(eligibility.deductible)} met
                </Text>
                <Badge
                  label={eligibility.deductibleMet >= eligibility.deductible ? 'Met' : 'Not Met'}
                  variant={eligibility.deductibleMet >= eligibility.deductible ? 'success' : 'pending'}
                />
              </View>
            </Card>

            <Button
              title="Submit Claim for this Patient"
              onPress={() => navigation.navigate('SubmitClaim', {
                memberId: eligibility.memberId,
                patientName: eligibility.memberName,
              })}
              size="large"
              style={styles.submitButton}
            />
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.background,
  },
  navHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 14,
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
  searchCard: {
    marginBottom: 20,
  },
  searchTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 6,
  },
  searchSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: 16,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  eligibleBanner: {
    backgroundColor: '#EAFAF1',
    borderWidth: 1,
    borderColor: colors.success,
  },
  notEligibleBanner: {
    backgroundColor: '#FDEDEC',
    borderWidth: 1,
    borderColor: colors.error,
  },
  statusIcon: {
    fontSize: 32,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 3,
  },
  statusMember: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
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
  infoGrid: {},
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  infoLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '600',
    textAlign: 'right',
    flex: 1,
    marginLeft: 12,
  },
  coverageGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 8,
  },
  coverageItem: {
    alignItems: 'center',
  },
  coveragePct: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.primary,
    marginBottom: 4,
  },
  coverageLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  benefitRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  benefitItem: {
    alignItems: 'center',
  },
  benefitLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 4,
    fontWeight: '500',
  },
  benefitValue: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },
  deductibleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  deductibleLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  submitButton: {
    marginTop: 8,
  },
});

export default PatientEligibilityScreen;
