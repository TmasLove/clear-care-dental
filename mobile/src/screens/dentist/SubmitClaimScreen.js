import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { claimsAPI } from '../../api/claims';
import { formatCurrency } from '../../utils/formatters';
import { dentistColors as colors } from '../../utils/dentistColors';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';

const PROCEDURE_CODES = [
  { code: 'D0120', name: 'Periodic Oral Evaluation', typical: 89 },
  { code: 'D0150', name: 'Comprehensive Oral Evaluation', typical: 125 },
  { code: 'D0210', name: 'Full Mouth X-Rays', typical: 220 },
  { code: 'D0220', name: 'Periapical X-Ray', typical: 45 },
  { code: 'D0274', name: 'Bitewing X-Rays (4)', typical: 98 },
  { code: 'D1110', name: 'Adult Prophylaxis', typical: 145 },
  { code: 'D1120', name: 'Child Prophylaxis', typical: 110 },
  { code: 'D2140', name: 'Amalgam, 1 surface', typical: 195 },
  { code: 'D2150', name: 'Amalgam, 2 surfaces', typical: 265 },
  { code: 'D2160', name: 'Amalgam, 3 surfaces', typical: 320 },
  { code: 'D2330', name: 'Resin, 1 surface anterior', typical: 175 },
  { code: 'D2390', name: 'Resin, 3 surfaces posterior', typical: 295 },
  { code: 'D2740', name: 'Crown - Porcelain/Ceramic', typical: 1200 },
  { code: 'D2750', name: 'Crown - Porcelain fused to metal', typical: 1100 },
  { code: 'D3310', name: 'Root Canal - Anterior', typical: 950 },
  { code: 'D3330', name: 'Root Canal - Molar', typical: 1350 },
  { code: 'D4341', name: 'Periodontal Scaling', typical: 450 },
  { code: 'D5110', name: 'Complete Upper Denture', typical: 1800 },
  { code: 'D6010', name: 'Implant Fixture', typical: 2500 },
  { code: 'D7140', name: 'Extraction, erupted tooth', typical: 189 },
  { code: 'D7210', name: 'Surgical Extraction', typical: 380 },
  { code: 'D8080', name: 'Comprehensive Orthodontic Treatment', typical: 5500 },
];

const ProcedurePicker = ({ visible, onSelect, onClose }) => (
  <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
    <View style={pickerStyles.container}>
      <View style={pickerStyles.header}>
        <Text style={pickerStyles.title}>Select Procedure Code</Text>
        <TouchableOpacity onPress={onClose}>
          <Text style={pickerStyles.close}>Done</Text>
        </TouchableOpacity>
      </View>
      <ScrollView>
        {PROCEDURE_CODES.map((p) => (
          <TouchableOpacity
            key={p.code}
            style={pickerStyles.item}
            onPress={() => { onSelect(p); onClose(); }}
          >
            <View style={pickerStyles.itemLeft}>
              <Text style={pickerStyles.code}>{p.code}</Text>
              <Text style={pickerStyles.name}>{p.name}</Text>
            </View>
            <Text style={pickerStyles.typical}>{formatCurrency(p.typical)}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  </Modal>
);

const pickerStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: { fontSize: 17, fontWeight: '700', color: colors.text },
  close: { fontSize: 16, color: colors.primary, fontWeight: '700' },
  item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.white,
  },
  itemLeft: { flex: 1 },
  code: { fontSize: 14, fontWeight: '700', color: colors.primary, marginBottom: 3 },
  name: { fontSize: 13, color: colors.text },
  typical: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
});

