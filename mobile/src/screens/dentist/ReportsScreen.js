import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { dentistColors as colors } from '../../utils/dentistColors';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';

const MOCK_PAYMENT_REPORT = [
  { claimRef: 'CLM-20260318-00001', patient: 'Sarah Johnson', serviceDate: '2026-03-18', paidDate: '2026-03-22', procedure: 'Adult Prophylaxis (D1110)', amount: 116 },
  { claimRef: 'CLM-20260315-00002', patient: 'Michael Chen', serviceDate: '2026-03-15', paidDate: '2026-03-20', procedure: 'Crown - PFM (D2750)', amount: 880 },
  { claimRef: 'CLM-20260310-00003', patient: 'Emily Rodriguez', serviceDate: '2026-03-10', paidDate: '2026-03-16', procedure: 'Periodontal Scaling (D4341)', amount: 360 },
  { claimRef: 'CLM-20260305-00004', patient: 'Amanda Davis', serviceDate: '2026-03-05', paidDate: '2026-03-11', procedure: 'Full Mouth X-Rays (D0210)', amount: 176 },
  { claimRef: 'CLM-20260301-00005', patient: 'James Wilson', serviceDate: '2026-03-01', paidDate: '2026-03-07', procedure: 'Amalgam, 2 surfaces (D2150)', amount: 212 },
];

const SuccessModal = ({ visible, onClose, reportType }) => (
  <Modal visible={visible} transparent animationType="fade">
    <View style={modalStyles.overlay}>
      <View style={modalStyles.box}>
        <Text style={modalStyles.icon}>✅</Text>
        <Text style={modalStyles.title}>Report Ready</Text>
        <Text style={modalStyles.message}>
          Your {reportType} report has been generated. In a production environment, this would download as a CSV/PDF file.
        </Text>
        <TouchableOpacity style={modalStyles.btn} onPress={onClose}>
          <Text style={modalStyles.btnText}>Done</Text>
        </TouchableOpacity>
      </View>
    </View>
  </Modal>
);

const modalStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 32 },
  box: { backgroundColor: colors.white, borderRadius: 16, padding: 24, width: '100%', maxWidth: 320, alignItems: 'center' },
  icon: { fontSize: 48, marginBottom: 12 },
  title: { fontSize: 18, fontWeight: '800', color: colors.text, marginBottom: 8, textAlign: 'center' },
  message: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  btn: { backgroundColor: colors.primary, paddingVertical: 12, paddingHorizontal: 32, borderRadius: 10 },
  btnText: { fontSize: 15, fontWeight: '700', color: colors.white },
});

const ReportsScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [startDate, setStartDate] = useState('2026-03-01');
  const [endDate, setEndDate] = useState('2026-03-31');
  const [reportType, setReportType] = useState('payment');
  const [showReport, setShowReport] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successType, setSuccessType] = useState('');

  const totalAmount = MOCK_PAYMENT_REPORT.reduce((s, p) => s + p.amount, 0);

  const handleGenerate = () => {
    setShowReport(true);
  };

  const handleDownload = (type) => {
    setSuccessType(type);
    setShowSuccess(true);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Reports</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Payments from Bento */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Payments From Bento</Text>
          <Text style={styles.sectionSubtitle}>Download a report of all payments received from Bento.</Text>

          <View style={styles.dateRow}>
            <View style={styles.dateField}>
              <Text style={styles.fieldLabel}>Start Date</Text>
              <TextInput
                style={styles.dateInput}
                value={startDate}
                onChangeText={setStartDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
            <View style={styles.dateSep} />
            <View style={styles.dateField}>
              <Text style={styles.fieldLabel}>End Date</Text>
              <TextInput
                style={styles.dateInput}
                value={endDate}
                onChangeText={setEndDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
          </View>

          <View style={styles.reportTypeRow}>
            <Text style={styles.fieldLabel}>Report Type</Text>
            <View style={styles.reportTypeOptions}>
              {[
                { key: 'payment', label: 'By Payment Date' },
                { key: 'service', label: 'By Service Date' },
              ].map((opt) => (
                <TouchableOpacity
                  key={opt.key}
                  style={styles.radioRow}
                  onPress={() => setReportType(opt.key)}
                >
                  <View style={[styles.radio, reportType === opt.key && styles.radioActive]}>
                    {reportType === opt.key && <View style={styles.radioDot} />}
                  </View>
                  <Text style={styles.radioLabel}>{opt.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.btnRow}>
            <Button
              title="Preview Report"
              onPress={handleGenerate}
              variant="outline"
              style={styles.previewBtn}
            />
            <Button
              title="Download CSV"
              onPress={() => handleDownload('Payments From Bento')}
              style={styles.downloadBtn}
            />
          </View>
        </Card>

        {/* Inline report preview */}
        {showReport && (
          <Card style={styles.section}>
            <View style={styles.reportHeader}>
              <Text style={styles.sectionTitle}>Payments Report</Text>
              <Text style={styles.reportPeriod}>{startDate} — {endDate}</Text>
            </View>
            <View style={styles.reportSummary}>
              <Text style={styles.reportTotal}>Total Received: <Text style={{ color: colors.success }}>{formatCurrency(totalAmount)}</Text></Text>
              <Text style={styles.reportCount}>{MOCK_PAYMENT_REPORT.length} payments</Text>
            </View>
            {MOCK_PAYMENT_REPORT.map((p, i) => (
              <View key={i} style={[styles.reportRow, i === MOCK_PAYMENT_REPORT.length - 1 && { borderBottomWidth: 0 }]}>
                <View style={styles.reportRowLeft}>
                  <Text style={styles.reportPatient}>{p.patient}</Text>
                  <Text style={styles.reportProc}>{p.procedure}</Text>
                  <Text style={styles.reportRef}>{p.claimRef} · Paid {formatDate(p.paidDate)}</Text>
                </View>
                <Text style={styles.reportAmount}>{formatCurrency(p.amount)}</Text>
              </View>
            ))}
          </Card>
        )}

        {/* Membership Report */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>In-Office Plan Membership Report</Text>
          <Text style={styles.sectionSubtitle}>Download a list of active membership plan patients.</Text>
          <View style={styles.dateRow}>
            <View style={styles.dateField}>
              <Text style={styles.fieldLabel}>Start Date</Text>
              <TextInput
                style={styles.dateInput}
                value={startDate}
                onChangeText={setStartDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
          </View>
          <Button
            title="Download Report"
            onPress={() => handleDownload('Membership Plan')}
            style={styles.downloadBtnFull}
          />
        </Card>

        {/* Ortho Payments Report */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Ortho Payments Report</Text>
          <Text style={styles.sectionSubtitle}>Download orthodontic payment plan activity.</Text>
          <View style={styles.dateRow}>
            <View style={styles.dateField}>
              <Text style={styles.fieldLabel}>Start Date</Text>
              <TextInput
                style={styles.dateInput}
                value={startDate}
                onChangeText={setStartDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
            <View style={styles.dateSep} />
            <View style={styles.dateField}>
              <Text style={styles.fieldLabel}>End Date</Text>
              <TextInput
                style={styles.dateInput}
                value={endDate}
                onChangeText={setEndDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
          </View>
          <Button
            title="Download Report"
            onPress={() => handleDownload('Ortho Payments')}
            style={styles.downloadBtnFull}
          />
        </Card>
      </ScrollView>

      <SuccessModal
        visible={showSuccess}
        reportType={successType}
        onClose={() => setShowSuccess(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    backgroundColor: colors.white,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: colors.text },
  content: { padding: 20, paddingBottom: 100 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 4 },
  sectionSubtitle: { fontSize: 13, color: colors.textSecondary, marginBottom: 16, lineHeight: 18 },
  dateRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 14, gap: 10 },
  dateField: { flex: 1 },
  dateSep: { width: 1, height: 36, backgroundColor: colors.border, marginBottom: 1 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: colors.textSecondary, marginBottom: 6 },
  dateInput: {
    borderWidth: 1.5, borderColor: colors.border, borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 8, fontSize: 13, color: colors.text,
    backgroundColor: colors.white,
  },
  reportTypeRow: { marginBottom: 16 },
  reportTypeOptions: { marginTop: 8, gap: 8 },
  radioRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: colors.border, justifyContent: 'center', alignItems: 'center' },
  radioActive: { borderColor: colors.primary },
  radioDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
  radioLabel: { fontSize: 13, color: colors.text, fontWeight: '500' },
  btnRow: { flexDirection: 'row', gap: 10 },
  previewBtn: { flex: 1 },
  downloadBtn: { flex: 1 },
  downloadBtnFull: { marginTop: 4 },
  reportHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  reportPeriod: { fontSize: 12, color: colors.textSecondary },
  reportSummary: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#EAFAF1', borderRadius: 8, padding: 10, marginBottom: 12 },
  reportTotal: { fontSize: 14, fontWeight: '700', color: colors.text },
  reportCount: { fontSize: 12, color: colors.textSecondary },
  reportRow: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  reportRowLeft: { flex: 1, marginRight: 8 },
  reportPatient: { fontSize: 13, fontWeight: '700', color: colors.text, marginBottom: 2 },
  reportProc: { fontSize: 12, color: colors.textSecondary, marginBottom: 2 },
  reportRef: { fontSize: 11, color: colors.primaryLight },
  reportAmount: { fontSize: 15, fontWeight: '800', color: colors.success },
});

export default ReportsScreen;
