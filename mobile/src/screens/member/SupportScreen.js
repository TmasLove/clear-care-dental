import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../utils/colors';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';

const FAQ_ITEMS = [
  {
    q: 'How do I find an in-network dentist?',
    a: 'Tap "Find Dentist" on your home screen and filter by "In-Network". In-network dentists will show a green badge and typically cost you less out-of-pocket.',
  },
  {
    q: 'How do I check my remaining benefits?',
    a: 'Your home screen shows your current benefit usage. Tap "Plan Details" for a full breakdown of your coverage, deductibles, and annual maximum.',
  },
  {
    q: 'How long does a claim take to process?',
    a: 'Most claims are processed within 3-5 business days. Complex claims may take up to 15 business days. You\'ll receive a notification when your claim status changes.',
  },
  {
    q: 'What is a deductible?',
    a: 'Your deductible is the amount you pay for dental services before your insurance begins to pay. Most preventive care does not apply to your deductible.',
  },
  {
    q: 'Can I share my plan details with my dentist?',
    a: 'Yes! Tap "Share Plan" from your home screen to display a QR code or copy your member ID. Your dentist can verify your eligibility instantly.',
  },
];

const FAQItem = ({ item }) => {
  const [expanded, setExpanded] = useState(false);
  return (
    <TouchableOpacity
      style={styles.faqItem}
      onPress={() => setExpanded(!expanded)}
      activeOpacity={0.8}
    >
      <View style={styles.faqHeader}>
        <Text style={styles.faqQuestion}>{item.q}</Text>
        <Text style={styles.faqChevron}>{expanded ? '−' : '+'}</Text>
      </View>
      {expanded && <Text style={styles.faqAnswer}>{item.a}</Text>}
    </TouchableOpacity>
  );
};

const MemberSupportScreen = () => {
  const insets = useSafeAreaInsets();
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const handleSend = () => {
    if (!subject.trim() || !message.trim()) {
      Alert.alert('Missing Info', 'Please enter a subject and message.');
      return;
    }
    setSending(true);
    setTimeout(() => {
      setSending(false);
      Alert.alert('Sent!', 'We\'ll respond to your inquiry within 1 business day.', [
        { text: 'OK', onPress: () => { setSubject(''); setMessage(''); } },
      ]);
    }, 1000);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Help & Support</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.contactRow}>
          <TouchableOpacity
            style={styles.contactCard}
            onPress={() => Linking.openURL('tel:+18005551234')}
          >
            <Text style={styles.contactIcon}>📞</Text>
            <Text style={styles.contactLabel}>Call</Text>
            <Text style={styles.contactSub}>1-800-555-1234</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.contactCard}
            onPress={() => Linking.openURL('mailto:support@clearcaredental.com')}
          >
            <Text style={styles.contactIcon}>✉️</Text>
            <Text style={styles.contactLabel}>Email</Text>
            <Text style={styles.contactSub}>support@</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.contactCard}>
            <Text style={styles.contactIcon}>💬</Text>
            <Text style={styles.contactLabel}>Chat</Text>
            <Text style={styles.contactSub}>9am–5pm</Text>
          </TouchableOpacity>
        </View>

        <Card style={styles.messageCard}>
          <Text style={styles.sectionTitle}>Send a Message</Text>
          <Text style={styles.fieldLabel}>Subject</Text>
          <TextInput
            style={styles.subjectInput}
            value={subject}
            onChangeText={setSubject}
            placeholder="What do you need help with?"
            placeholderTextColor={colors.textSecondary}
          />
          <Text style={styles.fieldLabel}>Message</Text>
          <TextInput
            style={styles.messageInput}
            value={message}
            onChangeText={setMessage}
            placeholder="Describe your question or issue..."
            placeholderTextColor={colors.textSecondary}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
          <Button title={sending ? 'Sending...' : 'Send'} onPress={handleSend} loading={sending} disabled={sending} />
        </Card>

        <View style={styles.faqSection}>
          <Text style={styles.sectionTitle}>FAQ</Text>
          {FAQ_ITEMS.map((item, i) => <FAQItem key={i} item={item} />)}
        </View>
      </ScrollView>
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
  contactRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  contactCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    alignItems: 'center',
  },
  contactIcon: { fontSize: 24, marginBottom: 6 },
  contactLabel: { fontSize: 12, fontWeight: '700', color: colors.text, marginBottom: 3 },
  contactSub: { fontSize: 10, color: colors.primary, fontWeight: '500', textAlign: 'center' },
  messageCard: { marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 14 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: 6 },
  subjectInput: {
    borderWidth: 1.5, borderColor: colors.border, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, color: colors.text, marginBottom: 14,
  },
  messageInput: {
    borderWidth: 1.5, borderColor: colors.border, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, color: colors.text,
    minHeight: 100, marginBottom: 14,
  },
  faqSection: {},
  faqItem: {
    backgroundColor: colors.white, borderRadius: 10, borderWidth: 1,
    borderColor: colors.border, padding: 14, marginBottom: 8,
  },
  faqHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  faqQuestion: { fontSize: 14, fontWeight: '600', color: colors.text, flex: 1, marginRight: 10, lineHeight: 20 },
  faqChevron: { fontSize: 18, color: colors.primary, fontWeight: '700', lineHeight: 22 },
  faqAnswer: {
    fontSize: 13, color: colors.textSecondary, lineHeight: 20,
    marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.border,
  },
});

export default MemberSupportScreen;
