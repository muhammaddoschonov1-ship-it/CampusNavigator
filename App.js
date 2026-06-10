import React, { useState } from 'react';
import { ThemeProvider } from './src/theme/ThemeContext';
import { LanguageProvider } from './src/theme/LanguageContext';
import AppNavigator from './src/navigation/AppNavigator';
import LoginScreen from './src/screens/LoginScreen';
import { AuthProvider } from './src/theme/AuthContext';
import { requestNotificationPermissions, scheduleClassNotifications } from './src/utils/notifications';

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);

  const handleLogin = async (userData) => {
    setUser(userData);
    setIsLoggedIn(true);
    
    // Bildirishnoma ruxsatini so'rash va darslarni rejalashtirish
    const hasPermission = await requestNotificationPermissions();
    if (hasPermission && userData?.group) {
      await scheduleClassNotifications(userData.group);
    }
  };

  const handleLogout = () => {
    setUser(null);
    setIsLoggedIn(false);
  };

  return (
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
  );
}
