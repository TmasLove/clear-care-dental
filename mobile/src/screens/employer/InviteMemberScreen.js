import React, { useState, useEffect } from 'react';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { employersAPI } from '../../api/employers';
import { colors } from '../../utils/colors';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';

const MOCK_PLANS = [
  { id: '1', name: 'Standard Dental Plan' },
  { id: '2', name: 'Premium Dental Plan' },
  { id: '3', name: 'Basic Dental Plan' },
];

const InviteMemberScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    planId: '',
  });
  const [plans, setPlans] = useState(MOCK_PLANS);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const loadPlans = async () => {
      try {
        const data = await employersAPI.getPlans();
        const list = data?.plans || data || [];
        if (list.length > 0) setPlans(list);
      } catch {
        // Use mock plans
      }
    };
    loadPlans();
  }, []);

  const update = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: null }));
  };

  const validate = () => {
    const newErrors = {};
    if (!form.firstName.trim()) newErrors.firstName = 'First name is required';
    if (!form.lastName.trim()) newErrors.lastName = 'Last name is required';
    if (!form.email.trim()) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) newErrors.email = 'Enter a valid email';
    if (!form.planId) newErrors.planId = 'Please select a plan';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInvite = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await employersAPI.inviteMember({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim().toLowerCase(),
        planId: form.planId,
      });
      setSuccess(true);
    } catch (error) {
      Alert.alert('Error', error.userMessage || 'Failed to send invitation. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <View style={[styles.successContainer, { paddingTop: insets.top }]}>
        <Text style={styles.successIcon}>🎉</Text>
        <Text style={styles.successTitle}>Invitation Sent!</Text>
        <Text style={styles.successMessage}>
          An invitation has been sent to {form.email}. They'll receive instructions to set up their account and access their dental benefits.
        </Text>
        <Button
          title="Invite Another Member"
          onPress={() => {
            setSuccess(false);
            setForm({ firstName: '', lastName: '', email: '', planId: '' });
          }}
          variant="outline"
          style={styles.successButton}
        />
        <Button
          title="Back to Members"
          onPress={() => navigation.goBack()}
          style={styles.successButton}
        />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={[styles.navHeader, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Invite Member</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.description}>
          Send an email invitation to a new team member. They'll receive a link to create their account and access their dental benefits.
        </Text>

        <Card style={styles.formCard}>
          <Text style={styles.sectionTitle}>Member Details</Text>

          <View style={styles.nameRow}>
            <View style={styles.nameField}>
              <Input
                label="First Name"
                value={form.firstName}
                onChangeText={(v) => update('firstName', v)}
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
                onChangeText={(v) => update('lastName', v)}
                placeholder="Smith"
                autoCapitalize="words"
                error={errors.lastName}
              />
            </View>
          </View>

          <Input
            label="Work Email"
            value={form.email}
            onChangeText={(v) => update('email', v)}
            placeholder="jane.smith@company.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            error={errors.email}
          />
        </Card>

        <Card style={styles.formCard}>
          <Text style={styles.sectionTitle}>Assign Plan</Text>
          {errors.planId && (
            <Text style={styles.planError}>{errors.planId}</Text>
          )}
          {plans.map((plan) => (
            <TouchableOpacity
              key={plan.id}
              style={[styles.planOption, form.planId === plan.id && styles.planOptionSelected]}
              onPress={() => update('planId', plan.id)}
            >
              <View style={[styles.planRadio, form.planId === plan.id && styles.planRadioSelected]}>
                {form.planId === plan.id && <View style={styles.planRadioInner} />}
              </View>
              <Text style={[styles.planName, form.planId === plan.id && styles.planNameSelected]}>
                {plan.name}
              </Text>
            </TouchableOpacity>
          ))}
        </Card>

        <View style={styles.noteBox}>
          <Text style={styles.noteIcon}>ℹ️</Text>
          <Text style={styles.noteText}>
            The member will receive an email with instructions to complete their enrollment. Coverage begins upon successful account activation.
          </Text>
        </View>

        <Button
          title="Send Invitation"
          onPress={handleInvite}
          loading={loading}
          disabled={loading}
          size="large"
          style={styles.submitButton}
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 14,
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
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
  },
  content: {
    padding: 20,
    paddingBottom: 60,
  },
  description: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 20,
  },
  formCard: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
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
  planError: {
    fontSize: 12,
    color: colors.error,
    marginBottom: 8,
  },
  planOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  planOptionSelected: {
    backgroundColor: '#F0F4F8',
    marginHorizontal: -16,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderBottomWidth: 0,
    marginBottom: 4,
  },
  planRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.border,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  planRadioSelected: {
    borderColor: colors.primary,
  },
  planRadioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  planName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  planNameSelected: {
    color: colors.primary,
  },
  noteBox: {
    flexDirection: 'row',
    backgroundColor: '#EBF5FB',
    borderRadius: 10,
    padding: 14,
    marginBottom: 20,
    gap: 10,
  },
  noteIcon: {
    fontSize: 16,
  },
  noteText: {
    flex: 1,
    fontSize: 13,
    color: colors.primary,
    lineHeight: 18,
  },
  submitButton: {
    marginTop: 4,
  },
  successContainer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  successIcon: {
    fontSize: 64,
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 12,
  },
  successMessage: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  successButton: {
    marginBottom: 12,
    width: '100%',
  },
});

export default InviteMemberScreen;
