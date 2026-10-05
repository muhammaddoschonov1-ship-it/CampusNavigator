import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Animated, StatusBar, Modal, ScrollView
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../theme/LanguageContext';
import { spacing, borderRadius, typography } from '../theme/colors';
import SearchBar from '../components/SearchBar';
import RoomCard from '../components/RoomCard';
import { getAllRooms } from '../api/roomsService';

export default function SearchScreen({ navigation, route }) {
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedBuilding, setSelectedBuilding] = useState('all');
  const [selectedFloor, setSelectedFloor] = useState('all');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [rooms, setRooms] = useState([]);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const isFocused = useIsFocused();

  useEffect(() => {
    if (isFocused) {
      const loadRooms = async () => {
        const res = await getAllRooms();
        if (res.success) {
          setRooms(res.data);
        }
      };
      loadRooms();
    }
  }, [isFocused]);

  const CATEGORIES = [
    { id: 'all', label: t.allCategory, icon: 'apps' },
    { id: 'auditoriya', label: t.auditoriya, icon: 'school' },
    { id: 'kutubxona', label: t.kutubxona, icon: 'local-library' },
    { id: 'oshxona', label: t.oshxona, icon: 'restaurant' },
    { id: 'ofis', label: t.ofis, icon: 'business' },
    { id: 'sport', label: t.sport, icon: 'fitness-center' },
    { id: 'laboratoriya', label: t.lab, icon: 'computer' },
    { id: 'tibbiyot', label: t.tibbiyot, icon: 'local-hospital' },
  ];

  useEffect(() => {
    if (route.params?.filterType) setSelectedCategory(route.params.filterType);
  }, [route.params?.filterType]);

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, []);

  const filteredRooms = useMemo(() => {
    let result = rooms;
    if (selectedCategory !== 'all') result = result.filter((r) => r.type === selectedCategory);
    if (selectedBuilding !== 'all') result = result.filter((r) => r.building === selectedBuilding);
    if (selectedFloor !== 'all') result = result.filter((r) => String(r.floor) === selectedFloor);
    
    // Sort so that 'ofis' type rooms appear first
    result = [...result].sort((a, b) => {
      if (a.type === 'ofis' && b.type !== 'ofis') return -1;
      if (a.type !== 'ofis' && b.type === 'ofis') return 1;
      return 0;
    });

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((r) =>
        r.name.toLowerCase().includes(q) || r.building.toLowerCase().includes(q) ||
        r.type.toLowerCase().includes(q) || r.description.toLowerCase().includes(q)
      );
    }
    return result;
  }, [rooms, searchQuery, selectedCategory]);

  const handleRoomPress = (room) => navigation.navigate('RoomDetail', { room });
  
  const uniqueBuildings = useMemo(() => {
    const blds = new Set(rooms.map(r => r.building));
    return ['all', ...Array.from(blds)];
  }, [rooms]);
  const floors = ['all', '1', '2', '3', '4'];

  const styles = createStyles(colors);

  const renderCategory = ({ item }) => {
    const isActive = selectedCategory === item.id;
    const catColor = item.id === 'all' ? colors.primary : (colors.categoryColors[item.id] || colors.primary);
    return (
      <TouchableOpacity onPress={() => setSelectedCategory(item.id)} activeOpacity={0.7}
        style={[styles.categoryChip, isActive && { backgroundColor: catColor + '25', borderColor: catColor }]}>
        <MaterialIcons name={item.icon} size={16} color={isActive ? catColor : colors.textMuted} />
        <Text style={[styles.categoryLabel, isActive && { color: catColor, fontWeight: '700' }]}>{item.label}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} translucent={false} />
      <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
        <Text style={styles.title}>{t.searchTitle}</Text>
        <TouchableOpacity onPress={() => setShowFilterModal(true)}>
          <MaterialIcons name="tune" size={24} color={colors.textSecondary} />
        </TouchableOpacity>
      </Animated.View>
      <Animated.View style={[{ flex: 1 }, { opacity: fadeAnim }]}>
        <FlatList
          data={filteredRooms}
          renderItem={({ item, index }) => <RoomCard room={item} onPress={handleRoomPress} index={index} />}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={
            <>
              <View style={styles.searchContainer}>
                <SearchBar value={searchQuery} onChangeText={setSearchQuery} placeholder={t.searchPlaceholder2} autoFocus={false} />
              </View>
              <FlatList data={CATEGORIES} renderItem={renderCategory} keyExtractor={(i) => i.id} horizontal showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.categoriesContainer} style={styles.categoriesList} />
              <View style={styles.resultsHeader}>
                <Text style={styles.resultsCount}>{filteredRooms.length} {t.results}</Text>
                {selectedCategory !== 'all' && (
                  <TouchableOpacity onPress={() => setSelectedCategory('all')} style={styles.clearFilter}>
                    <Text style={styles.clearFilterText}>{t.clearFilter}</Text>
                    <MaterialIcons name="close" size={14} color={colors.primary} />
                  </TouchableOpacity>
                )}
              </View>
            </>
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIcon}>
                <MaterialIcons name="search-off" size={48} color={colors.textMuted} />
              </View>
              <Text style={styles.emptyTitle}>{t.nothingFound}</Text>
              <Text style={styles.emptySubtitle}>{t.tryAnother}</Text>
            </View>
          }
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      </Animated.View>

      {/* Filter Modal */}
      <Modal visible={showFilterModal} transparent animationType="slide" onRequestClose={() => setShowFilterModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t.filter}</Text>
              <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                <MaterialIcons name="close" size={24} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={styles.filterLabel}>{t.byBuilding}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
              {uniqueBuildings.map((bld) => (
                <TouchableOpacity
                  key={bld}
                  style={[styles.filterOption, selectedBuilding === bld && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                  onPress={() => setSelectedBuilding(bld)}
                >
                  <Text style={[styles.filterOptionText, selectedBuilding === bld && { color: '#FFF' }]}>
                    {bld === 'all' ? t.allCategory : bld}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.filterLabel}>{t.byFloor}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
              {floors.map((flr) => (
                <TouchableOpacity
                  key={flr}
                  style={[styles.filterOption, selectedFloor === flr && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                  onPress={() => setSelectedFloor(flr)}
                >
                  <Text style={[styles.filterOptionText, selectedFloor === flr && { color: '#FFF' }]}>
                    {flr === 'all' ? t.allCategory : flr + '-' + t.floor}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity style={styles.applyBtn} onPress={() => setShowFilterModal(false)}>
              <Text style={styles.applyBtnText}>{t.apply}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background, paddingTop: 16 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.lg, marginBottom: spacing.sm },
    title: { ...typography.hero, color: colors.textPrimary },
    searchContainer: { paddingHorizontal: spacing.lg, marginBottom: spacing.md },
    categoriesList: { marginBottom: spacing.md },
    categoriesContainer: { paddingHorizontal: spacing.lg, gap: spacing.sm },
    categoryChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: borderRadius.full, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, gap: 5 },
    categoryLabel: { ...typography.bodySmall, color: colors.textSecondary, fontWeight: '600' },
    resultsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.lg, marginBottom: spacing.md },
    resultsCount: { ...typography.bodySmall, color: colors.textMuted },
    clearFilter: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    clearFilterText: { ...typography.bodySmall, color: colors.primary, fontWeight: '600' },
    listContent: { paddingHorizontal: spacing.lg, paddingBottom: 120 },
    emptyContainer: { alignItems: 'center', paddingTop: 60, paddingHorizontal: spacing.xl },
    emptyIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center', marginBottom: spacing.lg, borderWidth: 1, borderColor: colors.border },
    emptyTitle: { ...typography.h2, color: colors.textPrimary, marginBottom: spacing.sm },
    emptySubtitle: { ...typography.body, color: colors.textSecondary, textAlign: 'center', lineHeight: 22 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: spacing.lg, paddingBottom: 40 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg },
    modalTitle: { ...typography.h2, color: colors.textPrimary },
    filterLabel: { ...typography.bodySmall, color: colors.textSecondary, fontWeight: '700', marginBottom: 8 },
    filterScroll: { marginBottom: spacing.lg, maxHeight: 40 },
    filterOption: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: borderRadius.full, borderWidth: 1, borderColor: colors.border, marginRight: 8, justifyContent: 'center' },
    filterOptionText: { ...typography.bodySmall, color: colors.textPrimary, fontWeight: '600' },
    applyBtn: { backgroundColor: colors.primary, paddingVertical: 14, borderRadius: borderRadius.lg, alignItems: 'center', marginTop: spacing.md },
    applyBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  });
