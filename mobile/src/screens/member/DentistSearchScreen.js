import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  RefreshControl,
  Keyboard,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../utils/colors';
import DentistCard from '../../components/dentist/DentistCard';
import EmptyState from '../../components/common/EmptyState';

// NPPES NPI Registry — free CMS government API, no key required
const NPPES_URL = 'https://npiregistry.cms.hhs.gov/api/';

// Dental taxonomy codes (NUCC)
const SPECIALTY_TAXONOMIES = {
  All: null,
  'General Dentistry': ['122300000X', '1223G0001X'],
  Orthodontics: ['1223X0400X'],
  'Oral Surgery': ['1223S0112X'],
  Periodontics: ['1223P0300X'],
  Endodontics: ['1223E0200X'],
  'Pediatric Dentistry': ['1223P0221X'],
  Prosthodontics: ['1223P0700X'],
};

const FILTERS = Object.keys(SPECIALTY_TAXONOMIES);

// Normalise an NPPES result into our DentistCard shape
function normaliseProvider(p) {
  const basic = p.basic || {};
  const addr = (p.addresses || []).find((a) => a.address_purpose === 'LOCATION') || p.addresses?.[0] || {};
  const taxonomy = (p.taxonomies || []).find((t) => t.primary) || p.taxonomies?.[0] || {};

  const firstName = basic.first_name || '';
  const lastName = basic.last_name || '';
  const orgName = basic.organization_name || '';
  const name = orgName || `${firstName} ${lastName}`.trim() || 'Unknown Provider';

  const specialty = taxonomy.desc || 'Dentist';

  return {
    id: p.number || String(Math.random()),
    npi: p.number,
    name,
    specialty,
    city: addr.city || '',
    state: addr.state || '',
    zip: addr.postal_code || '',
    address: addr.address_1 || '',
    phone: addr.telephone_number || '',
    inNetwork: true, // all NPPES dental providers are treated as in-network for display
    rating: null,
    reviewCount: null,
  };
}

async function searchNPPES({ zip, nameQuery, taxonomyCodes }) {
  const params = new URLSearchParams({
    version: '2.1',
    enumeration_type: 'NPI-1', // individual providers
    limit: 25,
    skip: 0,
  });

  if (zip) params.set('postal_code', zip);
  if (nameQuery) {
    const parts = nameQuery.trim().split(/\s+/);
    if (parts.length >= 2) {
      params.set('first_name', parts[0]);
      params.set('last_name', parts.slice(1).join(' '));
    } else {
      params.set('last_name', nameQuery.trim());
    }
  }
  if (taxonomyCodes && taxonomyCodes.length > 0) {
    params.set('taxonomy_description', taxonomyCodes[0].replace(/X/g, ''));
  } else {
    // Default: any dental taxonomy — use a broad dental code prefix
    params.set('taxonomy_description', 'Dentist');
  }

  const res = await fetch(`${NPPES_URL}?${params.toString()}`);
  if (!res.ok) throw new Error('NPPES request failed');
  const data = await res.json();
  const results = (data.results || []).map(normaliseProvider);

  // Org providers as fallback if < 10 individual results
  if (results.length < 10 && zip) {
    const params2 = new URLSearchParams({
      version: '2.1',
      enumeration_type: 'NPI-2', // organizations
      postal_code: zip,
      limit: 25,
      taxonomy_description: taxonomyCodes?.[0]?.replace(/X/g, '') || 'Dentist',
    });
    const res2 = await fetch(`${NPPES_URL}?${params2.toString()}`);
    if (res2.ok) {
      const data2 = await res2.json();
      const orgs = (data2.results || []).map(normaliseProvider);
      // deduplicate by NPI
      const seen = new Set(results.map((r) => r.npi));
      orgs.forEach((o) => { if (!seen.has(o.npi)) results.push(o); });
    }
  }

  return results;
}

