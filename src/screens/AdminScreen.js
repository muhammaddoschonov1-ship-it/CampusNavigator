import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  StatusBar,
  Dimensions,
  ActivityIndicator,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../theme/LanguageContext';
import { spacing, borderRadius, typography } from '../theme/colors';
import { getAllRooms, addRoom, updateRoom, deleteRoom } from '../api/roomsService';
import MapEditorScreen from './MapEditorScreen';
import ScheduleAdminTab from '../components/ScheduleAdminTab';

const { width, height } = Dimensions.get('window');
const NOTIFS_KEY = '@notifications_list';

// Default notifications to initialize if not exists
const DEFAULT_NOTIFS = [
  { id: '1', title: "Dars jadvali o'zgardi", message: "15-may kuni 3-para 205-auditoriyadan 101-auditoriyaga ko'chirildi.", icon: 'event-note', type: 'info', time: '10 daqiqa oldin', read: false },
  { id: '2', title: 'Kutubxona vaqti uzaytirildi', message: "Imtihon davrida kutubxona 22:00 gacha ochiq bo'ladi.", icon: 'local-library', type: 'success', time: '1 soat oldin', read: false },
  { id: '3', title: 'Sport musobaqasi', message: 'Fakultetlar aro voleybol musobaqasi 20-may kuni sport majmuasida.', icon: 'sports-volleyball', type: 'warning', time: '3 soat oldin', read: false },
];

