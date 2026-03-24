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
import { authAPI } from '../../api/auth';
import { useAuth } from '../../hooks/useAuth';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import { colors } from '../../utils/colors';

const MagicLinkScreen = ({ navigation }) => {
  const { loginWithMagicLink } = useAuth();
  const [email, setEmail] = useState('');
  const [magicToken, setMagicToken] = useState('');
  const [step, setStep] = useState('email'); // 'email' | 'token'
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [tokenError, setTokenError] = useState('');

  const handleSendLink = async () => {
    if (!email.trim()) {
      setEmailError('Email is required');
      return;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setEmailError('Enter a valid email address');
      return;
    }

    setLoading(true);
    try {
      await authAPI.requestMagicLink(email.trim().toLowerCase());
      setStep('token');
    } catch (error) {
      Alert.alert(
        'Error',
        error.userMessage || 'Failed to send magic link. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyToken = async () => {
    if (!magicToken.trim()) {
      setTokenError('Please enter the code from your email');
      return;
    }

    setLoading(true);
    try {
      await loginWithMagicLink(magicToken.trim());
      // AppNavigator will handle redirect
    } catch (error) {
      Alert.alert(
        'Verification Failed',
        error.message || 'Invalid or expired code. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResend = () => {
    setStep('email');
    setMagicToken('');
    setTokenError('');
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar style="dark" />
      <View style={styles.navHeader}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>‹ Back</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>✉️</Text>
        </View>

        {step === 'email' ? (
          <>
            <Text style={styles.title}>Sign in with Magic Link</Text>
            <Text style={styles.subtitle}>
              Enter your email address and we'll send you a secure sign-in link.
              No password needed.
            </Text>

            <Input
              label="Email Address"
              value={email}
              onChangeText={(t) => { setEmail(t); setEmailError(''); }}
              placeholder="you@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              error={emailError}
              returnKeyType="done"
              onSubmitEditing={handleSendLink}
            />

            <Button
              title="Send Magic Link"
              onPress={handleSendLink}
              loading={loading}
              disabled={loading}
              size="large"
              style={styles.actionButton}
            />
          </>
        ) : (
          <>
            <Text style={styles.title}>Check your inbox</Text>
            <Text style={styles.subtitle}>
              We sent a verification code to{'\n'}
              <Text style={styles.emailHighlight}>{email}</Text>
              {'\n\n'}Enter the code below to sign in.
            </Text>

            <Input
              label="Verification Code"
              value={magicToken}
              onChangeText={(t) => { setMagicToken(t); setTokenError(''); }}
              placeholder="Paste your code here"
              autoCapitalize="none"
              autoCorrect={false}
              error={tokenError}
              returnKeyType="done"
              onSubmitEditing={handleVerifyToken}
            />

            <Button
              title="Verify & Sign In"
              onPress={handleVerifyToken}
              loading={loading}
              disabled={loading}
              size="large"
              style={styles.actionButton}
            />

            <TouchableOpacity style={styles.resendContainer} onPress={handleResend}>
              <Text style={styles.resendText}>
                Didn't receive an email?{' '}
                <Text style={styles.resendLink}>Try again</Text>
              </Text>
            </TouchableOpacity>
          </>
        )}

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        <Button
          title="Sign in with Password"
          onPress={() => navigation.navigate('Login')}
          variant="outline"
          size="large"
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.background,
  },
  navHeader: {
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
  content: {
    flexGrow: 1,
    padding: 24,
    paddingTop: 40,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  icon: {
    fontSize: 56,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  emailHighlight: {
    fontWeight: '700',
    color: colors.primary,
  },
  actionButton: {
    marginTop: 8,
    marginBottom: 20,
  },
  resendContainer: {
    alignItems: 'center',
    marginBottom: 12,
  },
  resendText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  resendLink: {
    color: colors.primary,
    fontWeight: '700',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
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
  },
});

export default MagicLinkScreen;
