import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Switch,
  StatusBar,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../api/firebase';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../theme/LanguageContext';
import { spacing, borderRadius, typography } from '../theme/colors';
import { getAllRooms } from '../api/roomsService';
import { getFullSchedule } from '../api/scheduleService';
export default function ProfileScreen({ navigation, user, onLogout }) {
  const { colors, isDark, toggleTheme } = useTheme();
  const { t, language, setLanguage } = useLanguage();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const [notifications, setNotifications] = useState(true);
  const [showLangModal, setShowLangModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  
  // Tahrirlash uchun ma'lumotlar
  const [editName, setEditName] = useState(user?.name || '');
  const [editGroup, setEditGroup] = useState(user?.group || '');
  const [editAvatar, setEditAvatar] = useState(user?.avatar || '');

  const [savedRooms, setSavedRooms] = useState([]);
  const [allRooms, setAllRooms] = useState([]);
  const [scheduleData, setScheduleData] = useState(null);
  const isFocused = useIsFocused();

  const getTodaySchedule = () => {
    if (!scheduleData) return { classes: [], title: 'Jadval yuklanmoqda...', isNextDay: false };
    if (!user || user.isGuest || user.role === 'admin') return { classes: [], title: 'Dars jadvali' };
    const now = new Date();
    const today = now.getDay();
    const groupSchedule = scheduleData[user.group] || scheduleData['default'] || {};
    let classes = groupSchedule[String(today)] || [];

    // Check if classes are over for today
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
      return { 
        classes, 
        title: `${t.todaySchedule}${user.group ? ` (${user.group})` : ''}`,
        isNextDay: false 
      };
    }

    // Find next day with classes
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

        return {
          classes: nextClasses,
          title: `${dayLabel} ${t.jadval}${user.group ? ` (${user.group})` : ''}`,
          dateString: dateString,
          isNextDay: true
        };
      }
    }
    
    return { classes: [], title: `${t.schedule}${user.group ? ` (${user.group})` : ''}`, isNextDay: false };
  };

  const scheduleInfo = getTodaySchedule();
  const todayClasses = scheduleInfo.classes;

  useEffect(() => {
    if (isFocused) {
      const loadSavedRooms = async () => {
        const res = await getAllRooms();
        if (res.success) {
          setAllRooms(res.data);
          setSavedRooms(res.data.slice(0, 3));
        }
      };
      const loadSchedule = async () => {
        const res = await getFullSchedule();
        if (res.success) {
          setScheduleData(res.data);
        }
      };
      loadSavedRooms();
      loadSchedule();
    }
  }, [isFocused]);

  const handleSchedulePress = (scheduleItem) => {
    const roomString = scheduleItem.room;
    if (!roomString) return;

    // 1. Aniq moslik
    let foundRoom = allRooms.find(r => r.name.toLowerCase() === roomString.toLowerCase());

    // 2. Raqam bo'yicha izlash (masalan "205-xona" dan "205" ni olib qidirish)
    if (!foundRoom) {
      const numbersInString = roomString.match(/\d{3,}/);
      if (numbersInString) {
        const roomNum = numbersInString[0];
        foundRoom = allRooms.find(r => r.name.includes(roomNum));
      }
    }

    // 3. Qisman moslik (masalan "Sport majmuasi")
    if (!foundRoom) {
      foundRoom = allRooms.find(r => roomString.toLowerCase().includes(r.name.toLowerCase()) || r.name.toLowerCase().includes(roomString.toLowerCase()));
    }

    if (foundRoom) {
      navigation.navigate('RoomDetail', { room: foundRoom });
    } else {
      Alert.alert('Xatolik', `Tizimdan ${roomString} topilmadi.`);
    }
  };

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, friction: 8, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleLogout = () => {
    Alert.alert(
      t.logout,
      t.logoutConfirm,
      [
        { text: t.cancel, style: 'cancel' },
        { text: t.logout, style: 'destructive', onPress: () => onLogout && onLogout() },
      ]
    );
  };

  const handleRoomPress = (room) => navigation.navigate('RoomDetail', { room });

  const userName = user?.name || t.student;
  const userAvatar = user?.avatar || '';
  const initials = userName.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();

  const handleSaveProfile = async () => {
    if (!editName.trim()) {
      Alert.alert('Xatolik', "Ismni bo'sh qoldirib bo'lmaydi");
      return;
    }
    
    try {
      if (user?.uid) {
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, {
          name: editName.trim(),
          group: editGroup.trim(),
          avatar: editAvatar
        });
      }
      
      setShowEditModal(false);
      Alert.alert('Saqlandi! ✅', "O'zgarishlar muvaffaqiyatli saqlandi. To'liq ko'rinishi uchun ilovadan chiqib, qayta kiring.");
    } catch (e) {
      console.error(e);
      Alert.alert('Xatolik', 'Saqlashda xatolik yuz berdi');
    }
  };

  const AVATARS = ['👨‍🎓', '👩‍🎓', '👨‍🏫', '👩‍🏫', '👨‍💻', '👩‍💻', '🥷', '🦸‍♂️', '🕵️‍♂️', '🦁', '🦉', '🦊', '🐼', '🤖', '👽'];

  const styles = createStyles(colors);

  return (
    <View style={styles.container}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <Animated.View style={[styles.header, { opacity: fadeAnim, transform: [{ translateY: slideAnim }], flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
          <Text style={styles.title}>{t.profileTitle}</Text>
          {!user?.isGuest && (
            <TouchableOpacity onPress={() => setShowEditModal(true)} style={{ padding: 8, backgroundColor: colors.surfaceHighlight, borderRadius: 20 }}>
              <MaterialIcons name="edit" size={24} color={colors.primary} />
            </TouchableOpacity>
          )}
        </Animated.View>

        {/* Profile Card */}
        <Animated.View style={[styles.profileCard, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <LinearGradient colors={colors.gradientPurpleTeal} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.profileGradient}>
            <View style={styles.avatarContainer}>
              <LinearGradient colors={['rgba(255,255,255,0.25)', 'rgba(255,255,255,0.1)']} style={styles.avatar}>
                {userAvatar ? (
                  <Text style={{ fontSize: 45 }}>{userAvatar}</Text>
                ) : (
                  <Text style={styles.avatarText}>{initials}</Text>
                )}
              </LinearGradient>
              <View style={styles.onlineDot} />
            </View>
            <Text style={styles.profileName}>{userName}</Text>
            {user?.role !== 'admin' && (
              <Text style={styles.profileRole}>
                📚 {user?.group ? user.group : t.student}
              </Text>
            )}
            <Text style={styles.profileUniversity}>{t.universityName}</Text>

          </LinearGradient>
        </Animated.View>
        {/* Schedule Section */}
        {!user?.isGuest && user?.role !== 'admin' && (
          <Animated.View style={[styles.section, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <View style={styles.sectionHeader}>
              <MaterialIcons name="event-note" size={20} color={colors.accent} />
              <Text style={styles.sectionTitle}>{scheduleInfo.title}</Text>
            </View>
            {scheduleInfo.isNextDay && (
              <Text style={[styles.savedMeta, { marginLeft: 30, marginTop: -4, marginBottom: 12, color: colors.primary, fontWeight: '600' }]}>
                📅 {scheduleInfo.dateString}
              </Text>
            )}
            {todayClasses.length === 0 ? (
              <Text style={[styles.savedMeta, { marginLeft: 10 }]}>Darslar topilmadi 🎉</Text>
            ) : (
              todayClasses.map((item, index) => (
                <TouchableOpacity key={index} style={styles.savedItem} onPress={() => handleSchedulePress(item)}>
                  <View style={[styles.savedIcon, { backgroundColor: colors.primary + '20' }]}>
                    <MaterialIcons name="schedule" size={20} color={colors.primary} />
                  </View>
                  <View style={styles.savedContent}>
                    <Text style={styles.savedName}>{item.subject} ({item.type})</Text>
                    <Text style={styles.savedMeta}>{item.time} • {item.room}</Text>
                  </View>
                  <MaterialIcons name="chevron-right" size={20} color={colors.textMuted} />
                </TouchableOpacity>
              ))
            )}
          </Animated.View>
        )}

        {/* Saved Places */}
        {user?.role !== 'admin' ? (
          <Animated.View style={[styles.section, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <View style={styles.sectionHeader}>
              <MaterialIcons name="bookmark" size={20} color={colors.accent} />
              <Text style={styles.sectionTitle}>{t.savedPlaces}</Text>
            </View>
            {savedRooms.map((room) => {
              const categoryColor = colors.categoryColors[room.type] || colors.primary;
              return (
                <TouchableOpacity key={room.id} style={styles.savedItem} onPress={() => handleRoomPress(room)} activeOpacity={0.7}>
                  <View style={[styles.savedIcon, { backgroundColor: categoryColor + '20' }]}>
                    <MaterialIcons name={room.icon || 'place'} size={20} color={categoryColor} />
                  </View>
                  <View style={styles.savedContent}>
                    <Text style={styles.savedName}>{room.name}</Text>
                    <Text style={styles.savedMeta}>{room.building} • {room.floor}-{t.floor}</Text>
                  </View>
                  <MaterialIcons name="bookmark" size={22} color={colors.primary} />
                </TouchableOpacity>
              );
            })}
          </Animated.View>
        ) : null}

        {/* Settings */}
        <Animated.View style={[styles.section, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="settings" size={20} color={colors.accent} />
            <Text style={styles.sectionTitle}>{t.settings}</Text>
          </View>

          <View style={styles.settingsCard}>
            <SettingRow icon="notifications-none" label={t.notifications} colors={colors}
              rightComponent={
                <Switch value={notifications} onValueChange={setNotifications}
                  trackColor={{ false: colors.surfaceHighlight, true: colors.primary + '50' }}
                  thumbColor={notifications ? colors.primary : colors.textMuted}
                />
              }
            />
            <View style={styles.settingDivider} />
            <SettingRow icon={isDark ? 'dark-mode' : 'light-mode'} label={isDark ? t.darkMode : t.lightMode} colors={colors}
              rightComponent={
                <Switch value={isDark} onValueChange={toggleTheme}
                  trackColor={{ false: colors.surfaceHighlight, true: colors.primary + '50' }}
                  thumbColor={isDark ? colors.primary : colors.warning}
                />
              }
            />

            <View style={styles.settingDivider} />
            <TouchableOpacity 
              activeOpacity={0.7}
              onPress={() => Alert.alert(
                t.aboutApp,
                "Campus Navigator\n\nVersiya: 1.0.0\n\nBu ilova universitet hududida binolar, o'quv xonalari va boshqa obyektlarni oson topish, xaritada harakatlanish va qisqa yo'llarni aniqlash uchun mo'ljallangan.\n\nYaratuvchi: Muhammadjon Doschonov"
              )}
            >
              <SettingRow icon="info-outline" label={t.aboutApp} value="v1.0.0" colors={colors} />
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Logout */}
        <Animated.View style={[{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.7}>
            <MaterialIcons name="logout" size={20} color={colors.error} />
            <Text style={styles.logoutText}>{t.logout}</Text>
          </TouchableOpacity>
        </Animated.View>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal visible={showEditModal} transparent animationType="slide" onRequestClose={() => setShowEditModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { width: '90%', maxHeight: '80%' }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <Text style={styles.modalTitle}>Profilni tahrirlash</Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)}><MaterialIcons name="close" size={24} color={colors.textSecondary} /></TouchableOpacity>
            </View>
            
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={{ ...typography.body, color: colors.textSecondary, marginBottom: 8 }}>To'liq ismingiz</Text>
              <TextInput
                style={{ backgroundColor: colors.surfaceHighlight, color: colors.textPrimary, padding: 15, borderRadius: borderRadius.md, marginBottom: 15 }}
                value={editName}
                onChangeText={setEditName}
                placeholder="Ismingizni kiriting"
                placeholderTextColor={colors.textMuted}
              />
              
              {user?.role !== 'admin' && (
                <>
                  <Text style={{ ...typography.body, color: colors.textSecondary, marginBottom: 8 }}>Guruhingiz</Text>
                  <TextInput
                    style={{ backgroundColor: colors.surfaceHighlight, color: colors.textPrimary, padding: 15, borderRadius: borderRadius.md, marginBottom: 20 }}
                    value={editGroup}
                    onChangeText={setEditGroup}
                    placeholder="Masalan: 211-20"
                    placeholderTextColor={colors.textMuted}
                  />
                </>
              )}

              <Text style={{ ...typography.body, color: colors.textSecondary, marginBottom: 12 }}>Avatar (Rasm) tanlang:</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10, marginBottom: 20 }}>
                {AVATARS.map(emo => (
                  <TouchableOpacity
                    key={emo}
                    onPress={() => setEditAvatar(emo)}
                    style={{
                      width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center',
                      backgroundColor: editAvatar === emo ? colors.primary + '50' : colors.surfaceHighlight,
                      borderWidth: editAvatar === emo ? 2 : 0, borderColor: colors.primary
                    }}
                  >
                    <Text style={{ fontSize: 30 }}>{emo}</Text>
                  </TouchableOpacity>
                ))}
                {/* Clear avatar button */}
                <TouchableOpacity
                  onPress={() => setEditAvatar('')}
                  style={{
                    width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center',
                    backgroundColor: colors.surfaceHighlight, borderWidth: editAvatar === '' ? 2 : 0, borderColor: colors.error
                  }}
                >
                  <MaterialIcons name="do-not-disturb" size={24} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <TouchableOpacity onPress={handleSaveProfile} style={{ backgroundColor: colors.primary, padding: 15, borderRadius: borderRadius.md, alignItems: 'center', marginTop: 10 }}>
                <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>Saqlash</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

    </View>
  );
}

function SettingRow({ icon, label, value, rightComponent, colors }) {
  const styles = createStyles(colors);
  return (
    <View style={styles.settingRow}>
      <View style={styles.settingLeft}>
        <MaterialIcons name={icon} size={22} color={colors.textSecondary} />
        <Text style={styles.settingLabel}>{label}</Text>
      </View>
      {rightComponent || (
        <View style={styles.settingRight}>
          <Text style={styles.settingValue}>{value}</Text>
          <MaterialIcons name="chevron-right" size={20} color={colors.textMuted} />
        </View>
      )}
    </View>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scrollView: { flex: 1 },
    scrollContent: { paddingTop: 60, paddingHorizontal: spacing.lg },
    header: { marginBottom: spacing.lg },
    title: { ...typography.hero, color: colors.textPrimary },
    // Profile
    profileCard: { marginBottom: spacing.lg, borderRadius: borderRadius.xl, overflow: 'hidden' },
    profileGradient: { alignItems: 'center', paddingVertical: spacing.xl, paddingHorizontal: spacing.lg, borderRadius: borderRadius.xl },
    avatarContainer: { position: 'relative', marginBottom: spacing.md },
    avatar: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: 'rgba(255,255,255,0.3)' },
    avatarText: { fontSize: 28, fontWeight: '800', color: '#FFF' },
    onlineDot: { position: 'absolute', bottom: 2, right: 2, width: 16, height: 16, borderRadius: 8, backgroundColor: colors.success, borderWidth: 3, borderColor: colors.primary },
    profileName: { ...typography.h1, color: '#FFF', marginBottom: 4 },
    profileRole: { ...typography.body, color: 'rgba(255,255,255,0.8)', marginBottom: 4 },
    profileUniversity: { ...typography.bodySmall, color: 'rgba(255,255,255,0.6)', marginBottom: spacing.lg },
    profileStats: { flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: borderRadius.lg, paddingVertical: spacing.md, paddingHorizontal: spacing.lg, width: '100%', justifyContent: 'space-around', alignItems: 'center' },
    profileStat: { alignItems: 'center' },
    profileStatDivider: { width: 1, height: 30, backgroundColor: 'rgba(255,255,255,0.2)' },
    statNumber: { ...typography.h1, color: '#FFF' },
    statDesc: { ...typography.caption, color: 'rgba(255,255,255,0.7)' },
    // Sections
    section: { marginBottom: spacing.lg },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: spacing.md },
    sectionTitle: { ...typography.h2, color: colors.textPrimary },
    // Saved
    savedItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, padding: spacing.md, borderRadius: borderRadius.lg, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border },
    savedIcon: { width: 42, height: 42, borderRadius: borderRadius.md, justifyContent: 'center', alignItems: 'center', marginRight: spacing.md },
    savedContent: { flex: 1 },
    savedName: { ...typography.h3, color: colors.textPrimary, marginBottom: 2 },
    savedMeta: { ...typography.bodySmall, color: colors.textSecondary },
    // Settings
    settingsCard: { backgroundColor: colors.surface, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
    settingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingVertical: 14 },
    settingLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    settingLabel: { ...typography.body, color: colors.textPrimary },
    settingRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    settingValue: { ...typography.bodySmall, color: colors.textSecondary },
    settingDivider: { height: 1, backgroundColor: colors.border, marginHorizontal: spacing.md },
    // Logout
    logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, backgroundColor: colors.error + '10', borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.error + '30' },
    logoutText: { ...typography.button, color: colors.error },
    // Language Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing.xl },
    modalContent: { backgroundColor: colors.surface, borderRadius: borderRadius.xl, padding: spacing.lg, width: '100%', maxWidth: 340, borderWidth: 1, borderColor: colors.border },
    modalTitle: { ...typography.h2, color: colors.textPrimary, marginBottom: spacing.lg, textAlign: 'center' },
    langOption: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, borderRadius: borderRadius.lg, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.border, gap: 12 },
    langOptionActive: { borderColor: colors.primary + '60', backgroundColor: colors.primary + '08' },
    langFlag: { fontSize: 28 },
    langText: { ...typography.h3, color: colors.textPrimary, flex: 1 },
  });
