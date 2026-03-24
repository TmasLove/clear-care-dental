import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../utils/colors';
import { formatCurrency } from '../../utils/formatters';
import { proceduresAPI } from '../../api/procedures';

// ── Detail Modal ───────────────────────────────────────────────────────────────
const DetailModal = ({ item, visible, onClose, zipCode }) => {
  if (!item) return null;
  const savings = item.without - item.withLow;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={modalStyles.overlay}>
        <View style={modalStyles.sheet}>
          <View style={modalStyles.handle} />

          <View style={modalStyles.header}>
            <View style={modalStyles.cdtBadge}>
              <Text style={modalStyles.cdtText}>{item.cdt}</Text>
            </View>
            <View style={modalStyles.headerText}>
              <Text style={modalStyles.name}>{item.name}</Text>
              <Text style={modalStyles.category}>{item.category}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={modalStyles.closeBtn}>
              <Text style={modalStyles.closeX}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {zipCode ? (
              <View style={modalStyles.locationRow}>
                <Text style={modalStyles.locationIcon}>📍</Text>
                <Text style={modalStyles.locationText}>Estimated costs near {zipCode}</Text>
              </View>
            ) : null}

            <Text style={modalStyles.description}>{item.description}</Text>

            {/* With plan */}
            <View style={modalStyles.priceBlock}>
              <View style={modalStyles.priceRow}>
                <View>
                  <Text style={modalStyles.priceLabel}>With your plan</Text>
                  <Text style={modalStyles.priceNote}>In-network estimated range</Text>
                </View>
                <Text style={modalStyles.priceWith}>
                  {formatCurrency(item.withLow)} – {formatCurrency(item.withHigh)}
                </Text>
              </View>
              <View style={[modalStyles.priceRow, modalStyles.priceRowBorder]}>
                <View>
                  <Text style={[modalStyles.priceLabel, { color: colors.textSecondary }]}>Without plan</Text>
                  <Text style={modalStyles.priceNote}>Typical out-of-network rate</Text>
                </View>
                <Text style={modalStyles.priceWithout}>{formatCurrency(item.without)}</Text>
              </View>
            </View>

            {/* Savings */}
            {savings > 0 && (
              <View style={modalStyles.savingsCard}>
                <Text style={modalStyles.savingsIcon}>💰</Text>
                <View>
                  <Text style={modalStyles.savingsTitle}>
                    Save up to {formatCurrency(savings)} with your plan
                  </Text>
                  <Text style={modalStyles.savingsSub}>
                    vs. paying the full {formatCurrency(item.without)} out-of-pocket
                  </Text>
                </View>
              </View>
            )}

            {/* Notes */}
            <View style={modalStyles.notesCard}>
              <Text style={modalStyles.notesTitle}>Important Notes</Text>
              <Text style={modalStyles.notesText}>• Costs are estimates based on in-network rates near {zipCode || 'your area'}.</Text>
              <Text style={modalStyles.notesText}>• Your actual cost may vary by provider and complexity of treatment.</Text>
              {item.deductibleApplies && (
                <Text style={modalStyles.notesText}>• Your deductible must be met before plan benefits apply.</Text>
              )}
              {item.coverage === 0 && (
                <Text style={[modalStyles.notesText, { color: colors.warning }]}>
                  • Orthodontic coverage varies by plan. Ask your employer about ortho benefits.
                </Text>
              )}
              <Text style={modalStyles.notesText}>• Always confirm costs with your dentist before treatment.</Text>
            </View>
          </ScrollView>

          <TouchableOpacity style={modalStyles.cta} onPress={onClose} activeOpacity={0.85}>
            <Text style={modalStyles.ctaText}>Find an In-Network Dentist</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const modalStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 32,
    maxHeight: '88%',
  },
  handle: {
    width: 40, height: 4, backgroundColor: colors.border,
    borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 16,
  },
  header: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 },
  cdtBadge: {
    backgroundColor: '#EBF7F4', borderRadius: 6,
    paddingHorizontal: 9, paddingVertical: 5, marginRight: 12, marginTop: 2,
  },
  cdtText: { fontSize: 12, fontWeight: '700', color: colors.secondary },
  headerText: { flex: 1 },
  name: { fontSize: 18, fontWeight: '800', color: colors.text, marginBottom: 3 },
  category: { fontSize: 13, color: colors.textSecondary },
  closeBtn: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center',
  },
  closeX: { fontSize: 13, color: colors.textSecondary, fontWeight: '600' },
  locationRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#EBF7F4', borderRadius: 8, padding: 10, marginBottom: 14,
  },
  locationIcon: { fontSize: 14, marginRight: 8 },
  locationText: { fontSize: 13, color: colors.secondary, fontWeight: '600' },
  description: {
    fontSize: 14, color: colors.textSecondary,
    lineHeight: 20, marginBottom: 16,
  },
  priceBlock: {
    backgroundColor: colors.background, borderRadius: 12,
    overflow: 'hidden', marginBottom: 14,
  },
  priceRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', padding: 14,
  },
  priceRowBorder: { borderTopWidth: 1, borderTopColor: colors.border },
  priceLabel: { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 2 },
  priceNote: { fontSize: 12, color: colors.textSecondary },
  priceWith: { fontSize: 18, fontWeight: '800', color: colors.primary },
  priceWithout: { fontSize: 16, fontWeight: '700', color: colors.secondary },
  savingsCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#E8F5EE', borderRadius: 12, padding: 14, marginBottom: 14,
  },
  savingsIcon: { fontSize: 24, marginRight: 12 },
  savingsTitle: { fontSize: 14, fontWeight: '800', color: colors.success, marginBottom: 2 },
  savingsSub: { fontSize: 12, color: colors.textSecondary },
  notesCard: { backgroundColor: colors.background, borderRadius: 12, padding: 14, marginBottom: 20 },
  notesTitle: { fontSize: 13, fontWeight: '800', color: colors.text, marginBottom: 8 },
  notesText: { fontSize: 12, color: colors.textSecondary, lineHeight: 18, marginBottom: 4 },
  cta: {
    backgroundColor: colors.primary, borderRadius: 12,
    paddingVertical: 15, alignItems: 'center', marginTop: 4,
  },
  ctaText: { fontSize: 15, fontWeight: '700', color: colors.white },
});

