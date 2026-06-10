import React, { useMemo, memo, useState, useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { WebView } from 'react-native-webview';
import { useTheme } from '../theme/ThemeContext';
import { NDTU, getBuildingCoords, resolveBuildingName } from '../data/ndtuCampus';
import { getBuildings } from '../api/mapService';

const { width: SW } = Dimensions.get('window');
const MAP_H = 420;

const GATE = NDTU.gate;

export default memo(function NavigationMapView({ building, userLocation, transportMode = 'foot', onRouteData, onMapTouch }) {
  const { isDark } = useTheme();

  const [bld, setBld] = useState(() => getBuildingCoords(building));

  useEffect(() => {
    let isMounted = true;
    const fetchUpdatedCoords = async () => {
      try {
        const resolvedName = resolveBuildingName(building);
        const allBuildings = await getBuildings();
        const match = allBuildings.find(b => b.name === resolvedName || b.name === building);
        
        if (match && match.lat && match.lng && isMounted) {
          setBld({
            lat: match.lat,
            lng: match.lng,
            icon: match.icon || '📍',
            color: match.color || '#3B82F6',
            id: match.id
          });
        }
      } catch (e) {}
    };
    fetchUpdatedCoords();
    return () => { isMounted = false; };
  }, [building]);

  const destJSON = JSON.stringify(bld);
  const startJSON = JSON.stringify(userLocation || GATE);

  const html = useMemo(() => {
    const tile = isDark
      ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
      : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    const attr = isDark ? '&copy; CARTO' : '&copy; OpenStreetMap';

    return `<!DOCTYPE html><html><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body,#map{width:100%;height:100%}
body{background:${isDark ? '#1a1a2e' : '#f0f4f8'}}
.custom-marker{background:none!important;border:none!important}
.pulse-dot{animation:pulse 1.5s infinite}
@keyframes pulse{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.4);opacity:.6}}
.leaflet-control-zoom{display:none}
.loading-box{position:absolute;top:10px;left:50%;transform:translateX(-50%);z-index:1000;background:rgba(0,0,0,0.7);color:white;padding:8px 16px;border-radius:20px;font-family:system-ui;font-size:12px;display:none;}
</style></head><body>
<div id="loading" class="loading-box">Yo'l qidirilmoqda...</div>
<div id="map"></div>
<script>
var dest = ${destJSON};
var start = ${startJSON};
var mode = '${transportMode}';

var map = L.map('map',{zoomControl:false,attributionControl:false});
L.tileLayer('${tile}',{attribution:'${attr}',maxZoom:19}).addTo(map);

L.marker([dest.lat,dest.lng],{icon:L.divIcon({className:'custom-marker',
  html:'<div style="width:42px;height:42px;background:'+dest.color+';border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:22px;border:3px solid white;box-shadow:0 4px 16px '+dest.color+'80">'+dest.icon+'</div>',
  iconSize:[42,42],iconAnchor:[21,21]})}).addTo(map);

var startMarker = L.marker([start.lat,start.lng],{icon:L.divIcon({className:'custom-marker',
  html:'<div class="pulse-dot" style="width:20px;height:20px;background:#3B82F6;border-radius:50%;border:4px solid white;box-shadow:0 0 0 6px rgba(59,130,246,0.3)"></div>',
  iconSize:[20,20],iconAnchor:[10,10]})}).addTo(map);

var bounds = L.latLngBounds([[start.lat, start.lng], [dest.lat, dest.lng]]);
map.fitBounds(bounds.pad(0.3));

document.getElementById('loading').style.display = 'block';

fetch('https://router.project-osrm.org/route/v1/' + mode + '/' + start.lng + ',' + start.lat + ';' + dest.lng + ',' + dest.lat + '?overview=full&geometries=geojson')
  .then(res => res.json())
  .then(data => {
    document.getElementById('loading').style.display = 'none';
    if(data.routes && data.routes.length > 0) {
      var coords = data.routes[0].geometry.coordinates;
      var latlngs = coords.map(function(c) { return [c[1], c[0]] });
      L.polyline(latlngs, {color: dest.color, weight: 8, opacity: 0.2, lineCap: 'round', lineJoin: 'round'}).addTo(map);
      L.polyline(latlngs, {color: dest.color, weight: 5, opacity: 0.9, lineCap: 'round', lineJoin: 'round'}).addTo(map);
      map.fitBounds(L.latLngBounds(latlngs).pad(0.2));
      var distance = data.routes[0].distance;
      var duration = data.routes[0].duration;
      try{window.ReactNativeWebView.postMessage(JSON.stringify({distance: distance, duration: duration}))}catch(e){}
    }
  })
  .catch(err => {
    document.getElementById('loading').style.display = 'none';
    L.polyline([[start.lat, start.lng], [dest.lat, dest.lng]], {color: dest.color, weight: 5, dashArray: '10, 10'}).addTo(map);
  });

document.addEventListener('touchstart', function() { try{window.ReactNativeWebView.postMessage(JSON.stringify({type:'touch_start'}))}catch(e){} }, {passive: true});
document.addEventListener('touchend', function() { try{window.ReactNativeWebView.postMessage(JSON.stringify({type:'touch_end'}))}catch(e){} }, {passive: true});
document.addEventListener('touchcancel', function() { try{window.ReactNativeWebView.postMessage(JSON.stringify({type:'touch_end'}))}catch(e){} }, {passive: true});

</script></body></html>`;
  }, [isDark, destJSON, startJSON, transportMode]);

  const webViewSource = useMemo(() => ({ html }), [html]);

  return (
    <View style={styles.container}>
      <WebView
        source={webViewSource}
        style={{ height: MAP_H, borderRadius: 16 }}
        javaScriptEnabled
        domStorageEnabled
        originWhitelist={['*']}
        onMessage={(event) => {
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
        }}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: { width: '100%', borderRadius: 16, overflow: 'hidden' },
});
