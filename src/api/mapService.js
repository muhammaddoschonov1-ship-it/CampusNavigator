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

// Agar firebase yoqilgan bo'lsa firebase'dan, bo'lmasa localdan oladi
export const getBuildings = async () => {
  try {
    const cachedData = await AsyncStorage.getItem(MAP_STORAGE_KEY);
    if (cachedData && !useFirebase) {
      return JSON.parse(cachedData);
    }

    if (useFirebase) {
      try {
        const snapshot = await getDocs(collection(db, BUILDINGS_COLLECTION));
        let buildings = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        // Agar bazada 5 tadan kam bino bo'lsa (yoki bo'sh bo'lsa), default binolarni bazaga yozib yuboramiz
        if (buildings.length < 5) {
          console.log("Firebase bino bazasi bo'sh yoki kam, local binolar yuklanmoqda...");
          const { setDoc } = require('firebase/firestore');
          
          for (const bld of buildingsLocal) {
            const bldExists = buildings.find(b => b.id === bld.id || b.name === bld.name);
            if (!bldExists) {
              await setDoc(doc(db, BUILDINGS_COLLECTION, bld.id), bld);
              buildings.push(bld);
            }
          }
        }

        await AsyncStorage.setItem(MAP_STORAGE_KEY, JSON.stringify(buildings));
        return buildings;
      } catch (err) {
        console.warn("Firebase fetching failed, using local JSON", err);
      }
    }
    await AsyncStorage.setItem(MAP_STORAGE_KEY, JSON.stringify(buildingsLocal));
    return buildingsLocal;
  } catch (error) {
    console.warn("Error loading buildings:", error);
    return buildingsLocal;
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
