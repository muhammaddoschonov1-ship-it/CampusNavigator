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
  } catch (e) {
    console.warn('Could not load expo-notifications', e);
  }
}

export const requestNotificationPermissions = async () => {
  if (!Notifications) {
    console.warn('Notifications are not supported in Expo Go on Android. Use a development build.');
    return false;
  }
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  return finalStatus === 'granted';
};

export const scheduleClassNotifications = async (group) => {
  if (!Notifications) return;

  // Avvalgi barcha bildirishnomalarni bekor qilamiz
  await Notifications.cancelAllScheduledNotificationsAsync();
  
  if (!group) return;
  
  const groupSchedule = scheduleData[group] || scheduleData['default'];
  if (!groupSchedule) return;

  const today = new Date();
  const dayIndex = String(today.getDay());
  const todayClasses = groupSchedule[dayIndex] || [];

  for (const cls of todayClasses) {
    if (!cls.startTime) continue;
    
    const [hour, min] = cls.startTime.split(':').map(Number);
    
    // Darsdan 10 daqiqa oldin
    const notifTime = new Date(today.getFullYear(), today.getMonth(), today.getDate(), hour, min, 0);
    notifTime.setMinutes(notifTime.getMinutes() - 10);

    // Agar vaqt o'tib ketgan bo'lsa (yoki o'tmish bo'lsa), o'tkazib yuboramiz
    if (notifTime <= new Date()) continue;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Darsga 10 daqiqa qoldi! 📚",
        body: `Navbatdagi dars: ${cls.subject}. Xona: ${cls.room}`,
        data: { classData: cls },
      },
      trigger: {
        type: 'date',
        date: notifTime,
      },
    });
  }
};
