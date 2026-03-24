import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '../../hooks/useAuth';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import { colors } from '../../utils/colors';

const ROLES = [
  {
    id: 'employer',
    icon: '🏢',
    title: 'Employer / Admin',
    subtitle: 'Manage dental plans for your team',
  },
  {
    id: 'member',
    icon: '👤',
    title: 'Member / Employee',
    subtitle: 'Access your dental benefits',
  },
  {
    id: 'dentist',
    icon: '🦷',
    title: 'Dentist',
    subtitle: 'Submit claims and manage patients',
  },
];

const RoleCard = ({ role, selected, onSelect }) => (
  <TouchableOpacity
    style={[styles.roleCard, selected && styles.roleCardSelected]}
    onPress={() => onSelect(role.id)}
    activeOpacity={0.8}
  >
    <Text style={styles.roleIcon}>{role.icon}</Text>
    <View style={styles.roleInfo}>
      <Text style={[styles.roleTitle, selected && styles.roleTitleSelected]}>
        {role.title}
      </Text>
      <Text style={styles.roleSubtitle}>{role.subtitle}</Text>
    </View>
    <View style={[styles.roleRadio, selected && styles.roleRadioSelected]}>
      {selected && <View style={styles.roleRadioInner} />}
    </View>
  </TouchableOpacity>
);

const RegisterScreen = ({ navigation }) => {
  const { register } = useAuth();
  const [step, setStep] = useState(1);
  const [selectedRole, setSelectedRole] = useState(null);
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const updateForm = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: null }));
  };

  const validateStep1 = () => {
    if (!selectedRole) {
      Alert.alert('Select a Role', 'Please choose your account type to continue.');
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    const newErrors = {};
    if (!form.firstName.trim()) newErrors.firstName = 'First name is required';
    if (!form.lastName.trim()) newErrors.lastName = 'Last name is required';
    if (!form.email.trim()) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) newErrors.email = 'Enter a valid email';
    if (!form.password) newErrors.password = 'Password is required';
    else if (form.password.length < 8) newErrors.password = 'Password must be at least 8 characters';
    if (!form.confirmPassword) newErrors.confirmPassword = 'Please confirm your password';
    else if (form.password !== form.confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (step === 1 && validateStep1()) {
      setStep(2);
    }
  };

  const handleRegister = async () => {
    if (!validateStep2()) return;
    setLoading(true);
    try {
      await register({
        role: selectedRole,
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
      });
      // AuthContext will update and AppNavigator will redirect
    } catch (error) {
      Alert.alert('Registration Failed', error.message || 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar style="dark" />
      <View style={styles.navHeader}>
        <TouchableOpacity
          onPress={() => (step === 2 ? setStep(1) : navigation.goBack())}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.backButton}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.stepIndicator}>Step {step} of 2</Text>
      </View>

      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {step === 1 ? (
          <View style={styles.container}>
            <Text style={styles.title}>Choose your account type</Text>
            <Text style={styles.subtitle}>
              Select the role that best describes how you'll use Clear Care Dental.
            </Text>

            {ROLES.map((role) => (
              <RoleCard
                key={role.id}
                role={role}
                selected={selectedRole === role.id}
                onSelect={setSelectedRole}
              />
            ))}

            <Button
              title="Continue"
              onPress={handleNext}
              disabled={!selectedRole}
              size="large"
              style={styles.continueButton}
            />
          </View>
        ) : (
          <View style={styles.container}>
            <Text style={styles.title}>Create your account</Text>
            <Text style={styles.subtitle}>
              {ROLES.find((r) => r.id === selectedRole)?.title} — enter your details below.
            </Text>

            <View style={styles.nameRow}>
              <View style={styles.nameField}>
                <Input
                  label="First Name"
                  value={form.firstName}
                  onChangeText={(v) => updateForm('firstName', v)}
                  placeholder="Jane"
                  autoCapitalize="words"
                  error={errors.firstName}
                />
              </View>
              <View style={styles.nameSpacer} />
              <View style={styles.nameField}>
                <Input
                  label="Last Name"
                  value={form.lastName}
                  onChangeText={(v) => updateForm('lastName', v)}
                  placeholder="Smith"
                  autoCapitalize="words"
                  error={errors.lastName}
                />
              </View>
            </View>

            <Input
              label="Email Address"
              value={form.email}
              onChangeText={(v) => updateForm('email', v)}
              placeholder="you@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              error={errors.email}
            />

            <Input
              label="Password"
              value={form.password}
              onChangeText={(v) => updateForm('password', v)}
              placeholder="At least 8 characters"
              secureTextEntry
              error={errors.password}
              hint="Use 8+ characters with a mix of letters and numbers"
            />

            <Input
              label="Confirm Password"
              value={form.confirmPassword}
              onChangeText={(v) => updateForm('confirmPassword', v)}
              placeholder="Re-enter your password"
              secureTextEntry
              error={errors.confirmPassword}
              returnKeyType="done"
              onSubmitEditing={handleRegister}
            />

            <Button
              title="Create Account"
              onPress={handleRegister}
              loading={loading}
              disabled={loading}
              size="large"
              style={styles.continueButton}
            />

            <Text style={styles.terms}>
              By creating an account, you agree to our{' '}
              <Text style={styles.termsLink}>Terms of Service</Text>
              {' '}and{' '}
              <Text style={styles.termsLink}>Privacy Policy</Text>.
            </Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Already have an account? </Text>
        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
          <Text style={styles.footerLink}>Sign In</Text>
        </TouchableOpacity>
      </View>
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
    paddingTop: 56,
    paddingBottom: 12,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: '600',
  },
  stepIndicator: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
    paddingBottom: 40,
  },
  container: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 8,
    marginTop: 8,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 28,
  },
  roleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 12,
  },
  roleCardSelected: {
    borderColor: colors.primary,
    backgroundColor: '#F0F4F8',
  },
  roleIcon: {
    fontSize: 30,
    marginRight: 14,
  },
  roleInfo: {
    flex: 1,
  },
  roleTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 3,
  },
  roleTitleSelected: {
    color: colors.primary,
  },
  roleSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  roleRadio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  roleRadioSelected: {
    borderColor: colors.primary,
  },
  roleRadioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  continueButton: {
    marginTop: 16,
  },
  nameRow: {
    flexDirection: 'row',
  },
  nameField: {
    flex: 1,
  },
  nameSpacer: {
    width: 12,
  },
  terms: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 18,
  },
  termsLink: {
    color: colors.primary,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 20,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  footerText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  footerLink: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '700',
  },
});

export default RegisterScreen;