const CATEGORIES = ['All', 'Preventive', 'Basic', 'Major', 'Periodontics', 'Oral Surgery', 'Orthodontics'];

// ── Main Screen ────────────────────────────────────────────────────────────────
const PriceCheckerScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [zipCode, setZipCode] = useState('');
  const [searchedZip, setSearchedZip] = useState('');
  const [searchedState, setSearchedState] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [procedures, setProcedures] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  const filteredProcedures = useMemo(() => {
    if (activeCategory === 'All') return procedures;
    return procedures.filter((p) => p.category === activeCategory);
  }, [activeCategory, procedures]);

  const handleSearch = async () => {
    const zip = zipCode.trim();
    if (zip.length < 5) return;
    setLoading(true);
    setError('');
    try {
      const data = await proceduresAPI.getPriceCheck(zip);
      if (data.success && data.procedures?.length) {
        setProcedures(data.procedures);
        setSearchedZip(zip);
        setSearchedState(data.state || '');
        setHasSearched(true);
        setActiveCategory('All');
      } else {
        setError('No pricing data found for this ZIP code. Please try another.');
      }
    } catch {
      setError('Unable to load pricing. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRowPress = (item) => {
    setSelectedItem(item);
    setModalVisible(true);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        {navigation.canGoBack() && (
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backArrow}>‹</Text>
          </TouchableOpacity>
        )}
        <Text style={styles.headerTitle}>PriceCheck</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Intro + ZIP search */}
        <View style={styles.searchSection}>
          <Text style={styles.intro}>
            Enter your ZIP code to see a comparison of costs for common procedures when using a dentist that is{' '}
            <Text style={styles.introHighlight}>in the Clear Care network</Text>
            {' '}vs{' '}
            <Text style={styles.introMuted}>out of network</Text>.
          </Text>

          <View style={styles.searchRow}>
            <View style={styles.zipWrap}>
              <TextInput
                style={styles.zipInput}
                placeholder="Zip Code"
                placeholderTextColor={colors.textSecondary}
                value={zipCode}
                onChangeText={(t) => setZipCode(t.replace(/\D/g, '').slice(0, 5))}
                keyboardType="number-pad"
                maxLength={5}
                returnKeyType="search"
                onSubmitEditing={handleSearch}
              />
              {zipCode.length > 0 && (
                <TouchableOpacity onPress={() => { setZipCode(''); setHasSearched(false); }} style={styles.clearBtn}>
                  <Text style={styles.clearX}>✕</Text>
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity
              style={[styles.searchBtn, zipCode.length < 5 && styles.searchBtnDisabled]}
              onPress={handleSearch}
              activeOpacity={0.85}
            >
              <Text style={styles.searchBtnText}>Search</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Loading / Error */}
        {loading && (
          <View style={styles.loadingState}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Loading prices for {zipCode}...</Text>
          </View>
        )}

        {!loading && error ? (
          <View style={styles.errorState}>
            <Text style={styles.errorIcon}>⚠️</Text>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* Results */}
        {!loading && hasSearched && !error ? (
          <>
            {/* Category filter */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.chipScroll}
              contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 10 }}
            >
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.chip, activeCategory === cat && styles.chipActive]}
                  onPress={() => setActiveCategory(cat)}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.chipText, activeCategory === cat && styles.chipTextActive]}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Table */}
            <View style={styles.table}>
              {/* Table header */}
              <View style={styles.tableHeader}>
                <Text style={styles.tableHeaderLeft}>Service</Text>
                <Text style={styles.tableHeaderRight}>Cost</Text>
              </View>

              {/* Table rows */}
              {filteredProcedures.map((item, index) => (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.tableRow,
                    index === filteredProcedures.length - 1 && styles.tableRowLast,
                  ]}
                  onPress={() => handleRowPress(item)}
                  activeOpacity={0.7}
                >
                  {/* Service column */}
                  <View style={styles.serviceCol}>
                    <Text style={styles.serviceName}>{item.name}</Text>
                    <Text style={styles.serviceCdt}>{item.cdt}</Text>
                  </View>

                  {/* Cost column */}
                  <View style={styles.costCol}>
                    <Text style={styles.costWith}>
                      {formatCurrency(item.withLow)} – {formatCurrency(item.withHigh)}
                    </Text>
                    <Text style={styles.costWithout}>
                      {formatCurrency(item.without)} without Clear Care
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.disclaimer}>
              Costs are estimates for in-network providers near {searchedZip}{searchedState ? `, ${searchedState}` : ''}. Tap any row for a full breakdown.
            </Text>
          </>
        ) : null}

        {/* Empty state — shown only before first search */}
        {!loading && !hasSearched && !error ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🦷</Text>
            <Text style={styles.emptyTitle}>Check Dental Costs</Text>
            <Text style={styles.emptySubtitle}>
              Enter your ZIP code above to see how much you save with Clear Care vs paying out of pocket.
            </Text>
            <View style={styles.featureList}>
              {[
                { icon: '✅', text: 'In-network pricing by location' },
                { icon: '💰', text: 'See your savings with Clear Care' },
                { icon: '🔍', text: '272,000+ in-network dentists nationwide' },
              ].map((f, i) => (
                <View key={i} style={styles.featureRow}>
                  <Text style={styles.featureIcon}>{f.icon}</Text>
                  <Text style={styles.featureText}>{f.text}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      <DetailModal
        item={selectedItem}
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        zipCode={searchedZip}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  // Header
  header: {
    backgroundColor: colors.white,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backBtn: { marginRight: 8, padding: 4 },
  backArrow: { fontSize: 28, color: colors.text, lineHeight: 30, fontWeight: '300' },
  headerTitle: { fontSize: 22, fontWeight: '800', color: colors.text },

  // Search section
  searchSection: {
    backgroundColor: colors.white,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  intro: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 21,
    marginBottom: 16,
  },
  introHighlight: { color: colors.secondary, fontWeight: '600' },
  introMuted: { color: colors.textSecondary, fontWeight: '600' },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  zipWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.white,
  },
  zipInput: {
    flex: 1, fontSize: 15, color: colors.text,
    padding: 0, letterSpacing: 1,
  },
  clearBtn: { padding: 4 },
  clearX: { fontSize: 14, color: colors.textSecondary },
  searchBtn: {
    backgroundColor: colors.secondary,
    borderRadius: 8,
    paddingHorizontal: 22,
    paddingVertical: 12,
  },
  searchBtnDisabled: { opacity: 0.4 },
  searchBtnText: { fontSize: 14, fontWeight: '700', color: colors.white },

  // Category chips
  chipScroll: { backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.border },
  chip: {
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 20, backgroundColor: colors.background,
    borderWidth: 1.5, borderColor: colors.border, marginRight: 8,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  chipTextActive: { color: colors.white },

  // Table
  table: {
    backgroundColor: colors.white,
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tableHeaderLeft: { fontSize: 13, fontWeight: '700', color: colors.textSecondary },
  tableHeaderRight: { fontSize: 13, fontWeight: '700', color: colors.textSecondary },
  tableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tableRowLast: { borderBottomWidth: 0 },
  serviceCol: { flex: 1, marginRight: 16 },
  serviceName: { fontSize: 15, fontWeight: '600', color: colors.text, marginBottom: 3 },
  serviceCdt: { fontSize: 12, fontWeight: '700', color: colors.secondary },
  costCol: { alignItems: 'flex-end' },
  costWith: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 3 },
  costWithout: { fontSize: 12, color: colors.secondary, fontWeight: '600' },

  disclaimer: {
    fontSize: 12, color: colors.textSecondary,
    textAlign: 'center', marginHorizontal: 20,
    marginTop: 12, lineHeight: 17,
  },

  // Loading / error
  loadingState: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 32,
  },
  loadingText: {
    fontSize: 14, color: colors.textSecondary,
    marginTop: 16, textAlign: 'center',
  },
  errorState: {
    alignItems: 'center',
    paddingTop: 48,
    paddingHorizontal: 32,
  },
  errorIcon: { fontSize: 36, marginBottom: 12 },
  errorText: {
    fontSize: 14, color: colors.error || '#e53935',
    textAlign: 'center', lineHeight: 20,
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 48,
  },
  emptyIcon: { fontSize: 52, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: colors.text, marginBottom: 10, textAlign: 'center' },
  emptySubtitle: {
    fontSize: 14, color: colors.textSecondary,
    textAlign: 'center', lineHeight: 21, marginBottom: 28,
  },
  featureList: {
    alignSelf: 'stretch', backgroundColor: colors.white,
    borderRadius: 14, padding: 16, borderWidth: 1, borderColor: colors.border,
  },
  featureRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  featureIcon: { fontSize: 18, marginRight: 12, width: 28 },
  featureText: { fontSize: 14, color: colors.text, fontWeight: '500' },
});

export default PriceCheckerScreen;
