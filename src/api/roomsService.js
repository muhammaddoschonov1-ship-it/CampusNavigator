// ==========================================
// 🏫 Xonalar va Binolar API xizmati
// ==========================================
// Firestore'dan kampus ma'lumotlarini olish
// ==========================================

import { db } from './firebase';
import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import roomsLocal from '../data/rooms.json';

const ROOMS_COLLECTION = 'rooms';
const EVENTS_COLLECTION = 'events';

// ====================================
// 🔄 Firebase yoki Local ma'lumotlarni olish
// ====================================
// Agar Firebase ulangan bo'lsa — Firestore'dan oladi
// Aks holda — local rooms.json dan oladi
// ====================================

let useFirebase = true; // Firebase tayyor bo'lgach true qiling
const LOCAL_ROOMS_KEY = '@campus_rooms';

// Check if Firebase is properly configured and not dummy
const isFirebaseReady = () => {
  return (
    useFirebase &&
    db &&
    db.app &&
    db.app.options &&
    db.app.options.projectId &&
    db.app.options.projectId !== 'YOUR_PROJECT_ID'
  );
};

// Helper: Save rooms to AsyncStorage
const saveRoomsLocal = async (rooms) => {
  try {
    await AsyncStorage.setItem(LOCAL_ROOMS_KEY, JSON.stringify(rooms));
  } catch (e) {
    console.error('AsyncStorage saqlashda xatolik:', e);
  }
};

