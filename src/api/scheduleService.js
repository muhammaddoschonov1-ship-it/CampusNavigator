import AsyncStorage from '@react-native-async-storage/async-storage';
import scheduleLocal from '../data/schedule.json';
import { db } from './firebase'; // Hozircha import qilib qo'yamiz, keyinchalik ishlatish mumkin

const LOCAL_SCHEDULE_KEY = '@campus_schedule';

// ====================================
// 🔄 Dars jadvalini barchasini olish
// ====================================
export const getFullSchedule = async () => {
  try {
    const stored = await AsyncStorage.getItem(LOCAL_SCHEDULE_KEY);
    if (stored) {
      return { success: true, data: JSON.parse(stored) };
    }
    // Agar xotirada hech narsa bo'lmasa, default schedule.json dan olamiz va saqlaymiz
    await AsyncStorage.setItem(LOCAL_SCHEDULE_KEY, JSON.stringify(scheduleLocal));
    return { success: true, data: scheduleLocal };
  } catch (error) {
    console.error('Jadvalni yuklashda xatolik:', error);
    return { success: true, data: scheduleLocal };
  }
};

// ====================================
// 💾 Dars jadvalini to'liq saqlash
// ====================================
export const saveFullSchedule = async (newSchedule) => {
  try {
    await AsyncStorage.setItem(LOCAL_SCHEDULE_KEY, JSON.stringify(newSchedule));
    return { success: true };
  } catch (error) {
    console.error('Jadvalni saqlashda xatolik:', error);
    return { success: false, error: error.message };
  }
};

// ====================================
// ➕ Bitta yangi dars qo'shish
// ====================================
export const addClassToSchedule = async (group, dayStr, classData) => {
  try {
    const res = await getFullSchedule();
    let schedule = res.data;
    
    if (!schedule[group]) {
      schedule[group] = { "0": [], "1": [], "2": [], "3": [], "4": [], "5": [], "6": [] };
    }
    
    if (!schedule[group][dayStr]) {
      schedule[group][dayStr] = [];
    }

    const newClass = {
      ...classData,
      id: Date.now(), // unique id
    };
    
    schedule[group][dayStr].push(newClass);
    
    // Vaqti bo'yicha saralash
    schedule[group][dayStr].sort((a, b) => {
      const aTime = a.startTime || a.time.substring(0, 5);
      const bTime = b.startTime || b.time.substring(0, 5);
      return aTime.localeCompare(bTime);
    });

    await saveFullSchedule(schedule);
    return { success: true, data: newClass };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// ====================================
// ✏️ Bitta darsni tahrirlash
// ====================================
export const updateClassInSchedule = async (group, dayStr, classId, updatedData) => {
  try {
    const res = await getFullSchedule();
    let schedule = res.data;
    
    if (schedule[group] && schedule[group][dayStr]) {
      const idx = schedule[group][dayStr].findIndex(c => c.id === classId);
      if (idx !== -1) {
        schedule[group][dayStr][idx] = { ...schedule[group][dayStr][idx], ...updatedData };
        
        // Vaqti bo'yicha qayta saralash
        schedule[group][dayStr].sort((a, b) => {
          const aTime = a.startTime || a.time.substring(0, 5);
          const bTime = b.startTime || b.time.substring(0, 5);
          return aTime.localeCompare(bTime);
        });

        await saveFullSchedule(schedule);
        return { success: true };
      }
    }
    return { success: false, error: 'Dars topilmadi' };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// ====================================
// 🗑️ Bitta darsni o'chirish
// ====================================
export const deleteClassFromSchedule = async (group, dayStr, classId) => {
  try {
    const res = await getFullSchedule();
    let schedule = res.data;
    
    if (schedule[group] && schedule[group][dayStr]) {
      schedule[group][dayStr] = schedule[group][dayStr].filter(c => c.id !== classId);
      await saveFullSchedule(schedule);
      return { success: true };
    }
    return { success: false, error: 'Dars topilmadi' };
  } catch (error) {
    return { success: false, error: error.message };
  }
};
