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
    q: 'How do I add a new employee to our dental plan?',
    a: 'Go to Members tab and tap "Invite Member". Enter the employee\'s details and assign them a plan. They\'ll receive an email invitation.',
  },
  {
    q: 'How do I view all claims submitted for my group?',
    a: 'Navigate to the Claims tab on your dashboard. You can filter by status, date, and search by patient name or procedure code.',
  },
  {
    q: 'Can I have multiple dental plans active at once?',
    a: 'Yes! You can create and manage multiple plans for different employee groups. Go to Plan Management to create additional plans.',
  },
  {
    q: 'How do I update our plan coverage percentages?',
    a: 'Navigate to Plan Management, select the plan you want to edit, and tap "Edit Plan". Changes take effect at the next billing cycle.',
  },
  {
    q: 'How are savings calculated?',
    a: 'Savings are calculated as the difference between the billed amount from dentists and the negotiated/adjudicated amount paid. This reflects the value of our network rates.',
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

const SupportScreen = () => {
  const insets = useSafeAreaInsets();
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const handleSendMessage = async () => {
    if (!subject.trim() || !message.trim()) {
      Alert.alert('Missing Fields', 'Please enter a subject and message.');
      return;
    }
    setSending(true);
    setTimeout(() => {
      setSending(false);
      Alert.alert('Message Sent', 'Our support team will respond within 1 business day.', [
        { text: 'OK', onPress: () => { setSubject(''); setMessage(''); } },
      ]);
    }, 1200);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Support</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Contact options */}
        <View style={styles.contactRow}>
          <TouchableOpacity
            style={styles.contactCard}
            onPress={() => Linking.openURL('tel:+18005551234')}
          >
            <Text style={styles.contactIcon}>📞</Text>
            <Text style={styles.contactLabel}>Call Us</Text>
            <Text style={styles.contactValue}>1-800-555-1234</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.contactCard}
            onPress={() => Linking.openURL('mailto:employers@clearcaredental.com')}
          >
            <Text style={styles.contactIcon}>✉️</Text>
            <Text style={styles.contactLabel}>Email</Text>
            <Text style={styles.contactValue}>employers@</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.contactCard}>
            <Text style={styles.contactIcon}>💬</Text>
            <Text style={styles.contactLabel}>Live Chat</Text>
            <Text style={styles.contactValue}>9am–5pm EST</Text>
          </TouchableOpacity>
        </View>

        {/* Send message */}
        <Card style={styles.messageCard}>
          <Text style={styles.sectionTitle}>Send a Message</Text>

          <Text style={styles.fieldLabel}>Subject</Text>
          <TextInput
            style={styles.subjectInput}
            value={subject}
            onChangeText={setSubject}
            placeholder="How can we help?"
            placeholderTextColor={colors.textSecondary}
          />

          <Text style={styles.fieldLabel}>Message</Text>
          <TextInput
            style={styles.messageInput}
            value={message}
            onChangeText={setMessage}
            placeholder="Describe your issue or question in detail..."
            placeholderTextColor={colors.textSecondary}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
          />

          <Button
            title={sending ? 'Sending...' : 'Send Message'}
            onPress={handleSendMessage}
            loading={sending}
            disabled={sending}
            style={styles.sendButton}
          />
        </Card>

        {/* FAQ */}
        <View style={styles.faqSection}>
          <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
          {FAQ_ITEMS.map((item, i) => (
            <FAQItem key={i} item={item} />
          ))}
        </View>
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
    padding: 20,
    paddingBottom: 100,
  },
  contactRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  contactCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  contactIcon: {
    fontSize: 24,
    marginBottom: 6,
  },
  contactLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 3,
  },
  contactValue: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: '500',
    textAlign: 'center',
  },
  messageCard: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 6,
  },
  subjectInput: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: colors.text,
    marginBottom: 14,
    backgroundColor: colors.white,
  },
  messageInput: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: colors.text,
    minHeight: 110,
    marginBottom: 14,
    backgroundColor: colors.white,
  },
  sendButton: {},
  faqSection: {
    marginBottom: 20,
  },
  faqItem: {
    backgroundColor: colors.white,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 8,
  },
  faqHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  faqQuestion: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
    marginRight: 10,
    lineHeight: 20,
  },
  faqChevron: {
    fontSize: 18,
    color: colors.primary,
    fontWeight: '700',
    lineHeight: 22,
  },
  faqAnswer: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 20,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});

export default SupportScreen;
