import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Dimensions,
  StatusBar,
  Image,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../theme/LanguageContext';
import { spacing, borderRadius, typography } from '../theme/colors';
import { useIsFocused } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SearchBar from '../components/SearchBar';
import LeafletMap from '../components/LeafletMap';
import { getAllRooms } from '../api/roomsService';
import { getFullSchedule } from '../api/scheduleService';

const { width } = Dimensions.get('window');

export default function HomeScreen({ navigation, user, onLogout }) {
  const { colors, isDark } = useTheme();
  const { t, language } = useLanguage();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const [searchQuery, setSearchQuery] = useState('');
  const [mapView, setMapView] = useState('real');
  const [rooms, setRooms] = useState([]);
  const [scheduleData, setScheduleData] = useState(null);
  const popularRooms = [...rooms]
    .sort((a, b) => {
      if (a.type === 'ofis' && b.type !== 'ofis') return -1;
      if (a.type !== 'ofis' && b.type === 'ofis') return 1;
      return 0;
    })
    .slice(0, 4);
  const [unreadNotifs, setUnreadNotifs] = useState(false);
  const isFocused = useIsFocused();

  useEffect(() => {
    if (isFocused) {
      const loadRooms = async () => {
        const res = await getAllRooms();
        if (res.success) {
          setRooms(res.data);
        }
      };
      const loadSchedule = async () => {
        const res = await getFullSchedule();
        if (res.success) {
          setScheduleData(res.data);
        }
      };
      loadRooms();
      loadSchedule();

      const checkUnread = async () => {
        try {
          const storedRead = await AsyncStorage.getItem('@read_notifications_ids');
          const readIds = storedRead ? JSON.parse(storedRead) : [];
          
          const storedNotifs = await AsyncStorage.getItem('@notifications_list');
          let notifList = [];
          if (storedNotifs) {
            notifList = JSON.parse(storedNotifs);
          } else {
            // ID '1' is "Dars jadvali o'zgardi" (schedule), filter it for guests
            const defaultUnreadIds = user?.isGuest ? ['2', '3'] : ['1', '2', '3'];
            const hasUnread = defaultUnreadIds.some(id => !readIds.includes(id));
            setUnreadNotifs(hasUnread);
            return;
          }
          
          if (user?.isGuest) {
            notifList = notifList.filter(n => {
              const titleLower = n.title.toLowerCase();
              const messageLower = n.message.toLowerCase();
              const isSchedule = titleLower.includes('jadval') || titleLower.includes('dars') || titleLower.includes('расписание') ||
                                 titleLower.includes('пара') || titleLower.includes('заняти') ||
                                 messageLower.includes('jadval') || messageLower.includes('dars') || messageLower.includes('расписание') ||
                                 messageLower.includes('пара') || messageLower.includes('заняти');
              return !isSchedule;
            });
          }
          
          const hasUnread = notifList.some(n => !readIds.includes(n.id) && !n.read);
          setUnreadNotifs(hasUnread);
        } catch (e) {
          setUnreadNotifs(true);
        }
      };
      checkUnread();
    }
  }, [isFocused]);

  const QUICK_LINKS = [
    { id: 'auditoriya', label: t.auditoriyalar, icon: 'school', color: colors.categoryColors.auditoriya },
    { id: 'kutubxona', label: t.kutubxona, icon: 'local-library', color: colors.categoryColors.kutubxona },
    { id: 'oshxona', label: t.oshxona, icon: 'restaurant', color: colors.categoryColors.oshxona },
    { id: 'sport', label: t.sport, icon: 'fitness-center', color: colors.categoryColors.sport },
    { id: 'ofis', label: t.ofis, icon: 'business', color: colors.categoryColors.ofis || '#795548' },
  ];

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 0,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleSearchFocus = () => navigation.navigate('SearchTab');
  const handleQuickLink = (type) => navigation.navigate('SearchTab', { filterType: type });
  const handleRoomPress = (room) => navigation.navigate('RoomDetail', { room });
  const handleNotifications = () => navigation.navigate('Notifications');

  const handleBuildingPress = useCallback((building) => {
    const buildingNameMap = {
      'ndtu-1': "1-o'quv binosi (Bosh bino)",
      'ndtu-2': "2-o'quv binosi",
      'ndtu-library': 'Markaziy kutubxona',
      'ndtu-canteen': 'Talabalar oshxonasi',
      'ndtu-it-lab': 'IT va axborot texnologiyalari',
      'ndtu-mining': 'Konchilik va metallurgiya',
      'ndtu-sport': 'Sport majmuasi',
      'ndtu-medical': 'Tibbiyot punkti',
      'ndtu-dorm': 'Talabalar yotoqxonasi',
    };
    const bName = buildingNameMap[building.id] || building.name;
    const room = rooms.find((r) => r.building === bName);
    if (room) {
      handleRoomPress(room);
    }
  }, [rooms, navigation]);

  const getTodaySchedule = () => {
    if (!scheduleData) return { classes: [], title: 'Jadval yuklanmoqda...', isNextDay: false };
    if (!user || user.isGuest || user.role === 'admin') return { classes: [], title: 'Dars jadvali' };
    const now = new Date();
    const today = now.getDay();
    const groupSchedule = scheduleData[user.group] || scheduleData['default'] || {};
    let classes = groupSchedule[String(today)] || [];

    let areClassesOver = false;
    if (classes.length > 0) {
      const lastClass = classes[classes.length - 1];
      const endTime = lastClass.endTime; 
      if (endTime) {
        const [hours, minutes] = endTime.split(':').map(Number);
        const currentHours = now.getHours();
        const currentMinutes = now.getMinutes();
        if (currentHours > hours || (currentHours === hours && currentMinutes >= minutes)) {
          areClassesOver = true;
        }
      }
    } else {
      areClassesOver = true;
    }

    if (!areClassesOver) {
      return { classes, title: t.todaySchedule, isNextDay: false };
    }

    let nextDay = today;
    let daysAdded = 0;
    while (daysAdded < 7) {
      nextDay = (nextDay + 1) % 7;
      daysAdded++;
      const nextClasses = groupSchedule[String(nextDay)] || [];
      if (nextClasses.length > 0) {
        const nextDate = new Date();
        nextDate.setDate(now.getDate() + daysAdded);
        const dateString = `${nextDate.getDate()}-${t.monthNames[nextDate.getMonth()]}`;
        const dayLabel = daysAdded === 1 ? t.tomorrow : `${t.dayNames[nextDay]} ${t.kungi}`;
        return { classes: nextClasses, title: `${dayLabel} ${t.jadval}`, dateString: dateString, isNextDay: true };
      }
    }
    return { classes: [], title: t.schedule, isNextDay: false };
  };

  const scheduleInfo = getTodaySchedule();
  const todayClasses = scheduleInfo.classes;

  const handleSchedulePress = (scheduleItem) => {
    const roomString = scheduleItem.room;
    if (!roomString) return;
    let foundRoom = rooms.find(r => r.name.toLowerCase() === roomString.toLowerCase());
    if (!foundRoom) {
      const numbersInString = roomString.match(/\d{3,}/);
      if (numbersInString) {
        const roomNum = numbersInString[0];
        foundRoom = rooms.find(r => r.name.includes(roomNum));
      }
    }
    if (!foundRoom) {
      foundRoom = rooms.find(r => roomString.toLowerCase().includes(r.name.toLowerCase()) || r.name.toLowerCase().includes(roomString.toLowerCase()));
    }
    if (foundRoom) {
      navigation.navigate('RoomDetail', { room: foundRoom });
    } else {
      Alert.alert('Xatolik', `Tizimdan ${roomString} topilmadi.`);
    }
  };

  const userName = user?.name || (language === 'ru' ? 'Гость' : 'Mehmon');
  const styles = createStyles(colors);

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
      />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Animated.View
          style={[styles.header, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
        >
          <View>
            <Text style={styles.greeting}>{t.greeting} 👋 {userName}</Text>
            <Text style={styles.title}>{t.appTitle}</Text>
            <Text style={styles.subtitle}>{t.universityName}</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
            {user?.isGuest && (
              <TouchableOpacity style={styles.logoutBtnGuest} onPress={onLogout} activeOpacity={0.7}>
                <MaterialIcons name="exit-to-app" size={24} color={colors.error} />
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.notificationBtn} onPress={handleNotifications}>
              <MaterialIcons name="notifications-none" size={26} color={colors.textPrimary} />
              {unreadNotifs && <View style={styles.notifBadge} />}
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Search Bar */}
        <Animated.View
          style={[styles.searchContainer, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
        >
          <SearchBar
            value={searchQuery}
            onChangeText={setSearchQuery}
            onFocus={handleSearchFocus}
            placeholder={t.searchPlaceholder}
          />
        </Animated.View>

        {/* Campus Map */}
        <Animated.View style={[styles.mapSection, { opacity: fadeAnim }]}>
          <View style={styles.mapHeader}>
            <MaterialIcons name="map" size={20} color={colors.accent} />
            <Text style={styles.mapTitle}>{t.campusMap}</Text>
            {/* Map view toggle */}
            <View style={styles.mapToggle}>
              <TouchableOpacity
                style={[
                  styles.mapToggleBtn,
                  mapView === 'real' && { backgroundColor: colors.primary },
                ]}
                onPress={() => setMapView('real')}
              >
                <MaterialIcons
                  name="satellite"
                  size={14}
                  color={mapView === 'real' ? '#FFF' : colors.textMuted}
                />
                <Text style={[
                  styles.mapToggleText,
                  { color: mapView === 'real' ? '#FFF' : colors.textMuted },
                ]}>{t.mapView}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.mapToggleBtn,
                  mapView === 'blueprint' && { backgroundColor: colors.primary },
                ]}
                onPress={() => setMapView('blueprint')}
              >
                <MaterialIcons
                  name="layers"
                  size={14}
                  color={mapView === 'blueprint' ? '#FFF' : colors.textMuted}
                />
                <Text style={[
                  styles.mapToggleText,
                  { color: mapView === 'blueprint' ? '#FFF' : colors.textMuted },
                ]}>{t.blueprintView}</Text>
              </TouchableOpacity>
            </View>
          </View>
          {mapView === 'real' ? (
            <View>
              <LeafletMap
                onBuildingPress={handleBuildingPress}
                language={language}
              />
            </View>
          ) : (
            <BlueprintView
              colors={colors}
              language={language}
            />
          )}
        </Animated.View>

        {/* Schedule Section */}
        {!user?.isGuest && user?.role !== 'admin' && (
          <Animated.View style={[styles.section, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <View style={styles.sectionHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <MaterialIcons name="event-note" size={20} color={colors.accent} />
                <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>{scheduleInfo.title}</Text>
              </View>
            </View>
            {scheduleInfo.isNextDay && (
              <Text style={[styles.savedMeta, { marginLeft: 26, marginTop: -8, marginBottom: 12, color: colors.primary, fontWeight: '600' }]}>
                📅 {scheduleInfo.dateString}
              </Text>
            )}
            {todayClasses.length === 0 ? (
              <Text style={[styles.savedMeta, { marginLeft: 10 }]}>{t.noClasses}</Text>
            ) : (
              todayClasses.map((item, index) => (
                <TouchableOpacity key={index} style={styles.savedItem} onPress={() => handleSchedulePress(item)}>
                  <View style={[styles.savedIcon, { backgroundColor: colors.primary + '20' }]}>
                    <MaterialIcons name="schedule" size={20} color={colors.primary} />
                  </View>
                  <View style={styles.savedContent}>
                    <Text style={styles.savedName}>{item.subject} ({t[item.type] || item.type})</Text>
                    <Text style={styles.savedMeta}>{item.time} • {item.room}</Text>
                  </View>
                  <MaterialIcons name="chevron-right" size={20} color={colors.textMuted} />
                </TouchableOpacity>
              ))
            )}
          </Animated.View>
        )}

        {/* Quick Links */}
        <Animated.View
          style={[styles.section, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
        >
          <Text style={styles.sectionTitle}>{t.quickLinks}</Text>
          <View style={styles.quickLinksGrid}>
            {QUICK_LINKS.map((link) => (
              <QuickLinkCard
                key={link.id}
                link={link}
                colors={colors}
                onPress={() => handleQuickLink(link.id)}
              />
            ))}
          </View>
        </Animated.View>

        {/* Popular Places */}
        <Animated.View
          style={[styles.section, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
        >
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t.popularPlaces}</Text>
            <TouchableOpacity onPress={() => navigation.navigate('SearchTab')}>
              <Text style={styles.seeAllText}>{t.seeAll}</Text>
            </TouchableOpacity>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.popularScroll}
          >
             {popularRooms.map((room, index) => (
               <PopularCard
                 key={room.id}
                 room={room}
                 index={index}
                 colors={colors}
                 t={t}
                 onPress={() => handleRoomPress(room)}
               />
             ))}
          </ScrollView>
        </Animated.View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

function QuickLinkCard({ link, onPress, colors }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const styles = createStyles(colors);
  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }], flex: 1 }}>
      <TouchableOpacity
        style={styles.quickLink}
        activeOpacity={0.7}
        onPress={onPress}
        onPressIn={() => Animated.spring(scaleAnim, { toValue: 0.93, friction: 8, useNativeDriver: true }).start()}
        onPressOut={() => Animated.spring(scaleAnim, { toValue: 1, friction: 5, useNativeDriver: true }).start()}
      >
        <LinearGradient colors={[link.color + '20', link.color + '08']} style={styles.quickLinkGradient}>
          <View style={[styles.quickLinkIcon, { backgroundColor: link.color + '25' }]}>
            <MaterialIcons name={link.icon} size={24} color={link.color} />
          </View>
          <Text style={styles.quickLinkLabel} numberOfLines={1}>{link.label}</Text>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
}

function PopularCard({ room, index, onPress, colors, t }) {
  const categoryColor = colors.categoryColors[room.type] || colors.primary;
  const styles = createStyles(colors);
  return (
    <TouchableOpacity style={[styles.popularCard, index === 0 && { marginLeft: 0 }]} activeOpacity={0.8} onPress={onPress}>
      <LinearGradient colors={[categoryColor + '25', colors.surface]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.popularGradient}>
        <View style={[styles.popularIcon, { backgroundColor: categoryColor + '30' }]}>
          <MaterialIcons name={room.icon || 'place'} size={28} color={categoryColor} />
        </View>
        <Text style={styles.popularName} numberOfLines={1}>{room.name}</Text>
        <Text style={styles.popularBuilding}>{room.building}</Text>
        <View style={styles.popularFloor}>
          <MaterialIcons name="layers" size={12} color={colors.textMuted} />
          <Text style={styles.popularFloorText}>{room.floor}-{t.floor}</Text>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

function BlueprintView({ colors, language }) {
  const [selectedBld, setSelectedBld] = useState('bosh-bino');
  const [selectedFloor, setSelectedFloor] = useState(1);
  const styles = createStyles(colors);

  const blueprints = {
    'bosh-bino': {
      tabLabel: language === 'ru' ? '1-й корпус' : "1-bino",
      title: language === 'ru' ? '1-й учебный корпус' : "1-o'quv binosi (Bosh bino)",
      floors: [
        { floor: 1, image: require('../../assets/bosh_bino_blueprint.jpg'), desc: language === 'ru' ? "1-й этаж: Деканат, Ректорат, аудитории 101-108" : "1-qavat: Kirish, Dekanat, Qabulxona, 101-108 auditoriyalar" },
        { floor: 2, image: require('../../assets/bosh_bino_blueprint.jpg'), desc: language === 'ru' ? "2-й этаж: Лекционные залы, аудитории 201-215" : "2-qavat: Ma'ruzalar zallari, 201-215 auditoriyalar, O'qituvchilar xonasi" },
        { floor: 3, image: require('../../assets/bosh_bino_blueprint.jpg'), desc: language === 'ru' ? "3-й этаж: Компьютерные лаборатории, аудитории 301-312" : "3-qavat: Kompyuter laboratoriyalari, 301-312 auditoriyalar" },
        { floor: 4, image: require('../../assets/bosh_bino_blueprint.jpg'), desc: language === 'ru' ? "4-й этаж: Кафедры, Научный отдел, аудитории 401-410" : "4-qavat: Kafedralar, Ilmiy bo'lim, 401-410 auditoriyalar" },
      ],
    },
    'bino-2': {
      tabLabel: language === 'ru' ? '2-й корпус' : "2-bino",
      title: language === 'ru' ? '2-й учебный корпус' : "2-o'quv binosi",
      floors: [
        { floor: 1, image: require('../../assets/bino_2_blueprint.jpg'), desc: language === 'ru' ? "1-й этаж: Вестибюль, Союз молодежи, аудитории 110-120" : "1-qavat: Foyye, Yoshlar ittifoqi, 110-120 auditoriyalar" },
        { floor: 2, image: require('../../assets/bino_2_blueprint.jpg'), desc: language === 'ru' ? "2-й этаж: Лаборатории химии и физики, аудитории 220-235" : "2-qavat: Laboratoriyalar, 220-235 auditoriyalar" },
        { floor: 3, image: require('../../assets/bino_2_blueprint.jpg'), desc: language === 'ru' ? "3-й этаж: Музей горного дела, аудитории 330-340" : "3-qavat: Konchilik muzeyi, 330-340 auditoriyalar" },
      ],
    },
    'kutubxona': {
      tabLabel: language === 'ru' ? 'Библиотека' : "Kutubxona",
      title: language === 'ru' ? 'Центральная библиотека' : "Markaziy kutubxona",
      floors: [
        { floor: 1, image: require('../../assets/kutubxona_blueprint.jpg'), desc: language === 'ru' ? "1-й этаж: Регистрация, читальный зал, Книжный фонд" : "1-qavat: Ro'yxatdan o'tish, Bosh zal, Kitob saqlash fondi" },
        { floor: 2, image: require('../../assets/kutubxona_blueprint.jpg'), desc: language === 'ru' ? "2-й этаж: Электронная библиотека, Коворкинг центр, Медиа зал" : "2-qavat: Elektron kutubxona, Co-working markazi, Media zal" },
      ],
    },
    'yotoqxona': {
      tabLabel: language === 'ru' ? 'Общежитие' : "Yotoqxona",
      title: language === 'ru' ? 'Студенческое общежитие' : "Talabalar yotoqxonasi",
      floors: [
        { floor: 1, image: require('../../assets/dorm_blueprint.jpg'), desc: language === 'ru' ? "1-й этаж: Комната дежурного, Кухня, Прачечная, комнаты 1-8" : "1-qavat: Navbatchi xonasi, Oshxona, Kir yuvish xonasi, 1-8 xonalar" },
        { floor: 2, image: require('../../assets/dorm_blueprint.jpg'), desc: language === 'ru' ? "2-й этаж: Зал отдыха, жилые комнаты 9-24" : "2-qavat: Dam olish zali, 9-24 talabalar yotoq xonalari" },
        { floor: 3, image: require('../../assets/dorm_blueprint.jpg'), desc: language === 'ru' ? "3-й этаж: Библиотечный уголок, жилые комнаты 25-40" : "3-qavat: Kutubxona burchagi, 25-40 talabalar yotoq xonalari" },
      ],
    },
  };

  const handleBuildingChange = (key) => {
    setSelectedBld(key);
    setSelectedFloor(1);
  };

  const currentBuilding = blueprints[selectedBld];
  const currentFloorData = currentBuilding.floors.find(f => f.floor === selectedFloor) || currentBuilding.floors[0];

  return (
    <View style={styles.blueprintContainer}>
      {/* Selector Tabs (Horizontal Scroll) */}
      <View style={styles.selectorWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.selectorScroll}
        >
          {Object.keys(blueprints).map((key) => {
            const bld = blueprints[key];
            const isSelected = selectedBld === key;
            return (
              <TouchableOpacity
                key={key}
                style={[
                  styles.selectorTab,
                  isSelected && { backgroundColor: colors.primary, borderColor: colors.primary },
                ]}
                onPress={() => handleBuildingChange(key)}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.selectorText,
                  { color: isSelected ? '#FFF' : colors.textSecondary },
                ]}>
                  {bld.tabLabel}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Floor Selector Row */}
      <View style={styles.floorSelectorRow}>
        <Text style={styles.floorLabelText}>{language === 'ru' ? 'Этаж:' : 'Qavat:'}</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.floorScroll}
        >
          {currentBuilding.floors.map((f) => {
            const isSelected = selectedFloor === f.floor;
            return (
              <TouchableOpacity
                key={f.floor}
                style={[
                  styles.floorTab,
                  isSelected && { backgroundColor: colors.accent, borderColor: colors.accent },
                ]}
                onPress={() => setSelectedFloor(f.floor)}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.floorText,
                  { color: isSelected ? '#FFF' : colors.textPrimary },
                ]}>
                  {f.floor}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Image Display */}
      <View style={styles.imageWrapper}>
        <Image
          source={currentFloorData.image}
          style={styles.blueprintImage}
          resizeMode="cover"
        />
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.85)']}
          style={styles.imageOverlay}
        >
          <Text style={styles.overlayTitle}>{currentBuilding.title} - {selectedFloor}-{language === 'ru' ? 'этаж' : 'qavat'}</Text>
          <Text style={styles.overlayDesc}>{currentFloorData.desc}</Text>
        </LinearGradient>
      </View>
    </View>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scrollView: { flex: 1 },
    scrollContent: { paddingTop: 60, paddingHorizontal: spacing.lg },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg },
    greeting: { ...typography.body, color: colors.textSecondary, marginBottom: 2 },
    title: { ...typography.hero, color: colors.textPrimary },
    subtitle: { ...typography.bodySmall, color: colors.accent, fontWeight: '600', marginTop: 2 },
    notificationBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: colors.border },
    logoutBtnGuest: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: colors.border },
    notifBadge: { position: 'absolute', top: 10, right: 12, width: 8, height: 8, borderRadius: 4, backgroundColor: colors.accent },
    searchContainer: { marginBottom: spacing.lg },
    mapSection: { marginBottom: spacing.lg },
    mapHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: spacing.sm },
    mapTitle: { ...typography.h2, color: colors.textPrimary, flex: 1 },
    mapToggle: { flexDirection: 'row', backgroundColor: colors.surfaceLight, borderRadius: borderRadius.md, padding: 2, borderWidth: 1, borderColor: colors.border },
    mapToggleBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: borderRadius.sm },
    mapToggleText: { fontSize: 11, fontWeight: '600' },
    section: { marginBottom: spacing.lg },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
    sectionTitle: { ...typography.h2, color: colors.textPrimary, marginBottom: spacing.md },
    seeAllText: { ...typography.body, color: colors.primary, fontWeight: '600', marginBottom: spacing.md },
    savedItem: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, backgroundColor: colors.surface, borderRadius: borderRadius.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border },
    savedIcon: { width: 40, height: 40, borderRadius: borderRadius.sm, justifyContent: 'center', alignItems: 'center', marginRight: spacing.md },
    savedContent: { flex: 1 },
    savedName: { ...typography.h3, color: colors.textPrimary, marginBottom: 2 },
    savedMeta: { ...typography.caption, color: colors.textMuted },
    quickLinksGrid: { flexDirection: 'row', gap: spacing.sm },
    quickLink: { borderRadius: borderRadius.lg, overflow: 'hidden' },
    quickLinkGradient: { alignItems: 'center', paddingVertical: spacing.md, paddingHorizontal: spacing.sm, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.border },
    quickLinkIcon: { width: 48, height: 48, borderRadius: borderRadius.md, justifyContent: 'center', alignItems: 'center', marginBottom: spacing.sm },
    quickLinkLabel: { ...typography.bodySmall, color: colors.textPrimary, fontWeight: '600', textAlign: 'center' },
    popularScroll: { paddingRight: spacing.lg },
    popularCard: { width: 150, marginLeft: spacing.sm, borderRadius: borderRadius.lg, overflow: 'hidden' },
    popularGradient: { padding: spacing.md, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.border, minHeight: 160 },
    popularIcon: { width: 50, height: 50, borderRadius: borderRadius.md, justifyContent: 'center', alignItems: 'center', marginBottom: spacing.sm },
    popularName: { ...typography.h3, color: colors.textPrimary, marginBottom: 3 },
    popularBuilding: { ...typography.bodySmall, color: colors.textSecondary, marginBottom: 4 },
    popularFloor: { flexDirection: 'row', alignItems: 'center', gap: 3 },
    popularFloorText: { ...typography.caption, color: colors.textMuted },
    blueprintContainer: {
      width: '100%',
      height: 320,
      borderRadius: borderRadius.xl,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    selectorWrapper: {
      backgroundColor: colors.surfaceLight,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      paddingVertical: spacing.xs,
    },
    selectorScroll: {
      paddingHorizontal: spacing.sm,
      gap: spacing.xs,
    },
    selectorTab: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      alignItems: 'center',
      borderRadius: borderRadius.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    selectorText: {
      fontSize: 12,
      fontWeight: '600',
    },
    imageWrapper: {
      flex: 1,
      position: 'relative',
    },
    blueprintImage: {
      width: '100%',
      height: '100%',
    },
    imageOverlay: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      padding: spacing.md,
      zIndex: 10,
    },
    overlayTitle: {
      color: '#FFF',
      fontSize: 15,
      fontWeight: '700',
    },
    overlayDesc: {
      color: 'rgba(255,255,255,0.7)',
      fontSize: 11,
      marginTop: 2,
    },
    floorSelectorRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 8,
      paddingHorizontal: spacing.sm,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      gap: spacing.sm,
    },
    floorLabelText: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.textSecondary,
    },
    floorScroll: {
      gap: spacing.xs,
    },
    floorTab: {
      width: 28,
      height: 28,
      borderRadius: 14,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceLight,
    },
    floorText: {
      fontSize: 12,
      fontWeight: '700',
    },
  });
