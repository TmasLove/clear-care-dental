import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { claimsAPI } from '../../api/claims';
import { formatCurrency, formatDate, formatDateTime } from '../../utils/formatters';
import { colors } from '../../utils/colors';
import Card from '../../components/common/Card';
import ClaimStatusBadge from '../../components/claims/ClaimStatusBadge';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const ClaimDetailScreen = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const { claimId, claim: routeClaim } = route.params || {};
  const [claim, setClaim] = useState(routeClaim || null);
  const [loading, setLoading] = useState(!routeClaim);

  useEffect(() => {
    if (!routeClaim && claimId) {
      const load = async () => {
        try {
          const data = await claimsAPI.getClaimById(claimId);
          setClaim(data?.claim || data);
        } catch {
          // Use route claim
        } finally {
          setLoading(false);
        }
      };
      load();
    }
  }, [claimId, routeClaim]);

  if (loading) return <LoadingSpinner fullScreen message="Loading claim..." />;
  if (!claim) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Claim not found.</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backLink}>← Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const statusColor = {
    approved: colors.approved,
    pending: colors.pending,
    denied: colors.denied,
    paid: colors.paid,
  }[claim.status?.toLowerCase()] || colors.border;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.navHeader}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Claim Details</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Status Banner */}
        <View style={[styles.statusBanner, { backgroundColor: statusColor }]}>
          <Text style={styles.statusBannerTitle}>
            {claim.procedureName || claim.procedure_name || 'Dental Procedure'}
          </Text>
          <View style={styles.statusBannerRow}>
            <Text style={styles.statusBannerCode}>
              Code: {claim.procedureCode || claim.procedure_code || 'N/A'}
            </Text>
            <ClaimStatusBadge status={claim.status} size="medium" />
          </View>
        </View>

        {/* Financial Breakdown */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Financial Breakdown</Text>

          <View style={styles.amountRow}>
            <View style={styles.amountItem}>
              <Text style={styles.amountLabel}>Amount Billed</Text>
              <Text style={styles.amountValue}>
                {formatCurrency(claim.amountBilled || claim.amount_billed || 0)}
              </Text>
            </View>
            <View style={styles.amountArrow}>
              <Text style={styles.amountArrowText}>→</Text>
            </View>
            <View style={styles.amountItem}>
              <Text style={styles.amountLabel}>Plan Approved</Text>
              <Text style={[styles.amountValue, { color: colors.success }]}>
                {formatCurrency(claim.amountApproved || claim.amount_approved || 0)}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.costRow}>
            <Text style={styles.costLabel}>Insurance Pays</Text>
            <Text style={[styles.costValue, { color: colors.primary }]}>
              {formatCurrency(claim.insurancePays || claim.insurance_pays || (claim.amountApproved - claim.patientOwes) || 0)}
            </Text>
          </View>
          <View style={styles.costRow}>
            <Text style={styles.costLabel}>Deductible Applied</Text>
            <Text style={styles.costValue}>
              {formatCurrency(claim.deductibleApplied || claim.deductible_applied || 0)}
            </Text>
          </View>
          <View style={styles.costRow}>
            <Text style={styles.costLabel}>Coinsurance</Text>
            <Text style={styles.costValue}>
              {formatCurrency(claim.coinsurance || 0)}
            </Text>
          </View>
          <View style={[styles.costRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Your Responsibility</Text>
            <Text style={styles.totalValue}>
              {formatCurrency(claim.patientOwes || claim.patient_owes || 0)}
            </Text>
          </View>
        </Card>

        {/* Claim Info */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Claim Information</Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Claim ID</Text>
            <Text style={styles.infoValue}>#{claim.id}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Service Date</Text>
            <Text style={styles.infoValue}>
              {formatDate(claim.serviceDate || claim.service_date)}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Submitted</Text>
            <Text style={styles.infoValue}>
              {formatDate(claim.submittedAt || claim.submitted_at || claim.createdAt || claim.created_at)}
            </Text>
          </View>
          {claim.processedAt || claim.processed_at ? (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Processed</Text>
              <Text style={styles.infoValue}>
                {formatDate(claim.processedAt || claim.processed_at)}
              </Text>
            </View>
          ) : null}
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Provider</Text>
            <Text style={styles.infoValue}>
              {claim.providerName || claim.provider_name || 'N/A'}
            </Text>
          </View>
          <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
            <Text style={styles.infoLabel}>Status</Text>
            <ClaimStatusBadge status={claim.status} />
          </View>
        </Card>

        {/* Denial reason */}
        {claim.status?.toLowerCase() === 'denied' && claim.denialReason && (
          <Card style={[styles.section, styles.denialCard]}>
            <Text style={styles.denialTitle}>Why was this claim denied?</Text>
            <Text style={styles.denialReason}>{claim.denialReason || claim.denial_reason}</Text>
            <Text style={styles.denialHelp}>
              If you believe this is in error, contact our support team to file an appeal.
            </Text>
          </Card>
        )}

        {/* Adjudication notes */}
        {claim.adjudicationNotes && (
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Adjudication Notes</Text>
            <Text style={styles.notes}>{claim.adjudicationNotes}</Text>
          </Card>
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
  navHeader: {
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
    paddingBottom: 60,
  },
  statusBanner: {
    padding: 20,
  },
  statusBannerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.white,
    marginBottom: 8,
  },
  statusBannerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusBannerCode: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '600',
  },
  section: {
    margin: 20,
    marginBottom: 0,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 14,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  amountItem: {
    flex: 1,
    alignItems: 'center',
  },
  amountLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 6,
    fontWeight: '500',
  },
  amountValue: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
  },
  amountArrow: {
    paddingHorizontal: 10,
  },
  amountArrowText: {
    fontSize: 20,
    color: colors.border,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginBottom: 12,
  },
  costRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 7,
  },
  costLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  costValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: 4,
    paddingTop: 10,
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.primary,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 9,
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
  },
  denialCard: {
    backgroundColor: '#FFF5F5',
    borderColor: colors.error,
  },
  denialTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.error,
    marginBottom: 8,
  },
  denialReason: {
    fontSize: 13,
    color: colors.text,
    lineHeight: 18,
    marginBottom: 8,
  },
  denialHelp: {
    fontSize: 12,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  notes: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 16,
  },
  backLink: {
    fontSize: 15,
    color: colors.primary,
    fontWeight: '700',
  },
});

export default ClaimDetailScreen;
