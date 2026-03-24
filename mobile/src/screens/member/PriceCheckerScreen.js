import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  FlatList,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../utils/colors';
import { formatCurrency } from '../../utils/formatters';

// ── Procedure data ─────────────────────────────────────────────────────────────
const PROCEDURES = [
  // Preventive
  { id: 1, cdt: 'D0120', name: 'Periodic Oral Exam', category: 'Preventive', typical: 65,  coverage: 100, deductibleApplies: false },
  { id: 2, cdt: 'D0150', name: 'Comprehensive Oral Exam', category: 'Preventive', typical: 120, coverage: 100, deductibleApplies: false },
  { id: 3, cdt: 'D0210', name: 'Full Mouth X-Rays', category: 'Preventive', typical: 185, coverage: 100, deductibleApplies: false },
  { id: 4, cdt: 'D0330', name: 'Panoramic X-Ray', category: 'Preventive', typical: 165, coverage: 100, deductibleApplies: false },
  { id: 5, cdt: 'D1110', name: 'Adult Teeth Cleaning', category: 'Preventive', typical: 135, coverage: 100, deductibleApplies: false },
  { id: 6, cdt: 'D1120', name: 'Child Teeth Cleaning', category: 'Preventive', typical: 95,  coverage: 100, deductibleApplies: false },
  { id: 7, cdt: 'D1206', name: 'Topical Fluoride (child)', category: 'Preventive', typical: 45,  coverage: 100, deductibleApplies: false },

  // Basic Restorative
  { id: 8,  cdt: 'D2140', name: 'Amalgam Filling (1 surface)', category: 'Basic', typical: 195, coverage: 80, deductibleApplies: true },
  { id: 9,  cdt: 'D2150', name: 'Amalgam Filling (2 surfaces)', category: 'Basic', typical: 255, coverage: 80, deductibleApplies: true },
  { id: 10, cdt: 'D2330', name: 'Composite Filling (anterior, 1 surface)', category: 'Basic', typical: 215, coverage: 80, deductibleApplies: true },
  { id: 11, cdt: 'D2391', name: 'Composite Filling (posterior, 1 surface)', category: 'Basic', typical: 235, coverage: 80, deductibleApplies: true },
  { id: 12, cdt: 'D7140', name: 'Simple Tooth Extraction', category: 'Basic', typical: 185, coverage: 80, deductibleApplies: true },

  // Major Restorative
  { id: 13, cdt: 'D2710', name: 'Crown (resin-based)', category: 'Major', typical: 1050, coverage: 50, deductibleApplies: true },
  { id: 14, cdt: 'D2740', name: 'Crown (porcelain/ceramic)', category: 'Major', typical: 1350, coverage: 50, deductibleApplies: true },
  { id: 15, cdt: 'D3310', name: 'Root Canal (anterior)', category: 'Major', typical: 850,  coverage: 50, deductibleApplies: true },
  { id: 16, cdt: 'D3320', name: 'Root Canal (premolar)', category: 'Major', typical: 1000, coverage: 50, deductibleApplies: true },
  { id: 17, cdt: 'D3330', name: 'Root Canal (molar)', category: 'Major', typical: 1200, coverage: 50, deductibleApplies: true },
  { id: 18, cdt: 'D5110', name: 'Complete Upper Denture', category: 'Major', typical: 1800, coverage: 50, deductibleApplies: true },
  { id: 19, cdt: 'D6010', name: 'Dental Implant (surgical)', category: 'Major', typical: 2400, coverage: 50, deductibleApplies: true },

  // Oral Surgery
  { id: 20, cdt: 'D7210', name: 'Surgical Tooth Extraction', category: 'Oral Surgery', typical: 355,  coverage: 80, deductibleApplies: true },
  { id: 21, cdt: 'D7240', name: 'Impacted Wisdom Tooth Removal', category: 'Oral Surgery', typical: 595,  coverage: 50, deductibleApplies: true },
  { id: 22, cdt: 'D7310', name: 'Alveoloplasty (per quadrant)', category: 'Oral Surgery', typical: 275,  coverage: 50, deductibleApplies: true },

  // Periodontics
  { id: 23, cdt: 'D4341', name: 'Scaling & Root Planing (per quadrant)', category: 'Periodontics', typical: 285, coverage: 80, deductibleApplies: true },
  { id: 24, cdt: 'D4355', name: 'Full Mouth Debridement', category: 'Periodontics', typical: 165, coverage: 80, deductibleApplies: true },
  { id: 25, cdt: 'D4910', name: 'Periodontal Maintenance', category: 'Periodontics', typical: 175, coverage: 80, deductibleApplies: true },

  // Orthodontics
  { id: 26, cdt: 'D8080', name: 'Braces (child, comprehensive)', category: 'Orthodontics', typical: 5200, coverage: 0, deductibleApplies: false },
  { id: 27, cdt: 'D8090', name: 'Braces (adult, comprehensive)', category: 'Orthodontics', typical: 6000, coverage: 0, deductibleApplies: false },
  { id: 28, cdt: 'D8660', name: 'Orthodontic Exam', category: 'Orthodontics', typical: 150,  coverage: 0, deductibleApplies: false },
];

