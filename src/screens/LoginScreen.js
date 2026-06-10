import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Animated,
  KeyboardAvoidingView,
  StatusBar,
  Dimensions,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../theme/LanguageContext';
import { spacing, borderRadius, typography } from '../theme/colors';
import { loginUser, registerUser, resetPassword } from '../api/authService';

const { width, height } = Dimensions.get('window');

// Firebase sozlanganmi yoki yo'qligini aniqlash
const FIREBASE_ENABLED = true; // Firebase tayyor bo'lgach true qiling

export default function LoginScreen({ onLogin }) {
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  
  // Form holatlari
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [group, setGroup] = useState('');

  // Register/Login o'rtasida almashish
  const toggleMode = () => {
    setIsRegister(!isRegister);
    // Formni tozalash
    setPassword('');
    setConfirmPassword('');
    setGroup('');
  };

  // ====================================
  // 🔑 KIRISH — Firebase yoki Local
  // ====================================
  const handleLogin = async () => {
    // Check for "admin" username/email bypass first
    const isOfflineAdmin = name.trim().toLowerCase() === 'admin' || email.trim().toLowerCase() === 'admin' || email.trim().toLowerCase().startsWith('admin@');
    if (isOfflineAdmin) {
      onLogin({
        name: 'Admin',
        role: 'admin',
        email: email.trim() || 'admin@campus.uz',
      });
      return;
    }

    if (!email.trim() || !email.includes('@')) {
      Alert.alert('Xatolik', 'Iltimos, to\'g\'ri Gmail pochta manzilini kiriting (@ belgisi bo\'lishi shart)');
      return;
    }

    if (FIREBASE_ENABLED) {
      // Check if Firebase is actually configured or is dummy
      const { db } = require('../api/firebase');
      const isFirebaseConfigured = db && db.app && db.app.options && db.app.options.projectId && db.app.options.projectId !== 'YOUR_PROJECT_ID';

      if (!isFirebaseConfigured) {
        // Fall back to local login if firebase is not configured
        if (!password.trim()) {
          Alert.alert('Xatolik', 'Iltimos, parolni kiriting');
          return;
        }
        const savedName = await AsyncStorage.getItem('localName_' + email.trim());
        const savedGroup = await AsyncStorage.getItem('localGroup_' + email.trim());
        const displayName = savedName || 'Foydalanuvchi';
        onLogin({
          name: displayName,
          group: savedGroup || '',
          role: email.trim().toLowerCase() === 'admin' || email.trim().toLowerCase().startsWith('admin@') ? 'admin' : 'student',
          email: email.trim(),
        });
        return;
      }

      if (!email.trim() || !password.trim()) {
        Alert.alert('Xatolik', 'Iltimos, email va parolni kiriting');
        return;
      }

      setIsLoading(true);
      const result = await loginUser({ email: email.trim(), password });
      setIsLoading(false);

      if (result.success) {
        onLogin(result.user);
      } else {
        Alert.alert('Xatolik', result.error);
      }
    } else {
      const savedName = await AsyncStorage.getItem('localName_' + email.trim());
      const savedGroup = await AsyncStorage.getItem('localGroup_' + email.trim());
      const loginName = savedName || 'Foydalanuvchi';
      onLogin({
        name: loginName,
        group: savedGroup || '',
        role: loginName.toLowerCase() === 'admin' || email.trim().toLowerCase().startsWith('admin@') ? 'admin' : 'student',
        email: email.trim(),
      });
    }
  };

  // ====================================
  // 📝 RO'YXATDAN O'TISH
  // ====================================
  const handleRegister = async () => {
    if (!name.trim()) {
      Alert.alert('Xatolik', 'Iltimos, ismingizni kiriting');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      Alert.alert('Xatolik', 'Iltimos, to\'g\'ri Gmail pochta manzilini kiriting (@ belgisi bo\'shart)');
      return;
    }
    if (!group.trim()) {
      Alert.alert('Xatolik', 'Iltimos, guruh raqami va harfini kiriting');
      return;
    }
    if (!password.trim() || password.length < 6) {
      Alert.alert('Xatolik', 'Parol kamida 6 belgidan iborat bo\'lishi kerak');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Xatolik', 'Parollar mos kelmaydi');
      return;
    }

    if (FIREBASE_ENABLED) {
      // Check if Firebase is actually configured or is dummy
      const { db } = require('../api/firebase');
      const isFirebaseConfigured = db && db.app && db.app.options && db.app.options.projectId && db.app.options.projectId !== 'YOUR_PROJECT_ID';

      if (!isFirebaseConfigured) {
        // Fall back to local login if firebase is not configured
        await AsyncStorage.setItem('localName_' + email.trim(), name.trim());
        await AsyncStorage.setItem('localGroup_' + email.trim(), group.trim());
        onLogin({
          name: name.trim(),
          group: group.trim(),
          role: name.trim().toLowerCase() === 'admin' || email.trim().toLowerCase() === 'admin' || email.trim().toLowerCase().startsWith('admin@') ? 'admin' : 'student',
          email: email.trim(),
        });
        return;
      }

      setIsLoading(true);
      const result = await registerUser({
        name: name.trim(),
        email: email.trim(),
        password,
        group: group.trim(),
      });
      setIsLoading(false);

      if (result.success) {
        Alert.alert(
          'Muvaffaqiyat! ✅',
          'Ro\'yxatdan o\'tdingiz! Endi tizimga kirishingiz mumkin.',
          [{ text: 'OK', onPress: () => toggleMode() }]
        );
      } else {
        Alert.alert('Xatolik', result.error);
      }
    } else {
      await AsyncStorage.setItem('localName_' + email.trim(), name.trim());
      await AsyncStorage.setItem('localGroup_' + email.trim(), group.trim());
      onLogin({
        name: name.trim(),
        group: group.trim(),
        role: name.trim().toLowerCase() === 'admin' || email.trim().toLowerCase() === 'admin' || email.trim().toLowerCase().startsWith('admin@') ? 'admin' : 'student',
        email: email.trim(),
      });
    }
  };

  // ====================================
  // 🔄 PAROLNI TIKLASH
  // ====================================
  const handleForgotPassword = async () => {
    if (!FIREBASE_ENABLED) {
      Alert.alert('Ma\'lumot', 'Firebase ulanmagan. Parolni tiklash uchun Firebase\'ni sozlang.');
      return;
    }
    
    if (!email.trim() || !email.includes('@')) {
      Alert.alert('Parolni tiklash', 'Iltimos, avval Email qatoriga pochta manzilingizni kiriting va keyin "Parolni unutdim" tugmasini bosing.');
      return;
    }

    setIsLoading(true);
    try {
      const { resetPassword } = require('../api/authService');
      const result = await resetPassword(email.trim());
      Alert.alert(result.success ? 'Yuborildi ✅' : 'Xatolik', result.success ? result.message : result.error);
    } catch (e) {
      Alert.alert('Xatolik', 'Kutilmagan xatolik yuz berdi');
    } finally {
      setIsLoading(false);
    }
  };

  // ====================================
  // 👤 MEHMON KIRISH
  // ====================================
  const handleGuestLogin = () => {
    onLogin({ name: 'Mehmon', isGuest: true });
  };

  const styles = createStyles(colors);

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor="transparent"
        translucent
      />

      {/* Background gradient */}
      <LinearGradient
        colors={[colors.primary + '15', colors.background, colors.accent + '08']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Decorative circles */}
      <View style={[styles.decorCircle1, { backgroundColor: colors.primary + '08' }]} />
      <View style={[styles.decorCircle2, { backgroundColor: colors.accent + '06' }]} />

      <KeyboardAvoidingView
        behavior="height"
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo Section */}
          <View style={styles.logoSection}>
            <LinearGradient
              colors={colors.gradientPurpleTeal}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.logoContainer}
            >
              <MaterialIcons name="explore" size={48} color="#FFF" />
            </LinearGradient>
            <Text style={styles.logoTitle}>{t.loginTitle}</Text>
            <Text style={styles.logoSubtitle}>{t.loginSubtitle}</Text>
          </View>

          {/* Form Section */}
          <View style={styles.formSection}>
            <View style={styles.formCard}>
              {/* Tab switcher — Login / Register */}
              <View style={styles.tabRow}>
                <TouchableOpacity
                  style={[styles.tab, !isRegister && styles.tabActive]}
                  onPress={() => isRegister && toggleMode()}
                >
                  <MaterialIcons 
                    name="login" 
                    size={18} 
                    color={!isRegister ? '#FFF' : colors.textMuted} 
                  />
                  <Text style={[styles.tabText, !isRegister && styles.tabTextActive]}>
                    Kirish
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.tab, isRegister && styles.tabActive]}
                  onPress={() => !isRegister && toggleMode()}
                >
                  <MaterialIcons 
                    name="person-add" 
                    size={18} 
                    color={isRegister ? '#FFF' : colors.textMuted} 
                  />
                  <Text style={[styles.tabText, isRegister && styles.tabTextActive]}>
                    Ro'yxatdan o'tish
                  </Text>
                </TouchableOpacity>
              </View>


              <Text style={styles.welcomeText}>
                {isRegister ? 'Yangi hisob yarating 🎓' : `${t.loginWelcome} 👋`}
              </Text>
              <Text style={styles.formDesc}>
                {isRegister
                  ? 'Kampus navigatsiya tizimiga qo\'shiling'
                  : t.loginDesc}
              </Text>

              {/* Name Input — faqat Ro'yxatdan o'tish rejimida */}
              {isRegister && (
                <View style={styles.inputContainer}>
                  <MaterialIcons name="person" size={20} color={colors.textMuted} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder={t.loginNamePlaceholder}
                    placeholderTextColor={colors.textMuted}
                    value={name}
                    onChangeText={setName}
                    selectionColor={colors.primary}
                  />
                </View>
              )}

              {/* Email Input — har doim ko'rinadi (Gmail pochta manzili) */}
              <View style={styles.inputContainer}>
                <MaterialIcons name="email" size={20} color={colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Gmail pochta manzili"
                  placeholderTextColor={colors.textMuted}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  selectionColor={colors.primary}
                />
              </View>



              {/* Group Input — faqat Ro'yxatdan o'tish rejimida */}
              {isRegister && (
                <View style={styles.inputContainer}>
                  <MaterialIcons name="group" size={20} color={colors.textMuted} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder={t.groupPlaceholder}
                    placeholderTextColor={colors.textMuted}
                    value={group}
                    onChangeText={setGroup}
                    selectionColor={colors.primary}
                    autoCapitalize="characters"
                  />
                </View>
              )}

              {/* Password Input — har doim ko'rinadi */}
              <View style={styles.inputContainer}>
                <MaterialIcons name="lock" size={20} color={colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder={t.loginPasswordPlaceholder}
                  placeholderTextColor={colors.textMuted}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  selectionColor={colors.primary}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  <MaterialIcons
                    name={showPassword ? 'visibility' : 'visibility-off'}
                    size={20}
                    color={colors.textMuted}
                  />
                </TouchableOpacity>
              </View>

              {/* Confirm Password — faqat Register rejimda */}
              {isRegister && (
                <View style={styles.inputContainer}>
                  <MaterialIcons name="lock-outline" size={20} color={colors.textMuted} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Parolni tasdiqlang"
                    placeholderTextColor={colors.textMuted}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showPassword}
                    selectionColor={colors.primary}
                  />
                </View>
              )}

              {/* Remember me & Forgot password */}
              {!isRegister && (
                <View style={styles.bottomRow}>
                  <TouchableOpacity
                    style={styles.rememberRow}
                    onPress={() => setRememberMe(!rememberMe)}
                    activeOpacity={0.7}
                  >
                    <MaterialIcons
                      name={rememberMe ? 'check-box' : 'check-box-outline-blank'}
                      size={22}
                      color={rememberMe ? colors.primary : colors.textMuted}
                    />
                    <Text style={styles.rememberText}>{t.loginRemember}</Text>
                  </TouchableOpacity>

                  {FIREBASE_ENABLED && (
                    <TouchableOpacity onPress={handleForgotPassword}>
                      <Text style={styles.forgotText}>Parolni unutdim</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {/* Main Action Button */}
              <TouchableOpacity
                style={styles.loginBtn}
                onPress={isRegister ? handleRegister : handleLogin}
                activeOpacity={0.8}
                disabled={isLoading}
              >
                <LinearGradient
                  colors={isRegister ? ['#10B981', '#059669'] : colors.gradientPurpleTeal}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.loginGradient}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#FFF" size="small" />
                  ) : (
                    <>
                      <MaterialIcons
                        name={isRegister ? 'person-add' : 'login'}
                        size={22}
                        color="#FFF"
                      />
                      <Text style={styles.loginBtnText}>
                        {isRegister ? 'Ro\'yxatdan o\'tish' : t.loginButton}
                      </Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              {/* Divider */}
              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>yoki</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Guest Button */}
              <TouchableOpacity
                style={styles.guestBtn}
                onPress={handleGuestLogin}
                activeOpacity={0.7}
              >
                <MaterialIcons name="person-outline" size={20} color={colors.primary} />
                <Text style={styles.guestBtnText}>{t.loginGuest}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    keyboardView: {
      flex: 1,
    },
    scrollContent: {
      flexGrow: 1,
      justifyContent: 'center',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.xl,
    },
    // Decorative
    decorCircle1: {
      position: 'absolute',
      top: -60,
      right: -60,
      width: 200,
      height: 200,
      borderRadius: 100,
    },
    decorCircle2: {
      position: 'absolute',
      bottom: -40,
      left: -40,
      width: 160,
      height: 160,
      borderRadius: 80,
    },
    // Logo
    logoSection: {
      alignItems: 'center',
      marginBottom: spacing.xl,
    },
    logoContainer: {
      width: 90,
      height: 90,
      borderRadius: 28,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: spacing.md,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.4,
      shadowRadius: 16,
      elevation: 12,
    },
    logoTitle: {
      ...typography.hero,
      color: colors.textPrimary,
      textAlign: 'center',
    },
    logoSubtitle: {
      ...typography.bodySmall,
      color: colors.accent,
      fontWeight: '600',
      textAlign: 'center',
      marginTop: 4,
    },
    // Form
    formSection: {
      width: '100%',
    },
    formCard: {
      backgroundColor: colors.surface,
      borderRadius: borderRadius.xl,
      padding: spacing.lg,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 12,
      elevation: 6,
    },
    // Tabs
    tabRow: {
      flexDirection: 'row',
      backgroundColor: colors.surfaceLight,
      borderRadius: borderRadius.lg,
      padding: 4,
      marginBottom: spacing.md,
    },
    tab: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 10,
      borderRadius: borderRadius.md,
      gap: 6,
    },
    tabActive: {
      backgroundColor: colors.primary,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 3,
    },
    tabText: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textMuted,
    },
    tabTextActive: {
      color: '#FFF',
    },
    welcomeText: {
      ...typography.h1,
      color: colors.textPrimary,
      marginBottom: 4,
    },
    formDesc: {
      ...typography.bodySmall,
      color: colors.textSecondary,
      marginBottom: spacing.lg,
    },
    // Inputs
    inputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surfaceLight,
      borderRadius: borderRadius.lg,
      paddingHorizontal: spacing.md,
      height: 52,
      marginBottom: spacing.sm,
      borderWidth: 1,
      borderColor: colors.border,
    },
    inputIcon: {
      marginRight: spacing.sm,
    },
    input: {
      flex: 1,
      fontSize: 15,
      fontWeight: '500',
      color: colors.textPrimary,
    },
    // Bottom row
    bottomRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.lg,
      marginTop: spacing.xs,
    },
    // Remember
    rememberRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    rememberText: {
      ...typography.bodySmall,
      color: colors.textSecondary,
    },
    forgotText: {
      ...typography.bodySmall,
      color: colors.primary,
      fontWeight: '600',
    },
    // Login button
    loginBtn: {
      borderRadius: borderRadius.lg,
      overflow: 'hidden',
      marginBottom: spacing.md,
    },
    loginGradient: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 16,
      gap: 8,
      borderRadius: borderRadius.lg,
    },
    loginBtnText: {
      ...typography.button,
      color: '#FFF',
      fontSize: 17,
    },
    // Divider
    dividerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: spacing.md,
    },
    dividerLine: {
      flex: 1,
      height: 1,
      backgroundColor: colors.border,
    },
    dividerText: {
      ...typography.bodySmall,
      color: colors.textMuted,
      marginHorizontal: spacing.md,
    },
    // Guest
    guestBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 14,
      borderRadius: borderRadius.lg,
      borderWidth: 1.5,
      borderColor: colors.primary + '40',
      backgroundColor: colors.primary + '08',
      gap: 8,
    },
    guestBtnText: {
      ...typography.button,
      color: colors.primary,
    },
    // API Status
    apiStatusRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: spacing.md,
      gap: 6,
    },
    apiDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    apiStatusText: {
      ...typography.bodySmall,
      color: colors.textMuted,
      fontSize: 12,
    },
  });
