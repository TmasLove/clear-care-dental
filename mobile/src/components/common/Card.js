import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { colors } from '../../utils/colors';

const Card = ({
  children,
  style,
  onPress,
  padded = true,
  elevated = true,
  borderLeft,
  noBorder = false,
}) => {
  const cardStyles = [
    styles.card,
    elevated && styles.elevated,
    padded && styles.padded,
    borderLeft && { borderLeftWidth: 4, borderLeftColor: borderLeft },
    noBorder && styles.noBorder,
    style,
  ];

  if (onPress) {
    return (
      <TouchableOpacity style={cardStyles} onPress={onPress} activeOpacity={0.85}>
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={cardStyles}>{children}</View>;
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  elevated: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  padded: {
    padding: 16,
  },
  noBorder: {
    borderWidth: 0,
  },
});

export default Card;