const DentistSearchScreen = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const [dentists, setDentists] = useState([]);
  const [zip, setZip] = useState('');
  const [nameQuery, setNameQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState(
    route?.params?.filter === 'in-network' ? 'All' : 'All'
  );
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState('');
  const lastZipRef = useRef('');

  const doSearch = useCallback(async (options = {}) => {
    const searchZip = options.zip !== undefined ? options.zip : zip;
    const searchName = options.name !== undefined ? options.name : nameQuery;
    const filter = options.filter !== undefined ? options.filter : activeFilter;

    if (!searchZip && !searchName) return;

    setError('');
    if (!options.isRefresh) setLoading(true);
    try {
      const taxonomyCodes = SPECIALTY_TAXONOMIES[filter] || null;
      const results = await searchNPPES({
        zip: searchZip,
        nameQuery: searchName,
        taxonomyCodes,
      });
      setDentists(results);
      setHasSearched(true);
      lastZipRef.current = searchZip;
    } catch {
      setError('Unable to load providers. Please check your connection and try again.');
      if (dentists.length === 0) setDentists([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [zip, nameQuery, activeFilter, dentists.length]);

  const handleSearch = () => {
    Keyboard.dismiss();
    doSearch();
  };

  const handleFilterChange = (filter) => {
    setActiveFilter(filter);
    if (hasSearched) {
      doSearch({ filter });
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    doSearch({ isRefresh: true });
  }, [doSearch]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Find a Dentist</Text>

        {/* ZIP search row */}
        <View style={styles.searchRow}>
          <View style={styles.zipWrap}>
            <Text style={styles.searchIcon}>📍</Text>
            <TextInput
              style={styles.searchInput}
              value={zip}
              onChangeText={(t) => setZip(t.replace(/\D/g, '').slice(0, 5))}
              placeholder="ZIP Code"
              placeholderTextColor={colors.textSecondary}
              keyboardType="number-pad"
              maxLength={5}
              returnKeyType="search"
              onSubmitEditing={handleSearch}
            />
            {zip.length > 0 && (
              <TouchableOpacity onPress={() => setZip('')}>
                <Text style={styles.clearSearch}>✕</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={[styles.zipWrap, { flex: 2 }]}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              value={nameQuery}
              onChangeText={setNameQuery}
              placeholder="Name (optional)"
              placeholderTextColor={colors.textSecondary}
              autoCorrect={false}
              autoCapitalize="words"
              returnKeyType="search"
              onSubmitEditing={handleSearch}
            />
            {nameQuery.length > 0 && (
              <TouchableOpacity onPress={() => setNameQuery('')}>
                <Text style={styles.clearSearch}>✕</Text>
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            style={[styles.searchBtn, (!zip && !nameQuery) && styles.searchBtnDisabled]}
            onPress={handleSearch}
            activeOpacity={0.85}
            disabled={!zip && !nameQuery}
          >
            <Text style={styles.searchBtnText}>Search</Text>
          </TouchableOpacity>
        </View>

        {/* Specialty filters */}
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={FILTERS}
          keyExtractor={(item) => item}
          contentContainerStyle={styles.filterList}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.filterChip, activeFilter === item && styles.filterChipActive]}
              onPress={() => handleFilterChange(item)}
            >
              <Text style={[styles.filterText, activeFilter === item && styles.filterTextActive]}>
                {item}
              </Text>
            </TouchableOpacity>
          )}
        />

        {hasSearched && !loading && (
          <Text style={styles.resultCount}>
            {dentists.length} provider{dentists.length !== 1 ? 's' : ''} found
            {lastZipRef.current ? ` near ${lastZipRef.current}` : ''}
          </Text>
        )}
      </View>

      {loading ? (
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Searching real providers...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorState}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : !hasSearched ? (
        <View style={styles.promptState}>
          <Text style={styles.promptIcon}>🔍</Text>
          <Text style={styles.promptTitle}>Search Real Dental Providers</Text>
          <Text style={styles.promptSubtitle}>
            Enter a ZIP code to find actual licensed dentists in your area from the CMS National Provider Registry.
          </Text>
        </View>
      ) : (
        <FlatList
          data={dentists}
          keyExtractor={(item) => item.id?.toString()}
          renderItem={({ item }) => (
            <View style={styles.cardWrapper}>
              <DentistCard
                dentist={item}
                onPress={() => navigation.navigate('DentistDetail', { dentistId: item.id, dentist: item })}
              />
            </View>
          )}
          ListEmptyComponent={
            <EmptyState
              icon="🦷"
              title="No Providers Found"
              subtitle="Try a different ZIP code or specialty filter."
              actionLabel="Clear Filters"
              onAction={() => { setNameQuery(''); setActiveFilter('All'); }}
            />
          }
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        />
      )}
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
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 12,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  zipWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
  },
  searchIcon: {
    fontSize: 15,
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 9,
    fontSize: 14,
    color: colors.text,
  },
  clearSearch: {
    fontSize: 13,
    color: colors.textSecondary,
    padding: 4,
  },
  searchBtn: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  searchBtnDisabled: { opacity: 0.35 },
  searchBtnText: { fontSize: 13, fontWeight: '700', color: colors.white },
  filterList: {
    paddingBottom: 8,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  filterChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  filterText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  filterTextActive: {
    color: colors.white,
  },
  resultCount: {
    fontSize: 12,
    color: colors.textSecondary,
    paddingBottom: 6,
    fontWeight: '500',
  },
  loadingState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 40,
  },
  loadingText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 14,
  },
  errorState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  errorIcon: { fontSize: 36, marginBottom: 12 },
  errorText: {
    fontSize: 14,
    color: colors.error || '#e53935',
    textAlign: 'center',
    lineHeight: 20,
  },
  promptState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingBottom: 60,
  },
  promptIcon: { fontSize: 52, marginBottom: 16 },
  promptTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 10,
    textAlign: 'center',
  },
  promptSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 21,
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
    flexGrow: 1,
  },
  cardWrapper: {},
});

export default DentistSearchScreen;
