import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../../utils/colors';
import { formatCurrency } from '../../utils/formatters';

const BenefitMeter = ({ label, used, total, color }) => {
  const safeUsed = Number(used) || 0;
  const safeTotal = Number(total) || 1;
  const progress = Math.min(safeUsed / safeTotal, 1);
  const percentage = Math.round(progress * 100);
  const barColor = color || (percentage >= 80 ? colors.warning : colors.primary);
  const remaining = Math.max(safeTotal - safeUsed, 0);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.percentage}>{percentage}% used</Text>
      </View>

      <View style={styles.track}>
        <View
          style={[
            styles.fill,
            { width: `${percentage}%`, backgroundColor: barColor },
          ]}
        />
      </View>

      <View style={styles.footer}>
        <Text style={styles.amountText}>
          {formatCurrency(safeUsed)} used
        </Text>
        <Text style={styles.totalText}>
          {formatCurrency(safeTotal)} total
        </Text>
      </View>

      {remaining > 0 && (
        <Text style={styles.remainingText}>
          {formatCurrency(remaining)} remaining
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  percentage: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  track: {
    height: 10,
    backgroundColor: colors.border,
    borderRadius: 5,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 5,
    minWidth: 4,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  amountText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  totalText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  remainingText: {
    fontSize: 12,
    color: colors.success,
    fontWeight: '600',
    marginTop: 2,
  },
});

export default BenefitMeter;
