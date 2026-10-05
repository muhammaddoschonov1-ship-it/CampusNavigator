import React, { useMemo, useState, useEffect, useRef, memo } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  StatusBar,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { MaterialIcons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { spacing, borderRadius } from '../theme/colors';
import { getBuildings } from '../api/mapService';
import { NDTU } from '../data/ndtuCampus';
import buildingsLocal from '../data/buildings.json';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const MAP_HEIGHT = 380;

const NDTU_CENTER = NDTU.center;
const NDTU_ZOOM = NDTU.zoom;

const generateMapHTML = (isDark, language, highlightId, buildingsData = []) => {
  const markersScript = buildingsData
    .map((b, idx) => {
      const name = language === 'ru' ? (b.nameRu || b.name) : b.name;
      const address = b.address || '';
      const isHighlighted = highlightId === b.id;
      return `
      (function() {
        var m = L.marker([${b.lat}, ${b.lng}], {
          icon: L.divIcon({
            className: 'custom-marker',
            html: '<div style="background:${b.color};width:${isHighlighted ? 44 : 36}px;height:${isHighlighted ? 44 : 36}px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:${isHighlighted ? 22 : 18}px;box-shadow:0 3px 12px ${b.color}80;border:3px solid white;transition:all 0.3s;${isHighlighted ? 'animation:pulse 1s infinite;' : ''}">${b.icon}</div>',
            iconSize: [${isHighlighted ? 44 : 36}, ${isHighlighted ? 44 : 36}],
            iconAnchor: [${isHighlighted ? 22 : 18}, ${isHighlighted ? 22 : 18}],
          })
        })
        .addTo(map)
        .bindPopup(\`
          <div style="text-align:center;min-width:130px;font-family:system-ui,-apple-system,sans-serif;padding:2px;">
            <div style="font-size:26px;margin-bottom:4px;">${b.icon}</div>
            <div style="font-size:13px;font-weight:700;color:${b.color};margin-bottom:2px;">${name}</div>
            <div style="font-size:11px;color:#888;">${b.type || ''}</div>
            ${address ? `<div style="font-size:10px;color:#aaa;margin-top:4px;">${address}</div>` : ''}
          </div>
        \`, { closeButton: false, className: 'custom-popup' });

        m.on('click', function() {
          try {
            window.ReactNativeWebView && window.ReactNativeWebView.postMessage(
              JSON.stringify({ type: 'markerClick', id: '${b.id}' })
            );
          } catch(err) {}
        });

        window.markers['${b.id}'] = m;
        ${isHighlighted ? 'm.openPopup();' : ''}
      })();
    `;
    })
    .join('\n');

  const tileUrl = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
  const tileAttribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
    html, body, #map { width: 100%; height: 100%; overflow: hidden; }
    body { background: ${isDark ? '#1a1a2e' : '#f0f4f8'}; }
    .leaflet-tile { will-change: transform; -webkit-backface-visibility: hidden; }
    ${isDark ? `
    .leaflet-tile-pane {
      filter: brightness(0.6) invert(1) contrast(3) hue-rotate(200deg) saturate(0.35) brightness(0.75);
    }
    ` : ''}
    .custom-marker { background: none !important; border: none !important; }
    .custom-popup .leaflet-popup-content-wrapper {
      border-radius: 16px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.18);
      background: ${isDark ? '#2a2a3e' : 'white'};
      border: 1px solid ${isDark ? '#3a3a4e' : '#e2e8f0'};
    }
    .custom-popup .leaflet-popup-tip {
      background: ${isDark ? '#2a2a3e' : 'white'};
    }
    @keyframes pulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.15); }
    }
    .ndtu-label {
      position: absolute;
      top: 10px;
      left: 12px;
      z-index: 1000;
      background: ${isDark ? 'rgba(30,30,46,0.88)' : 'rgba(255,255,255,0.92)'};
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      padding: 6px 14px;
      border-radius: 20px;
      font-family: system-ui, -apple-system, sans-serif;
      font-weight: 700;
      font-size: 12px;
      color: ${isDark ? '#a78bfa' : '#6C63FF'};
      box-shadow: 0 2px 8px rgba(0,0,0,0.12);
      border: 1px solid ${isDark ? '#3a3a4e' : '#e0e0e0'};
      white-space: nowrap;
      pointer-events: none;
    }
  </style>
