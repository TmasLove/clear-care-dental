import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors } from '../../utils/colors';
import { formatCurrency, formatDate } from '../../utils/formatters';
import ClaimStatusBadge from './ClaimStatusBadge';

const ClaimCard = ({ claim, onPress, showPatient = false }) => {
  const statusColor = {
    approved: colors.approved,
    pending: colors.pending,
    denied: colors.denied,
    paid: colors.paid,
    processing: colors.warning,
    partial: colors.accent,
  }[claim.status?.toLowerCase()] || colors.border;

  // Normalize field names — support both camelCase and snake_case and API-specific names
  const procedureCode = claim.procedureCode || claim.procedure_code || claim.claim_number || '';
  const procedureName = claim.procedureName || claim.procedure_name || claim.description ||
    (claim.dentist_practice ? `${claim.dentist_practice}` : 'Dental Service');
  const amountBilled = parseFloat(claim.amountBilled || claim.amount_billed || claim.total_billed || 0);
  const amountApproved = parseFloat(claim.amountApproved || claim.amount_approved || claim.allowed_amount || claim.plan_paid || 0);
  const patientOwes = parseFloat(claim.patientOwes || claim.patient_owes || claim.member_responsibility || 0);
  const patientName = claim.patientName || claim.patient_name ||
    (claim.member_first_name ? `${claim.member_first_name} ${claim.member_last_name}` : null);
  const serviceDate = claim.serviceDate || claim.service_date || claim.createdAt || claim.created_at;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={onPress ? 0.8 : 1}
      disabled={!onPress}
    >
      <View style={[styles.statusBar, { backgroundColor: statusColor }]} />
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.procedureCode} numberOfLines={1}>
              {procedureCode || 'N/A'}
            </Text>
            <Text style={styles.procedureName} numberOfLines={1}>
              {procedureName}
            </Text>
          </View>
          <ClaimStatusBadge status={claim.status} />
        </View>

        {showPatient && patientName && (
          <Text style={styles.patientName}>
            Patient: {patientName}
          </Text>
        )}

        <View style={styles.footer}>
          <View style={styles.amountRow}>
            <View style={styles.amountItem}>
              <Text style={styles.amountLabel}>Billed</Text>
              <Text style={styles.amountValue}>{formatCurrency(amountBilled)}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.amountItem}>
              <Text style={styles.amountLabel}>Plan Pays</Text>
              <Text style={[styles.amountValue, styles.approvedAmount]}>{formatCurrency(amountApproved)}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.amountItem}>
              <Text style={styles.amountLabel}>You Owe</Text>
              <Text style={styles.amountValue}>{formatCurrency(patientOwes)}</Text>
            </View>
          </View>
          <Text style={styles.date}>{formatDate(serviceDate)}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
    flexDirection: 'row',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  statusBar: {
    width: 4,
  },
  content: {
    flex: 1,
    padding: 14,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  headerLeft: {
    flex: 1,
    marginRight: 8,
  },
  procedureCode: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  procedureName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  patientName: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 4,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  amountItem: {
    alignItems: 'center',
  },
  amountLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    marginBottom: 2,
    letterSpacing: 0.3,
  },
  amountValue: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  approvedAmount: {
    color: colors.success,
  },
  divider: {
    width: 1,
    height: 24,
    backgroundColor: colors.border,
    marginHorizontal: 10,
  },
  date: {
    fontSize: 11,
    color: colors.textSecondary,
    marginLeft: 8,
  },
});

export default ClaimCard;
