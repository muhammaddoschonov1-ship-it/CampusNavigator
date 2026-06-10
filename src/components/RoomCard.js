import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../theme/LanguageContext';
import { spacing, borderRadius, typography } from '../theme/colors';

export default function RoomCard({ room, onPress, index = 0 }) {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.96,
      friction: 8,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 5,
      useNativeDriver: true,
    }).start();
  };

  const categoryColor = colors.categoryColors[room.type] || colors.primary;
  const styles = createStyles(colors);
  
  // Try to find translation for room type
  const roomTypeLabel = t[room.type] || room.type;

  return (
    <Animated.View style={[styles.wrapper, { transform: [{ scale: scaleAnim }] }]}>
      <TouchableOpacity
        onPress={() => onPress(room)}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
        style={styles.touchable}
      >
        <LinearGradient
          colors={[colors.surfaceLight, colors.surface]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.card}
        >
          {/* Icon */}
          <View style={[styles.iconContainer, { backgroundColor: categoryColor + '20' }]}>
            <MaterialIcons
              name={room.icon || 'place'}
              size={26}
              color={categoryColor}
            />
          </View>

          {/* Content */}
          <View style={styles.content}>
            <Text style={styles.name} numberOfLines={1}>{room.name}</Text>
            <View style={styles.metaRow}>
              <MaterialIcons name="apartment" size={13} color={colors.textSecondary} />
              <Text style={styles.metaText}>{room.building}</Text>
              <View style={styles.dot} />
              <MaterialIcons name="layers" size={13} color={colors.textSecondary} />
              <Text style={styles.metaText}>{room.floor}-{t.floor}</Text>
            </View>
            <View style={styles.tagRow}>
              <View style={[styles.tag, { backgroundColor: categoryColor + '18' }]}>
                <Text style={[styles.tagText, { color: categoryColor }]}>
                  {roomTypeLabel}
                </Text>
              </View>
              {room.capacity && (
                <View style={styles.capacityBadge}>
                  <MaterialIcons name="people" size={11} color={colors.textMuted} />
                  <Text style={styles.capacityText}>{room.capacity}</Text>
                </View>
              )}
            </View>
          </View>

          {/* Arrow */}
          <View style={styles.arrowContainer}>
            <MaterialIcons name="chevron-right" size={22} color={colors.textMuted} />
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    wrapper: {
      marginBottom: spacing.sm,
    },
    touchable: {
      borderRadius: borderRadius.lg,
      overflow: 'hidden',
    },
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: spacing.md,
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      borderColor: colors.border,
    },
    iconContainer: {
      width: 50,
      height: 50,
      borderRadius: borderRadius.md,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: spacing.md,
    },
    content: {
      flex: 1,
    },
    name: {
      ...typography.h3,
      color: colors.textPrimary,
      marginBottom: 3,
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 6,
    },
    metaText: {
      ...typography.bodySmall,
      color: colors.textSecondary,
      marginLeft: 3,
    },
    dot: {
      width: 3,
      height: 3,
      borderRadius: 1.5,
      backgroundColor: colors.textMuted,
      marginHorizontal: 6,
    },
    tagRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    tag: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: borderRadius.sm,
    },
    tagText: {
      ...typography.caption,
      fontSize: 10,
    },
    capacityBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
    },
    capacityText: {
      ...typography.caption,
      fontSize: 10,
      color: colors.textMuted,
    },
    arrowContainer: {
      marginLeft: spacing.sm,
    },
  });
