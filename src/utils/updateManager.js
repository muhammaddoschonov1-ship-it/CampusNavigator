// ==========================================
// 🚀 Havodan yangilanish (OTA & In-App Updater)
// ==========================================
// Telegram kabi havodan yangilanish (Expo Updates)
// va yangi APK chiqqanda to'g'ridan-to'g'ri yuklab olish
// ==========================================

import { Alert, Linking, Platform } from 'react-native';
import Constants from 'expo-constants';
import { db } from '../api/firebase';
import { doc, getDoc } from 'firebase/firestore';

export const CURRENT_APP_VERSION = '1.0.6';

let Updates = null;
try {
  Updates = require('expo-updates');
} catch (e) {
  console.warn('expo-updates module could not be loaded:', e);
}

/** Vaqt chegarasi (timeout) bilan xavfsiz bajarish */
const withTimeout = (promise, ms = 7000) => {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), ms)),
  ]);
};

/**
 * Haqiqiy ishlayotgan versiya ma'lumotini aniqlash.
 * Agar ilova havoda (OTA) yangilangan bo'lsa, uni avtomatik aks ettiradi.
 */
export const getAppVersionDisplay = () => {
  try {
    if (Updates && Updates.updateId) {
      const date = Updates.createdAt ? new Date(Updates.createdAt) : null;
      if (date) {
        const d = String(date.getDate()).padStart(2, '0');
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const h = String(date.getHours()).padStart(2, '0');
        const min = String(date.getMinutes()).padStart(2, '0');
        return `v${CURRENT_APP_VERSION} (OTA ${d}.${m} ${h}:${min})`;
      }
      return `v${CURRENT_APP_VERSION} (OTA #${Updates.updateId.slice(0, 6)})`;
    }
  } catch (e) {}
  return `v${CURRENT_APP_VERSION}`;
};

/**
 * 1. Havodan yangilanishni (OTA - Over The Air) tekshirish
 * Bu usulda APK'ni qayta yuklab o'rnatmasdan, orqa fonda
 * JavaScript kodlari, dizayn va xatoliklar avtomatik yangilanadi.
 */
export const checkOTAUpdate = async (silent = false) => {
  if (!Updates) {
    if (!silent) {
      Alert.alert('Ma\'lumot', 'Havodan yangilanish moduli yuklanmadi.');
    }
    return false;
  }

  // Development (Expo Go) rejimida Updates ishlamaydi
  if (__DEV__ || !Updates.isEnabled) {
    if (!silent) {
      Alert.alert(
        'Ishlab chiqish rejimi',
        `Siz hozirda Expo Go / Test rejimidasiz (v${CURRENT_APP_VERSION}).\n\nHavodan yangilanish (OTA) xizmati o'rnatilgan APK fayllarda avtomatik ishlaydi.`
      );
    }
    return false;
  }

  try {
    // 7 soniya ichida tekshirish
    const update = await withTimeout(Updates.checkForUpdateAsync(), 7000);

    if (update && update.isAvailable) {
      // Yangilanishni fonda yuklab olamiz (maksimum 18 soniya)
      try {
        await withTimeout(Updates.fetchUpdateAsync(), 18000);
      } catch (e) {
        console.warn('Fetch error:', e);
      }

      Alert.alert(
        'Yangi yangilanish yuklandi! 🚀',
        "Ilova uchun yangi yaxshilanishlar tayyor. Yangilanishlarni qo'llash uchun ilovani hozir qayta ishga tushirilsinmi?",
        [
          { text: 'Keyinroq', style: 'cancel' },
          {
            text: 'Qayta ishga tushirish',
            style: 'default',
            onPress: async () => {
              try {
                await Updates.reloadAsync();
              } catch (err) {
                console.warn('Reload error:', err);
              }
            },
          },
        ]
      );
      return true;
    } else {
      if (!silent) {
        Alert.alert(
          'Yangilanish yo\'q ✅',
          `Sizda ilovaning eng so'nggi versiyasi o'rnatilgan (${getAppVersionDisplay()}).`
        );
      }
      return false;
    }
  } catch (error) {
    console.warn('OTA tekshirishda xatolik:', error);
    if (!silent) {
      Alert.alert('Aloqa xabari', 'Yangilanishlarni tekshirishda internet sekinligi sezildi. Ilovani yopib qayta ochsangiz, yangilanish avtomatik qo\'llaniladi.');
    }
    return false;
  }
};

/**
 * 2. Telegram uslubida yangi APK versiyasini tekshirish
 * (Firebase Firestore orqali yangi APK chiqqanini tekshiradi)
 */
export const checkServerAppVersion = async (silent = false) => {
  try {
    // Firestore uchun 3 soniyalik timeout (qotib qolmasligi uchun)
    const versionDoc = await withTimeout(getDoc(doc(db, 'system', 'app_version')), 3500);
    if (versionDoc && versionDoc.exists()) {
      const data = versionDoc.data();
      const latestVersion = data.version;
      const downloadUrl = data.apkUrl || data.downloadUrl;
      const releaseNotes = data.changelog || data.notes || "Yangi imkoniyatlar va xatoliklar tuzatildi.";

      if (latestVersion && latestVersion !== CURRENT_APP_VERSION) {
        Alert.alert(
          `Yangi versiya mavjud! (v${latestVersion}) 📲`,
          `Sizdagi versiya: v${CURRENT_APP_VERSION}\n\nYangiliklar:\n${releaseNotes}\n\nYangi versiyani yuklab olishni xohlaysizmi?`,
          [
            { text: 'Keyinroq', style: 'cancel' },
            {
              text: 'Yuklab olish',
              style: 'default',
              onPress: () => {
                if (downloadUrl) {
                  Linking.openURL(downloadUrl);
                } else {
                  Alert.alert('Xatolik', 'Yuklab olish havolasi topilmadi.');
                }
              },
            },
          ]
        );
        return true;
      }
    }
    return false;
  } catch (err) {
    return false;
  }
};

/**
 * 3. Barcha yangilanishlarni birdaniga tekshirish
 */
export const checkForAllUpdates = async (silent = false) => {
  try {
    const otaFound = await checkOTAUpdate(silent);
    if (!otaFound) {
      await checkServerAppVersion(silent);
    }
  } catch (err) {
    console.warn('Check update overall error:', err);
  }
};
