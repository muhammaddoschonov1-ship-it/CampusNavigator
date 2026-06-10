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

// ====================================
// 📝 Ro'yxatdan o'tish (Register)
// ====================================
export const registerUser = async ({ name, email, password, group }) => {
  try {
    // Firebase Auth da foydalanuvchi yaratish
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Profilga ism qo'shish
    await updateProfile(user, { displayName: name });

    // Firestore ga foydalanuvchi ma'lumotlarini saqlash
    await setDoc(doc(db, 'users', user.uid), {
      name,
      email,
      group: group || '',
      role: 'student',
      avatar: null,
      createdAt: serverTimestamp(),
      lastLogin: serverTimestamp(),
    });

    return {
      success: true,
      user: {
        uid: user.uid,
        name,
        email,
        group,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error.code) + `\n\nSababi: ${error.message}`,
    };
  }
};

// ====================================
// 🔑 Kirish (Login)
// ====================================
export const loginUser = async ({ email, password }) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Firestore dan to'liq ma'lumotlarni olish
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    const userData = userDoc.exists() ? userDoc.data() : {};

    // Oxirgi kirish vaqtini yangilash (agar baza tozalanib ketgan bo'lsa, qayta yaratadi)
    await setDoc(doc(db, 'users', user.uid), {
      lastLogin: serverTimestamp(),
      email: user.email,
      name: userData.name || user.displayName || 'Foydalanuvchi',
      role: userData.role || 'student'
    }, { merge: true });

    return {
      success: true,
      user: {
        uid: user.uid,
        name: userData.name || user.displayName || 'Foydalanuvchi',
        email: user.email,
        group: userData.group || '',
        studentId: userData.studentId || '',
        role: userData.role || 'student',
        avatar: userData.avatar || null,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error.code) + `\n\nSababi: ${error.message}`,
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
