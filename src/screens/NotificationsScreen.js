import React, { useRef, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Animated, StatusBar,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../theme/LanguageContext';
import { useAuth } from '../theme/AuthContext';
import { spacing, borderRadius, typography } from '../theme/colors';

const NOTIFS_UZ = [
  { id: '1', title: "Dars jadvali o'zgardi", message: "15-may kuni 3-para 205-auditoriyadan 101-auditoriyaga ko'chirildi.", icon: 'event-note', type: 'info', time: '10 daqiqa oldin', read: false },
  { id: '2', title: 'Kutubxona vaqti uzaytirildi', message: "Imtihon davrida kutubxona 22:00 gacha ochiq bo'ladi.", icon: 'local-library', type: 'success', time: '1 soat oldin', read: false },
  { id: '3', title: 'Sport musobaqasi', message: 'Fakultetlar aro voleybol musobaqasi 20-may kuni sport majmuasida.', icon: 'sports-volleyball', type: 'warning', time: '3 soat oldin', read: false },
  { id: '4', title: 'Oshxona menyusi yangilandi', message: "Bugungi maxsus taom: Lag'mon va plov. Narx: 12,000 so'm.", icon: 'restaurant-menu', type: 'info', time: '5 soat oldin', read: true },
  { id: '5', title: "Ta'mirlash ishlari", message: "Fizmat fakulteti 3-qavatida ta'mirlash. 2-qavatdagi xonalardan foydalaning.", icon: 'construction', type: 'error', time: 'Kecha', read: true },
  { id: '6', title: 'Ilmiy konferentsiya', message: "25-may kuni Konferents zalda o'tkaziladi. Ro'yxatdan o'tish ochiq.", icon: 'groups', type: 'success', time: 'Kecha', read: true },
  { id: '7', title: 'Wi-Fi parol yangilandi', message: 'Yangi parol: NDTU2026secure', icon: 'wifi', type: 'info', time: '2 kun oldin', read: true },
];

const NOTIFS_RU = [
  { id: '1', title: 'Изменение расписания', message: 'Пара 15 мая перенесена из 205 в 101 аудиторию.', icon: 'event-note', type: 'info', time: '10 минут назад', read: false },
  { id: '2', title: 'Библиотека работает дольше', message: 'В период экзаменов библиотека открыта до 22:00.', icon: 'local-library', type: 'success', time: '1 час назад', read: false },
  { id: '3', title: 'Спортивное соревнование', message: 'Волейбольный турнир между факультетами 20 мая.', icon: 'sports-volleyball', type: 'warning', time: '3 часа назад', read: false },
  { id: '4', title: 'Обновление меню столовой', message: 'Спецблюдо дня: Лагман и плов. Цена: 12,000 сум.', icon: 'restaurant-menu', type: 'info', time: '5 часов назад', read: true },
  { id: '5', title: 'Ремонтные работы', message: 'На 3-м этаже физмат факультета идёт ремонт.', icon: 'construction', type: 'error', time: 'Вчера', read: true },
  { id: '6', title: 'Научная конференция', message: 'Международная конференция 25 мая. Регистрация открыта.', icon: 'groups', type: 'success', time: 'Вчера', read: true },
  { id: '7', title: 'Обновление Wi-Fi', message: 'Новый пароль: NDTU2026secure', icon: 'wifi', type: 'info', time: '2 дня назад', read: true },
];

const READ_NOTIFS_KEY = '@read_notifications_ids';

export default function NotificationsScreen({ navigation }) {
  const { colors, isDark } = useTheme();
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    const loadNotifications = async () => {
      try {
        const storedNotifs = await AsyncStorage.getItem('@notifications_list');
        let list = [];
        if (storedNotifs) {
          list = JSON.parse(storedNotifs);
        } else {
          list = language === 'ru' ? NOTIFS_RU : NOTIFS_UZ;
          await AsyncStorage.setItem('@notifications_list', JSON.stringify(list));
        }

        const stored = await AsyncStorage.getItem(READ_NOTIFS_KEY);
        const readIds = stored ? JSON.parse(stored) : [];
        const updated = list.map((n) =>
          readIds.includes(n.id) || n.read ? { ...n, read: true } : n
        );
        setNotifications(updated);
      } catch (e) {
        setNotifications(language === 'ru' ? NOTIFS_RU : NOTIFS_UZ);
      }
    };
    loadNotifications();
  }, [language]);

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, []);

  const filteredNotifs = notifications.filter((notif) => {
    if (user?.isGuest) {
      const titleLower = notif.title.toLowerCase();
      const messageLower = notif.message.toLowerCase();
      const isSchedule = titleLower.includes('jadval') || titleLower.includes('dars') || titleLower.includes('расписание') ||
                         titleLower.includes('пара') || titleLower.includes('заняти') ||
                         messageLower.includes('jadval') || messageLower.includes('dars') || messageLower.includes('расписание') ||
                         messageLower.includes('пара') || messageLower.includes('заняти');
      return !isSchedule;
    }
    return true;
  });

  const unreadCount = filteredNotifs.filter((n) => !n.read).length;

  const markAsRead = async (id) => {
    setNotifications((prev) => {
      const updated = prev.map((n) => (n.id === id ? { ...n, read: true } : n));
      const readIds = updated.filter((n) => n.read).map((n) => n.id);
      AsyncStorage.setItem(READ_NOTIFS_KEY, JSON.stringify(readIds)).catch(() => {});
      return updated;
    });
  };

  const markAllAsRead = async () => {
    setNotifications((prev) => {
      const updated = prev.map((n) => ({ ...n, read: true }));
      const readIds = updated.map((n) => n.id);
      AsyncStorage.setItem(READ_NOTIFS_KEY, JSON.stringify(readIds)).catch(() => {});
      return updated;
    });
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'success': return colors.success;
      case 'warning': return colors.warning;
      case 'error': return colors.error;
      default: return colors.info;
    }
  };

  const styles = createStyles(colors);

  return (
    <View style={styles.container}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
      <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <MaterialIcons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>{t.notifTitle}</Text>
        <View style={styles.badgeContainer}>
          <MaterialIcons name="notifications" size={24} color={colors.textPrimary} />
          {unreadCount > 0 && (
            <View style={styles.headerBadge}><Text style={styles.headerBadgeText}>{unreadCount}</Text></View>
          )}
        </View>
      </Animated.View>
      <FlatList
        data={filteredNotifs}
        renderItem={({ item, index }) => {
          const typeColor = getTypeColor(item.type);
          return (
            <Animated.View style={[styles.notifCard, !item.read && styles.notifUnread, { opacity: fadeAnim }]}>
              <TouchableOpacity activeOpacity={0.7} onPress={() => markAsRead(item.id)} style={styles.notifTouchable}>
                <View style={[styles.notifIconContainer, { backgroundColor: typeColor + '20' }]}>
                  <MaterialIcons name={item.icon} size={24} color={typeColor} />
                </View>
                <View style={styles.notifContent}>
                  <View style={styles.notifTitleRow}>
                    <Text style={styles.notifTitle} numberOfLines={1}>{item.title}</Text>
                    {!item.read && <View style={[styles.unreadDot, { backgroundColor: typeColor }]} />}
                  </View>
                  <Text style={styles.notifMessage} numberOfLines={2}>{item.message}</Text>
                  <Text style={styles.notifTime}>{item.time}</Text>
                </View>
              </TouchableOpacity>
            </Animated.View>
          );
        }}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <View style={styles.headerInfo}>
            {unreadCount > 0 && (
              <TouchableOpacity style={styles.markAllBtn} onPress={markAllAsRead} activeOpacity={0.7}>
                <MaterialIcons name="done-all" size={18} color={colors.primary} />
                <Text style={styles.markAllText}>{t.markAllRead}</Text>
              </TouchableOpacity>
            )}
            <Text style={styles.notifCount}>
              {unreadCount > 0 ? `${unreadCount} ${t.newNotifs}` : t.allRead}
            </Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialIcons name="notifications-off" size={48} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>{t.noNotifs}</Text>
            <Text style={styles.emptySubtitle}>{t.noNotifsDesc}</Text>
          </View>
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 55, paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
    backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: colors.border },
    title: { ...typography.h1, color: colors.textPrimary },
    badgeContainer: { position: 'relative' },
    headerBadge: { position: 'absolute', top: -6, right: -8, backgroundColor: colors.error, borderRadius: 10, minWidth: 20, height: 20, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4 },
    headerBadgeText: { color: '#FFF', fontSize: 11, fontWeight: '800' },
    headerInfo: { marginBottom: spacing.md },
    markAllBtn: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-end', gap: 6, marginBottom: spacing.sm, paddingVertical: 6, paddingHorizontal: 12, borderRadius: borderRadius.full, backgroundColor: colors.primary + '15' },
    markAllText: { ...typography.bodySmall, color: colors.primary, fontWeight: '600' },
    notifCount: { ...typography.bodySmall, color: colors.textMuted },
    listContent: { paddingHorizontal: spacing.lg, paddingBottom: 120 },
    notifCard: { marginBottom: spacing.sm, borderRadius: borderRadius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
    notifUnread: { borderColor: colors.primary + '40', backgroundColor: colors.primary + '08' },
    notifTouchable: { flexDirection: 'row', padding: spacing.md },
    notifIconContainer: { width: 48, height: 48, borderRadius: borderRadius.md, justifyContent: 'center', alignItems: 'center', marginRight: spacing.md },
    notifContent: { flex: 1 },
    notifTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
    notifTitle: { ...typography.h3, color: colors.textPrimary, flex: 1, marginRight: 8 },
    unreadDot: { width: 10, height: 10, borderRadius: 5 },
    notifMessage: { ...typography.bodySmall, color: colors.textSecondary, lineHeight: 20, marginBottom: 6 },
    notifTime: { ...typography.caption, color: colors.textMuted, fontSize: 10 },
    emptyContainer: { alignItems: 'center', paddingTop: 80, paddingHorizontal: spacing.xl },
    emptyTitle: { ...typography.h2, color: colors.textPrimary, marginTop: spacing.md, marginBottom: spacing.sm },
    emptySubtitle: { ...typography.body, color: colors.textSecondary, textAlign: 'center' },
  });
