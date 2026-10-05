import { db } from './firebase';
import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import buildingsLocal from '../data/buildings.json';

const BUILDINGS_COLLECTION = 'buildings';
const MAP_STORAGE_KEY = '@ndtu_buildings';
let useFirebase = true;

// Tezkor kesh va xavfsiz timeout bilan binolarni olish
export const getBuildings = async () => {
  let initialData = buildingsLocal;
  try {
    const cachedData = await AsyncStorage.getItem(MAP_STORAGE_KEY);
    if (cachedData) {
      initialData = JSON.parse(cachedData);
    }
  } catch (e) {}

  if (!useFirebase) {
    return initialData;
  }

  // Firebase'dan olish (3.5 soniya timeout bilan, shunda ekran qotib qolmaydi)
  try {
    const fetchPromise = getDocs(collection(db, BUILDINGS_COLLECTION));
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Firebase timeout')), 3500)
    );

    const snapshot = await Promise.race([fetchPromise, timeoutPromise]);
    let buildings = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    if (buildings.length >= 5) {
      await AsyncStorage.setItem(MAP_STORAGE_KEY, JSON.stringify(buildings));
      return buildings;
    } else {
      // Backgroundda default binolarni bazaga yuklab qo'yish (foydalanuvchini kutdirmaydi)
      setTimeout(async () => {
        try {
          for (const bld of buildingsLocal) {
            const bldExists = buildings.find(b => b.id === bld.id || b.name === bld.name);
            if (!bldExists) {
              await setDoc(doc(db, BUILDINGS_COLLECTION, bld.id), bld);
            }
          }
        } catch (e) {}
      }, 100);
      return initialData;
    }
  } catch (err) {
    // Timeout yoki tarmoq xatosi bo'lsa kesh/local qaytariladi
    return initialData;
  }
};

export const saveBuilding = async (buildingData) => {
  try {
    const currentList = await getBuildings();
    let updatedList = [...currentList];
    const bId = buildingData.id || `bld_${Date.now()}`;
    const newBuilding = { ...buildingData, id: bId };
    
    const existingIndex = updatedList.findIndex(b => b.id === buildingData.id);
    if (existingIndex >= 0) {
      updatedList[existingIndex] = newBuilding;
    } else {
      updatedList.push(newBuilding);
    }
    
    await AsyncStorage.setItem(MAP_STORAGE_KEY, JSON.stringify(updatedList));

    if (useFirebase) {
      try {
        if (buildingData.id) {
          const docRef = doc(db, BUILDINGS_COLLECTION, buildingData.id);
          await setDoc(docRef, { ...buildingData, updatedAt: serverTimestamp() }, { merge: true });
        } else {
          await addDoc(collection(db, BUILDINGS_COLLECTION), {
            ...buildingData,
            createdAt: serverTimestamp()
          });
        }
      } catch (e) {
        console.warn("Firebase save error", e);
      }
    }
    return { success: true, id: bId };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const deleteBuilding = async (buildingId) => {
  try {
    const currentList = await getBuildings();
    const updatedList = currentList.filter(b => b.id !== buildingId);
    await AsyncStorage.setItem(MAP_STORAGE_KEY, JSON.stringify(updatedList));

    if (useFirebase) {
      try {
        await deleteDoc(doc(db, BUILDINGS_COLLECTION, buildingId));
      } catch (e) {
        console.warn("Firebase delete error", e);
      }
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const setMapFirebaseMode = (enabled) => {
  useFirebase = enabled;
};
