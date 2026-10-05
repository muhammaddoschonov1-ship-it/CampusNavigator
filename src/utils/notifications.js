import scheduleData from '../data/schedule.json';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

const isExpoGoAndroid = Platform.OS === 'android' && Constants.appOwnership === 'expo';

let Notifications = null;

if (!isExpoGoAndroid) {
  try {
    Notifications = require('expo-notifications');
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });

    // Android uchun bildirishnoma kanalini yaratish (Android 8+ da majburiy)
    if (Platform.OS === 'android') {
      Notifications.setNotificationChannelAsync('default', {
        name: 'NDTU Campus Bildirishnomalar',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#6C63FF',
        sound: 'default',
      }).catch(err => console.warn('Notification channel error:', err));
    }
  } catch (e) {
    console.warn('Could not load expo-notifications', e);
  }
}

export const requestNotificationPermissions = async () => {
  if (!Notifications) {
    console.warn('Notifications are not supported in Expo Go on Android. Use a development build.');
    return false;
  }
  try {
    // Android kanallarini ta'minlash
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'NDTU Campus Bildirishnomalar',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#6C63FF',
        sound: 'default',
      });
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    return finalStatus === 'granted';
  } catch (err) {
    console.warn('Error requesting notification permissions:', err);
    return false;
  }
};

// Darslar jadvali bo'yicha 7 kunlik eslatmalarni rejalashtirish
export const scheduleClassNotifications = async (group) => {
  if (!Notifications) return;

  try {
    // Avvalgi barcha bildirishnomalarni bekor qilamiz
    await Notifications.cancelAllScheduledNotificationsAsync();
    
    if (!group) return;
    
    const groupSchedule = scheduleData[group] || scheduleData['default'];
    if (!groupSchedule) return;

    const now = new Date();

    // Keyingi 7 kun uchun darslarni tekshirib eslatma qo'yamiz
    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const targetDate = new Date();
      targetDate.setDate(now.getDate() + dayOffset);
      const dayIndex = String(targetDate.getDay());
      const classesForDay = groupSchedule[dayIndex] || [];

      for (const cls of classesForDay) {
        if (!cls.startTime) continue;
        
        const [hour, min] = cls.startTime.split(':').map(Number);
        
        // Dars boshlanishidan 10 daqiqa oldin
        const notifTime = new Date(
          targetDate.getFullYear(),
          targetDate.getMonth(),
          targetDate.getDate(),
          hour,
          min,
          0
        );
        notifTime.setMinutes(notifTime.getMinutes() - 10);

        // Agar o'tib ketgan vaqt bo'lsa, o'tkazib yuboramiz
        if (notifTime <= now) continue;

        await Notifications.scheduleNotificationAsync({
          content: {
            title: "Darsga 10 daqiqa qoldi! 📚",
            body: `Navbatdagi dars: ${cls.subject}. Xona: ${cls.room}`,
            data: { classData: cls },
            sound: true,
            channelId: 'default',
          },
          trigger: {
            type: 'date',
            date: notifTime,
          },
        });
      }
    }
  } catch (err) {
    console.warn('scheduleClassNotifications error:', err);
  }
};

// Test bildirishnoma yuborish (foydalanuvchi tekshirib ko'rishi uchun)
export const sendTestNotification = async () => {
  if (!Notifications) return false;
  try {
    await requestNotificationPermissions();
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Test bildirishnoma 🔔",
        body: "NDTU Navigator ilovasi bildirishnomalari telefoningizda muvaffaqiyatli ishlamoqda!",
        sound: true,
        channelId: 'default',
      },
      trigger: {
        seconds: 1,
      },
    });
    return true;
  } catch (e) {
    console.warn('sendTestNotification error:', e);
    return false;
  }
};
