import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors } from '../../utils/colors';
import Badge from '../common/Badge';

const StarRating = ({ rating }) => {
  const fullStars = Math.floor(rating || 0);
  const hasHalf = (rating || 0) % 1 >= 0.5;
  const stars = [];

  for (let i = 1; i <= 5; i++) {
    if (i <= fullStars) {
      stars.push('★');
    } else if (i === fullStars + 1 && hasHalf) {
      stars.push('⯨');
    } else {
      stars.push('☆');
    }
  }

  return (
    <View style={starStyles.row}>
      <Text style={starStyles.stars}>{stars.join('')}</Text>
      {rating ? (
        <Text style={starStyles.ratingText}>{Number(rating).toFixed(1)}</Text>
      ) : null}
    </View>
  );
};

const starStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stars: {
    fontSize: 13,
    color: colors.accent,
    letterSpacing: 1,
  },
  ratingText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginLeft: 4,
    fontWeight: '600',
  },
});

const DentistCard = ({ dentist, onPress }) => {
  const isInNetwork = dentist.inNetwork || dentist.in_network || false;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.avatarContainer}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {(dentist.name || dentist.firstName || 'D').charAt(0).toUpperCase()}
          </Text>
        </View>
        {isInNetwork && <View style={styles.networkDot} />}
      </View>

      <View style={styles.info}>
        <View style={styles.nameRow}>
          <Text style={styles.name} numberOfLines={1}>
            Dr. {dentist.name || `${dentist.firstName || ''} ${dentist.lastName || ''}`.trim()}
          </Text>
          {isInNetwork && (
            <Badge label="In-Network" variant="network" size="small" />
          )}
        </View>

        <Text style={styles.specialty}>
          {dentist.specialty || dentist.specialization || 'General Dentistry'}
        </Text>

        <View style={styles.metaRow}>
          <Text style={styles.location}>
            {[dentist.city, dentist.state].filter(Boolean).join(', ') || 'Location N/A'}
          </Text>
          {dentist.distance !== undefined && (
            <Text style={styles.distance}>
              {Number(dentist.distance).toFixed(1)} mi
            </Text>
          )}
        </View>

        <StarRating rating={dentist.rating || dentist.averageRating} />
      </View>

      <View style={styles.chevron}>
        <Text style={styles.chevronText}>›</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 14,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.white,
  },
  networkDot: {
    position: 'absolute',
    bottom: 1,
    right: 1,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.success,
    borderWidth: 2,
    borderColor: colors.white,
  },
  info: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 3,
  },
  name: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    flexShrink: 1,
  },
  specialty: {
    fontSize: 13,
    color: colors.primaryLight,
    fontWeight: '500',
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  location: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  distance: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  chevron: {
    marginLeft: 8,
  },
  chevronText: {
    fontSize: 22,
    color: colors.border,
    fontWeight: '300',
  },
});

export default DentistCard;
