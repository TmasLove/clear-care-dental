import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Share,
  Alert,
  Clipboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../hooks/useAuth';
import { colors } from '../../utils/colors';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';

// Conditional QR import
let QRCode = null;
try {
  QRCode = require('react-native-qrcode-svg').default;
} catch {
  QRCode = null;
}

const QRPlaceholder = ({ value, size = 200 }) => (
  <View style={[qrStyles.placeholder, { width: size, height: size }]}>
    <Text style={qrStyles.qrGrid}>
      {Array(8).fill(null).map((_, i) => (
        <Text key={i} style={qrStyles.qrRow}>
          {'█░'.repeat(4).slice(0, 8) + '\n'}
        </Text>
      ))}
    </Text>
    <Text style={qrStyles.qrLabel}>QR Code</Text>
    <Text style={qrStyles.qrValue} numberOfLines={1}>{value?.substring(0, 16)}...</Text>
  </View>
);

const qrStyles = StyleSheet.create({
  placeholder: {
    backgroundColor: colors.white,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.border,
  },
  qrGrid: {
    fontFamily: 'monospace',
    fontSize: 12,
    color: colors.text,
    letterSpacing: 2,
    lineHeight: 16,
    textAlign: 'center',
  },
  qrRow: {
    display: 'flex',
  },
  qrLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
    marginTop: 8,
  },
  qrValue: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 4,
  },
});

const SharePlanScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);

  const memberId = user?.memberId || user?.member_id || 'CC-1001';
  const planName = user?.planName || user?.plan_name || 'Standard Dental Plan';
  const groupNumber = user?.groupNumber || user?.group_number || 'GRP-4892';
  const insurer = 'Clear Care Dental Insurance';

  const qrData = JSON.stringify({
    memberId,
    planName,
    groupNumber,
    insurer,
    memberName: `${user?.firstName || ''} ${user?.lastName || ''}`.trim(),
    effectiveDate: user?.effectiveDate || '2025-01-01',
  });

  const handleCopyMemberId = () => {
    Clipboard.setString(memberId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Clear Care Dental Insurance\n\nMember: ${user?.firstName || ''} ${user?.lastName || ''}\nMember ID: ${memberId}\nGroup #: ${groupNumber}\nPlan: ${planName}\nInsurer: ${insurer}\n\nShow this to your dentist at check-in.`,
        title: 'My Dental Insurance Info',
      });
    } catch (error) {
      if (error.message !== 'User did not share') {
        Alert.alert('Error', 'Failed to share plan details.');
      }
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.navHeader}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Share Plan</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.subtitle}>
          Show your QR code or share your member ID with your dentist at check-in.
        </Text>

        {/* QR Code Card */}
        <Card style={styles.qrCard}>
          <Text style={styles.qrCardTitle}>Your Insurance Card</Text>
          <View style={styles.qrContainer}>
            {QRCode ? (
              <QRCode
                value={qrData}
                size={200}
                color={colors.primary}
                backgroundColor={colors.white}
              />
            ) : (
              <QRPlaceholder value={qrData} size={200} />
            )}
          </View>
          <Text style={styles.qrHint}>Dentist can scan to verify eligibility instantly</Text>
        </Card>

        {/* Member Info */}
        <Card style={styles.infoCard}>
          <View style={styles.memberInfoRow}>
            <View style={styles.memberInfoItem}>
              <Text style={styles.memberInfoLabel}>Member Name</Text>
              <Text style={styles.memberInfoValue}>
                {`${user?.firstName || 'Member'} ${user?.lastName || ''}`.trim()}
              </Text>
            </View>
          </View>

          <View style={styles.memberInfoRow}>
            <View style={styles.memberInfoItem}>
              <Text style={styles.memberInfoLabel}>Member ID</Text>
              <View style={styles.memberIdRow}>
                <Text style={styles.memberIdValue}>{memberId}</Text>
                <TouchableOpacity
                  style={[styles.copyButton, copied && styles.copyButtonSuccess]}
                  onPress={handleCopyMemberId}
                >
                  <Text style={[styles.copyButtonText, copied && styles.copyButtonTextSuccess]}>
                    {copied ? '✓ Copied' : 'Copy'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <View style={styles.memberInfoRow}>
            <View style={styles.memberInfoItem}>
              <Text style={styles.memberInfoLabel}>Plan Name</Text>
              <Text style={styles.memberInfoValue}>{planName}</Text>
            </View>
          </View>

          <View style={styles.memberInfoRow}>
            <View style={styles.memberInfoItem}>
              <Text style={styles.memberInfoLabel}>Group Number</Text>
              <Text style={styles.memberInfoValue}>{groupNumber}</Text>
            </View>
          </View>

          <View style={[styles.memberInfoRow, { borderBottomWidth: 0 }]}>
            <View style={styles.memberInfoItem}>
              <Text style={styles.memberInfoLabel}>Insurance Company</Text>
              <Text style={styles.memberInfoValue}>{insurer}</Text>
            </View>
          </View>
        </Card>

        {/* Quick Coverage Summary */}
        <Card style={styles.coverageSummary}>
          <Text style={styles.coverageSummaryTitle}>Quick Coverage Reference</Text>
          <View style={styles.coverageGrid}>
            {[
              { label: 'Preventive', pct: '100%', color: colors.success },
              { label: 'Basic', pct: '80%', color: colors.primary },
              { label: 'Major', pct: '50%', color: colors.primaryLight },
              { label: 'Ortho', pct: '50%', color: colors.accent },
            ].map((item) => (
              <View key={item.label} style={styles.coverageGridItem}>
                <Text style={[styles.coverageGridPct, { color: item.color }]}>{item.pct}</Text>
                <Text style={styles.coverageGridLabel}>{item.label}</Text>
              </View>
            ))}
          </View>
        </Card>

        <Button
          title="Share with Dentist"
          onPress={handleShare}
          size="large"
          style={styles.shareButton}
        />

        <Button
          title="View Full Plan Details"
          onPress={() => navigation.navigate('PlanDetails')}
          variant="outline"
          size="large"
          style={styles.planDetailsButton}
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
    paddingVertical: 14,
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
    alignItems: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  qrCard: {
    alignItems: 'center',
    width: '100%',
    marginBottom: 16,
  },
  qrCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 20,
  },
  qrContainer: {
    padding: 16,
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
  },
  qrHint: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  infoCard: {
    width: '100%',
    marginBottom: 16,
  },
  memberInfoRow: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  memberInfoItem: {},
  memberInfoLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  memberInfoValue: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  memberIdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  memberIdValue: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 1,
  },
  copyButton: {
    backgroundColor: '#EBF5FB',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  copyButtonSuccess: {
    backgroundColor: '#EAFAF1',
  },
  copyButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  copyButtonTextSuccess: {
    color: colors.success,
  },
  coverageSummary: {
    width: '100%',
    marginBottom: 24,
  },
  coverageSummaryTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 14,
  },
  coverageGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  coverageGridItem: {
    alignItems: 'center',
  },
  coverageGridPct: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 4,
  },
  coverageGridLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  shareButton: {
    width: '100%',
    marginBottom: 12,
  },
  planDetailsButton: {
    width: '100%',
  },
});

export default SharePlanScreen;
