import React, { useMemo, useState, useEffect, memo } from 'react';
import { View, StyleSheet, Dimensions, Text, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import { MaterialIcons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';
import { useTheme } from '../theme/ThemeContext';
import { spacing, borderRadius } from '../theme/colors';
import { getBuildings } from '../api/mapService';
import { NDTU } from '../data/ndtuCampus';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const MAP_HEIGHT = 380;

const NDTU_CENTER = NDTU.center;
const NDTU_ZOOM = NDTU.zoom;

const generateMapHTML = (isDark, language, highlightId, buildingsData = []) => {
  const markers = buildingsData.map((b) => {
    const name = language === 'ru' ? (b.nameRu || b.name) : b.name;
    const address = b.address || '';
    const isHighlighted = highlightId === b.id;
    return `
      L.marker([${b.lat}, ${b.lng}], {
        icon: L.divIcon({
          className: 'custom-marker',
          html: '<div style="background:${b.color};width:${isHighlighted ? 44 : 36}px;height:${isHighlighted ? 44 : 36}px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:${isHighlighted ? 22 : 18}px;box-shadow:0 3px 12px ${b.color}80;border:3px solid white;transition:all 0.3s;${isHighlighted ? 'animation:pulse 1s infinite;' : ''}">${b.icon}</div>',
          iconSize: [${isHighlighted ? 44 : 36}, ${isHighlighted ? 44 : 36}],
          iconAnchor: [${isHighlighted ? 22 : 18}, ${isHighlighted ? 22 : 18}],
        })
      })
      .addTo(map)
      .bindPopup(\`
        <div style="text-align:center;min-width:120px;font-family:system-ui,-apple-system,sans-serif;">
          <div style="font-size:28px;margin-bottom:4px;">${b.icon}</div>
          <div style="font-size:14px;font-weight:700;color:${b.color};margin-bottom:2px;">${name}</div>
          <div style="font-size:11px;color:#888;">${b.type || ''}</div>
          ${address ? `<div style="font-size:10px;color:#aaa;margin-top:4px;">${address}</div>` : ''}
        </div>
      \`, { closeButton: false, className: 'custom-popup' })
      ${isHighlighted ? '.openPopup()' : ''};
    `;
  }).join('\n');

  const tileUrl = isDark
    ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
    : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

  const tileAttribution = isDark
    ? '&copy; <a href="https://carto.com/">CARTO</a>'
    : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body, #map { width: 100%; height: 100%; }
    body { background: ${isDark ? '#1a1a2e' : '#f0f4f8'}; }
    .custom-marker { background: none !important; border: none !important; }
    .custom-popup .leaflet-popup-content-wrapper {
      border-radius: 16px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.15);
      background: ${isDark ? '#2a2a3e' : 'white'};
    }
    .custom-popup .leaflet-popup-tip {
      background: ${isDark ? '#2a2a3e' : 'white'};
    }
    @keyframes pulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.15); }
    }
    .leaflet-control-zoom a {
      background: ${isDark ? '#2a2a3e' : 'white'} !important;
      color: ${isDark ? '#e0e0e0' : '#333'} !important;
      border-color: ${isDark ? '#3a3a4e' : '#ccc'} !important;
    }
    .ndtu-label {
      position: absolute;
      top: 10px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 1000;
      background: ${isDark ? 'rgba(42,42,62,0.9)' : 'rgba(255,255,255,0.9)'};
      backdrop-filter: blur(10px);
      padding: 6px 16px;
      border-radius: 20px;
      font-family: system-ui, -apple-system, sans-serif;
      font-weight: 700;
      font-size: 13px;
      color: ${isDark ? '#a78bfa' : '#6C63FF'};
      box-shadow: 0 2px 12px rgba(0,0,0,0.1);
      border: 1px solid ${isDark ? '#3a3a4e' : '#e0e0e0'};
      white-space: nowrap;
    }
  </style>