</head>
<body>
  <div class="ndtu-label">🎓 ${language === 'ru' ? NDTU.nameRu : NDTU.name}</div>
  <div id="map"></div>
  <script>
    window.markers = {};

    var map = L.map('map', {
      center: [${NDTU_CENTER.lat}, ${NDTU_CENTER.lng}],
      zoom: ${NDTU_ZOOM},
      zoomControl: false,
      attributionControl: false,
      tap: false,
      touchZoom: true,
      bounceAtZoomLimits: false,
      zoomAnimation: true,
      markerZoomAnimation: true,
      fadeAnimation: true,
      inertia: true,
      inertiaDeceleration: 3000,
      inertiaMaxSpeed: 1500,
    });
    window.map = map;

    L.tileLayer('${tileUrl}', {
      attribution: '${tileAttribution}',
      maxZoom: 19,
    }).addTo(map);

    L.circle([${NDTU_CENTER.lat}, ${NDTU_CENTER.lng}], {
      radius: 380,
      color: '#6C63FF',
      fillColor: '#6C63FF',
      fillOpacity: 0.05,
      weight: 2,
      dashArray: '6, 6',
    }).addTo(map);

    ${markersScript}

    var touchTimer = null;
    function reportTouch(isStart) {
      clearTimeout(touchTimer);
      if (isStart) {
        try {
          window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'touch_start' }));
        } catch(e) {}
      } else {
        touchTimer = setTimeout(function() {
          try {
            window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'touch_end' }));
          } catch(e) {}
        }, 1200);
      }
    }
    document.addEventListener('touchstart', function() { reportTouch(true); }, { passive: true });
    document.addEventListener('touchend', function() { reportTouch(false); }, { passive: true });
    document.addEventListener('touchcancel', function() { reportTouch(false); }, { passive: true });

    setTimeout(function() { map.invalidateSize(); }, 250);
    setTimeout(function() { map.invalidateSize(); }, 750);
  </script>
