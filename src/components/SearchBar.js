import React, { useRef } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { spacing, borderRadius } from '../theme/colors';

export default function SearchBar({ value, onChangeText, placeholder, onFocus, onSubmit, autoFocus }) {
  const { colors } = useTheme();
  const glowAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handleFocus = () => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1.02,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.timing(glowAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: false,
      }),
    ]).start();
    onFocus && onFocus();
  };

  const handleBlur = () => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.timing(glowAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: false,
      }),
    ]).start();
  };

  const borderColor = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.border, colors.primary],
  });

  const shadowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.3],
  });

  const styles = createStyles(colors);

  return (
    <Animated.View
      style={[
        styles.container,
        {
          borderColor,
          shadowOpacity,
        },
      ]}
    >
      <Animated.View style={[styles.inner, { transform: [{ scale: scaleAnim }] }]}>
        <MaterialIcons name="search" size={22} color={colors.textSecondary} style={styles.searchIcon} />
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder || "Xona, bino qidirish..."}
          placeholderTextColor={colors.textMuted}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onSubmitEditing={onSubmit}
          autoFocus={autoFocus}
          returnKeyType="search"
          selectionColor={colors.primary}
        />
        {value?.length > 0 && (
          <TouchableOpacity
            onPress={() => onChangeText('')}
            style={styles.clearButton}
            activeOpacity={0.7}
          >
            <View style={styles.clearIcon}>
              <MaterialIcons name="close" size={16} color={colors.textPrimary} />
            </View>
          </TouchableOpacity>
        )}
      </Animated.View>
    </Animated.View>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    container: {
      backgroundColor: colors.surface,
      borderRadius: borderRadius.xl,
      borderWidth: 1.5,
      height: 52,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 0 },
      shadowRadius: 12,
      elevation: 4,
      overflow: 'hidden',
    },
    inner: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.md,
      height: '100%',
    },
    searchIcon: {
      marginRight: spacing.sm,
    },
    input: {
      flex: 1,
      fontSize: 15,
      fontWeight: '500',
      color: colors.textPrimary,
      paddingVertical: 0,
    },
    clearButton: {
      marginLeft: spacing.sm,
      padding: 2,
    },
    clearIcon: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: colors.surfaceHighlight,
      justifyContent: 'center',
      alignItems: 'center',
    },
  });
