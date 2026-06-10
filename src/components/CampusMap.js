import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  ScrollView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../theme/ThemeContext';
import { spacing, borderRadius, typography } from '../theme/colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const MAP_WIDTH = SCREEN_WIDTH - spacing.lg * 2;
const MAP_HEIGHT = 320;

// NDTU asosiy kampus (Dosnazarov 74 + Kayipbergenov 26) — sxematik joylashuv
const BUILDINGS = [
  {
    id: 'ndtu-1',
    name: "1-o'quv binosi",
    nameRu: '1-й корпус',
    x: 0.12,
    y: 0.38,
    w: 0.3,
    h: 0.24,
    color: '#6C63FF',
    icon: 'business',
  },
  {
    id: 'ndtu-2',
    name: "2-o'quv binosi",
    nameRu: '2-й корпус',
    x: 0.52,
    y: 0.12,
    w: 0.28,
    h: 0.22,
    color: '#63B3ED',
    icon: 'apartment',
  },
  {
    id: 'ndtu-library',
    name: 'Kutubxona',
    nameRu: 'Библиотека',
    x: 0.42,
    y: 0.42,
    w: 0.18,
    h: 0.16,
    color: '#00D4AA',
    icon: 'local-library',
  },
  {
    id: 'ndtu-canteen',
    name: 'Oshxona',
    nameRu: 'Столовая',
    x: 0.72,
    y: 0.28,
    w: 0.18,
    h: 0.14,
    color: '#FFB347',
    icon: 'restaurant',
  },
  {
    id: 'ndtu-it-lab',
    name: 'IT fakulteti',
    nameRu: 'ИТ факультет',
    x: 0.55,
    y: 0.38,
    w: 0.2,
    h: 0.18,
    color: '#38BDF8',
    icon: 'computer',
  },
  {
    id: 'ndtu-mining',
    name: 'Konchilik',
    nameRu: 'Горный факультет',
    x: 0.14,
    y: 0.58,
    w: 0.22,
    h: 0.16,
    color: '#78716C',
    icon: 'science',
  },
  {
    id: 'ndtu-sport',
    name: 'Sport',
    nameRu: 'Спорт',
    x: 0.74,
    y: 0.48,
    w: 0.2,
    h: 0.2,
    color: '#FF6B6B',
    icon: 'fitness-center',
  },
  {
    id: 'ndtu-medical',
    name: 'Tibbiyot',
    nameRu: 'Медпункт',
    x: 0.05,
    y: 0.32,
    w: 0.12,
    h: 0.1,
    color: '#F87171',
    icon: 'local-hospital',
  },
  {
    id: 'ndtu-dorm',
    name: 'Yotoqxona',
    nameRu: 'Общежитие',
    x: 0.38,
    y: 0.72,
    w: 0.22,
    h: 0.18,
    color: '#A78BFA',
    icon: 'hotel',
  },
];

// Paths between buildings (simplified)
const PATHS = [
  // Main road from gate to center
  { x1: 0.5, y1: 0.98, x2: 0.5, y2: 0.7 },
  { x1: 0.5, y1: 0.7, x2: 0.5, y2: 0.35 },
  { x1: 0.5, y1: 0.35, x2: 0.3, y2: 0.35 },
  { x1: 0.5, y1: 0.35, x2: 0.75, y2: 0.35 },
  // Side paths
  { x1: 0.3, y1: 0.35, x2: 0.3, y2: 0.52 },
  { x1: 0.5, y1: 0.7, x2: 0.75, y2: 0.7 },
  { x1: 0.3, y1: 0.35, x2: 0.1, y2: 0.38 },
];

// Trees/green areas
const TREES = [
  { x: 0.42, y: 0.65 },
  { x: 0.38, y: 0.75 },
  { x: 0.1, y: 0.75 },
  { x: 0.2, y: 0.8 },
  { x: 0.6, y: 0.7 },
  { x: 0.55, y: 0.8 },
  { x: 0.05, y: 0.65 },
  { x: 0.4, y: 0.08 },
  { x: 0.65, y: 0.65 },
];