</head>
<body>
  <div class="ndtu-label">🎓 ${language === 'ru' ? NDTU.nameRu : NDTU.name}</div>
  <div id="map"></div>
  <script>
    var map = L.map('map', {
      center: [${NDTU_CENTER.lat}, ${NDTU_CENTER.lng}],
      zoom: ${NDTU_ZOOM},
      zoomControl: true,
      attributionControl: true,
    });

    L.tileLayer('${tileUrl}', {
      attribution: '${tileAttribution}',
      maxZoom: 19,
    }).addTo(map);

    L.circle([${NDTU_CENTER.lat}, ${NDTU_CENTER.lng}], {
      radius: 380,
      color: '${isDark ? '#6C63FF' : '#6C63FF'}',
      fillColor: '${isDark ? '#6C63FF' : '#6C63FF'}',
      fillOpacity: 0.05,
      weight: 2,
      dashArray: '8, 8',
    }).addTo(map);

    ${markers}

    map.on('popupopen', function(e) {
      try {
        window.ReactNativeWebView && window.ReactNativeWebView.postMessage(
          JSON.stringify({ type: 'markerClick', data: e.popup.getLatLng() })
        );
      } catch(err) {}
    });
  </script>
</body>
</html>`;
};

export default memo(function LeafletMap({ onBuildingPress, highlightBuilding, language = 'uz' }) {
  const { colors, isDark } = useTheme();
  const isFocused = useIsFocused();
  const [buildings, setBuildings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isFocused) {
      const fetchBuildings = async () => {
        const data = await getBuildings();
        setBuildings(data);
        if (loading) {
          setLoading(false);
        }
      };
      fetchBuildings();
    }
  }, [isFocused]);

  const mapHTML = useMemo(
    () => generateMapHTML(isDark, language, highlightBuilding, buildings),
    [isDark, language, highlightBuilding, buildings]
  );

  const webViewSource = useMemo(() => ({ html: mapHTML }), [mapHTML]);

  const handleBuildingPress = (buildingId) => {
    const building = buildings.find((b) => b.id === buildingId);
    if (building && onBuildingPress) {
      onBuildingPress(building);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { height: MAP_HEIGHT, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.surface }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { borderColor: colors.border }]}>
      <WebView
        source={webViewSource}
        style={{ height: MAP_HEIGHT, borderRadius: 16 }}
        javaScriptEnabled
        domStorageEnabled
        originWhitelist={['*']}
        onMessage={(event) => {
          try {
            const data = JSON.parse(event.nativeEvent.data);
            if (data.type === 'markerClick') {
              if (data.id) {
                handleBuildingPress(data.id);
              } else if (data.data) {
                const closest = buildings.reduce((prev, curr) => {
                  const prevDist = Math.abs(prev.lat - data.data.lat) + Math.abs(prev.lng - data.data.lng);
                  const currDist = Math.abs(curr.lat - data.data.lat) + Math.abs(curr.lng - data.data.lng);
                  return currDist < prevDist ? curr : prev;
                });
                handleBuildingPress(closest.id);
              }
            }
          } catch (e) {}
        }}
      />
      <View style={[styles.legend, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.legendRow}>
          <Text style={[styles.legendIcon]}>🏛️</Text>
          <Text style={[styles.legendText, { color: colors.textSecondary }]}>
            {language === 'ru' ? 'Нажмите на маркер' : 'Markerga bosing'}
          </Text>
        </View>
        <View style={styles.legendDot}>
          <View style={[styles.dot, { backgroundColor: '#6C63FF' }]} />
          <View style={[styles.dot, { backgroundColor: '#00D4AA' }]} />
          <View style={[styles.dot, { backgroundColor: '#FFB347' }]} />
          <View style={[styles.dot, { backgroundColor: '#E879F9' }]} />
          <View style={[styles.dot, { backgroundColor: '#FF6B6B' }]} />
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderTopWidth: 1,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendIcon: {
    fontSize: 16,
  },
  legendText: {
    fontSize: 12,
    fontWeight: '500',
  },
  legendDot: {
    flexDirection: 'row',
    gap: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