const CATEGORIES = ['All', 'Preventive', 'Basic', 'Major', 'Oral Surgery', 'Periodontics', 'Orthodontics'];

const DEDUCTIBLE = 50;

// Calculate what member pays given coverage %, typical cost, and deductible
function calcMemberPays(proc) {
  if (proc.coverage === 0) return proc.typical;
  const planPays = proc.typical * (proc.coverage / 100);
  let memberPays = proc.typical - planPays;
  if (proc.deductibleApplies) memberPays = Math.max(0, memberPays); // deductible already factored in plan cost
  return Math.round(memberPays);
}

function calcSavings(proc) {
  return proc.typical - calcMemberPays(proc);
}

// ── Sub-components ─────────────────────────────────────────────────────────────
const CategoryChip = ({ label, active, onPress }) => (
  <TouchableOpacity
    style={[chipStyles.chip, active && chipStyles.chipActive]}
    onPress={onPress}
    activeOpacity={0.75}
  >
    <Text style={[chipStyles.label, active && chipStyles.labelActive]}>{label}</Text>
  </TouchableOpacity>
);

const chipStyles = StyleSheet.create({
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.border,
    marginRight: 8,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  labelActive: {
    color: colors.white,
  },
});

const ProcedureCard = ({ item, onPress }) => {
  const memberPays = calcMemberPays(item);
  const savings = calcSavings(item);
  const savingsPct = Math.round((savings / item.typical) * 100);

  return (
    <TouchableOpacity style={cardStyles.card} onPress={() => onPress(item)} activeOpacity={0.85}>
      <View style={cardStyles.row}>
        <View style={cardStyles.left}>
          <View style={cardStyles.cdtBadge}>
            <Text style={cardStyles.cdtText}>{item.cdt}</Text>
          </View>
          <View style={cardStyles.nameBlock}>
            <Text style={cardStyles.name} numberOfLines={2}>{item.name}</Text>
            <Text style={cardStyles.category}>{item.category}</Text>
          </View>
        </View>
        <View style={cardStyles.right}>
          <Text style={cardStyles.memberPays}>{formatCurrency(memberPays)}</Text>
          <Text style={cardStyles.memberPaysLabel}>you pay</Text>
          {savingsPct > 0 && (
            <View style={cardStyles.savingsBadge}>
              <Text style={cardStyles.savingsText}>Save {savingsPct}%</Text>
            </View>
          )}
        </View>
      </View>
      <View style={cardStyles.footer}>
        <Text style={cardStyles.typicalText}>
          Typical area cost: <Text style={cardStyles.typicalAmount}>{formatCurrency(item.typical)}</Text>
        </Text>
        <Text style={cardStyles.detailLink}>Details ›</Text>
      </View>
    </TouchableOpacity>
  );
};

const cardStyles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  left: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  cdtBadge: {
    backgroundColor: '#EBF2FA',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 4,
    marginRight: 10,
    marginTop: 2,
  },
  cdtText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 0.3,
  },
  nameBlock: {
    flex: 1,
  },
  name: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 3,
    lineHeight: 19,
  },
  category: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  right: {
    alignItems: 'flex-end',
    marginLeft: 8,
  },
  memberPays: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.primary,
  },
  memberPaysLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  savingsBadge: {
    backgroundColor: '#E8F5EE',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
    marginTop: 5,
  },
  savingsText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.success,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  typicalText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  typicalAmount: {
    fontWeight: '700',
    color: colors.text,
  },
  detailLink: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '700',
  },
});