export default function CampusMap({ onBuildingPress, highlightBuilding, language = 'uz' }) {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  return (
    <View style={styles.container}>
      {/* Map background */}
      <LinearGradient
        colors={[colors.surfaceLight, colors.surface + 'DD']}
        style={styles.mapBg}
      >
        {/* Grid lines for campus feel */}
        {[0.25, 0.5, 0.75].map((pos) => (
          <View
            key={`h-${pos}`}
            style={[
              styles.gridLine,
              {
                top: `${pos * 100}%`,
                left: 0,
                right: 0,
                height: 1,
              },
            ]}
          />
        ))}
        {[0.25, 0.5, 0.75].map((pos) => (
          <View
            key={`v-${pos}`}
            style={[
              styles.gridLine,
              {
                left: `${pos * 100}%`,
                top: 0,
                bottom: 0,
                width: 1,
              },
            ]}
          />
        ))}

        {/* Paths/Roads */}
        {PATHS.map((path, i) => {
          const isVertical = path.x1 === path.x2;
          const left = Math.min(path.x1, path.x2) * 100;
          const top = Math.min(path.y1, path.y2) * 100;
          const pathWidth = isVertical ? 0.8 : Math.abs(path.x2 - path.x1) * 100;
          const pathHeight = isVertical ? Math.abs(path.y2 - path.y1) * 100 : 0.8;

          return (
            <View
              key={`path-${i}`}
              style={[
                styles.path,
                {
                  left: `${left}%`,
                  top: `${top}%`,
                  width: isVertical ? 4 : `${pathWidth}%`,
                  height: isVertical ? `${pathHeight}%` : 4,
                  backgroundColor: colors.textMuted + '30',
                },
              ]}
            />
          );
        })}

        {/* Trees */}
        {TREES.map((tree, i) => (
          <View
            key={`tree-${i}`}
            style={[
              styles.tree,
              {
                left: `${tree.x * 100}%`,
                top: `${tree.y * 100}%`,
              },
            ]}
          >
            <MaterialIcons name="park" size={16} color={colors.success + '60'} />
          </View>
        ))}

        {/* Buildings */}
        {BUILDINGS.map((bld) => {
          const isHighlighted = highlightBuilding === bld.id || highlightBuilding === bld.name;
          const displayName = language === 'ru' ? bld.nameRu : bld.name;

          return (
            <TouchableOpacity
              key={bld.id}
              activeOpacity={0.7}
              onPress={() => onBuildingPress && onBuildingPress(bld)}
              style={[
                styles.building,
                {
                  left: `${bld.x * 100}%`,
                  top: `${bld.y * 100}%`,
                  width: `${bld.w * 100}%`,
                  height: `${bld.h * 100}%`,
                  backgroundColor: bld.color + (isHighlighted ? '40' : '18'),
                  borderColor: bld.color + (isHighlighted ? 'CC' : '40'),
                  borderWidth: isHighlighted ? 2 : 1,
                },
              ]}
            >
              <MaterialIcons
                name={bld.icon}
                size={isHighlighted ? 18 : 14}
                color={bld.color}
              />
              <Text
                style={[
                  styles.buildingName,
                  {
                    color: isHighlighted ? bld.color : colors.textSecondary,
                    fontWeight: isHighlighted ? '700' : '500',
                    fontSize: isHighlighted ? 8 : 7,
                  },
                ]}
                numberOfLines={2}
              >
                {displayName}
              </Text>
              {isHighlighted && (
                <View style={[styles.highlightPulse, { backgroundColor: bld.color + '30' }]} />
              )}
            </TouchableOpacity>
          );
        })}

        {/* Gate */}
        <View style={styles.gate}>
          <MaterialIcons name="door-front" size={14} color={colors.warning} />
          <Text style={styles.gateText}>
            {language === 'ru' ? 'Вход' : 'Kirish'}
          </Text>
        </View>

        {/* Compass */}
        <View style={styles.compass}>
          <Text style={styles.compassN}>N</Text>
          <MaterialIcons name="navigation" size={16} color={colors.primary} />
        </View>

        {/* Scale */}
        <View style={styles.scale}>
          <View style={styles.scaleLine} />
          <Text style={styles.scaleText}>~100m</Text>
        </View>
      </LinearGradient>
    </View>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    container: {
      width: '100%',
      height: MAP_HEIGHT,
      borderRadius: borderRadius.xl,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colors.border,
    },
    mapBg: {
      flex: 1,
      position: 'relative',
      borderRadius: borderRadius.xl,
    },
    gridLine: {
      position: 'absolute',
      backgroundColor: colors.border + '30',
    },
    path: {
      position: 'absolute',
      borderRadius: 2,
    },
    tree: {
      position: 'absolute',
    },
    building: {
      position: 'absolute',
      borderRadius: borderRadius.sm,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 2,
      zIndex: 10,
    },
    buildingName: {
      textAlign: 'center',
      marginTop: 1,
      lineHeight: 10,
    },
    highlightPulse: {
      position: 'absolute',
      top: -4,
      left: -4,
      right: -4,
      bottom: -4,
      borderRadius: borderRadius.sm + 4,
      zIndex: -1,
    },
    gate: {
      position: 'absolute',
      bottom: 4,
      left: '45%',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      backgroundColor: colors.warning + '20',
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: borderRadius.sm,
      borderWidth: 1,
      borderColor: colors.warning + '40',
    },
    gateText: {
      fontSize: 9,
      fontWeight: '700',
      color: colors.warning,
    },
    compass: {
      position: 'absolute',
      top: 8,
      right: 8,
      alignItems: 'center',
      backgroundColor: colors.surface + 'DD',
      paddingHorizontal: 6,
      paddingVertical: 4,
      borderRadius: borderRadius.sm,
      borderWidth: 1,
      borderColor: colors.border,
    },
    compassN: {
      fontSize: 8,
      fontWeight: '800',
      color: colors.primary,
    },
    scale: {
      position: 'absolute',
      bottom: 8,
      right: 8,
      alignItems: 'center',
    },
    scaleLine: {
      width: 40,
      height: 2,
      backgroundColor: colors.textMuted,
      marginBottom: 2,
    },
    scaleText: {
      fontSize: 8,
      color: colors.textMuted,
      fontWeight: '600',
    },
  });