const SubmitClaimScreen = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const { memberId: prefillMemberId, patientName: prefillPatient } = route?.params || {};

  const [form, setForm] = useState({
    memberId: prefillMemberId || '',
    patientName: prefillPatient || '',
    serviceDate: new Date().toISOString().split('T')[0],
    selectedProcedure: null,
    amountBilled: '',
    notes: '',
  });
  const [showPicker, setShowPicker] = useState(false);
  const [estimate, setEstimate] = useState(null);
  const [estimateLoading, setEstimateLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [success, setSuccess] = useState(null);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');

  const update = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: null }));
    setEstimate(null);
  };

  const selectProcedure = (procedure) => {
    setForm((prev) => ({
      ...prev,
      selectedProcedure: procedure,
      amountBilled: procedure.typical.toString(),
    }));
    setEstimate(null);
  };

  const validate = () => {
    const newErrors = {};
    if (!form.memberId.trim()) newErrors.memberId = 'Member ID is required';
    if (!form.serviceDate) newErrors.serviceDate = 'Service date is required';
    if (!form.selectedProcedure) newErrors.procedure = 'Select a procedure code';
    if (!form.amountBilled || isNaN(form.amountBilled) || Number(form.amountBilled) <= 0)
      newErrors.amountBilled = 'Enter a valid billed amount';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleGetEstimate = async () => {
    if (!validate()) return;
    setEstimateLoading(true);
    try {
      const data = await claimsAPI.getClaimEstimate({
        memberId: form.memberId.trim(),
        procedureCode: form.selectedProcedure.code,
        amountBilled: Number(form.amountBilled),
        serviceDate: form.serviceDate,
      });
      setEstimate(data?.estimate || data || MOCK_ESTIMATE);
    } catch {
      setEstimate(MOCK_ESTIMATE);
    } finally {
      setEstimateLoading(false);
    }
  };

  const MOCK_ESTIMATE = {
    amountBilled: Number(form.amountBilled) || 145,
    amountApproved: Math.round((Number(form.amountBilled) || 145) * 0.8),
    insurancePays: Math.round((Number(form.amountBilled) || 145) * 0.64),
    patientOwes: Math.round((Number(form.amountBilled) || 145) * 0.16),
    deductibleApplied: 0,
    coveragePercent: 80,
  };

  const handleSubmitClaim = async () => {
    if (!validate()) return;
    setSubmitLoading(true);
    try {
      const data = await claimsAPI.submitClaim({
        memberId: form.memberId.trim(),
        procedureCode: form.selectedProcedure.code,
        procedureName: form.selectedProcedure.name,
        amountBilled: Number(form.amountBilled),
        serviceDate: form.serviceDate,
        notes: form.notes,
      });
      setSuccess(data?.claim || { ...MOCK_ESTIMATE, claimId: 'CLM-' + Date.now().toString().slice(-6), status: 'approved' });
    } catch {
      setSubmitError('Failed to submit claim. Please try again.');
    } finally {
      setSubmitLoading(false);
    }
  };

  if (success) {
    return (
      <View style={[styles.successContainer, { paddingTop: insets.top }]}>
        <View style={styles.successNavHeader}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.successClose}>Done</Text>
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={styles.successContent}>
          <Text style={styles.successIcon}>🎉</Text>
          <Text style={styles.successTitle}>Claim Submitted!</Text>
          <Text style={styles.successClaimId}>Claim #{success.claimId || 'CLM-' + Date.now().toString().slice(-6)}</Text>

          <Card style={styles.successCard}>
            <Text style={styles.successCardTitle}>Adjudication Result</Text>
            <View style={styles.successRow}>
              <Text style={styles.successLabel}>Amount Billed</Text>
              <Text style={styles.successValue}>{formatCurrency(success.amountBilled || form.amountBilled)}</Text>
            </View>
            <View style={styles.successRow}>
              <Text style={styles.successLabel}>Amount Approved</Text>
              <Text style={[styles.successValue, { color: colors.success }]}>
                {formatCurrency(success.amountApproved || MOCK_ESTIMATE.amountApproved)}
              </Text>
            </View>
            <View style={styles.successRow}>
              <Text style={styles.successLabel}>Insurance Pays</Text>
              <Text style={[styles.successValue, { color: colors.primary }]}>
                {formatCurrency(success.insurancePays || MOCK_ESTIMATE.insurancePays)}
              </Text>
            </View>
            <View style={[styles.successRow, { borderBottomWidth: 0 }]}>
              <Text style={styles.successLabel}>Patient Owes</Text>
              <Text style={styles.successValue}>
                {formatCurrency(success.patientOwes || MOCK_ESTIMATE.patientOwes)}
              </Text>
            </View>
          </Card>

          <Text style={styles.successNote}>
            Payment will be processed within 3-5 business days.
          </Text>

          <Button
            title="Submit Another Claim"
            onPress={() => { setSuccess(null); setEstimate(null); setForm({ memberId: '', patientName: '', serviceDate: new Date().toISOString().split('T')[0], selectedProcedure: null, amountBilled: '', notes: '' }); }}
            variant="outline"
            size="large"
            style={styles.successActionBtn}
          />
          <Button
            title="Go to Payments"
            onPress={() => navigation.navigate('Payments')}
            size="large"
          />
        </ScrollView>
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
        <Text style={styles.headerTitle}>Submit Claim</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Patient Information</Text>

          <Input
            label="Member ID"
            value={form.memberId}
            onChangeText={(v) => update('memberId', v)}
            placeholder="e.g. CC-1001"
            autoCapitalize="characters"
            autoCorrect={false}
            error={errors.memberId}
          />

          <Input
            label="Patient Name (optional)"
            value={form.patientName}
            onChangeText={(v) => update('patientName', v)}
            placeholder="Jane Smith"
            autoCapitalize="words"
          />
        </Card>

        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Service Details</Text>

          <Input
            label="Service Date"
            value={form.serviceDate}
            onChangeText={(v) => update('serviceDate', v)}
            placeholder="YYYY-MM-DD"
            keyboardType="numeric"
            error={errors.serviceDate}
          />

          <Text style={styles.fieldLabel}>Procedure Code</Text>
          <TouchableOpacity
            style={[styles.procedurePicker, errors.procedure && styles.procedurePickerError]}
            onPress={() => setShowPicker(true)}
          >
            {form.selectedProcedure ? (
              <View>
                <Text style={styles.procedureCode}>{form.selectedProcedure.code}</Text>
                <Text style={styles.procedureName}>{form.selectedProcedure.name}</Text>
              </View>
            ) : (
              <Text style={styles.procedurePlaceholder}>Select a procedure code...</Text>
            )}
            <Text style={styles.pickerArrow}>›</Text>
          </TouchableOpacity>
          {errors.procedure && <Text style={styles.fieldError}>{errors.procedure}</Text>}

          <Input
            label="Amount Billed ($)"
            value={form.amountBilled}
            onChangeText={(v) => update('amountBilled', v)}
            placeholder="0.00"
            keyboardType="decimal-pad"
            error={errors.amountBilled}
            style={styles.amountInput}
          />

          <Input
            label="Notes (optional)"
            value={form.notes}
            onChangeText={(v) => update('notes', v)}
            placeholder="Any additional notes..."
            multiline
            numberOfLines={3}
          />
        </Card>

        {/* Estimate */}
        {estimate && (
          <Card style={[styles.section, styles.estimateCard]}>
            <Text style={styles.sectionTitle}>Estimate Preview</Text>
            <View style={styles.estimateRow}>
              <Text style={styles.estimateLabel}>Amount Billed</Text>
              <Text style={styles.estimateValue}>{formatCurrency(estimate.amountBilled)}</Text>
            </View>
            <View style={styles.estimateRow}>
              <Text style={styles.estimateLabel}>Amount Approved</Text>
              <Text style={[styles.estimateValue, { color: colors.success }]}>
                {formatCurrency(estimate.amountApproved)}
              </Text>
            </View>
            <View style={styles.estimateRow}>
              <Text style={styles.estimateLabel}>Insurance Pays</Text>
              <Text style={[styles.estimateValue, { color: colors.primary }]}>
                {formatCurrency(estimate.insurancePays)}
              </Text>
            </View>
            <View style={[styles.estimateRow, { borderBottomWidth: 0 }]}>
              <Text style={styles.estimateLabel}>Patient Owes</Text>
              <Text style={styles.estimateValue}>{formatCurrency(estimate.patientOwes)}</Text>
            </View>
          </Card>
        )}

        {submitError ? (
          <View style={styles.submitErrorBanner}>
            <Text style={styles.submitErrorText}>⚠️ {submitError}</Text>
          </View>
        ) : null}

        <Button
          title="Get Estimate"
          onPress={handleGetEstimate}
          loading={estimateLoading}
          disabled={estimateLoading || submitLoading}
          variant="outline"
          size="large"
          style={styles.estimateButton}
        />

        <Button
          title="Submit Claim"
          onPress={handleSubmitClaim}
          loading={submitLoading}
          disabled={submitLoading || estimateLoading}
          size="large"
          style={styles.submitButton}
        />
      </ScrollView>

      <ProcedurePicker
        visible={showPicker}
        onSelect={selectProcedure}
        onClose={() => setShowPicker(false)}
      />
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
    marginBottom: 6,
  },
  fieldError: {
    fontSize: 12,
    color: colors.error,
    marginTop: 4,
    marginLeft: 2,
    marginBottom: 8,
  },
  procedurePicker: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
    backgroundColor: colors.white,
    marginBottom: 16,
  },
  procedurePickerError: {
    borderColor: colors.error,
  },
  procedureCode: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 2,
  },
  procedureName: {
    fontSize: 13,
    color: colors.text,
  },
  procedurePlaceholder: {
    fontSize: 15,
    color: colors.textSecondary,
  },
  pickerArrow: {
    fontSize: 22,
    color: colors.textSecondary,
  },
  amountInput: {
    marginBottom: 12,
  },
  estimateCard: {
    backgroundColor: '#F0F4F8',
    borderColor: colors.primaryLight,
  },
  estimateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  estimateLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  estimateValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  submitErrorBanner: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  submitErrorText: {
    fontSize: 13,
    color: '#E74C3C',
    fontWeight: '500',
    textAlign: 'center',
  },
  estimateButton: {
    marginBottom: 12,
  },
  submitButton: {
    marginBottom: 8,
  },
  successContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  successNavHeader: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    alignItems: 'flex-end',
  },
  successClose: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: '700',
  },
  successContent: {
    padding: 24,
    alignItems: 'center',
    paddingBottom: 60,
  },
  successIcon: {
    fontSize: 64,
    marginBottom: 16,
    marginTop: 16,
  },
  successTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 6,
  },
  successClaimId: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 24,
    fontWeight: '500',
  },
  successCard: {
    width: '100%',
    marginBottom: 16,
  },
  successCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  successRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  successLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  successValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  successNote: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 18,
  },
  successActionBtn: {
    width: '100%',
    marginBottom: 12,
  },
});

export default SubmitClaimScreen;
