import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  RefreshControl,
  Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { dentistsAPI } from '../../api/dentists';
import { colors } from '../../utils/colors';
import DentistCard from '../../components/dentist/DentistCard';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';

const MOCK_DENTISTS = [
  { id: '1', name: 'Rachel Kim', specialty: 'General Dentistry', city: 'San Francisco', state: 'CA', distance: 0.8, inNetwork: true, rating: 4.9, reviewCount: 127 },
  { id: '2', name: 'David Park', specialty: 'Orthodontics', city: 'San Francisco', state: 'CA', distance: 1.2, inNetwork: true, rating: 4.8, reviewCount: 89 },
  { id: '3', name: 'Lisa Thompson', specialty: 'General Dentistry', city: 'Oakland', state: 'CA', distance: 2.1, inNetwork: true, rating: 4.7, reviewCount: 203 },
  { id: '4', name: 'James Lee', specialty: 'Periodontics', city: 'San Francisco', state: 'CA', distance: 1.5, inNetwork: false, rating: 4.9, reviewCount: 56 },
  { id: '5', name: 'Maria Santos', specialty: 'Pediatric Dentistry', city: 'Berkeley', state: 'CA', distance: 3.2, inNetwork: true, rating: 5.0, reviewCount: 44 },
  { id: '6', name: 'Robert Chen', specialty: 'Oral Surgery', city: 'San Francisco', state: 'CA', distance: 0.9, inNetwork: true, rating: 4.6, reviewCount: 178 },
  { id: '7', name: 'Jennifer Walsh', specialty: 'Endodontics', city: 'Daly City', state: 'CA', distance: 4.1, inNetwork: false, rating: 4.7, reviewCount: 92 },
  { id: '8', name: 'Kevin Zhang', specialty: 'Cosmetic Dentistry', city: 'San Mateo', state: 'CA', distance: 5.0, inNetwork: true, rating: 4.8, reviewCount: 61 },
];

const FILTERS = ['All', 'In-Network', 'General', 'Orthodontics', 'Oral Surgery', 'Periodontics'];

const DentistSearchScreen = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const [dentists, setDentists] = useState(MOCK_DENTISTS);
  const [filtered, setFiltered] = useState(MOCK_DENTISTS);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState(route?.params?.filter === 'in-network' ? 'In-Network' : 'All');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadDentists = useCallback(async (query = '') => {
    try {
      const data = await dentistsAPI.searchDentists({ query, limit: 20 });
      const list = data?.dentists || data || [];
      if (list.length > 0) {
        setDentists(list);
      }
    } catch {
      // Use mock data
    }
  }, []);

  useEffect(() => {
    loadDentists();
  }, [loadDentists]);

  useEffect(() => {
    let results = dentists;

    if (activeFilter === 'In-Network') {
      results = results.filter((d) => d.inNetwork || d.in_network);
    } else if (activeFilter !== 'All') {
      results = results.filter((d) =>
        (d.specialty || '').toLowerCase().includes(activeFilter.toLowerCase())
      );
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      results = results.filter(
        (d) =>
          (d.name || '').toLowerCase().includes(q) ||
          (d.specialty || '').toLowerCase().includes(q) ||
          (d.city || '').toLowerCase().includes(q)
      );
    }

    setFiltered(results);
  }, [dentists, activeFilter, search]);

  const handleSearch = (text) => {
    setSearch(text);
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadDentists(search);
    setRefreshing(false);
  }, [loadDentists, search]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Find a Dentist</Text>

        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={handleSearch}
            placeholder="Search by name, city, or specialty..."
            placeholderTextColor={colors.textSecondary}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
            onSubmitEditing={() => Keyboard.dismiss()}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Text style={styles.clearSearch}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={FILTERS}
          keyExtractor={(item) => item}
          contentContainerStyle={styles.filterList}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.filterChip, activeFilter === item && styles.filterChipActive]}
              onPress={() => setActiveFilter(item)}
            >
              <Text
                style={[styles.filterText, activeFilter === item && styles.filterTextActive]}
              >
                {item}
              </Text>
            </TouchableOpacity>
          )}
        />

        <Text style={styles.resultCount}>
          {filtered.length} dentist{filtered.length !== 1 ? 's' : ''} found
        </Text>
      </View>

      {loading ? (
        <LoadingSpinner message="Searching dentists..." />
      ) : (
        <FlatList
          data={filtered}
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
              title="No Dentists Found"
              subtitle="Try adjusting your search or filter criteria."
              actionLabel="Clear Filters"
              onAction={() => { setSearch(''); setActiveFilter('All'); }}
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
    paddingHorizontal: 20,
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
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.text,
  },
  clearSearch: {
    fontSize: 14,
    color: colors.textSecondary,
    padding: 4,
  },
  filterList: {
    paddingBottom: 8,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
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
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  filterTextActive: {
    color: colors.white,
  },
  resultCount: {
    fontSize: 12,
    color: colors.textSecondary,
    paddingBottom: 8,
    fontWeight: '500',
  },
  listContent: {
    padding: 20,
    paddingBottom: 100,
    flexGrow: 1,
  },
  cardWrapper: {},
});

export default DentistSearchScreen;
