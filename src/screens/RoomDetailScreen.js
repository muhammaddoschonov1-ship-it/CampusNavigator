import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Alert,
  StatusBar,
  Dimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../theme/LanguageContext';
import { spacing, borderRadius, typography } from '../theme/colors';
import * as Location from 'expo-location';
import NavigationMapView from '../components/NavigationMapView';
import { NDTU } from '../data/ndtuCampus';

const { width } = Dimensions.get('window');

const BUILDING_NAV_STEPS = {
  "1-o'quv binosi (Bosh bino)": [
    { icon: 'my-location', textKey: 'enterMainGate', meters: 0 },
    { icon: 'straight', textKey: 'walkStraight', meters: 50, detail: '50m' },
    { icon: 'turn-left', textKey: 'turnLeft', meters: 20 },
  ],
  'Markaziy kutubxona': [
    { icon: 'my-location', textKey: 'enterMainGate', meters: 0 },
    { icon: 'straight', textKey: 'walkStraight', meters: 80, detail: '80m' },
    { icon: 'turn-right', textKey: 'turnRight', meters: 25, detail: '25m' },
  ],
  'Talabalar oshxonasi': [
    { icon: 'my-location', textKey: 'enterMainGate', meters: 0 },
    { icon: 'straight', textKey: 'walkStraight', meters: 120, detail: '120m' },
    { icon: 'turn-right', textKey: 'turnRight', meters: 40, detail: '40m' },
  ],
  'Sport majmuasi': [
    { icon: 'my-location', textKey: 'enterMainGate', meters: 0 },
    { icon: 'straight', textKey: 'walkStraight', meters: 150, detail: '150m' },
    { icon: 'turn-right', textKey: 'turnRight', meters: 60, detail: '60m' },
  ],
  'IT va axborot texnologiyalari': [
    { icon: 'my-location', textKey: 'enterMainGate', meters: 0 },
    { icon: 'straight', textKey: 'walkStraight', meters: 130, detail: '130m' },
    { icon: 'turn-left', textKey: 'turnLeft', meters: 35, detail: '35m' },
  ],
  'Konchilik va metallurgiya': [
    { icon: 'my-location', textKey: 'enterMainGate', meters: 0 },
    { icon: 'straight', textKey: 'walkStraight', meters: 60, detail: '60m' },
    { icon: 'turn-left', textKey: 'turnLeft', meters: 30, detail: '30m' },
  ],
  'Talabalar yotoqxonasi': [
    { icon: 'my-location', textKey: 'enterMainGate', meters: 0 },
    { icon: 'straight', textKey: 'walkStraight', meters: 40, detail: '40m' },
    { icon: 'turn-left', textKey: 'turnLeft', meters: 80, detail: '80m' },
  ],
  "2-o'quv binosi": [
    { icon: 'my-location', textKey: 'enterMainGate', meters: 0 },
    { icon: 'straight', textKey: 'walkStraight', meters: 140, detail: '140m' },
    { icon: 'turn-right', textKey: 'turnRight', meters: 20, detail: '20m' },
  ],
};

const DEFAULT_STEPS = [
  { icon: 'my-location', textKey: 'enterMainGate', meters: 0 },
  { icon: 'straight', textKey: 'walkStraight', meters: 80, detail: '80m' },
];

