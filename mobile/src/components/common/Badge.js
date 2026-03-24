import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../../utils/colors';

const Badge = ({ label, variant = 'default', size = 'medium', style, textStyle }) => {
  return (
    <View style={[styles.badge, styles[variant], styles[`size_${size}`], style]}>
      <Text style={[styles.text, styles[`text_${variant}`], styles[`textSize_${size}`], textStyle]}>
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    borderRadius: 20,
    alignSelf: 'flex-start',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Variants
  default: {
    backgroundColor: colors.border,
  },
  primary: {
    backgroundColor: '#EBF5FB',
  },
  success: {
    backgroundColor: '#EAFAF1',
  },
  warning: {
    backgroundColor: '#FEF9E7',
  },
  error: {
    backgroundColor: '#FDEDEC',
  },
  approved: {
    backgroundColor: '#EAFAF1',
  },
  pending: {
    backgroundColor: '#FEF9E7',
  },
  denied: {
    backgroundColor: '#FDEDEC',
  },
  paid: {
    backgroundColor: '#EBF5FB',
  },
  network: {
    backgroundColor: '#EAFAF1',
  },
  info: {
    backgroundColor: '#EBF5FB',
  },

  // Sizes
  size_small: {
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  size_medium: {
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  size_large: {
    paddingHorizontal: 14,
    paddingVertical: 6,
  },

  // Text
  text: {
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  text_default: {
    color: colors.textSecondary,
  },
  text_primary: {
    color: colors.primary,
  },
  text_success: {
    color: colors.success,
  },
  text_warning: {
    color: '#D4811A',
  },
  text_error: {
    color: colors.error,
  },
  text_approved: {
    color: colors.approved,
  },
  text_pending: {
    color: '#D4811A',
  },
  text_denied: {
    color: colors.denied,
  },
  text_paid: {
    color: colors.paid,
  },
  text_network: {
    color: colors.success,
  },
  text_info: {
    color: colors.primary,
  },

  // Text sizes
  textSize_small: {
    fontSize: 10,
  },
  textSize_medium: {
    fontSize: 12,
  },
  textSize_large: {
    fontSize: 13,
  },
});

export default Badge;
