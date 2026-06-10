// ==========================================
// 🔥 Firebase konfiguratsiya
// ==========================================
// 
// Firebase Console'dan o'z loyihangiz ma'lumotlarini 
// qo'ying (https://console.firebase.google.com)
//
// Qadamlar:
// 1. console.firebase.google.com ga kiring
// 2. "Add project" bosing -> loyiha nomini kiriting
// 3. Web app qo'shing (</> tugmasi)
// 4. Berilgan config ma'lumotlarini pastga joylashtiring
// ==========================================

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// 🔧 Firebase config — O'Z MA'LUMOTLARINGIZNI QO'YING
const firebaseConfig = {
  apiKey: "AIzaSyDFP6dpeYJfJB39Do0ZIpj3UDdVsnilAiE",
  authDomain: "campus-d4ff9.firebaseapp.com",
  projectId: "campus-d4ff9",
  storageBucket: "campus-d4ff9.firebasestorage.app",
  messagingSenderId: "919536630474",
  appId: "1:919536630474:web:f01efebe090b573d7f1233",
  measurementId: "G-E1YH7C23S1"
};

// Firebase ishga tushirish
const app = initializeApp(firebaseConfig);

// Auth
const auth = getAuth(app);

// Firestore database
const db = getFirestore(app);

export { app, auth, db };
