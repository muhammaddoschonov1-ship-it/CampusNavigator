// ==========================================
// 🔐 Autentifikatsiya xizmati (Auth Service)
// ==========================================
// Firebase Authentication orqali login/register/logout
// ==========================================

import { auth, db } from './firebase';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  onAuthStateChanged,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';

import AsyncStorage from '@react-native-async-storage/async-storage';

// ====================================
// 📝 Ro'yxatdan o'tish (Register)
// ====================================
export const registerUser = async ({ name, email, password, group }) => {
  const cleanEmail = email.trim().toLowerCase();
  try {
    // Firebase Auth da foydalanuvchi yaratish
    const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, password);
    const user = userCredential.user;

    // Profilga ism qo'shish
    try {
      await updateProfile(user, { displayName: name });
    } catch (e) {
      console.warn("Auth updateProfile failed:", e);
    }

    const userData = {
      uid: user.uid,
      name,
      email: cleanEmail,
      group: group || '',
      role: 'student',
      avatar: null,
    };

    // Firestore ga foydalanuvchi ma'lumotlarini saqlash
    try {
      await setDoc(doc(db, 'users', user.uid), {
        ...userData,
        createdAt: serverTimestamp(),
        lastLogin: serverTimestamp(),
      });
    } catch (dbErr) {
      console.warn("Firestore setDoc failed, saving locally:", dbErr);
    }

    // Har doim localga ham saqlaymiz
    await AsyncStorage.setItem('@local_user_' + cleanEmail, JSON.stringify(userData));

    return {
      success: true,
      user: userData,
    };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error.code) + (error.message ? `\n\n(${error.message})` : ''),
    };
  }
};

// ====================================
// 🔑 Kirish (Login)
// ====================================
export const loginUser = async ({ email, password }) => {
  const cleanEmail = email.trim().toLowerCase();
  try {
    const userCredential = await signInWithEmailAndPassword(auth, cleanEmail, password);
    const user = userCredential.user;

    // Firestore dan ma'lumotlarni olish
    let userData = {};
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        userData = userDoc.data();
      }
    } catch (e) {
      console.warn("Firestore getDoc failed:", e);
    }

    // Local keshdan tekshirish
    if (!userData.group || !userData.name) {
      try {
        const local = await AsyncStorage.getItem('@local_user_' + cleanEmail);
        if (local) {
          const parsed = JSON.parse(local);
          userData = { ...parsed, ...userData };
        }
      } catch (e) {}
    }

    const finalUser = {
      uid: user.uid,
      name: userData.name || user.displayName || 'Foydalanuvchi',
      email: user.email,
      group: userData.group || '',
      studentId: userData.studentId || '',
      role: userData.role || (cleanEmail.includes('admin') ? 'admin' : 'student'),
      avatar: userData.avatar || null,
    };

    // Firestore da lastLogin yangilash (xatolik bo'lsa to'xtatmaydi)
    try {
      await setDoc(doc(db, 'users', user.uid), {
        lastLogin: serverTimestamp(),
        email: user.email,
        name: finalUser.name,
        role: finalUser.role
      }, { merge: true });
    } catch (e) {}

    // Keshni yangilaymiz
    await AsyncStorage.setItem('@local_user_' + cleanEmail, JSON.stringify(finalUser));

    return {
      success: true,
      user: finalUser,
    };
  } catch (error) {
    // Agar internet yo'q bo'lsa yoki offline bo'lsa, local tekshiramiz
    if (error.code === 'auth/network-request-failed') {
      try {
        const local = await AsyncStorage.getItem('@local_user_' + cleanEmail);
        if (local) {
          return {
            success: true,
            user: JSON.parse(local),
            offline: true,
          };
        }
      } catch (e) {}
    }

    return {
      success: false,
      error: getErrorMessage(error.code) + (error.message ? `\n\n(${error.message})` : ''),
    };
  }
};

// ====================================
// 🚪 Chiqish (Logout)
// ====================================
export const logoutUser = async () => {
  try {
    await signOut(auth);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// ====================================
// 🔄 Parolni tiklash
// ====================================
export const resetPassword = async (email) => {
  try {
    await sendPasswordResetEmail(auth, email);
    return { 
      success: true, 
      message: 'Parolni tiklash havolasi emailga yuborildi' 
    };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error.code),
    };
  }
};

// ====================================
// 👤 Joriy foydalanuvchini kuzatish
// ====================================
export const onAuthChange = (callback) => {
  return onAuthStateChanged(auth, async (user) => {
    if (user) {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const userData = userDoc.exists() ? userDoc.data() : {};
      callback({
        uid: user.uid,
        name: user.displayName || userData.name || 'Foydalanuvchi',
        email: user.email,
        studentId: userData.studentId || '',
        role: userData.role || 'student',
      });
    } else {
      callback(null);
    }
  });
};

// ====================================
// 📝 Profilni yangilash
// ====================================
export const updateUserProfile = async (uid, updates) => {
  try {
    await setDoc(doc(db, 'users', uid), {
      ...updates,
      updatedAt: serverTimestamp(),
    }, { merge: true });
    
    // Agar ism o'zgaryotgan bo'lsa, Auth profilini ham yangilash
    if (updates.name && auth.currentUser) {
      await updateProfile(auth.currentUser, { displayName: updates.name });
    }
    
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// ====================================
// 🌐 Xato xabarlarni o'zbekchaga tarjima qilish
// ====================================
const getErrorMessage = (errorCode) => {
  const errors = {
    'auth/email-already-in-use': 'Bu email allaqachon ro\'yxatdan o\'tgan',
    'auth/invalid-email': 'Email formati noto\'g\'ri',
    'auth/weak-password': 'Parol kamida 6 belgidan iborat bo\'lishi kerak',
    'auth/user-not-found': 'Foydalanuvchi topilmadi',
    'auth/wrong-password': 'Parol noto\'g\'ri',
    'auth/too-many-requests': 'Juda ko\'p urinish. Keyinroq qayta urinib ko\'ring',
    'auth/network-request-failed': 'Internet aloqasi yo\'q',
    'auth/invalid-credential': 'Email yoki parol noto\'g\'ri',
  };
  return errors[errorCode] || 'Noma\'lum xatolik yuz berdi';
};