</body>
</html>`;
};

export default memo(function LeafletMap({
  onBuildingPress,
  highlightBuilding,
  language = 'uz',
  onMapTouch,
}) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const [buildings, setBuildings] = useState(buildingsLocal);
  const [selectedBuildingId, setSelectedBuildingId] = useState(highlightBuilding || null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const mainWebviewRef = useRef(null);
  const fullscreenWebviewRef = useRef(null);

  useEffect(() => {
    if (isFocused) {
      const fetchBuildings = async () => {
        try {
          const data = await getBuildings();
          if (data && data.length > 0) {
            setBuildings(data);
          }
        } catch (e) {}
      };
      fetchBuildings();
    }
  }, [isFocused]);

  const mapHTML = useMemo(
    () => generateMapHTML(isDark, language, selectedBuildingId, buildings),
    [isDark, language, selectedBuildingId, buildings]
  );

  const webViewSource = useMemo(() => ({ html: mapHTML }), [mapHTML]);

  // Aktiv WebView ga buyruq yuborish
  const injectToActiveWebview = (code) => {
    const targetRef = isFullscreen ? fullscreenWebviewRef : mainWebviewRef;
    if (targetRef.current) {
      targetRef.current.injectJavaScript(`${code}; true;`);
    }
  };

  const handleZoomIn = () => {
    injectToActiveWebview('if(window.map){ window.map.zoomIn(); }');
  };

  const handleZoomOut = () => {
    injectToActiveWebview('if(window.map){ window.map.zoomOut(); }');
  };

  const handleCenter = () => {
    setSelectedBuildingId(null);
    injectToActiveWebview(
      `if(window.map){ window.map.flyTo([${NDTU_CENTER.lat}, ${NDTU_CENTER.lng}], ${NDTU_ZOOM}, { animate: true, duration: 0.8 }); }`
    );
  };

  const handleBuildingChipPress = (b) => {
    setSelectedBuildingId(b.id);
    const code = `
      if(window.map){
        window.map.flyTo([${b.lat}, ${b.lng}], 18, { animate: true, duration: 0.8 });
        if(window.markers && window.markers['${b.id}']){
          window.markers['${b.id}'].openPopup();
        }
      }
    `;
    injectToActiveWebview(code);
    if (onBuildingPress) {
      onBuildingPress(b);
    }
  };

  const handleMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'touch_start') {
        onMapTouch && onMapTouch(true);
      } else if (data.type === 'touch_end') {
        onMapTouch && onMapTouch(false);
      } else if (data.type === 'markerClick' && data.id) {
        setSelectedBuildingId(data.id);
        const b = buildings.find((item) => item.id === data.id);
        if (b && onBuildingPress) {
          onBuildingPress(b);
        }
      }
    } catch (e) {}
  };

  const selectedBuildingData = useMemo(
    () => buildings.find((b) => b.id === selectedBuildingId),
    [buildings, selectedBuildingId]
  );

  return (
    <View style={[styles.wrapper, { borderColor: colors.border }]}>
      {/* Asosiy xarita kartochkasi */}
      <View style={styles.mapContainer}>
        <WebView
          ref={mainWebviewRef}
          source={webViewSource}
          style={{ height: MAP_HEIGHT, backgroundColor: isDark ? '#1a1a2e' : '#f0f4f8' }}
          javaScriptEnabled
          domStorageEnabled
          androidHardwareAccelerationDisabled={false}
          mixedContentMode="always"
          scalesPageToFit={false}
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
          originWhitelist={['*']}
          onMessage={handleMessage}
        />

        {/* Tezkor suzuvchi boshqaruv tugmalari */}
        <View style={styles.floatingControls}>
          <TouchableOpacity
            style={[styles.controlBtn, { backgroundColor: isDark ? 'rgba(30,30,46,0.9)' : 'rgba(255,255,255,0.92)' }]}
            onPress={() => setIsFullscreen(true)}
            activeOpacity={0.8}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MaterialIcons name="fullscreen" size={22} color={colors.textPrimary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.controlBtn, { backgroundColor: isDark ? 'rgba(30,30,46,0.9)' : 'rgba(255,255,255,0.92)' }]}
            onPress={handleCenter}
            activeOpacity={0.8}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MaterialIcons name="my-location" size={20} color={colors.primary} />
          </TouchableOpacity>

          <View style={[styles.zoomGroup, { backgroundColor: isDark ? 'rgba(30,30,46,0.9)' : 'rgba(255,255,255,0.92)' }]}>
            <TouchableOpacity
              style={styles.zoomBtn}
              onPress={handleZoomIn}
              activeOpacity={0.7}
            >
              <MaterialIcons name="add" size={20} color={colors.textPrimary} />
            </TouchableOpacity>
            <View style={[styles.zoomDivider, { backgroundColor: colors.border }]} />
            <TouchableOpacity
              style={styles.zoomBtn}
              onPress={handleZoomOut}
              activeOpacity={0.7}
            >
              <MaterialIcons name="remove" size={20} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Eslatma / Holat indikatori */}
        <View style={[styles.bottomHintBar, { backgroundColor: isDark ? 'rgba(15,15,25,0.85)' : 'rgba(255,255,255,0.9)' }]}>
          <MaterialIcons name="touch-app" size={14} color={colors.primary} />
          <Text style={[styles.bottomHintText, { color: colors.textSecondary }]}>
            {language === 'ru'
              ? 'Нажмите на кнопку справа для полного экрана'
              : "To'liq ekranda ko'rish uchun ⛶ tugmasini bosing"}
          </Text>
        </View>
      </View>

      {/* Binolar ro'yxati (Tezkor o'tish chiptalari) */}
      <View style={[styles.chipsContainer, { backgroundColor: colors.surface }]}>
        <View style={styles.chipsHeader}>
          <Text style={[styles.chipsTitle, { color: colors.textPrimary }]}>
            {language === 'ru' ? 'Быстрый переход к корпусу:' : "Binoga tezkor o'tish:"}
          </Text>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsScroll}
        >
          {buildings.map((b) => {
            const isSelected = selectedBuildingId === b.id;
            const name = language === 'ru' ? (b.nameRu || b.name) : b.name;
            return (
              <TouchableOpacity
                key={b.id}
                style={[
                  styles.chip,
                  {
                    backgroundColor: isSelected ? b.color : colors.surfaceLight,
                    borderColor: isSelected ? b.color : colors.border,
                  },
                ]}
                onPress={() => handleBuildingChipPress(b)}
                activeOpacity={0.7}
              >
                <Text style={styles.chipIcon}>{b.icon}</Text>
                <Text
                  style={[
                    styles.chipText,
                    {
                      color: isSelected ? '#FFFFFF' : colors.textPrimary,
                      fontWeight: isSelected ? '700' : '500',
                    },
                  ]}
                  numberOfLines={1}
                >
                  {name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* To'liq Ekran Xarita Modali */}
      <Modal
        visible={isFullscreen}
        animationType="slide"
        onRequestClose={() => setIsFullscreen(false)}
      >
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <View style={[styles.fullscreenWrapper, { backgroundColor: colors.background }]}>
          {/* Modal Header */}
          <View
            style={[
              styles.fullscreenHeader,
              {
                paddingTop: insets.top > 0 ? insets.top + 8 : 45,
                backgroundColor: colors.surface,
                borderBottomColor: colors.border,
              },
            ]}
          >
            <TouchableOpacity
              style={[styles.modalCloseBtn, { backgroundColor: colors.surfaceLight }]}
              onPress={() => setIsFullscreen(false)}
              activeOpacity={0.7}
            >
              <MaterialIcons name="arrow-back" size={24} color={colors.textPrimary} />
            </TouchableOpacity>

            <View style={{ flex: 1, marginHorizontal: 12 }}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                {language === 'ru' ? 'Карта кампуса NDTU' : 'NDTU Kampus Xaritasi'}
              </Text>
              <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
                {selectedBuildingData
                  ? (language === 'ru' ? selectedBuildingData.nameRu : selectedBuildingData.name)
                  : (language === 'ru' ? 'Свободное перемещение' : 'Erkin navigatsiya')}
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.modalCenterBtn, { backgroundColor: colors.primary + '18' }]}
              onPress={handleCenter}
              activeOpacity={0.7}
            >
              <MaterialIcons name="my-location" size={20} color={colors.primary} />
            </TouchableOpacity>
          </View>

          {/* 100% Ekran Xaritasi */}
          <View style={{ flex: 1 }}>
            <WebView
              ref={fullscreenWebviewRef}
              source={webViewSource}
              style={{ flex: 1, backgroundColor: isDark ? '#1a1a2e' : '#f0f4f8' }}
              javaScriptEnabled
              domStorageEnabled
              androidHardwareAccelerationDisabled={false}
              mixedContentMode="always"
              scalesPageToFit={false}
              showsHorizontalScrollIndicator={false}
              showsVerticalScrollIndicator={false}
              originWhitelist={['*']}
              onMessage={handleMessage}
            />

            {/* To'liq ekrandagi suzuvchi zoom tugmalari */}
            <View style={styles.fullscreenZoomGroup}>
              <View style={[styles.zoomGroup, { backgroundColor: isDark ? 'rgba(30,30,46,0.95)' : 'rgba(255,255,255,0.95)' }]}>
                <TouchableOpacity
                  style={styles.zoomBtn}
                  onPress={handleZoomIn}
                  activeOpacity={0.7}
                >
                  <MaterialIcons name="add" size={22} color={colors.textPrimary} />
                </TouchableOpacity>
                <View style={[styles.zoomDivider, { backgroundColor: colors.border }]} />
                <TouchableOpacity
                  style={styles.zoomBtn}
                  onPress={handleZoomOut}
                  activeOpacity={0.7}
                >
                  <MaterialIcons name="remove" size={22} color={colors.textPrimary} />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Modal pastidagi tezkor binolar menyusi */}
          <View
            style={[
              styles.fullscreenBottomBar,
              {
                paddingBottom: insets.bottom > 0 ? insets.bottom + 10 : 20,
                backgroundColor: colors.surface,
                borderTopColor: colors.border,
              },
            ]}
          >
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
            >
              {buildings.map((b) => {
                const isSelected = selectedBuildingId === b.id;
                const name = language === 'ru' ? (b.nameRu || b.name) : b.name;
                return (
                  <TouchableOpacity
                    key={b.id}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: isSelected ? b.color : colors.surfaceLight,
                        borderColor: isSelected ? b.color : colors.border,
                      },
                    ]}
                    onPress={() => handleBuildingChipPress(b)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.chipIcon}>{b.icon}</Text>
                    <Text
                      style={[
                        styles.chipText,
                        {
                          color: isSelected ? '#FFFFFF' : colors.textPrimary,
                          fontWeight: isSelected ? '700' : '500',
                        },
                      ]}
                      numberOfLines={1}
                    >
                      {name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
});

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  mapContainer: {
    position: 'relative',
    height: MAP_HEIGHT,
    width: '100%',
  },
  floatingControls: {
    position: 'absolute',
    top: 14,
    right: 14,
    gap: 8,
    alignItems: 'center',
    zIndex: 10,
  },
  controlBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 5,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  zoomGroup: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 5,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  zoomBtn: {
    width: 40,
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
  },
  zoomDivider: {
    height: 1,
    width: '100%',
  },
  bottomHintBar: {
    position: 'absolute',
    bottom: 8,
    left: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  bottomHintText: {
    fontSize: 11,
    fontWeight: '500',
  },
  chipsContainer: {
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  chipsHeader: {
    paddingHorizontal: 14,
    marginBottom: 6,
  },
  chipsTitle: {
    fontSize: 12,
    fontWeight: '600',
  },
  chipsScroll: {
    paddingHorizontal: 12,
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1,
  },
  chipIcon: {
    fontSize: 14,
  },
  chipText: {
    fontSize: 12,
  },
  fullscreenWrapper: {
    flex: 1,
  },
  fullscreenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  modalCloseBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  modalSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  modalCenterBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenZoomGroup: {
    position: 'absolute',
    right: 18,
    bottom: 24,
    zIndex: 10,
  },
  fullscreenBottomBar: {
    borderTopWidth: 1,
    paddingTop: 12,
  },
});