export default function AdminScreen({ navigation }) {
  const { colors, isDark } = useTheme();
  const { t, language } = useLanguage();
  const [activeTab, setActiveTab] = useState('rooms'); // 'rooms' | 'notifs' | 'map'
  const [isLoading, setIsLoading] = useState(false);

  // Rooms states
  const [rooms, setRooms] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [roomModalVisible, setRoomModalVisible] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(null); // null for add, room object for edit

  // Room Form States
  const [roomName, setRoomName] = useState('');
  const [roomBuilding, setRoomBuilding] = useState('');
  const [roomFloor, setRoomFloor] = useState('1');
  const [roomType, setRoomType] = useState('auditoriya');
  const [roomCapacity, setRoomCapacity] = useState('30');
  const [roomDesc, setRoomDesc] = useState('');

  // Notifications states
  const [notifications, setNotifications] = useState([]);
  const [notifModalVisible, setNotifModalVisible] = useState(false);

  // Notification Form States
  const [notifTitle, setNotifTitle] = useState('');
  const [notifMessage, setNotifMessage] = useState('');
  const [notifType, setNotifType] = useState('info');
  const [notifIcon, setNotifIcon] = useState('event-note');

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setIsLoading(true);
    if (activeTab === 'rooms') {
      const res = await getAllRooms();
      if (res.success) {
        setRooms(res.data);
      }
    } else if (activeTab === 'notifs') {
      try {
        const stored = await AsyncStorage.getItem(NOTIFS_KEY);
        if (stored) {
          setNotifications(JSON.parse(stored));
        } else {
          await AsyncStorage.setItem(NOTIFS_KEY, JSON.stringify(DEFAULT_NOTIFS));
          setNotifications(DEFAULT_NOTIFS);
        }
      } catch (e) {
        setNotifications(DEFAULT_NOTIFS);
      }
    }
    setIsLoading(false);
  };

  // ====================================
  // ROOM CRUD ACTIONS
  // ====================================
  const handleOpenRoomModal = (room = null) => {
    setSelectedRoom(room);
    if (room) {
      setRoomName(room.name);
      setRoomBuilding(room.building);
      setRoomFloor(String(room.floor));
      setRoomType(room.type);
      setRoomCapacity(String(room.capacity || 30));
      setRoomDesc(room.description || '');
    } else {
      setRoomName('');
      setRoomBuilding("1-o'quv binosi (Bosh bino)");
      setRoomFloor('1');
      setRoomType('auditoriya');
      setRoomCapacity('30');
      setRoomDesc('');
    }
    setRoomModalVisible(true);
  };

  const handleSaveRoom = async () => {
    if (!roomName.trim() || !roomBuilding.trim()) {
      Alert.alert('Xatolik', 'Iltimos, barcha majburiy maydonlarni to\'ldiring');
      return;
    }

    const roomData = {
      name: roomName.trim(),
      building: roomBuilding.trim(),
      floor: parseInt(roomFloor) || 1,
      type: roomType,
      capacity: parseInt(roomCapacity) || 30,
      description: roomDesc.trim(),
      icon: getIconForType(roomType),
    };

    setIsLoading(true);
    if (selectedRoom) {
      // Update
      const res = await updateRoom(selectedRoom.id, roomData);
      if (res.success) {
        Alert.alert('Muvaffaqiyat', 'Xona muvaffaqiyatli yangilandi');
        setRoomModalVisible(false);
        loadData();
      } else {
        Alert.alert('Xatolik', res.error || 'Yangilab bo\'lmadi');
      }
    } else {
      // Add
      const res = await addRoom(roomData);
      if (res.success) {
        Alert.alert('Muvaffaqiyat', 'Yangi xona muvaffaqiyatli qo\'shildi');
        setRoomModalVisible(false);
        loadData();
      } else {
        Alert.alert('Xatolik', res.error || 'Qo\'shib bo\'lmadi');
      }
    }
    setIsLoading(false);
  };

  const handleDeleteRoom = (roomId) => {
    Alert.alert(
      "O'chirish",
      "Haqiqatan ham ushbu xonani o'chirib tashlamoqchimisiz?",
      [
        { text: 'Bekor qilish', style: 'cancel' },
        {
          text: "O'chirish",
          style: 'destructive',
          onPress: async () => {
            setIsLoading(true);
            const res = await deleteRoom(roomId);
            if (res.success) {
              Alert.alert('Muvaffaqiyat', 'Xona o\'chirildi');
              loadData();
            } else {
              Alert.alert('Xatolik', 'O\'chirib bo\'lmadi');
            }
            setIsLoading(false);
          },
        },
      ]
    );
  };

  // ====================================
  // NOTIFICATION CRUD ACTIONS
  // ====================================
  const handleSaveNotification = async () => {
    if (!notifTitle.trim() || !notifMessage.trim()) {
      Alert.alert('Xatolik', 'Iltimos, sarlavha va matnni kiriting');
      return;
    }

    const newNotif = {
      id: Date.now().toString(),
      title: notifTitle.trim(),
      message: notifMessage.trim(),
      type: notifType,
      icon: notifIcon,
      time: 'Hozirgina',
      read: false,
    };

    setIsLoading(true);
    try {
      const stored = await AsyncStorage.getItem(NOTIFS_KEY);
      const currentNotifs = stored ? JSON.parse(stored) : [];
      const updated = [newNotif, ...currentNotifs];
      await AsyncStorage.setItem(NOTIFS_KEY, JSON.stringify(updated));
      setNotifModalVisible(false);
      setNotifTitle('');
      setNotifMessage('');
      Alert.alert('Muvaffaqiyat', 'Bildirishnoma yuborildi');
      loadData();
    } catch (e) {
      Alert.alert('Xatolik', 'Saqlab bo\'lmadi');
    }
    setIsLoading(false);
  };

  const handleDeleteNotification = (id) => {
    Alert.alert(
      "O'chirish",
      "Ushbu bildirishnomani o'chirmoqchimisiz?",
      [
        { text: 'Bekor qilish', style: 'cancel' },
        {
          text: "O'chirish",
          style: 'destructive',
          onPress: async () => {
            setIsLoading(true);
            try {
              const updated = notifications.filter(n => n.id !== id);
              await AsyncStorage.setItem(NOTIFS_KEY, JSON.stringify(updated));
              loadData();
            } catch (e) { }
            setIsLoading(false);
          },
        },
      ]
    );
  };

  const getIconForType = (type) => {
    const icons = {
      auditoriya: 'school',
      kutubxona: 'local-library',
      oshxona: 'restaurant',
      sport: 'fitness-center',
      ofis: 'business',
      laboratoriya: 'computer',
      tibbiyot: 'local-hospital',
    };
    return icons[type] || 'place';
  };

  const filteredRooms = rooms.filter(
    (r) =>
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.building.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const styles = createStyles(colors);

  return (
    <View style={styles.container}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.surface} />

      {/* Header */}
      <SafeAreaView edges={['top']} style={{ backgroundColor: colors.surface }}>
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Boshqaruv Paneli</Text>
          </View>
          {activeTab === 'map' && (
            <TouchableOpacity
              style={styles.openFullscreenBtn}
              onPress={() => navigation.navigate('MapEditor')}
              activeOpacity={0.8}
            >
              <MaterialIcons name="fullscreen" size={18} color="#FFF" />
              <Text style={styles.openFullscreenBtnText}>Katta xarita</Text>
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>

      {/* Custom Tabs */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[
            styles.tabButton, 
            activeTab === 'rooms' && styles.tabButtonActive,
            { flex: activeTab === 'rooms' ? 1.4 : 0.85, transform: [{ scale: activeTab === 'rooms' ? 1.03 : 0.95 }] }
          ]}
          onPress={() => {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setActiveTab('rooms');
          }}
          activeOpacity={0.7}
        >
          <MaterialIcons name="meeting-room" size={20} color={activeTab === 'rooms' ? '#FFF' : colors.textMuted} />
          <Text style={[styles.tabButtonText, activeTab === 'rooms' && styles.tabButtonTextActive, { fontSize: activeTab === 'rooms' ? 14 : 12 }]} numberOfLines={1}>Xonalar</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tabButton, 
            activeTab === 'notifs' && styles.tabButtonActive,
            { flex: activeTab === 'notifs' ? 1.4 : 0.85, transform: [{ scale: activeTab === 'notifs' ? 1.03 : 0.95 }] }
          ]}
          onPress={() => {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setActiveTab('notifs');
          }}
          activeOpacity={0.7}
        >
          <MaterialIcons name="notifications" size={20} color={activeTab === 'notifs' ? '#FFF' : colors.textMuted} />
          <Text style={[styles.tabButtonText, activeTab === 'notifs' && styles.tabButtonTextActive, { fontSize: activeTab === 'notifs' ? 14 : 12 }]} numberOfLines={1}>Xabarlar</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tabButton, 
            activeTab === 'map' && styles.tabButtonActive,
            { flex: activeTab === 'map' ? 1.4 : 0.85, transform: [{ scale: activeTab === 'map' ? 1.03 : 0.95 }] }
          ]}
          onPress={() => {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setActiveTab('map');
          }}
          activeOpacity={0.7}
        >
          <MaterialIcons name="edit-location-alt" size={20} color={activeTab === 'map' ? '#FFF' : colors.textMuted} />
          <Text style={[styles.tabButtonText, activeTab === 'map' && styles.tabButtonTextActive, { fontSize: activeTab === 'map' ? 14 : 12 }]} numberOfLines={1}>Xarita</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tabButton, 
            activeTab === 'schedule' && styles.tabButtonActive,
            { flex: activeTab === 'schedule' ? 1.4 : 0.85, transform: [{ scale: activeTab === 'schedule' ? 1.03 : 0.95 }] }
          ]}
          onPress={() => {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setActiveTab('schedule');
          }}
          activeOpacity={0.7}
        >
          <MaterialIcons name="event-note" size={20} color={activeTab === 'schedule' ? '#FFF' : colors.textMuted} />
          <Text style={[styles.tabButtonText, activeTab === 'schedule' && styles.tabButtonTextActive, { fontSize: activeTab === 'schedule' ? 14 : 12 }]} numberOfLines={1}>Jadval</Text>
        </TouchableOpacity>
      </View>

      {/* Content Area */}
      <View style={[styles.content, activeTab === 'map' && { padding: 0 }]}>
        {isLoading && (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        )}

        {/* Tab 1: Rooms Manager */}
        {activeTab === 'rooms' && !isLoading && (
          <View style={{ flex: 1 }}>
            <View style={styles.actionRow}>
              <View style={styles.searchBox}>
                <MaterialIcons name="search" size={20} color={colors.textMuted} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Xonani qidirish..."
                  placeholderTextColor={colors.textMuted}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
              </View>
              <TouchableOpacity style={styles.addBtn} onPress={() => handleOpenRoomModal(null)}>
                <MaterialIcons name="add" size={22} color="#FFF" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollList}>
              {filteredRooms.length === 0 ? (
                <Text style={styles.emptyText}>Hech qanday xona topilmadi</Text>
              ) : (
                filteredRooms.map((room) => (
                  <View key={room.id} style={styles.card}>
                    <View style={[styles.cardIconContainer, { backgroundColor: (colors.categoryColors[room.type] || colors.primary) + '15' }]}>
                      <MaterialIcons name={room.icon || 'place'} size={24} color={colors.categoryColors[room.type] || colors.primary} />
                    </View>
                    <View style={styles.cardContent}>
                      <Text style={styles.cardTitle}>{room.name}</Text>
                      <Text style={styles.cardSubtitle}>{room.building}</Text>
                      <Text style={styles.cardMeta}>{room.floor}-qavat • Havo sig'imi: {room.capacity}</Text>
                    </View>
                    <View style={styles.cardActions}>
                      <TouchableOpacity style={styles.actionIcon} onPress={() => handleOpenRoomModal(room)}>
                        <MaterialIcons name="edit" size={20} color={colors.primary} />
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.actionIcon} onPress={() => handleDeleteRoom(room.id)}>
                        <MaterialIcons name="delete" size={20} color={colors.error} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        )}

        {/* Tab 2: Notifications Manager */}
        {activeTab === 'notifs' && !isLoading && (
          <View style={{ flex: 1 }}>
            <TouchableOpacity style={styles.addNotifBtn} onPress={() => setNotifModalVisible(true)}>
              <MaterialIcons name="add-alert" size={20} color="#FFF" />
              <Text style={styles.addNotifBtnText}>Yangi bildirishnoma yaratish</Text>
            </TouchableOpacity>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollList}>
              {notifications.length === 0 ? (
                <Text style={styles.emptyText}>Hech qanday bildirishnoma yo'q</Text>
              ) : (
                notifications.map((notif) => (
                  <View key={notif.id} style={styles.card}>
                    <View style={[styles.cardIconContainer, { backgroundColor: colors.accent + '15' }]}>
                      <MaterialIcons name={notif.icon} size={24} color={colors.accent} />
                    </View>
                    <View style={styles.cardContent}>
                      <Text style={styles.cardTitle}>{notif.title}</Text>
                      <Text style={styles.cardDescription} numberOfLines={2}>{notif.message}</Text>
                      <Text style={styles.cardTime}>{notif.time}</Text>
                    </View>
                    <TouchableOpacity style={styles.actionIcon} onPress={() => handleDeleteNotification(notif.id)}>
                      <MaterialIcons name="delete" size={20} color={colors.error} />
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        )}

        {/* Tab 3: Map Editor Embedded */}
        {activeTab === 'map' && (
          <View style={{ flex: 1, overflow: 'hidden' }}>
            <MapEditorScreen navigation={navigation} isEmbedded={true} />
          </View>
        )}

        {/* Tab 4: Schedule Admin */}
        {activeTab === 'schedule' && (
          <ScheduleAdminTab colors={colors} />
        )}
      </View>

      {/* Room Form Modal */}
      <Modal visible={roomModalVisible} transparent animationType="slide" onRequestClose={() => setRoomModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalHeaderTitle}>{selectedRoom ? 'Xonani tahrirlash' : 'Yangi xona qo\'shish'}</Text>
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: height * 0.6 }}>
              {/* Form Input fields */}
              <Text style={styles.inputLabel}>Xona Nomi *</Text>
              <TextInput style={styles.modalInput} placeholder="Masalan: 302-auditoriya" placeholderTextColor={colors.textMuted} value={roomName} onChangeText={setRoomName} />

              <Text style={styles.inputLabel}>Bino nomi *</Text>
              <TextInput style={styles.modalInput} placeholder="Bino nomi..." placeholderTextColor={colors.textMuted} value={roomBuilding} onChangeText={setRoomBuilding} />

              <View style={styles.formRow}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.inputLabel}>Qavat (1-4)</Text>
                  <TextInput style={styles.modalInput} keyboardType="number-pad" placeholder="1" placeholderTextColor={colors.textMuted} value={roomFloor} onChangeText={setRoomFloor} />
                </View>
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={styles.inputLabel}>Sig'imi (odam)</Text>
                  <TextInput style={styles.modalInput} keyboardType="number-pad" placeholder="30" placeholderTextColor={colors.textMuted} value={roomCapacity} onChangeText={setRoomCapacity} />
                </View>
              </View>

              <Text style={styles.inputLabel}>Xona turi</Text>
              <View style={styles.typeSelectorGrid}>
                {['auditoriya', 'kutubxona', 'oshxona', 'sport', 'ofis', 'laboratoriya', 'tibbiyot'].map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.typeBadge, roomType === t && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                    onPress={() => setRoomType(t)}
                  >
                    <Text style={[styles.typeBadgeText, roomType === t && { color: '#FFF' }]}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>Tavsif (Description)</Text>
              <TextInput style={[styles.modalInput, { height: 80, textAlignVertical: 'top' }]} multiline placeholder="Xona haqida batafsil ma'lumot..." placeholderTextColor={colors.textMuted} value={roomDesc} onChangeText={setRoomDesc} />
            </ScrollView>

            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.modalBtn, styles.modalBtnCancel]} onPress={() => setRoomModalVisible(false)}>
                <Text style={styles.modalBtnTextCancel}>Bekor qilish</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, styles.modalBtnSave]} onPress={handleSaveRoom}>
                <Text style={styles.modalBtnTextSave}>Saqlash</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Notification Form Modal */}
      <Modal visible={notifModalVisible} transparent animationType="slide" onRequestClose={() => setNotifModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalHeaderTitle}>Yangi bildirishnoma</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Sarlavha (Title) *</Text>
              <TextInput style={styles.modalInput} placeholder="Masalan: Dars qoldirildi" placeholderTextColor={colors.textMuted} value={notifTitle} onChangeText={setNotifTitle} />

              <Text style={styles.inputLabel}>Xabar matni *</Text>
              <TextInput style={[styles.modalInput, { height: 90, textAlignVertical: 'top' }]} multiline placeholder="E'lon matnini kiriting..." placeholderTextColor={colors.textMuted} value={notifMessage} onChangeText={setNotifMessage} />

              <Text style={styles.inputLabel}>Turi (Type)</Text>
              <View style={styles.typeSelectorGrid}>
                {['info', 'success', 'warning', 'error'].map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.typeBadge, notifType === t && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                    onPress={() => setNotifType(t)}
                  >
                    <Text style={[styles.typeBadgeText, notifType === t && { color: '#FFF' }]}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>Belgi (Icon)</Text>
              <View style={styles.typeSelectorGrid}>
                {['event-note', 'local-library', 'restaurant-menu', 'construction', 'sports-volleyball', 'groups', 'wifi'].map((icon) => (
                  <TouchableOpacity
                    key={icon}
                    style={[styles.iconSelectBadge, notifIcon === icon && { borderColor: colors.primary, backgroundColor: colors.primary + '10' }]}
                    onPress={() => setNotifIcon(icon)}
                  >
                    <MaterialIcons name={icon} size={20} color={notifIcon === icon ? colors.primary : colors.textMuted} />
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.modalBtn, styles.modalBtnCancel]} onPress={() => setNotifModalVisible(false)}>
                <Text style={styles.modalBtnTextCancel}>Bekor qilish</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, styles.modalBtnSave]} onPress={handleSaveNotification}>
                <Text style={styles.modalBtnTextSave}>Yuborish</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border
    },
    headerTitle: { ...typography.h1, color: colors.textPrimary },
    openFullscreenBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: colors.primary,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: borderRadius.md,
    },
    openFullscreenBtnText: {
      color: '#FFF',
      fontSize: 12,
      fontWeight: '700',
    },
    headerSubtitle: { ...typography.caption, color: colors.textSecondary },
    adminBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: borderRadius.sm },
    adminBadgeText: { color: '#FFF', fontSize: 11, fontWeight: '800' },
    tabRow: { flexDirection: 'row', backgroundColor: colors.surface, padding: spacing.xs, borderBottomWidth: 1, borderBottomColor: colors.border },
    tabButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: borderRadius.md, gap: 6 },
    tabButtonActive: { backgroundColor: colors.primary },
    tabButtonText: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
    tabButtonTextActive: { color: '#FFF' },
    content: { flex: 1, padding: spacing.lg },
    loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    actionRow: { flexDirection: 'row', gap: 10, marginBottom: spacing.md },
    searchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: borderRadius.lg, paddingHorizontal: spacing.md, borderWidth: 1, borderColor: colors.border },
    searchInput: { flex: 1, height: 48, fontSize: 14, color: colors.textPrimary, paddingLeft: 8 },
    addBtn: { width: 48, height: 48, borderRadius: borderRadius.lg, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
    addNotifBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accent, borderRadius: borderRadius.lg, paddingVertical: 14, gap: 8, marginBottom: spacing.md },
    addNotifBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
    scrollList: { paddingBottom: 60 },
    emptyText: { ...typography.body, color: colors.textMuted, textAlign: 'center', marginTop: 40 },
    card: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, padding: spacing.md, borderRadius: borderRadius.lg, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border },
    cardIconContainer: { width: 44, height: 44, borderRadius: borderRadius.md, justifyContent: 'center', alignItems: 'center', marginRight: spacing.md },
    cardContent: { flex: 1, marginRight: 8 },
    cardTitle: { ...typography.h3, color: colors.textPrimary, marginBottom: 2 },
    cardSubtitle: { ...typography.bodySmall, color: colors.textSecondary },
    cardMeta: { ...typography.caption, color: colors.textMuted, marginTop: 4 },
    cardDescription: { ...typography.bodySmall, color: colors.textSecondary, lineHeight: 18 },
    cardTime: { ...typography.caption, color: colors.textMuted, fontSize: 10, marginTop: 4 },
    cardActions: { flexDirection: 'row', gap: 10 },
    actionIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.surfaceLight, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: colors.border },
    mapInfoContainer: { alignItems: 'center', paddingTop: 30 },
    mapInfoCard: { width: '100%', backgroundColor: colors.surface, borderRadius: borderRadius.xl, padding: spacing.xl, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
    mapInfoTitle: { ...typography.h2, color: colors.textPrimary, marginBottom: 10 },
    mapInfoText: { ...typography.body, color: colors.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: spacing.xl },
    openMapBtn: { width: '100%', borderRadius: borderRadius.lg, overflow: 'hidden' },
    openMapBtnGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, gap: 8 },
    openMapBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', paddingHorizontal: spacing.lg },
    modalContent: { backgroundColor: colors.surface, borderRadius: borderRadius.xl, padding: spacing.lg, borderWidth: 1, borderColor: colors.border },
    modalHeaderTitle: { ...typography.h2, color: colors.textPrimary, marginBottom: spacing.lg, textAlign: 'center' },
    inputLabel: { ...typography.bodySmall, color: colors.textSecondary, fontWeight: '700', marginBottom: 6, marginTop: 10 },
    modalInput: { height: 48, borderRadius: borderRadius.lg, backgroundColor: colors.surfaceLight, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 16, color: colors.textPrimary, fontSize: 14 },
    formRow: { flexDirection: 'row' },
    typeSelectorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginVertical: 6 },
    typeBadge: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: borderRadius.full, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
    typeBadgeText: { fontSize: 11, fontWeight: '600', color: colors.textSecondary },
    iconSelectBadge: { width: 40, height: 40, borderRadius: 20, borderWidth: 1.5, borderColor: colors.border, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.surface },
    modalButtons: { flexDirection: 'row', gap: 10, marginTop: spacing.xl },
    modalBtn: { flex: 1, height: 50, borderRadius: borderRadius.lg, justifyContent: 'center', alignItems: 'center' },
    modalBtnCancel: { backgroundColor: colors.surfaceLight, borderWidth: 1, borderColor: colors.border },
    modalBtnSave: { backgroundColor: colors.primary },
    modalBtnTextCancel: { color: colors.textPrimary, fontSize: 15, fontWeight: '700' },
    modalBtnTextSave: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  });