// Helper: Get rooms from AsyncStorage
const getRoomsLocal = async () => {
  try {
    const stored = await AsyncStorage.getItem(LOCAL_ROOMS_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
    // Initialize local database with default rooms
    await AsyncStorage.setItem(LOCAL_ROOMS_KEY, JSON.stringify(roomsLocal));
    return roomsLocal;
  } catch (e) {
    console.error('AsyncStorage yuklashda xatolik:', e);
    return roomsLocal;
  }
};

// ====================================
// 📋 Barcha xonalarni olish
// ====================================
export const getAllRooms = async () => {
  try {
    if (isFirebaseReady()) {
      const snapshot = await getDocs(collection(db, ROOMS_COLLECTION));
      
      // Agar baza mutlaqo bo'sh bo'lsa (yangi ochilgan bo'lsa), local fayldan barcha xonalarni bazaga yuklaymiz
      if (snapshot.empty) {
        console.log('Baza bo\'sh! Local ma\'lumotlar Firebase ga yuklanmoqda...');
        const { setDoc } = require('firebase/firestore');
        const roomsToSeed = require('../data/rooms.json');
        
        for (const room of roomsToSeed) {
          const roomData = { ...room };
          const roomId = roomData.id || Math.random().toString(36).substring(7);
          // id maydonini alohida ham saqlab ketamiz
          await setDoc(doc(db, ROOMS_COLLECTION, roomId), roomData);
        }
        
        // Qayta o'qish
        const newSnapshot = await getDocs(collection(db, ROOMS_COLLECTION));
        const seededRooms = newSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        return { success: true, data: seededRooms };
      }

      const rooms = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      return { success: true, data: rooms };
    }

    // Local AsyncStorage dan olish
    await AsyncStorage.removeItem(LOCAL_ROOMS_KEY); // Majburiy tozalash
    const rooms = await getRoomsLocal();
    return { success: true, data: rooms };
  } catch (error) {
    console.error('Xonalarni olishda xato (local yuklanmoqda):', error);
    const localRooms = await getRoomsLocal();
    return { success: true, data: localRooms };
  }
};

// ====================================
// 🔍 Xonani ID bo'yicha olish
// ====================================
export const getRoomById = async (roomId) => {
  try {
    if (useFirebase) {
      const docRef = doc(db, ROOMS_COLLECTION, roomId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return { success: true, data: { id: docSnap.id, ...docSnap.data() } };
      }
      return { success: false, error: 'Xona topilmadi' };
    }

    const room = roomsLocal.find((r) => r.id === roomId);
    if (room) {
      return { success: true, data: room };
    }
    return { success: false, error: 'Xona topilmadi' };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// ====================================
// 🏢 Binolar bo'yicha filtrlash
// ====================================
export const getRoomsByBuilding = async (buildingName) => {
  try {
    if (useFirebase) {
      const q = query(
        collection(db, ROOMS_COLLECTION),
        where('building', '==', buildingName)
      );
      const snapshot = await getDocs(q);
      const rooms = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      return { success: true, data: rooms };
    }

    const rooms = roomsLocal.filter((r) => r.building === buildingName);
    return { success: true, data: rooms };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// ====================================
// 🏷️ Tur bo'yicha filtrlash
// ====================================
export const getRoomsByType = async (type) => {
  try {
    if (useFirebase) {
      const q = query(
        collection(db, ROOMS_COLLECTION),
        where('type', '==', type)
      );
      const snapshot = await getDocs(q);
      const rooms = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      return { success: true, data: rooms };
    }

    const rooms = roomsLocal.filter((r) => r.type === type);
    return { success: true, data: rooms };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// ====================================
// 🔎 Qidirish (Search)
// ====================================
export const searchRooms = async (searchQuery) => {
  try {
    const normalizedQuery = searchQuery.toLowerCase().trim();
    
    if (useFirebase) {
      // Firestore to'liq matn qidiruvni qo'llab-quvvatlamaydi,
      // shuning uchun barcha ma'lumotlarni olib, local filtrlash
      const snapshot = await getDocs(collection(db, ROOMS_COLLECTION));
      const rooms = snapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter(
          (room) =>
            room.name.toLowerCase().includes(normalizedQuery) ||
            room.building.toLowerCase().includes(normalizedQuery) ||
            room.description.toLowerCase().includes(normalizedQuery) ||
            room.type.toLowerCase().includes(normalizedQuery)
        );
      return { success: true, data: rooms };
    }

    const rooms = roomsLocal.filter(
      (room) =>
        room.name.toLowerCase().includes(normalizedQuery) ||
        room.building.toLowerCase().includes(normalizedQuery) ||
        room.description.toLowerCase().includes(normalizedQuery) ||
        room.type.toLowerCase().includes(normalizedQuery)
    );
    return { success: true, data: rooms };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// ====================================
// 📅 Tadbirlarni olish (Events)
// ====================================
export const getEvents = async () => {
  try {
    if (useFirebase) {
      const q = query(
        collection(db, EVENTS_COLLECTION),
        orderBy('date', 'asc')
      );
      const snapshot = await getDocs(q);
      const events = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      return { success: true, data: events };
    }

    // Local default tadbirlar
    return {
      success: true,
      data: [
        {
          id: '1',
          title: 'Ochiq dars — Dasturlash asoslari',
          date: '2026-05-20',
          time: '10:00',
          location: 'Informatika laboratoriyasi',
          type: 'dars',
        },
        {
          id: '2',
          title: 'Talabalar sport musobaqasi',
          date: '2026-05-22',
          time: '14:00',
          location: 'Sport majmuasi',
          type: 'sport',
        },
        {
          id: '3',
          title: 'Ilmiy konferentsiya',
          date: '2026-05-25',
          time: '09:00',
          location: 'Konferents zal',
          type: 'konferentsiya',
        },
      ],
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// ====================================
// 📊 Statistika
// ====================================
export const getCampusStats = async () => {
  try {
    const { data: rooms } = await getAllRooms();
    
    const stats = {
      totalRooms: rooms.length,
      totalCapacity: rooms.reduce((sum, r) => sum + (r.capacity || 0), 0),
      buildings: [...new Set(rooms.map((r) => r.building))].length,
      types: [...new Set(rooms.map((r) => r.type))],
      byType: {},
      byBuilding: {},
    };

    rooms.forEach((room) => {
      stats.byType[room.type] = (stats.byType[room.type] || 0) + 1;
      stats.byBuilding[room.building] = (stats.byBuilding[room.building] || 0) + 1;
    });

    return { success: true, data: stats };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// ====================================
// ➕ Xona qo'shish (Admin uchun)
// ====================================
export const addRoom = async (roomData) => {
  try {
    if (isFirebaseReady()) {
      const docRef = await addDoc(collection(db, ROOMS_COLLECTION), {
        ...roomData,
        createdAt: serverTimestamp(),
      });
      return { success: true, id: docRef.id };
    }
    
    // Local CRUD
    const localRooms = await getRoomsLocal();
    const newRoom = {
      ...roomData,
      id: Date.now().toString(), // unique string ID
    };
    localRooms.push(newRoom);
    await saveRoomsLocal(localRooms);
    return { success: true, id: newRoom.id };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// ====================================
// ✏️ Xonani yangilash (Admin uchun)
// ====================================
export const updateRoom = async (roomId, updates) => {
  try {
    if (isFirebaseReady()) {
      await updateDoc(doc(db, ROOMS_COLLECTION, roomId), {
        ...updates,
        updatedAt: serverTimestamp(),
      });
      return { success: true };
    }

    // Local CRUD
    const localRooms = await getRoomsLocal();
    const updated = localRooms.map((r) => (r.id === roomId ? { ...r, ...updates } : r));
    await saveRoomsLocal(updated);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// ====================================
// 🗑️ Xonani o'chirish (Admin uchun)
// ====================================
export const deleteRoom = async (roomId) => {
  try {
    if (isFirebaseReady()) {
      await deleteDoc(doc(db, ROOMS_COLLECTION, roomId));
      return { success: true };
    }

    // Local CRUD
    const localRooms = await getRoomsLocal();
    const filtered = localRooms.filter((r) => r.id !== roomId);
    await saveRoomsLocal(filtered);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// ====================================
// 🔧 Firebase rejimini almashtirish
// ====================================
export const setFirebaseMode = (enabled) => {
  useFirebase = enabled;
};