export default function RoomDetailScreen({ route, navigation }) {
  const { room } = route.params;
  const { colors, isDark } = useTheme();
  const { t, language } = useLanguage();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const scrollViewRef = useRef(null);
  const subscriptionRef = useRef(null);

  const [showNavigation, setShowNavigation] = useState(false);
  const [transportMode, setTransportMode] = useState('foot');
  const [userLocation, setUserLocation] = useState(null);
  const [routeDistance, setRouteDistance] = useState(0);
  const [routeDuration, setRouteDuration] = useState(0);
  const [navError, setNavError] = useState('');
  const [isMapActive, setIsMapActive] = useState(false);

  const categoryColor = colors.categoryColors[room.type] || colors.primary;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, friction: 8, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 6, useNativeDriver: true }),
    ]).start();

    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.remove();
      }
    };
  }, []);

  const handleNavigate = async () => {
    setShowNavigation(true);
    setNavError('');
    
    setTimeout(() => {
      if (scrollViewRef.current) {
        scrollViewRef.current.scrollToEnd({ animated: true });
      }
    }, 600);

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      let pos = null;
      if (status === 'granted') {
        try {
          pos = await Location.getLastKnownPositionAsync({});
        } catch (e) {}

        if (!pos) {
          try {
            pos = await Location.getCurrentPositionAsync({
              accuracy: Location.Accuracy.Balanced,
              timeout: 6000,
            });
          } catch (e) {}
        }
      }

      if (pos && pos.coords) {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      } else {
        // Fallback: Agar GPS ruxsati yoki signali bo'lmasa, universitet darvozasidan boshlaymiz
        setUserLocation(NDTU.gate);
        setNavError("GPS aniqlanmadi. Asosiy darvozadan boshlab yo'l ko'rsatildi.");
      }
    } catch (err) {
      setUserLocation(NDTU.gate);
      setNavError("Asosiy darvozadan boshlab yo'l ko'rsatildi.");
    }
  };

  const handleCloseNavigation = () => {
    setShowNavigation(false);
    if (subscriptionRef.current) {
      subscriptionRef.current.remove();
      subscriptionRef.current = null;
    }
  };

  const onRouteData = useCallback((data) => {
    if (data.distance) setRouteDistance(Math.round(data.distance));
    if (data.duration) setRouteDuration(Math.ceil(data.duration / 60)); // to minutes
  }, []);



  const workingHours = room.workingHours || { weekday: '8:00 - 18:00', saturday: '9:00 - 14:00', sunday: t.dayOff };

  const INFO_ITEMS = [
    { icon: 'apartment', label: t.building, value: room.building },
    { icon: 'layers', label: t.floorLabel, value: `${room.floor}-${t.floor}` },
    { icon: 'category', label: t.type, value: room.type },
    { icon: 'people', label: t.capacity, value: `${room.capacity} ${t.seat}` },
  ];

  // Map building name to building id for highlighting
  const buildingIdMap = {
    "1-o'quv binosi (Bosh bino)": 'ndtu-1',
    "2-o'quv binosi": 'ndtu-2',
    'Markaziy kutubxona': 'ndtu-library',
    'Talabalar oshxonasi': 'ndtu-canteen',
    'IT va axborot texnologiyalari': 'ndtu-it-lab',
    'Konchilik va metallurgiya': 'ndtu-mining',
    'Sport majmuasi': 'ndtu-sport',
    'Talabalar yotoqxonasi': 'ndtu-dorm',
    'Tibbiyot punkti': 'ndtu-medical',
  };

  const styles = createStyles(colors);

  return (
    <View style={styles.container}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <MaterialIcons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{room.name}</Text>
      </View>

      <ScrollView ref={scrollViewRef} scrollEnabled={!isMapActive} style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <Animated.View style={[styles.heroContainer, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
          <LinearGradient colors={[categoryColor + '30', categoryColor + '08', colors.surface]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.heroGradient}>
            <View style={[styles.heroIcon, { backgroundColor: categoryColor + '25' }]}>
              <MaterialIcons name={room.icon || 'place'} size={52} color={categoryColor} />
            </View>
            <Text style={styles.heroName}>{room.name}</Text>
            <View style={styles.heroBadge}>
              <View style={[styles.statusDot, { backgroundColor: colors.success }]} />
              <Text style={styles.heroStatus}>{t.open}</Text>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Info Grid */}
        <Animated.View style={[styles.infoGrid, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          {INFO_ITEMS.map((item, index) => (
            <View key={index} style={styles.infoItem}>
              <LinearGradient colors={[colors.surfaceLight, colors.surface]} style={styles.infoGradient}>
                <MaterialIcons name={item.icon} size={22} color={categoryColor} />
                <Text style={styles.infoLabel}>{item.label}</Text>
                <Text style={styles.infoValue} numberOfLines={1}>{item.value}</Text>
              </LinearGradient>
            </View>
          ))}
        </Animated.View>

        {/* Description */}
        <Animated.View style={[styles.sectionCard, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <LinearGradient colors={[colors.surfaceLight, colors.surface]} style={styles.sectionGradient}>
            <View style={styles.sectionHeader}>
              <MaterialIcons name="info-outline" size={20} color={colors.accent} />
              <Text style={styles.sectionTitle}>{t.description}</Text>
            </View>
            <Text style={styles.sectionText}>{room.description}</Text>
          </LinearGradient>
        </Animated.View>

        {/* Working Hours */}
        <Animated.View style={[styles.sectionCard, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <LinearGradient colors={[colors.surfaceLight, colors.surface]} style={styles.sectionGradient}>
            <View style={styles.sectionHeader}>
              <MaterialIcons name="schedule" size={20} color={colors.warning} />
              <Text style={styles.sectionTitle}>{t.workingHours}</Text>
            </View>
            <View style={styles.hoursRow}>
              <Text style={styles.hoursDay}>{t.monFri}</Text>
              <Text style={styles.hoursTime}>{workingHours.weekday}</Text>
            </View>
            <View style={styles.hoursDivider} />
            <View style={styles.hoursRow}>
              <Text style={styles.hoursDay}>{t.saturday}</Text>
              <Text style={workingHours.saturday === t.dayOff || workingHours.saturday === 'Dam olish' ? styles.hoursTimeOff : styles.hoursTime}>
                {workingHours.saturday}
              </Text>
            </View>
            <View style={styles.hoursDivider} />
            <View style={styles.hoursRow}>
              <Text style={workingHours.sunday === t.dayOff || workingHours.sunday === 'Dam olish' ? styles.hoursDayOff : styles.hoursDay}>{t.sunday}</Text>
              <Text style={workingHours.sunday === t.dayOff || workingHours.sunday === 'Dam olish' ? styles.hoursTimeOff : styles.hoursTime}>
                {workingHours.sunday}
              </Text>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Navigation Panel */}
        {showNavigation && (
          <View style={styles.navPanel}>
            <LinearGradient colors={[categoryColor + '12', colors.surface]} style={styles.navGradient}>
              {/* Nav Header */}
              <View style={styles.navHeader}>
                <View style={styles.navTitleRow}>
                  <MaterialIcons name="near-me" size={22} color={categoryColor} />
                  <Text style={styles.navTitle}>{t.navigation}</Text>
                </View>
                <TouchableOpacity onPress={handleCloseNavigation}>
                  <MaterialIcons name="close" size={22} color={colors.textMuted} />
                </TouchableOpacity>
              </View>

              {/* Transport Mode Toggle */}
              <View style={styles.modeToggleRow}>
                <TouchableOpacity 
                  style={[styles.modeBtn, transportMode === 'foot' && { backgroundColor: categoryColor + '30', borderColor: categoryColor }]}
                  onPress={() => setTransportMode('foot')}
                >
                  <MaterialIcons name="directions-walk" size={20} color={transportMode === 'foot' ? categoryColor : colors.textMuted} />
                  <Text style={[styles.modeBtnText, transportMode === 'foot' ? { color: categoryColor } : { color: colors.textMuted }]}>
                    Piyoda
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.modeBtn, transportMode === 'driving' && { backgroundColor: categoryColor + '30', borderColor: categoryColor }]}
                  onPress={() => setTransportMode('driving')}
                >
                  <MaterialIcons name="directions-car" size={20} color={transportMode === 'driving' ? categoryColor : colors.textMuted} />
                  <Text style={[styles.modeBtnText, transportMode === 'driving' ? { color: categoryColor } : { color: colors.textMuted }]}>
                    Mashinada
                  </Text>
                </TouchableOpacity>
              </View>

              {navError ? (
                <Text style={{ color: colors.error, marginBottom: 10 }}>{navError}</Text>
              ) : null}

              {/* Navigation Map */}
              <View style={styles.miniMapContainer}>
                <NavigationMapView
                  building={room.building}
                  userLocation={userLocation}
                  transportMode={transportMode}
                  onRouteData={onRouteData}
                  onMapTouch={setIsMapActive}
                />
              </View>

              {/* ETA info bar */}
              <View style={[styles.etaBar, { backgroundColor: categoryColor + '12', borderColor: categoryColor + '25' }]}>
                <View style={styles.etaItem}>
                  <MaterialIcons name={transportMode === 'foot' ? "directions-walk" : "directions-car"} size={18} color={categoryColor} />
                  <Text style={[styles.etaValue, { color: categoryColor }]}>{routeDistance}m</Text>
                  <Text style={styles.etaLabel}>{t.approxDistance}</Text>
                </View>
                <View style={[styles.etaDivider, { backgroundColor: categoryColor + '30' }]} />
                <View style={styles.etaItem}>
                  <MaterialIcons name="schedule" size={18} color={categoryColor} />
                  <Text style={[styles.etaValue, { color: categoryColor }]}>{routeDuration}</Text>
                  <Text style={styles.etaLabel}>{t.minuteWalk || 'Daqiqa'}</Text>
                </View>
                <View style={[styles.etaDivider, { backgroundColor: categoryColor + '30' }]} />
                <View style={styles.etaItem}>
                  <MaterialIcons name="layers" size={18} color={categoryColor} />
                  <Text style={[styles.etaValue, { color: categoryColor }]}>{room.floor}</Text>
                  <Text style={styles.etaLabel}>{t.floorLabel}</Text>
                </View>
              </View>
            </LinearGradient>
          </View>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Bottom Button */}
      <Animated.View style={[styles.bottomBar, { opacity: fadeAnim }]}>
        <TouchableOpacity
          style={styles.navigateBtn}
          onPress={showNavigation ? handleCloseNavigation : handleNavigate}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={showNavigation ? [colors.textMuted, colors.textMuted + 'CC'] : [categoryColor, categoryColor + 'CC']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.navigateGradient}
          >
            <MaterialIcons name={showNavigation ? 'close' : 'near-me'} size={22} color="#FFF" />
            <Text style={styles.navigateText}>{showNavigation ? t.closeNav : t.navigate}</Text>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: { flexDirection: 'row', alignItems: 'center', paddingTop: 55, paddingHorizontal: spacing.lg, paddingBottom: spacing.md, backgroundColor: colors.background },
    backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: colors.border },
    headerTitle: { ...typography.h3, color: colors.textPrimary, flex: 1, textAlign: 'center', marginHorizontal: spacing.sm },
    shareBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: colors.border },
    scrollView: { flex: 1 },
    scrollContent: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
    // Hero
    heroContainer: { marginBottom: spacing.lg, borderRadius: borderRadius.xl, overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
    heroGradient: { alignItems: 'center', paddingVertical: spacing.xl, paddingHorizontal: spacing.lg, borderRadius: borderRadius.xl },
    heroIcon: { width: 96, height: 96, borderRadius: borderRadius.xl, justifyContent: 'center', alignItems: 'center', marginBottom: spacing.md },
    heroName: { ...typography.hero, color: colors.textPrimary, textAlign: 'center', marginBottom: spacing.sm },
    heroBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.success + '15', paddingHorizontal: 12, paddingVertical: 5, borderRadius: borderRadius.full, gap: 6 },
    statusDot: { width: 8, height: 8, borderRadius: 4 },
    heroStatus: { ...typography.bodySmall, color: colors.success, fontWeight: '600' },
    // Info
    infoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
    infoItem: { width: (width - spacing.lg * 2 - spacing.sm) / 2, borderRadius: borderRadius.lg, overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
    infoGradient: { padding: spacing.md, borderRadius: borderRadius.lg, alignItems: 'center', gap: 4 },
    infoLabel: { ...typography.caption, color: colors.textMuted },
    infoValue: { ...typography.h3, color: colors.textPrimary, textAlign: 'center' },
    // Section cards
    sectionCard: { marginBottom: spacing.md, borderRadius: borderRadius.lg, overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
    sectionGradient: { padding: spacing.lg, borderRadius: borderRadius.lg },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: spacing.sm },
    sectionTitle: { ...typography.h3, color: colors.textPrimary },
    sectionText: { ...typography.body, color: colors.textSecondary, lineHeight: 24 },
    // Hours
    hoursRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
    hoursDay: { ...typography.body, color: colors.textSecondary },
    hoursTime: { ...typography.body, color: colors.accent, fontWeight: '600' },
    hoursDayOff: { ...typography.body, color: colors.textMuted },
    hoursTimeOff: { ...typography.body, color: colors.error, fontWeight: '600' },
    hoursDivider: { height: 1, backgroundColor: colors.border },
    // Navigation Panel
    navPanel: { marginBottom: spacing.md, borderRadius: borderRadius.lg, overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
    navGradient: { padding: spacing.lg, borderRadius: borderRadius.lg },
    navHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
    navTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    navTitle: { ...typography.h2, color: colors.textPrimary },
    miniMapContainer: { marginBottom: spacing.md, borderRadius: borderRadius.lg, overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
    etaBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingVertical: 12, borderRadius: borderRadius.lg, borderWidth: 1, marginBottom: spacing.md },
    etaItem: { alignItems: 'center', gap: 2 },
    etaValue: { fontSize: 18, fontWeight: '800' },
    etaLabel: { ...typography.caption, color: colors.textMuted, fontSize: 10 },
    etaDivider: { width: 1, height: 30 },
    // Progress
    progressContainer: { marginBottom: spacing.md },
    progressBar: { height: 6, backgroundColor: colors.surfaceHighlight, borderRadius: 3, overflow: 'hidden', marginBottom: 6 },
    progressFill: { height: '100%', borderRadius: 3 },
    progressText: { ...typography.bodySmall, color: colors.textSecondary, fontWeight: '600' },
    // Steps
    stepRow: { flexDirection: 'row', marginBottom: 0 },
    stepLine: { alignItems: 'center', width: 36 },
    stepDot: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
    stepConnector: { width: 2, height: 28 },
    stepContent: { flex: 1, paddingLeft: spacing.sm, paddingBottom: spacing.md },
    stepText: { ...typography.body, color: colors.textPrimary, fontWeight: '500' },
    stepSubtext: { ...typography.bodySmall, color: colors.textMuted, marginTop: 2 },
    activeIndicator: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
    // Distance
    distanceInfo: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.sm, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
    distanceText: { ...typography.bodySmall, color: colors.textMuted },
    // Toggle
    modeToggleRow: { flexDirection: 'row', gap: 10, marginBottom: spacing.md },
    modeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.border, gap: 6 },
    modeBtnText: { ...typography.body, fontWeight: '600' },
    // Bottom
    bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: spacing.lg, paddingBottom: 34, paddingTop: spacing.md, backgroundColor: colors.background + 'F0' },
    navigateBtn: { borderRadius: borderRadius.lg, overflow: 'hidden' },
    navigateGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: borderRadius.lg, gap: 8 },
    navigateText: { ...typography.button, color: '#FFF', fontSize: 17 },
  });
