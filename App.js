import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeProvider } from './src/theme/ThemeContext';
import { LanguageProvider } from './src/theme/LanguageContext';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import LoginScreen from './src/screens/LoginScreen';
import { AuthProvider } from './src/theme/AuthContext';
import { logoutUser } from './src/api/authService';
import { requestNotificationPermissions, scheduleClassNotifications } from './src/utils/notifications';
import { checkForAllUpdates } from './src/utils/updateManager';

const USER_SESSION_KEY = '@current_user_session';

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [isInitializing, setIsInitializing] = useState(true);

  // Ilova ochilganda saqlangan sessiyani tekshirish
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const storedUser = await AsyncStorage.getItem(USER_SESSION_KEY);
        if (storedUser) {
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);
          setIsLoggedIn(true);

          // Dars bildirishnomalarini yangilab qo'yish
          if (parsedUser.group) {
            scheduleClassNotifications(parsedUser.group).catch(() => {});
          }
        }
      } catch (e) {
        console.warn('Failed to restore session:', e);
      } finally {
        setIsInitializing(false);
      }
    };

    restoreSession();

    // Fonda havodan yangilanishlarni (OTA) avtomatik tekshirish
    setTimeout(() => {
      checkForAllUpdates(true).catch(() => {});
    }, 2500);
  }, []);

  const handleLogin = async (userData) => {
    setUser(userData);
    setIsLoggedIn(true);

    try {
      await AsyncStorage.setItem(USER_SESSION_KEY, JSON.stringify(userData));
    } catch (e) {
      console.warn('Failed to persist user session:', e);
    }
    
    // Bildirishnoma ruxsatini so'rash va darslarni rejalashtirish
    try {
      const hasPermission = await requestNotificationPermissions();
      if (hasPermission && userData?.group) {
        await scheduleClassNotifications(userData.group);
      }
    } catch (e) {}
  };

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem(USER_SESSION_KEY);
      await logoutUser();
    } catch (e) {}
    setUser(null);
    setIsLoggedIn(false);
  };

  if (isInitializing) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0A0E1A', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#6C63FF" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <LanguageProvider>
          {isLoggedIn ? (
            <AuthProvider user={user} onLogout={handleLogout}>
              <AppNavigator />
            </AuthProvider>
          ) : (
            <LoginScreen onLogin={handleLogin} />
          )}
        </LanguageProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