// ── Detail Modal ───────────────────────────────────────────────────────────────
const DetailModal = ({ item, visible, onClose, zipCode }) => {
  if (!item) return null;
  const memberPays = calcMemberPays(item);
  const planPays = item.typical - memberPays;
  const savings = calcSavings(item);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={modalStyles.overlay}>
        <View style={modalStyles.sheet}>
          {/* Handle */}
          <View style={modalStyles.handle} />

          {/* Header */}
          <View style={modalStyles.header}>
            <View style={modalStyles.cdtBig}>
              <Text style={modalStyles.cdtBigText}>{item.cdt}</Text>
            </View>
            <View style={modalStyles.headerText}>
              <Text style={modalStyles.modalName}>{item.name}</Text>
              <Text style={modalStyles.modalCategory}>{item.category}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={modalStyles.closeBtn}>
              <Text style={modalStyles.closeX}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Location */}
            {zipCode ? (
              <View style={modalStyles.locationRow}>
                <Text style={modalStyles.locationIcon}>📍</Text>
                <Text style={modalStyles.locationText}>Estimated costs near {zipCode}</Text>
              </View>
            ) : null}

            {/* Cost breakdown */}
            <View style={modalStyles.breakdownCard}>
              <Text style={modalStyles.breakdownTitle}>Cost Breakdown</Text>

              <View style={modalStyles.breakdownRow}>
                <Text style={modalStyles.breakdownLabel}>Typical area cost</Text>
                <Text style={modalStyles.breakdownValue}>{formatCurrency(item.typical)}</Text>
              </View>
              <View style={modalStyles.breakdownRow}>
                <Text style={modalStyles.breakdownLabel}>Plan pays ({item.coverage}%)</Text>
                <Text style={[modalStyles.breakdownValue, { color: colors.success }]}>
                  -{formatCurrency(planPays)}
                </Text>
              </View>
              {item.deductibleApplies && (
                <View style={modalStyles.breakdownRow}>
                  <Text style={modalStyles.breakdownLabel}>Deductible (if not met)</Text>
                  <Text style={[modalStyles.breakdownValue, { color: colors.warning }]}>
                    Up to {formatCurrency(DEDUCTIBLE)}
                  </Text>
                </View>
              )}
              <View style={[modalStyles.breakdownRow, modalStyles.breakdownTotal]}>
                <Text style={modalStyles.breakdownTotalLabel}>You pay (est.)</Text>
                <Text style={modalStyles.breakdownTotalValue}>{formatCurrency(memberPays)}</Text>
              </View>
            </View>

            {/* Savings highlight */}
            {savings > 0 && (
              <View style={modalStyles.savingsCard}>
                <Text style={modalStyles.savingsIcon}>💰</Text>
                <View>
                  <Text style={modalStyles.savingsTitle}>
                    Save {formatCurrency(savings)} with your plan
                  </Text>
                  <Text style={modalStyles.savingsSubtitle}>
                    vs. paying the full {formatCurrency(item.typical)} out-of-pocket
                  </Text>
                </View>
              </View>
            )}

            {/* Notes */}
            <View style={modalStyles.notesCard}>
              <Text style={modalStyles.notesTitle}>Important Notes</Text>
              <Text style={modalStyles.notesText}>
                • Costs are estimates based on typical in-network rates near {zipCode || 'your area'}.
              </Text>
              <Text style={modalStyles.notesText}>
                • Your actual cost may vary by provider and treatment complexity.
              </Text>
              {item.deductibleApplies && (
                <Text style={modalStyles.notesText}>
                  • Your deductible must be met before the plan contributes to this service.
                </Text>
              )}
              {item.coverage === 0 && (
                <Text style={[modalStyles.notesText, { color: colors.warning }]}>
                  • This procedure is typically not covered under standard dental plans. Ask about financing options.
                </Text>
              )}
              <Text style={modalStyles.notesText}>
                • Always verify costs with your dentist before treatment.
              </Text>
            </View>
          </ScrollView>

          {/* CTA */}
          <TouchableOpacity style={modalStyles.cta} onPress={onClose} activeOpacity={0.85}>
            <Text style={modalStyles.ctaText}>Find an In-Network Dentist</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 32,
    maxHeight: '88%',
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  cdtBig: {
    backgroundColor: '#EBF2FA',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 12,
    marginTop: 2,
  },
  cdtBigText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  headerText: {
    flex: 1,
  },
  modalName: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 3,
  },
  modalCategory: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeX: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EBF2FA',
    borderRadius: 10,
    padding: 10,
    marginBottom: 16,
  },
  locationIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  locationText: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '600',
  },
  breakdownCard: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 14,
  },
  breakdownTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 12,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  breakdownLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  breakdownValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  breakdownTotal: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 10,
    marginTop: 2,
    marginBottom: 0,
  },
  breakdownTotalLabel: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
  },
  breakdownTotalValue: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.primary,
  },
  savingsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5EE',
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
  },
  savingsIcon: {
    fontSize: 26,
    marginRight: 12,
  },
  savingsTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.success,
    marginBottom: 2,
  },
  savingsSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  notesCard: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
  },
  notesTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 8,
  },
  notesText: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: 4,
  },
  cta: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 4,
  },
  ctaText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.white,
  },
});

