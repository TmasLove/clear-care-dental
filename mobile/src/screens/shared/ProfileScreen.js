import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../hooks/useAuth';
import { colors } from '../../utils/colors';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';

const MenuItem = ({ icon, label, value, onPress, destructive = false, isSwitch = false, switchValue, onSwitchChange }) => (
  <TouchableOpacity
    style={styles.menuItem}
    onPress={onPress}
    disabled={isSwitch}
    activeOpacity={isSwitch ? 1 : 0.7}
  >
    <Text style={styles.menuIcon}>{icon}</Text>
    <Text style={[styles.menuLabel, destructive && styles.destructiveText]}>{label}</Text>
    {isSwitch ? (
      <Switch
        value={switchValue}
        onValueChange={onSwitchChange}
        trackColor={{ false: colors.border, true: colors.primaryLight }}
        thumbColor={colors.white}
      />
    ) : (
      <>
        {value && <Text style={styles.menuValue}>{value}</Text>}
        <Text style={[styles.menuChevron, destructive && styles.destructiveText]}>›</Text>
      </>
    )}
  </TouchableOpacity>
);

const ProfileScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { user, logout, role } = useAuth();
  const [notifications, setNotifications] = useState(true);
  const [biometrics, setBiometrics] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const firstName = user?.firstName || user?.first_name || 'User';
  const lastName = user?.lastName || user?.last_name || '';
  const email = user?.email || '';
  const roleLabel = { employer: 'Employer Admin', member: 'Member', dentist: 'Dentist' }[role] || 'User';

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Sign Out Confirmation Modal */}
      <Modal visible={showLogoutModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Sign Out</Text>
            <Text style={styles.modalMessage}>Are you sure you want to sign out?</Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setShowLogoutModal(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirm} onPress={() => { setShowLogoutModal(false); logout(); }}>
                <Text style={styles.modalConfirmText}>Sign Out</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile Card */}
        <View style={styles.profileHero}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{firstName.charAt(0)}{lastName.charAt(0)}</Text>
          </View>
          <Text style={styles.profileName}>{firstName} {lastName}</Text>
          <Text style={styles.profileEmail}>{email}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>{roleLabel}</Text>
          </View>
        </View>

        {/* Account Settings */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <MenuItem icon="👤" label="Edit Profile" onPress={() => {}} />
          <MenuItem icon="🔒" label="Change Password" onPress={() => {}} />
          <MenuItem icon="✉️" label="Email" value={email} onPress={() => {}} />
        </Card>

        {/* Preferences */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Preferences</Text>
          <MenuItem
            icon="🔔"
            label="Push Notifications"
            isSwitch
            switchValue={notifications}
            onSwitchChange={setNotifications}
          />
          <MenuItem
            icon="🔐"
            label="Biometric Login"
            isSwitch
            switchValue={biometrics}
            onSwitchChange={setBiometrics}
          />
        </Card>

        {/* Support & Legal */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Support</Text>
          <MenuItem icon="🎧" label="Contact Support" onPress={() => {}} />
          <MenuItem icon="📖" label="Terms of Service" onPress={() => {}} />
          <MenuItem icon="🔏" label="Privacy Policy" onPress={() => {}} />
          <MenuItem icon="ℹ️" label="App Version" value="1.0.0" onPress={() => {}} />
        </Card>

        {/* Sign Out */}
        <Card style={styles.section}>
          <MenuItem
            icon="🚪"
            label="Sign Out"
            onPress={() => setShowLogoutModal(true)}
            destructive
          />
        </Card>

        <Text style={styles.versionText}>Clear Care Dental v1.0.0</Text>
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
    backgroundColor: colors.white,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
  },
  content: {
    paddingBottom: 100,
  },
  profileHero: {
    backgroundColor: colors.primary,
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  avatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  avatarText: {
    fontSize: 30,
    fontWeight: '700',
    color: colors.white,
  },
  profileName: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.white,
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.75)',
    marginBottom: 12,
  },
  roleBadge: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.white,
    letterSpacing: 0.5,
  },
  section: {
    marginHorizontal: 20,
    marginBottom: 16,
    paddingTop: 4,
    paddingBottom: 4,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    letterSpacing: 0.5,
    paddingHorizontal: 4,
    paddingTop: 8,
    paddingBottom: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 4,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  menuIcon: {
    fontSize: 18,
    marginRight: 12,
    width: 24,
    textAlign: 'center',
  },
  menuLabel: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
    fontWeight: '500',
  },
  menuValue: {
    fontSize: 14,
    color: colors.textSecondary,
    marginRight: 6,
    maxWidth: 140,
  },
  menuChevron: {
    fontSize: 20,
    color: colors.border,
    fontWeight: '300',
  },
  destructiveText: {
    color: colors.error,
  },
  versionText: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  modalBox: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 320,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancel: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  modalConfirm: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: colors.error,
    alignItems: 'center',
  },
  modalConfirmText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.white,
  },
});

export default ProfileScreen;
