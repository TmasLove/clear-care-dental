import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '../../hooks/useAuth';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import { colors } from '../../utils/colors';

const LoginScreen = ({ navigation }) => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [loginError, setLoginError] = useState('');

  const validate = () => {
    const newErrors = {};
    if (!email.trim()) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) newErrors.email = 'Enter a valid email address';
    if (!password) newErrors.password = 'Password is required';
    else if (password.length < 6) newErrors.password = 'Password must be at least 6 characters';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;
    setLoginError('');
    setLoading(true);
    try {
      await login(email.trim().toLowerCase(), password);
    } catch (error) {
      setLoginError(error.userMessage || error.message || 'Invalid email or password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleMagicLink = () => {
    navigation.navigate('MagicLink');
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar style="light" />
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoMark}>
            <Text style={styles.logoMarkText}>🦷</Text>
          </View>
          <Text style={styles.brandName}>Clear Care Dental</Text>
          <Text style={styles.tagline}>Transparent Dental Benefits</Text>
        </View>

        {/* Form */}
        <View style={styles.formContainer}>
          <Text style={styles.formTitle}>Welcome back</Text>
          <Text style={styles.formSubtitle}>Sign in to your account</Text>

          <Input
            label="Email Address"
            value={email}
            onChangeText={(t) => { setEmail(t); setErrors((e) => ({ ...e, email: null })); }}
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            error={errors.email}
            returnKeyType="next"
          />

          <Input
            label="Password"
            value={password}
            onChangeText={(t) => { setPassword(t); setErrors((e) => ({ ...e, password: null })); }}
            placeholder="Enter your password"
            secureTextEntry
            error={errors.password}
            returnKeyType="done"
            onSubmitEditing={handleLogin}
          />

          <TouchableOpacity style={styles.forgotPassword}>
            <Text style={styles.forgotPasswordText}>Forgot password?</Text>
          </TouchableOpacity>

          {loginError ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>⚠️ {loginError}</Text>
            </View>
          ) : null}

          <Button
            title="Sign In"
            onPress={handleLogin}
            loading={loading}
            disabled={loading}
            style={styles.loginButton}
            size="large"
          />

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          <Button
            title="Sign in with Magic Link"
            onPress={handleMagicLink}
            variant="outline"
            size="large"
          />
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Don't have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Register')}>
            <Text style={styles.footerLink}>Create Account</Text>
          </TouchableOpacity>
        </View>

        {/* Demo Credentials */}
        <View style={styles.demoBox}>
          <Text style={styles.demoTitle}>🧪 Demo Credentials</Text>
          {[
            { role: 'Member', email: 'alice.johnson@email.com', pw: 'Member123!' },
            { role: 'Dentist', email: 'dr.patel@smileplus.com', pw: 'Dentist123!' },
            { role: 'Employer', email: 'hr@techcorp.com', pw: 'Employer123!' },
            { role: 'Admin', email: 'admin@clearcaredental.com', pw: 'Admin123!' },
          ].map((d) => (
            <TouchableOpacity
              key={d.role}
              style={styles.demoRow}
              onPress={() => { setEmail(d.email); setPassword(d.pw); setLoginError(''); setErrors({}); }}
            >
              <Text style={styles.demoRole}>{d.role}</Text>
              <Text style={styles.demoEmail}>{d.email}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  header: {
    backgroundColor: colors.primary,
    paddingTop: 70,
    paddingBottom: 40,
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  logoMark: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  logoMarkText: {
    fontSize: 28,
    color: colors.white,
    lineHeight: 34,
  },
  brandName: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.white,
    letterSpacing: 0.5,
  },
  tagline: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 6,
    letterSpacing: 0.8,
  },
  formContainer: {
    backgroundColor: colors.white,
    margin: 20,
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  formTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 4,
  },
  formSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 24,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginTop: -8,
    marginBottom: 20,
  },
  forgotPasswordText: {
    fontSize: 13,
    color: colors.primaryLight,
    fontWeight: '600',
  },
  loginButton: {
    marginBottom: 20,
  },
  errorBanner: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
  },
  errorBannerText: {
    fontSize: 13,
    color: colors.error,
    fontWeight: '500',
    textAlign: 'center',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    marginHorizontal: 14,
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    paddingHorizontal: 20,
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
  demoBox: {
    marginHorizontal: 20,
    marginTop: 8,
    marginBottom: 40,
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  demoTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 10,
    letterSpacing: 0.3,
  },
  demoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  demoRole: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
    width: 60,
  },
  demoEmail: {
    fontSize: 12,
    color: colors.textSecondary,
    flex: 1,
  },
});

export default LoginScreen;
