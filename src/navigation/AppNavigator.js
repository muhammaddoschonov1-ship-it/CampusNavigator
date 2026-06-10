import React from 'react';
import { View, StyleSheet, StatusBar } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../theme/LanguageContext';
import { useAuth } from '../theme/AuthContext';
import { spacing, borderRadius } from '../theme/colors';

import HomeScreen from '../screens/HomeScreen';
import SearchScreen from '../screens/SearchScreen';
import ProfileScreen from '../screens/ProfileScreen';
import RoomDetailScreen from '../screens/RoomDetailScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import MapEditorScreen from '../screens/MapEditorScreen';
import AdminScreen from '../screens/AdminScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function HomeTabs() {
  const { colors } = useTheme();
  const { t, language } = useLanguage();
  const { user, onLogout } = useAuth();

  return (
    <Tab.Navigator
      screenOptions={({ route: tabRoute }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surface + 'F5',
          borderWidth: 1,
          borderColor: colors.border,
          height: 65,
          paddingTop: 8,
          paddingBottom: 10,
          position: 'absolute',
          bottom: 8,
          left: 16,
          right: 16,
          borderRadius: 16,
          elevation: 0,
          shadowColor: colors.background,
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.3,
          shadowRadius: 12,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarShowLabel: true,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 2,
        },
        tabBarIcon: ({ focused, color }) => {
          let iconName;
          if (tabRoute.name === 'HomeTab') iconName = 'explore';
          else if (tabRoute.name === 'SearchTab') iconName = 'search';
          else if (tabRoute.name === 'AdminTab') iconName = 'admin-panel-settings';
          else if (tabRoute.name === 'ProfileTab') iconName = 'person';

          return (
            <View style={styles.tabIconContainer}>
              <MaterialIcons name={iconName} size={24} color={color} />
              {focused && <View style={[styles.tabDot, { backgroundColor: color }]} />}
            </View>
          );
        },
      })}
    >
      <Tab.Screen
        name="HomeTab"
        options={{ tabBarLabel: t.homeTab }}
      >
        {(props) => <HomeScreen {...props} user={user} onLogout={onLogout} />}
      </Tab.Screen>
      <Tab.Screen
        name="SearchTab"
        component={SearchScreen}
        options={{ tabBarLabel: t.searchTitle }}
      />
      {user?.role === 'admin' ? (
        <Tab.Screen
          name="AdminTab"
          component={AdminScreen}
          options={{ tabBarLabel: t.adminPanel || (language === 'ru' ? 'Управление' : 'Boshqaruv') }}
        />
      ) : null}
      {!user?.isGuest ? (
        <Tab.Screen
          name="ProfileTab"
          options={{ tabBarLabel: t.profileTitle }}
        >
          {(props) => <ProfileScreen {...props} user={user} onLogout={onLogout} />}
        </Tab.Screen>
      ) : null}
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { colors, isDark } = useTheme();

  return (
    <NavigationContainer>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
      />
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Main" component={HomeTabs} />
        <Stack.Screen
          name="RoomDetail"
          component={RoomDetailScreen}
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="Notifications"
          component={NotificationsScreen}
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="MapTab"
          component={MapEditorScreen}
          options={{ animation: 'slide_from_right' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  tabIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 2,
  },
  tabDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 3,
  },
});
