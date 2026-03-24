import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { dentistsAPI } from '../../api/dentists';
import { colors } from '../../utils/colors';
import Badge from '../../components/common/Badge';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const DentistDetailScreen = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const { dentistId, dentist: routeDentist } = route.params || {};
  const [dentist, setDentist] = useState(routeDentist || null);
  const [loading, setLoading] = useState(!routeDentist);

  useEffect(() => {
    if (!routeDentist && dentistId) {
      const load = async () => {
        try {
          const data = await dentistsAPI.getDentistById(dentistId);
          setDentist(data?.dentist || data);
        } catch {
          // Use route data fallback
        } finally {
          setLoading(false);
        }
      };
      load();
    }
  }, [dentistId, routeDentist]);

  if (loading) return <LoadingSpinner fullScreen message="Loading dentist profile..." />;

  if (!dentist) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Dentist not found.</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backLink}>← Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const name = dentist.name || `${dentist.firstName || ''} ${dentist.lastName || ''}`.trim();
  const isInNetwork = dentist.inNetwork || dentist.in_network;
  const rating = dentist.rating || dentist.averageRating;

  const handleCall = () => {
    if (dentist.phone) {
      Linking.openURL(`tel:${dentist.phone}`);
    } else {
      Alert.alert('Contact', 'Phone number not available. Please visit their website.');
    }
  };

  const handleDirections = () => {
    const address = [dentist.address, dentist.city, dentist.state].filter(Boolean).join(', ');
    if (address) {
      Linking.openURL(`maps:?q=${encodeURIComponent(address)}`);
    }
  };

  const handleBookAppointment = () => {
    if (dentist.website || dentist.bookingUrl) {
      Linking.openURL(dentist.website || dentist.bookingUrl);
    } else {
      Alert.alert('Book Appointment', 'Please call this dentist to schedule an appointment.', [
        { text: 'Call Now', onPress: handleCall },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.navHeader}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>‹ Back</Text>
        </TouchableOpacity>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile Hero */}
        <View style={styles.profileHero}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{name.charAt(0)}</Text>
          </View>
          <Text style={styles.doctorName}>Dr. {name}</Text>
          <Text style={styles.specialty}>
            {dentist.specialty || dentist.specialization || 'General Dentistry'}
          </Text>
          {isInNetwork && (
            <Badge label="In-Network" variant="network" size="medium" style={styles.networkBadge} />
          )}

          {rating && (
            <View style={styles.ratingRow}>
              <Text style={styles.stars}>{'★'.repeat(Math.floor(rating))}{'☆'.repeat(5 - Math.floor(rating))}</Text>
              <Text style={styles.ratingText}>{Number(rating).toFixed(1)} ({dentist.reviewCount || 0} reviews)</Text>
            </View>
          )}
        </View>

        {/* Actions */}
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.actionBtn} onPress={handleCall}>
            <Text style={styles.actionBtnIcon}>📞</Text>
            <Text style={styles.actionBtnLabel}>Call</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={handleDirections}>
            <Text style={styles.actionBtnIcon}>📍</Text>
            <Text style={styles.actionBtnLabel}>Directions</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={handleBookAppointment}>
            <Text style={styles.actionBtnIcon}>📅</Text>
            <Text style={styles.actionBtnLabel}>Book</Text>
          </TouchableOpacity>
        </View>

        {/* Location */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Location & Contact</Text>
          {dentist.address && (
            <View style={styles.infoRow}>
              <Text style={styles.infoIcon}>📍</Text>
              <Text style={styles.infoText}>
                {dentist.address}{'\n'}
                {[dentist.city, dentist.state, dentist.zip].filter(Boolean).join(', ')}
              </Text>
            </View>
          )}
          {dentist.phone && (
            <View style={styles.infoRow}>
              <Text style={styles.infoIcon}>📞</Text>
              <Text style={[styles.infoText, styles.link]}>{dentist.phone}</Text>
            </View>
          )}
          {dentist.website && (
            <View style={styles.infoRow}>
              <Text style={styles.infoIcon}>🌐</Text>
              <Text style={[styles.infoText, styles.link]}>{dentist.website}</Text>
            </View>
          )}
          {dentist.distance !== undefined && (
            <View style={styles.infoRow}>
              <Text style={styles.infoIcon}>📏</Text>
              <Text style={styles.infoText}>{Number(dentist.distance).toFixed(1)} miles away</Text>
            </View>
          )}
        </Card>

        {/* Insurance */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Insurance & Network</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoIcon}>{isInNetwork ? '✅' : '⚠️'}</Text>
            <View>
              <Text style={[styles.infoText, { fontWeight: '700', color: isInNetwork ? colors.success : colors.warning }]}>
                {isInNetwork ? 'In-Network Provider' : 'Out-of-Network Provider'}
              </Text>
              <Text style={[styles.infoText, { color: colors.textSecondary, marginTop: 3 }]}>
                {isInNetwork
                  ? 'You\'ll pay lower out-of-pocket costs at this dentist.'
                  : 'Higher out-of-pocket costs may apply. Check your plan details.'}
              </Text>
            </View>
          </View>
        </Card>

        {/* Services */}
        {dentist.services && dentist.services.length > 0 && (
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Services</Text>
            <View style={styles.servicesList}>
              {dentist.services.map((service, i) => (
                <View key={i} style={styles.serviceItem}>
                  <Text style={styles.serviceDot}>•</Text>
                  <Text style={styles.serviceText}>{service}</Text>
                </View>
              ))}
            </View>
          </Card>
        )}

        <Button
          title="Book Appointment"
          onPress={handleBookAppointment}
          size="large"
          style={styles.bookButton}
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
  navHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
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
  content: {
    paddingBottom: 60,
  },
  profileHero: {
    backgroundColor: colors.primary,
    alignItems: 'center',
    paddingVertical: 28,
    paddingHorizontal: 24,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  avatarText: {
    fontSize: 34,
    fontWeight: '700',
    color: colors.white,
  },
  doctorName: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.white,
    marginBottom: 4,
  },
  specialty: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 10,
  },
  networkBadge: {
    marginBottom: 10,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  stars: {
    fontSize: 14,
    color: colors.accent,
    letterSpacing: 1,
  },
  ratingText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
  },
  actionRow: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  actionBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  actionBtnIcon: {
    fontSize: 22,
    marginBottom: 4,
  },
  actionBtnLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  section: {
    margin: 20,
    marginBottom: 0,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
    gap: 10,
  },
  infoIcon: {
    fontSize: 16,
    marginTop: 1,
  },
  infoText: {
    fontSize: 14,
    color: colors.text,
    flex: 1,
    lineHeight: 20,
  },
  link: {
    color: colors.primaryLight,
    fontWeight: '500',
  },
  servicesList: {
    gap: 6,
  },
  serviceItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  serviceDot: {
    fontSize: 16,
    color: colors.primary,
    lineHeight: 20,
  },
  serviceText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  bookButton: {
    margin: 20,
    marginTop: 24,
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

export default DentistDetailScreen;
