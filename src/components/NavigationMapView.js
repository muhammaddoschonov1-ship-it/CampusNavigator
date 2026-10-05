import React, { useMemo, memo, useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Dimensions, TouchableOpacity, Modal, StatusBar, Text } from 'react-native';
import { WebView } from 'react-native-webview';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { NDTU, getBuildingCoords, resolveBuildingName } from '../data/ndtuCampus';
import { getBuildings } from '../api/mapService';

const { width: SW } = Dimensions.get('window');
const MAP_H = 420;

const GATE = NDTU.gate;

export default memo(function NavigationMapView({
  building,
  userLocation,
  transportMode = 'foot',
  onRouteData,
  onMapTouch,
}) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [bld, setBld] = useState(() => getBuildingCoords(building));
  const [isFullscreen, setIsFullscreen] = useState(false);

  const mainWebviewRef = useRef(null);
  const fullscreenWebviewRef = useRef(null);

  useEffect(() => {
    let isMounted = true;
    const fetchUpdatedCoords = async () => {
      try {
        const resolvedName = resolveBuildingName(building);
        const allBuildings = await getBuildings();
        const match = allBuildings.find((b) => b.name === resolvedName || b.name === building);

        if (match && match.lat && match.lng && isMounted) {
          setBld({
            lat: match.lat,
            lng: match.lng,
            icon: match.icon || '📍',
            color: match.color || '#3B82F6',
            id: match.id,
          });
        }
      } catch (e) {}
    };
    fetchUpdatedCoords();
    return () => {
      isMounted = false;
    };
  }, [building]);

  const destJSON = JSON.stringify(bld);
  const startJSON = JSON.stringify(userLocation || GATE);

  const html = useMemo(() => {
    const tile = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
    const attr = '&copy; OpenStreetMap';

    return `<!DOCTYPE html><html><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>
*{margin:0;padding:0;box-sizing:border-box;-webkit-tap-highlight-color:transparent;}
html,body,#map{width:100%;height:100%;overflow:hidden;}
body{background:${isDark ? '#1a1a2e' : '#f0f4f8'}}
.custom-marker{background:none!important;border:none!important}
.pulse-dot{animation:pulse 1.5s infinite}
@keyframes pulse{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.4);opacity:.6}}
.loading-box{position:absolute;top:10px;left:50%;transform:translateX(-50%);z-index:1000;background:rgba(0,0,0,0.75);color:white;padding:6px 14px;border-radius:20px;font-family:system-ui;font-size:12px;display:none;backdrop-filter:blur(6px);}
.leaflet-tile { will-change: transform; -webkit-backface-visibility: hidden; }
${isDark ? `
.leaflet-tile-pane {
  filter: brightness(0.6) invert(1) contrast(3) hue-rotate(200deg) saturate(0.35) brightness(0.75);
}
` : ''}
</style></head><body>
<div id="loading" class="loading-box">Marshrut aniqlanmoqda...</div>
<div id="map"></div>
<script>
var dest = ${destJSON};
var start = ${startJSON};
var mode = '${transportMode}';

var map = L.map('map',{
  zoomControl: false,
  attributionControl: false,
  tap: false,
  touchZoom: true,
  bounceAtZoomLimits: false,
  zoomAnimation: true,
  fadeAnimation: true,
  markerZoomAnimation: true,
  inertia: true,
  inertiaDeceleration: 3000,
});
window.map = map;

L.tileLayer('${tile}',{attribution:'${attr}',maxZoom:19}).addTo(map);

L.marker([dest.lat,dest.lng],{icon:L.divIcon({className:'custom-marker',
  html:'<div style="width:42px;height:42px;background:'+dest.color+';border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:22px;border:3px solid white;box-shadow:0 4px 16px '+dest.color+'80">'+dest.icon+'</div>',
  iconSize:[42,42],iconAnchor:[21,21]})}).addTo(map);

var startMarker = L.marker([start.lat,start.lng],{icon:L.divIcon({className:'custom-marker',
  html:'<div class="pulse-dot" style="width:20px;height:20px;background:#3B82F6;border-radius:50%;border:4px solid white;box-shadow:0 0 0 6px rgba(59,130,246,0.3)"></div>',
  iconSize:[20,20],iconAnchor:[10,10]})}).addTo(map);

var bounds = L.latLngBounds([[start.lat, start.lng], [dest.lat, dest.lng]]);
window.routeBounds = bounds;
map.fitBounds(bounds.pad(0.3));

document.getElementById('loading').style.display = 'block';

setTimeout(function() { map.invalidateSize(); }, 250);
setTimeout(function() { map.invalidateSize(); }, 750);

function calculateFallbackRoute() {
  var dLat = (dest.lat - start.lat) * Math.PI / 180;
  var dLng = (dest.lng - start.lng) * Math.PI / 180;
  var a = Math.sin(dLat/2) * Math.sin(dLat/2) +
          Math.cos(start.lat * Math.PI / 180) * Math.cos(dest.lat * Math.PI / 180) *
          Math.sin(dLng/2) * Math.sin(dLng/2);
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  var straightDist = Math.round(6371000 * c * 1.25);
  var straightDuration = Math.round(straightDist / (mode === 'car' ? 8.33 : 1.38));
  try {
    window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
      distance: straightDist,
      duration: straightDuration
    }));
  } catch(e) {}
}

fetch('https://router.project-osrm.org/route/v1/' + mode + '/' + start.lng + ',' + start.lat + ';' + dest.lng + ',' + dest.lat + '?overview=full&geometries=geojson')
  .then(res => res.json())
  .then(data => {
    document.getElementById('loading').style.display = 'none';
    if(data.routes && data.routes.length > 0) {
      var coords = data.routes[0].geometry.coordinates;
      var latlngs = coords.map(function(c) { return [c[1], c[0]] });
      L.polyline(latlngs, {color: dest.color, weight: 8, opacity: 0.2, lineCap: 'round', lineJoin: 'round'}).addTo(map);
      L.polyline(latlngs, {color: dest.color, weight: 5, opacity: 0.9, lineCap: 'round', lineJoin: 'round'}).addTo(map);
      window.routeBounds = L.latLngBounds(latlngs);
      map.fitBounds(window.routeBounds.pad(0.25));
      var distance = data.routes[0].distance;
      var duration = data.routes[0].duration;
      try{window.ReactNativeWebView.postMessage(JSON.stringify({distance: distance, duration: duration}))}catch(e){}
    } else {
      calculateFallbackRoute();
      L.polyline([[start.lat, start.lng], [dest.lat, dest.lng]], {color: dest.color, weight: 5, dashArray: '8, 8'}).addTo(map);
    }
  })
  .catch(err => {
    document.getElementById('loading').style.display = 'none';
    calculateFallbackRoute();
    L.polyline([[start.lat, start.lng], [dest.lat, dest.lng]], {color: dest.color, weight: 5, dashArray: '8, 8'}).addTo(map);
  });

var touchTimer = null;
function sendTouch(isStart) {
  clearTimeout(touchTimer);
  if (isStart) {
    try{window.ReactNativeWebView.postMessage(JSON.stringify({type:'touch_start'}))}catch(e){}
  } else {
    touchTimer = setTimeout(function() {
      try{window.ReactNativeWebView.postMessage(JSON.stringify({type:'touch_end'}))}catch(e){}
    }, 1200);
  }
}
document.addEventListener('touchstart', function() { sendTouch(true); }, {passive: true});
document.addEventListener('touchend', function() { sendTouch(false); }, {passive: true});
document.addEventListener('touchcancel', function() { sendTouch(false); }, {passive: true});

</script></body></html>`;
  }, [isDark, destJSON, startJSON, transportMode]);

  const webViewSource = useMemo(() => ({ html }), [html]);

  const injectToActive = (code) => {
    const target = isFullscreen ? fullscreenWebviewRef : mainWebviewRef;
    if (target.current) {
      target.current.injectJavaScript(`${code}; true;`);
    }
  };

  const handleZoomIn = () => {
    injectToActive('if(window.map){ window.map.zoomIn(); }');
  };

  const handleZoomOut = () => {
    injectToActive('if(window.map){ window.map.zoomOut(); }');
  };

  const handleFitRoute = () => {
    injectToActive(
      'if(window.map && window.routeBounds){ window.map.fitBounds(window.routeBounds.pad(0.25), { animate: true, duration: 0.8 }); }'
    );
  };

  const handleMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'touch_start') {
        onMapTouch && onMapTouch(true);
      } else if (data.type === 'touch_end') {
        onMapTouch && onMapTouch(false);
      } else if (data.distance && onRouteData) {
        onRouteData(data);
      }
    } catch (e) {}
  };

  return (
    <View style={[styles.container, { borderColor: colors.border }]}>
      <WebView
        ref={mainWebviewRef}
        source={webViewSource}
        style={{ height: MAP_H, backgroundColor: isDark ? '#1a1a2e' : '#f0f4f8' }}
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

      {/* Floating Controls */}
      <View style={styles.floatingControls}>
        <TouchableOpacity
          style={[styles.controlBtn, { backgroundColor: isDark ? 'rgba(30,30,46,0.9)' : 'rgba(255,255,255,0.92)' }]}
          onPress={() => setIsFullscreen(true)}
          activeOpacity={0.8}
        >
          <MaterialIcons name="fullscreen" size={22} color={colors.textPrimary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlBtn, { backgroundColor: isDark ? 'rgba(30,30,46,0.9)' : 'rgba(255,255,255,0.92)' }]}
          onPress={handleFitRoute}
          activeOpacity={0.8}
        >
          <MaterialIcons name="fit-screen" size={20} color={colors.primary} />
        </TouchableOpacity>

        <View style={[styles.zoomGroup, { backgroundColor: isDark ? 'rgba(30,30,46,0.9)' : 'rgba(255,255,255,0.92)' }]}>
          <TouchableOpacity style={styles.zoomBtn} onPress={handleZoomIn} activeOpacity={0.7}>
            <MaterialIcons name="add" size={20} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={[styles.zoomDivider, { backgroundColor: colors.border }]} />
          <TouchableOpacity style={styles.zoomBtn} onPress={handleZoomOut} activeOpacity={0.7}>
            <MaterialIcons name="remove" size={20} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Fullscreen Route Modal */}
      <Modal
        visible={isFullscreen}
        animationType="slide"
        onRequestClose={() => setIsFullscreen(false)}
      >
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <View style={{ flex: 1, backgroundColor: colors.background }}>
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
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                {building || 'Marshrut'}
              </Text>
              <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
                {transportMode === 'car' ? 'Mashinada yo‘l' : 'Piyoda yo‘l'}
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.modalCloseBtn, { backgroundColor: colors.primary + '18' }]}
              onPress={handleFitRoute}
              activeOpacity={0.7}
            >
              <MaterialIcons name="fit-screen" size={20} color={colors.primary} />
            </TouchableOpacity>
          </View>

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

            <View style={styles.fullscreenZoomGroup}>
              <View style={[styles.zoomGroup, { backgroundColor: isDark ? 'rgba(30,30,46,0.95)' : 'rgba(255,255,255,0.95)' }]}>
                <TouchableOpacity style={styles.zoomBtn} onPress={handleZoomIn} activeOpacity={0.7}>
                  <MaterialIcons name="add" size={22} color={colors.textPrimary} />
                </TouchableOpacity>
                <View style={[styles.zoomDivider, { backgroundColor: colors.border }]} />
                <TouchableOpacity style={styles.zoomBtn} onPress={handleZoomOut} activeOpacity={0.7}>
                  <MaterialIcons name="remove" size={22} color={colors.textPrimary} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    width: '100%',
    borderRadius: 18,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
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
  fullscreenZoomGroup: {
    position: 'absolute',
    right: 18,
    bottom: 28,
    zIndex: 10,
  },
});
