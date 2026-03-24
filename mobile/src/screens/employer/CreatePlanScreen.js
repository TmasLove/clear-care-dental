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
  Switch,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { employersAPI } from '../../api/employers';
import { colors } from '../../utils/colors';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';

const PLAN_TYPES = ['PPO', 'HMO', 'DHMO', 'Indemnity'];

const CreatePlanScreen = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const existingPlan = route?.params?.plan;
  const isEditing = !!existingPlan;

  const [form, setForm] = useState({
    name: existingPlan?.name || '',
    type: existingPlan?.type || 'PPO',
    annualMax: existingPlan?.annualMax?.toString() || '1500',
    deductible: existingPlan?.deductible?.toString() || '50',
    monthlyPremium: existingPlan?.monthlyPremium?.toString() || '',
    coveragePreventive: existingPlan?.coveragePreventive?.toString() || '100',
    coverageBasic: existingPlan?.coverageBasic?.toString() || '80',
    coverageMajor: existingPlan?.coverageMajor?.toString() || '50',
    coverageOrtho: existingPlan?.coverageOrtho?.toString() || '50',
    includesOrtho: existingPlan?.includesOrtho ?? true,
    orthoLifetimeMax: existingPlan?.orthoLifetimeMax?.toString() || '1500',
    waitingPeriodBasic: existingPlan?.waitingPeriodBasic?.toString() || '6',
    waitingPeriodMajor: existingPlan?.waitingPeriodMajor?.toString() || '12',
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const update = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: null }));
  };

  const validate = () => {
    const newErrors = {};
    if (!form.name.trim()) newErrors.name = 'Plan name is required';
    if (!form.annualMax || isNaN(form.annualMax) || Number(form.annualMax) <= 0)
      newErrors.annualMax = 'Enter a valid annual maximum';
    if (!form.monthlyPremium || isNaN(form.monthlyPremium) || Number(form.monthlyPremium) <= 0)
      newErrors.monthlyPremium = 'Enter a valid monthly premium';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const payload = {
        name: form.name.trim(),
        type: form.type,
        annualMax: Number(form.annualMax),
        deductible: Number(form.deductible) || 0,
        monthlyPremium: Number(form.monthlyPremium),
        coveragePreventive: Number(form.coveragePreventive),
        coverageBasic: Number(form.coverageBasic),
        coverageMajor: Number(form.coverageMajor),
        coverageOrtho: Number(form.coverageOrtho),
        includesOrtho: form.includesOrtho,
        orthoLifetimeMax: Number(form.orthoLifetimeMax),
        waitingPeriodBasic: Number(form.waitingPeriodBasic),
        waitingPeriodMajor: Number(form.waitingPeriodMajor),
      };

      if (isEditing) {
        await employersAPI.updatePlan(existingPlan.id, payload);
      } else {
        await employersAPI.createPlan(payload);
      }

      Alert.alert(
        'Success',
        `Plan ${isEditing ? 'updated' : 'created'} successfully!`,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      Alert.alert('Error', error.userMessage || 'Failed to save plan. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={[styles.navHeader, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isEditing ? 'Edit Plan' : 'New Plan'}</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Plan Details</Text>

          <Input
            label="Plan Name"
            value={form.name}
            onChangeText={(v) => update('name', v)}
            placeholder="e.g. Standard Dental Plan"
            error={errors.name}
          />

          <Text style={styles.fieldLabel}>Plan Type</Text>
          <View style={styles.typeRow}>
            {PLAN_TYPES.map((type) => (
              <TouchableOpacity
                key={type}
                style={[styles.typeChip, form.type === type && styles.typeChipSelected]}
                onPress={() => update('type', type)}
              >
                <Text
                  style={[styles.typeChipText, form.type === type && styles.typeChipTextSelected]}
                >
                  {type}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Input
            label="Monthly Premium ($)"
            value={form.monthlyPremium}
            onChangeText={(v) => update('monthlyPremium', v)}
            placeholder="42.50"
            keyboardType="decimal-pad"
            error={errors.monthlyPremium}
          />
        </Card>

        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Benefits</Text>

          <Input
            label="Annual Maximum ($)"
            value={form.annualMax}
            onChangeText={(v) => update('annualMax', v)}
            placeholder="1500"
            keyboardType="number-pad"
            error={errors.annualMax}
          />

          <Input
            label="Annual Deductible ($)"
            value={form.deductible}
            onChangeText={(v) => update('deductible', v)}
            placeholder="50"
            keyboardType="number-pad"
          />
        </Card>

        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Coverage Percentages</Text>

          <View style={styles.coverageRow}>
            <View style={styles.coverageField}>
              <Input
                label="Preventive (%)"
                value={form.coveragePreventive}
                onChangeText={(v) => update('coveragePreventive', v)}
                placeholder="100"
                keyboardType="number-pad"
              />
            </View>
            <View style={styles.coverageSpacer} />
            <View style={styles.coverageField}>
              <Input
                label="Basic (%)"
                value={form.coverageBasic}
                onChangeText={(v) => update('coverageBasic', v)}
                placeholder="80"
                keyboardType="number-pad"
              />
            </View>
          </View>

          <View style={styles.coverageRow}>
            <View style={styles.coverageField}>
              <Input
                label="Major (%)"
                value={form.coverageMajor}
                onChangeText={(v) => update('coverageMajor', v)}
                placeholder="50"
                keyboardType="number-pad"
              />
            </View>
            <View style={styles.coverageSpacer} />
            <View style={styles.coverageField}>
              <Input
                label="Ortho (%)"
                value={form.coverageOrtho}
                onChangeText={(v) => update('coverageOrtho', v)}
                placeholder="50"
                keyboardType="number-pad"
              />
            </View>
          </View>

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Includes Orthodontia</Text>
            <Switch
              value={form.includesOrtho}
              onValueChange={(v) => update('includesOrtho', v)}
              trackColor={{ false: colors.border, true: colors.primaryLight }}
              thumbColor={colors.white}
            />
          </View>

          {form.includesOrtho && (
            <Input
              label="Ortho Lifetime Maximum ($)"
              value={form.orthoLifetimeMax}
              onChangeText={(v) => update('orthoLifetimeMax', v)}
              placeholder="1500"
              keyboardType="number-pad"
            />
          )}
        </Card>

        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Waiting Periods (months)</Text>

          <View style={styles.coverageRow}>
            <View style={styles.coverageField}>
              <Input
                label="Basic Services"
                value={form.waitingPeriodBasic}
                onChangeText={(v) => update('waitingPeriodBasic', v)}
                placeholder="6"
                keyboardType="number-pad"
              />
            </View>
            <View style={styles.coverageSpacer} />
            <View style={styles.coverageField}>
              <Input
                label="Major Services"
                value={form.waitingPeriodMajor}
                onChangeText={(v) => update('waitingPeriodMajor', v)}
                placeholder="12"
                keyboardType="number-pad"
              />
            </View>
          </View>
        </Card>

        <Button
          title={isEditing ? 'Save Changes' : 'Create Plan'}
          onPress={handleSubmit}
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
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  typeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  typeChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  typeChipSelected: {
    borderColor: colors.primary,
    backgroundColor: '#EBF5FB',
  },
  typeChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  typeChipTextSelected: {
    color: colors.primary,
  },
  coverageRow: {
    flexDirection: 'row',
  },
  coverageField: {
    flex: 1,
  },
  coverageSpacer: {
    width: 12,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  switchLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  submitButton: {
    marginTop: 8,
  },
});

export default CreatePlanScreen;
