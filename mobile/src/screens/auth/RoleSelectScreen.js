import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors } from '../../utils/colors';

const ROLES = [
  { id: 'employer', icon: '🏢', title: 'Employer / Admin', desc: 'Manage plans for your team' },
  { id: 'member', icon: '👤', title: 'Member', desc: 'View your dental benefits' },
  { id: 'dentist', icon: '🦷', title: 'Dentist', desc: 'Submit claims, manage patients' },
];

const RoleSelectScreen = ({ navigation, route }) => {
  const onSelect = route?.params?.onSelect;

  const handleSelect = (roleId) => {
    if (onSelect) {
      onSelect(roleId);
    }
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Select Account Type</Text>
      <Text style={styles.subtitle}>Choose how you'll use Clear Care Dental.</Text>
      {ROLES.map((role) => (
        <TouchableOpacity
          key={role.id}
          style={styles.card}
          onPress={() => handleSelect(role.id)}
          activeOpacity={0.8}
        >
          <Text style={styles.icon}>{role.icon}</Text>
          <View>
            <Text style={styles.cardTitle}>{role.title}</Text>
            <Text style={styles.cardDesc}>{role.desc}</Text>
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 24,
    paddingTop: 60,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 28,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  icon: {
    fontSize: 32,
    marginRight: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 3,
  },
  cardDesc: {
    fontSize: 13,
    color: colors.textSecondary,
  },
});

export default RoleSelectScreen;