// ── Main Screen ────────────────────────────────────────────────────────────────
const PriceCheckerScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [zipCode, setZipCode] = useState('');
  const [searchedZip, setSearchedZip] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [query, setQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const filteredProcedures = useMemo(() => {
    let list = PROCEDURES;
    if (activeCategory !== 'All') {
      list = list.filter((p) => p.category === activeCategory);
    }
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter(
        (p) => p.name.toLowerCase().includes(q) || p.cdt.toLowerCase().includes(q)
      );
    }
    return list;
  }, [activeCategory, query]);

  const handleSearch = () => {
    if (zipCode.trim().length < 5) return;
    setSearchedZip(zipCode.trim());
    setHasSearched(true);
  };

  const handleProcedurePress = (item) => {
    setSelectedItem(item);
    setModalVisible(true);
  };

  // Summary stats
  const avgSavings = useMemo(() => {
    if (!filteredProcedures.length) return 0;
    const total = filteredProcedures.reduce((sum, p) => sum + calcSavings(p), 0);
    return Math.round(total / filteredProcedures.length);
  }, [filteredProcedures]);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.headerTop}>
          {navigation.canGoBack() && (
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <Text style={styles.backArrow}>‹</Text>
            </TouchableOpacity>
          )}
          <View style={styles.headerTitles}>
            <Text style={styles.headerTitle}>Price Check</Text>
            <Text style={styles.headerSubtitle}>Find dental costs in your area</Text>
          </View>
        </View>

        {/* ZIP search */}
        <View style={styles.searchRow}>
          <View style={styles.zipInputWrap}>
            <Text style={styles.zipIcon}>📍</Text>
            <TextInput
              style={styles.zipInput}
              placeholder="Enter ZIP code"
              placeholderTextColor="rgba(255,255,255,0.55)"
              value={zipCode}
              onChangeText={(t) => setZipCode(t.replace(/\D/g, '').slice(0, 5))}
              keyboardType="number-pad"
              maxLength={5}
              returnKeyType="search"
              onSubmitEditing={handleSearch}
            />
          </View>
          <TouchableOpacity
            style={[styles.searchBtn, zipCode.length < 5 && styles.searchBtnDisabled]}
            onPress={handleSearch}
            activeOpacity={0.85}
          >
            <Text style={styles.searchBtnText}>Search</Text>
          </TouchableOpacity>
        </View>

        {/* Summary strip */}
        {hasSearched && (
          <View style={styles.summaryStrip}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{PROCEDURES.length}</Text>
              <Text style={styles.summaryLabel}>Procedures</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>272K+</Text>
              <Text style={styles.summaryLabel}>Dentists</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{formatCurrency(avgSavings)}</Text>
              <Text style={styles.summaryLabel}>Avg Savings</Text>
            </View>
          </View>
        )}
      </View>

      {/* Empty state */}
      {!hasSearched ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>🦷</Text>
          <Text style={styles.emptyTitle}>Check Dental Costs</Text>
          <Text style={styles.emptySubtitle}>
            Enter your ZIP code above to see in-network prices for common dental procedures near you — with and without your plan.
          </Text>
          <View style={styles.emptyFeatures}>
            {[
              { icon: '✅', text: 'In-network pricing by location' },
              { icon: '💰', text: 'Your plan savings shown upfront' },
              { icon: '🔍', text: '272,000+ in-network dentists' },
            ].map((f, i) => (
              <View key={i} style={styles.featureRow}>
                <Text style={styles.featureIcon}>{f.icon}</Text>
                <Text style={styles.featureText}>{f.text}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : (
        <>
          {/* Category filter + procedure search */}
          <View style={styles.filterSection}>
            <View style={styles.procSearchWrap}>
              <Text style={styles.procSearchIcon}>🔍</Text>
              <TextInput
                style={styles.procSearchInput}
                placeholder="Search procedures or CDT code..."
                placeholderTextColor={colors.textSecondary}
                value={query}
                onChangeText={setQuery}
              />
              {query.length > 0 && (
                <TouchableOpacity onPress={() => setQuery('')}>
                  <Text style={styles.clearBtn}>✕</Text>
                </TouchableOpacity>
              )}
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.chipScroll}
              contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 4 }}
            >
              {CATEGORIES.map((cat) => (
                <CategoryChip
                  key={cat}
                  label={cat}
                  active={activeCategory === cat}
                  onPress={() => setActiveCategory(cat)}
                />
              ))}
            </ScrollView>
          </View>

          {/* Results header */}
          <View style={styles.resultsHeader}>
            <Text style={styles.resultsCount}>
              {filteredProcedures.length} procedure{filteredProcedures.length !== 1 ? 's' : ''}
              {searchedZip ? ` near ${searchedZip}` : ''}
            </Text>
            <Text style={styles.resultsSub}>Tap any procedure for full breakdown</Text>
          </View>

          {/* List */}
          <FlatList
            data={filteredProcedures}
            keyExtractor={(item) => String(item.id)}
            renderItem={({ item }) => (
              <ProcedureCard item={item} onPress={handleProcedurePress} />
            )}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.noResults}>
                <Text style={styles.noResultsText}>No procedures match your search.</Text>
              </View>
            }
          />
        </>
      )}

      {/* Detail modal */}
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
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },
  backBtn: {
    marginRight: 10,
    padding: 4,
  },
  backArrow: {
    fontSize: 30,
    color: colors.white,
    lineHeight: 32,
    fontWeight: '300',
  },
  headerTitles: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.white,
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  zipInputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  zipIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  zipInput: {
    flex: 1,
    fontSize: 16,
    color: colors.white,
    fontWeight: '600',
    padding: 0,
    letterSpacing: 2,
  },
  searchBtn: {
    backgroundColor: colors.secondary,
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  searchBtnDisabled: {
    opacity: 0.45,
  },
  searchBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.white,
  },
  summaryStrip: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 10,
    padding: 12,
    marginTop: 14,
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.white,
  },
  summaryLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  summaryDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  // Empty state
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingBottom: 60,
  },
  emptyIcon: {
    fontSize: 56,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 10,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 28,
  },
  emptyFeatures: {
    alignSelf: 'stretch',
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  featureIcon: {
    fontSize: 18,
    marginRight: 12,
    width: 28,
  },
  featureText: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
  },
  // Filter section
  filterSection: {
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingTop: 12,
    paddingBottom: 4,
  },
  procSearchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginHorizontal: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  procSearchIcon: {
    fontSize: 15,
    marginRight: 8,
  },
  procSearchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    padding: 0,
  },
  clearBtn: {
    fontSize: 14,
    color: colors.textSecondary,
    padding: 4,
  },
  chipScroll: {
    marginBottom: 8,
  },
  // Results
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  resultsCount: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  resultsSub: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  noResults: {
    alignItems: 'center',
    paddingTop: 40,
  },
  noResultsText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
});

export default PriceCheckerScreen;
