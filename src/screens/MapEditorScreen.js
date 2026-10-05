import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView,
  Dimensions, Alert, Modal, Share, Animated, PanResponder, StatusBar
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { useTheme } from '../theme/ThemeContext';
import { useLanguage } from '../theme/LanguageContext';
import { spacing, borderRadius, typography } from '../theme/colors';
import { getBuildings, saveBuilding, deleteBuilding } from '../api/mapService';
import { NDTU } from '../data/ndtuCampus';

const { width: SW, height: SH } = Dimensions.get('window');
const NDTU_CENTER = NDTU.center;

const ICONS = [
  { emoji: '🏛️', label: 'Bosh bino' },
  { emoji: '📚', label: 'Kutubxona' },
  { emoji: '🍽️', label: 'Oshxona' },
  { emoji: '🔬', label: 'Laboratoriya' },
  { emoji: '📖', label: 'Fakultet' },
  { emoji: '🏋️', label: 'Sport' },
  { emoji: '🏥', label: 'Tibbiyot' },
  { emoji: '🏠', label: 'Yotoqxona' },
  { emoji: '🏢', label: 'Ofis' },
  { emoji: '🎓', label: 'Dekanat' },
  { emoji: '🅿️', label: 'Parking' },
  { emoji: '🚪', label: 'Kirish' },
];

const COLORS = ['#6C63FF','#00D4AA','#FFB347','#E879F9','#63B3ED','#FF6B6B','#F87171','#A78BFA','#10B981','#F59E0B'];

export default function MapEditorScreen({ navigation, route, isEmbedded: propIsEmbedded }) {
  const isEmbedded = propIsEmbedded || route?.params?.isEmbedded || false;
  const { colors, isDark } = useTheme();
  const { t, language } = useLanguage();
  const [markers, setMarkers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [pendingCoord, setPendingCoord] = useState(null);
  const [formName, setFormName] = useState('');
  const [formIcon, setFormIcon] = useState('🏛️');
  const [formColor, setFormColor] = useState('#6C63FF');
  const [editingId, setEditingId] = useState(null);
  const [relocatingId, setRelocatingId] = useState(null);
  const [showCode, setShowCode] = useState(false);
  
  // Bottom Sheet animation values
  const defaultPanelHeight = isEmbedded ? 76 : SH * 0.36;
  const [panelHeight] = useState(new Animated.Value(defaultPanelHeight));
  const currentHeight = useRef(defaultPanelHeight);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (evt, gestureState) => Math.abs(gestureState.dy) > 10,
      onPanResponderGrant: () => {
        panelHeight.setOffset(currentHeight.current);
        panelHeight.setValue(0);
      },
      onPanResponderMove: (evt, gestureState) => {
        panelHeight.setValue(-gestureState.dy);
      },
      onPanResponderRelease: (evt, gestureState) => {
        panelHeight.flattenOffset();
        let finalHeight = currentHeight.current - gestureState.dy;
        const minH = isEmbedded ? 60 : SH * 0.15;
        const maxH = isEmbedded ? 340 : SH * 0.85;
        const midH = isEmbedded ? 140 : SH * 0.36;

        if (finalHeight > (isEmbedded ? 220 : SH * 0.55)) finalHeight = maxH;
        else if (finalHeight < (isEmbedded ? 90 : SH * 0.22)) finalHeight = minH;
        else finalHeight = midH;

        Animated.spring(panelHeight, {
          toValue: finalHeight,
          useNativeDriver: false,
          friction: 8,
        }).start(() => {
          currentHeight.current = finalHeight;
        });
      }
    })
  ).current;

  const [userLocation, setUserLocation] = useState(null);
  const [locationError, setLocationError] = useState(null);

  // Ma'lumotlarni yuklash
  useEffect(() => {
    let isMounted = true;
    const loadBuildings = async () => {
      try {
        const data = await getBuildings();
        if (isMounted && Array.isArray(data)) {
          setMarkers(data);
        }
      } catch (err) {
        console.log('Error loading buildings in editor:', err);
      }
    };
    loadBuildings();
    return () => { isMounted = false; };
  }, []);

  // GPS joylashuvini olish
  useEffect(() => {
    let subscription = null;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setLocationError('Joylashuv ruxsati berilmadi');
          return;
        }
        let loc = null;
        try {
          loc = await Location.getLastKnownPositionAsync({});
        } catch (e) {}
        if (!loc) {
          loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced, timeout: 6000 });
        }
        if (loc?.coords) {
          setUserLocation({ lat: loc.coords.latitude, lng: loc.coords.longitude });
        }

        // Real-time kuzatish
        subscription = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.Balanced, distanceInterval: 5, timeInterval: 4000 },
          (l) => {
            if (l?.coords) {
              setUserLocation({ lat: l.coords.latitude, lng: l.coords.longitude });
            }
          }
        );
      } catch (err) {
        setLocationError(err.message);
      }
    })();
    return () => { if (subscription) subscription.remove(); };
  }, []);

  // Xaritaga bosilganda yoki markerga bosilganda
  const handleMapMessage = useCallback(async (data) => {
    if (data.type === 'mapClick') {
      if (relocatingId) {
        setPendingCoord({ lat: data.lat, lng: data.lng });
        Alert.alert(
          'Joylashuvni saqlash',
          'Siz belgilagan yangi joylashuv saqlansinmi?',
          [
            { 
              text: 'Bekor qilish', 
              style: 'cancel', 
              onPress: () => { setRelocatingId(null); setPendingCoord(null); } 
            },
            { 
              text: 'Saqlash', 
              onPress: async () => {
                const existing = markers.find(m => m.id === relocatingId);
                if (existing) {
                  const updatedMarker = { ...existing, lat: data.lat, lng: data.lng };
                  setMarkers(prev => prev.map(m => m.id === relocatingId ? updatedMarker : m));
                  await saveBuilding(updatedMarker);
                  Alert.alert('Muvaffaqiyatli', 'Bino joylashuvi o\'zgartirildi!');
                }
                setRelocatingId(null);
                setPendingCoord(null);
              }
            }
          ]
        );
      } else {
        setPendingCoord({ lat: data.lat, lng: data.lng });
        if (!showForm) {
          setFormName('');
          setFormIcon('🏛️');
          setFormColor(COLORS[markers.length % COLORS.length]);
          setEditingId(null);
          setShowForm(true);
          const targetH = isEmbedded ? 310 : SH * 0.48;
          Animated.spring(panelHeight, { toValue: targetH, useNativeDriver: false }).start(() => {
            currentHeight.current = targetH;
          });
        }
      }
    } else if (data.type === 'markerClick') {
      const selectedMarker = markers.find(m => m.id === data.id);
      if (selectedMarker) {
        Alert.alert(
          selectedMarker.name,
          'Nima amal bajarmoqchisiz?',
          [
            { text: 'Bekor qilish', style: 'cancel' },
            { 
              text: 'Joyini almashtirish', 
              onPress: () => {
                setRelocatingId(selectedMarker.id);
                setPendingCoord(null);
                setShowForm(false);
                Alert.alert('Eslatma', 'Endi xaritadan bino uchun yangi joyni bosing.');
                const targetH = isEmbedded ? 76 : SH * 0.15;
                Animated.spring(panelHeight, { toValue: targetH, useNativeDriver: false }).start(() => {
                  currentHeight.current = targetH;
                });
              } 
            },
            { 
              text: 'Nomini almashtirish', 
              onPress: () => editMarker(selectedMarker) 
            }
          ]
        );
      }
    }
  }, [markers, showForm, panelHeight, relocatingId, isEmbedded]);

  const handleAddNewInitiate = () => {
    setPendingCoord(null);
    setShowForm(false);
    setFormName('');
    setEditingId(null);
    const targetH = isEmbedded ? 76 : SH * 0.15;
    Animated.spring(panelHeight, { toValue: targetH, useNativeDriver: false }).start(() => {
      currentHeight.current = targetH;
    });
  };

  // Marker qo'shish / yangilash
  const handleSaveMarker = async () => {
    if (!formName.trim()) {
      Alert.alert('Xatolik', 'Bino nomini kiriting!');
      return;
    }
    
    Alert.alert(
      'Saqlashni tasdiqlang',
      "Kiritilgan o'zgarishlar saqlansinmi?",
      [
        { text: 'Bekor qilish', style: 'cancel' },
        {
          text: 'Saqlash',
          onPress: async () => {
            let updatedMarker = null;

            if (editingId !== null) {
              const existing = markers.find(m => m.id === editingId);
              updatedMarker = { ...existing, name: formName.trim(), icon: formIcon, color: formColor };
              setMarkers(prev => prev.map(m => m.id === editingId ? updatedMarker : m));
            } else if (pendingCoord) {
              updatedMarker = {
                name: formName.trim(),
                lat: pendingCoord.lat,
                lng: pendingCoord.lng,
                icon: formIcon,
                color: formColor,
              };
              const tempId = Date.now().toString();
              updatedMarker.id = tempId;
              setMarkers(prev => [...prev, updatedMarker]);
            }

            setShowForm(false);
            setPendingCoord(null);
            setEditingId(null);
            const targetH = isEmbedded ? 76 : SH * 0.36;
            Animated.spring(panelHeight, { toValue: targetH, useNativeDriver: false }).start(() => {
              currentHeight.current = targetH;
            });

            // Bazaga saqlash
            if (updatedMarker) {
              const result = await saveBuilding(updatedMarker);
              if (result.success && result.id) {
                setMarkers(prev => prev.map(m => m.id === updatedMarker.id ? { ...m, id: result.id } : m));
              }
            }
          }
        }
      ]
    );
  };

  // Marker o'chirish
  const handleDeleteMarker = async (id) => {
    Alert.alert(
      "O'chirishni tasdiqlang",
      "Haqiqatan ham bu binoni o'chirmoqchimisiz?",
      [
        { text: 'Bekor qilish', style: 'cancel' },
        {
          text: "O'chirish",
          style: 'destructive',
          onPress: async () => {
            setMarkers(prev => prev.filter(m => m.id !== id));
            await deleteBuilding(id);
          }
        }
      ]
    );
  };

  // Marker tahrirlash
  const editMarker = (marker) => {
    setFormName(marker.name);
    setFormIcon(marker.icon);
    setFormColor(marker.color);
    setEditingId(marker.id);
    setPendingCoord({ lat: marker.lat, lng: marker.lng });
    setShowForm(true);
    const targetH = isEmbedded ? 310 : SH * 0.48;
    Animated.spring(panelHeight, { toValue: targetH, useNativeDriver: false }).start(() => {
      currentHeight.current = targetH;
    });
  };

  // Kodni ko'rsatish (koordinatalarni eksport)
  const exportCode = () => {
    setShowCode(true);
  };

  const codeText = markers.map(m =>
    `  { id: '${m.id}', name: '${m.name}', lat: ${Number(m.lat).toFixed(6)}, lng: ${Number(m.lng).toFixed(6)}, icon: '${m.icon}', color: '${m.color}' },`
  ).join('\n');

  const webviewRef = useRef(null);

  // Leaflet HTML (Standart OSM va silliq Dark filter bilan)
  const mapHTML = useMemo(() => {
    const tile = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

    const htmlParts = [
      '<!DOCTYPE html><html><head>',
      '<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">',
      '<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>',
      '<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"><\/script>',
      '<style>',
      '*{margin:0;padding:0;box-sizing:border-box;-webkit-tap-highlight-color:transparent;}html,body,#map{width:100%;height:100%;overflow:hidden;}',
      'body{background:' + (isDark ? '#1a1a2e' : '#f0f4f8') + '}',
      '.leaflet-tile{will-change:transform;-webkit-backface-visibility:hidden;}',
      (isDark ? '.leaflet-tile-pane{filter:brightness(0.6) invert(1) contrast(3) hue-rotate(200deg) saturate(0.35) brightness(0.75);}' : ''),
      '.cm{background:none!important;border:none!important}',
      '.label{background:' + (isDark ? 'rgba(30,30,50,0.92)' : 'rgba(255,255,255,0.95)') + ' !important;border:1px solid ' + (isDark ? '#444' : '#ddd') + ' !important;border-radius:8px !important;padding:3px 8px !important;font-size:11px !important;font-weight:700 !important;color:' + (isDark ? '#fff' : '#333') + ' !important;font-family:system-ui !important;box-shadow:0 2px 8px rgba(0,0,0,0.15) !important}',
      '@keyframes gps{0%,100%{transform:scale(1);opacity:0.6}50%{transform:scale(2);opacity:0}}',
      '.hint{position:fixed;top:10px;left:50%;transform:translateX(-50%);z-index:1000;background:' + (isDark ? 'rgba(30,30,50,0.92)' : 'rgba(255,255,255,0.95)') + ';padding:6px 14px;border-radius:20px;font-size:11px;font-weight:700;color:' + (isDark ? '#a78bfa' : '#6C63FF') + ';font-family:system-ui;box-shadow:0 2px 10px rgba(0,0,0,0.15);border:1px solid ' + (isDark ? '#3a3a4e' : '#e0e0e0') + ';pointer-events:none;white-space:nowrap;}',
      '</style></head><body>',
      '<div class="hint">📍 Xaritaga bosib bino belgilang</div>',
      '<div id="map"></div>',
      '<script>',
      'var map=L.map("map",{center:[' + NDTU_CENTER.lat + ',' + NDTU_CENTER.lng + '],zoom:' + NDTU.zoom + ',zoomControl:false,attributionControl:false,tap:false,touchZoom:true,inertia:true,inertiaDeceleration:3000});',
      'window.map=map;',
      'L.tileLayer("' + tile + '",{maxZoom:19,attribution:"&copy; OpenStreetMap"}).addTo(map);',
      'L.circle([' + NDTU_CENTER.lat + ',' + NDTU_CENTER.lng + '],{radius:380,color:"#6C63FF",fillColor:"#6C63FF",fillOpacity:0.04,weight:1.5,dashArray:"8,6"}).addTo(map);',
      'var markersLayer = L.layerGroup().addTo(map);',
      'var pendingLayer = L.layerGroup().addTo(map);',
      'var gpsLayer = L.layerGroup().addTo(map);',
      'setTimeout(function(){ if(window.map){window.map.invalidateSize();} }, 200);',
      'setTimeout(function(){ if(window.map){window.map.invalidateSize();} }, 600);',
      'setTimeout(function(){ if(window.map){window.map.invalidateSize();} }, 1500);',
      'window.addEventListener("resize", function(){ if(window.map){window.map.invalidateSize();} });',
      'window.zoomIn = function(){ if(window.map){window.map.zoomIn();} };',
      'window.zoomOut = function(){ if(window.map){window.map.zoomOut();} };',
      'window.centerMap = function(lat, lng){ if(window.map){window.map.setView([lat, lng], 17); } };',
      'window.updateMap = function(markers, pending, userLoc, flyToPending) {',
      '  if (!window.map) return;',
      '  window.map.invalidateSize();',
      '  markersLayer.clearLayers(); pendingLayer.clearLayers(); gpsLayer.clearLayers();',
      '  if(Array.isArray(markers)) {',
      '    markers.forEach(function(m) {',
      '      var mk = L.marker([m.lat,m.lng],{icon:L.divIcon({className:"cm",',
      '        html:"<div style=\\"width:38px;height:38px;background:"+m.color+";border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:20px;border:3px solid white;box-shadow:0 3px 12px "+m.color+"80;cursor:pointer\\">"+m.icon+"</div>",',
      '        iconSize:[38,38],iconAnchor:[19,19]})}).addTo(markersLayer)',
      '        .bindTooltip(m.name,{permanent:true,direction:"top",offset:[0,-22],className:"label"});',
      '      mk.on("click", function(e){',
      '        L.DomEvent.stopPropagation(e);',
      '        if(window.ReactNativeWebView){window.ReactNativeWebView.postMessage(JSON.stringify({type:"markerClick", id: m.id}));}',
      '      });',
      '    });',
      '  }',
      '  if(pending) {',
      '    L.circleMarker([pending.lat,pending.lng],{radius:8,color:"#FF0000",fillColor:"#FF0000",fillOpacity:0.5,weight:2}).addTo(pendingLayer);',
      '    if(flyToPending) { map.flyTo([pending.lat, pending.lng], 18, { duration: 0.5 }); }',
      '  }',
      '  if(userLoc) {',
      '    L.marker([userLoc.lat,userLoc.lng],{icon:L.divIcon({className:"cm",',
      '      html:"<div style=\\"position:relative\\"><div style=\\"width:18px;height:18px;background:#3B82F6;border-radius:50%;border:3px solid white;box-shadow:0 0 0 6px rgba(59,130,246,0.25),0 2px 8px rgba(0,0,0,0.3)\\"></div><div style=\\"position:absolute;top:-3px;left:-3px;width:24px;height:24px;border-radius:50%;background:rgba(59,130,246,0.2);animation:gps 2s infinite\\"></div></div>",',
      '      iconSize:[18,18],iconAnchor:[9,9]})}).addTo(gpsLayer)',
      '      .bindTooltip("📍 Siz shu yerdasiz",{direction:"top",offset:[0,-14],className:"label"});',
      '  }',
      '};',
      'map.on("click",function(e){',
      '  var msg=JSON.stringify({type:"mapClick",lat:e.latlng.lat,lng:e.latlng.lng});',
      '  try{window.ReactNativeWebView.postMessage(msg)}catch(err){window.parent.postMessage(msg,"*")}',
      '});',
      'try{ if(window.ReactNativeWebView){ window.ReactNativeWebView.postMessage(JSON.stringify({type:"ready"})); } }catch(e){}',
      '<\/script></body></html>',
    ].join('\n');

    return htmlParts;
  }, [isDark]);

  const sendMapState = useCallback(() => {
    if (webviewRef.current) {
      const js = `if(window.updateMap){window.updateMap(${JSON.stringify(markers)}, ${JSON.stringify(pendingCoord)}, ${JSON.stringify(userLocation)}, ${showForm});} true;`;
      webviewRef.current.injectJavaScript(js);
    }
  }, [markers, pendingCoord, userLocation, showForm]);

  useEffect(() => {
    sendMapState();
  }, [sendMapState]);

  const styles = createStyles(colors, isEmbedded);

  return (
    <View style={styles.container}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.surface} />
      
      {/* Header (faqat to'liq ekranda) */}
      {!isEmbedded && (
        <SafeAreaView edges={['top']} style={{ backgroundColor: colors.surface }}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
              <MaterialIcons name="arrow-back" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>🗺️ Xarita Tahrirlovchi</Text>
            <TouchableOpacity style={styles.exportBtn} onPress={exportCode}>
              <MaterialIcons name="code" size={22} color={colors.primary} />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      )}

      {/* Map View */}
      <View style={styles.mapContainer}>
        <WebView
          ref={webviewRef}
          source={{ html: mapHTML }}
          style={{ flex: 1, backgroundColor: isDark ? '#1a1a2e' : '#f0f4f8' }}
          javaScriptEnabled
          domStorageEnabled
          androidHardwareAccelerationDisabled={false}
          mixedContentMode="always"
          allowFileAccess
          scalesPageToFit={false}
          originWhitelist={['*']}
          onLoadEnd={() => {
            sendMapState();
          }}
          onMessage={(event) => {
            try {
              const data = JSON.parse(event.nativeEvent.data);
              if (data.type === 'ready') {
                sendMapState();
                return;
              }
              handleMapMessage(data);
            } catch {}
          }}
        />

        {/* Floating Quick Map Controls */}
        <View style={styles.floatingControls}>
          {isEmbedded && (
            <TouchableOpacity
              style={[styles.controlBtn, { backgroundColor: isDark ? 'rgba(30,30,46,0.92)' : 'rgba(255,255,255,0.95)' }]}
              onPress={() => navigation.navigate('MapEditor')}
              activeOpacity={0.8}
            >
              <MaterialIcons name="fullscreen" size={22} color={colors.textPrimary} />
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.controlBtn, { backgroundColor: isDark ? 'rgba(30,30,46,0.92)' : 'rgba(255,255,255,0.95)' }]}
            onPress={() => {
              const target = userLocation || NDTU_CENTER;
              webviewRef.current?.injectJavaScript(`if(window.centerMap){window.centerMap(${target.lat}, ${target.lng});} true;`);
            }}
            activeOpacity={0.8}
          >
            <MaterialIcons name="my-location" size={20} color={colors.primary} />
          </TouchableOpacity>

          <View style={[styles.zoomGroup, { backgroundColor: isDark ? 'rgba(30,30,46,0.92)' : 'rgba(255,255,255,0.95)' }]}>
            <TouchableOpacity
              style={styles.zoomBtn}
              onPress={() => webviewRef.current?.injectJavaScript('if(window.zoomIn){window.zoomIn();} true;')}
              activeOpacity={0.7}
            >
              <MaterialIcons name="add" size={22} color={colors.textPrimary} />
            </TouchableOpacity>
            <View style={[styles.zoomDivider, { backgroundColor: colors.border }]} />
            <TouchableOpacity
              style={styles.zoomBtn}
              onPress={() => webviewRef.current?.injectJavaScript('if(window.zoomOut){window.zoomOut();} true;')}
              activeOpacity={0.7}
            >
              <MaterialIcons name="remove" size={22} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Draggable Bottom Sheet */}
      <Animated.View style={[styles.bottomSheet, { height: panelHeight }]}>
        <View style={styles.dragHandleContainer} {...panResponder.panHandlers}>
          <View style={styles.dragHandle} />
        </View>

        {showForm ? (
          <View style={styles.sheetContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingId ? '✏️ Tahrirlash' : '📍 Yangi bino'}</Text>
              <TouchableOpacity onPress={() => {
                setShowForm(false);
                setPendingCoord(null);
                const targetH = isEmbedded ? 76 : SH * 0.36;
                Animated.spring(panelHeight, { toValue: targetH, useNativeDriver: false }).start(() => {
                  currentHeight.current = targetH;
                });
              }}>
                <MaterialIcons name="close" size={24} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            {pendingCoord && (
              <Text style={styles.coordText}>📌 {pendingCoord.lat.toFixed(6)}, {pendingCoord.lng.toFixed(6)}</Text>
            )}

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
              <TextInput
                style={[styles.formInput, { color: colors.textPrimary, backgroundColor: colors.surfaceLight, borderColor: colors.border }]}
                placeholder="Bino nomi..."
                placeholderTextColor={colors.textMuted}
                value={formName}
                onChangeText={setFormName}
              />

              <Text style={styles.formLabel}>Belgi tanlang:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pickerScroll}>
                {ICONS.map((ic) => (
                  <TouchableOpacity
                    key={ic.emoji}
                    style={[styles.iconOption, formIcon === ic.emoji && { backgroundColor: formColor + '30', borderColor: formColor }]}
                    onPress={() => setFormIcon(ic.emoji)}
                  >
                    <Text style={{ fontSize: 22 }}>{ic.emoji}</Text>
                    <Text style={[styles.iconLabel, { color: colors.textMuted }]}>{ic.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.formLabel}>Rang tanlang:</Text>
              <View style={styles.colorRow}>
                {COLORS.map((c) => (
                  <TouchableOpacity
                    key={c}
                    style={[styles.colorOption, { backgroundColor: c }, formColor === c && styles.colorSelected]}
                    onPress={() => setFormColor(c)}
                  >
                    {formColor === c && <MaterialIcons name="check" size={16} color="#FFF" />}
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveMarker}>
                <LinearGradient colors={[formColor, formColor + 'CC']} style={styles.saveBtnGrad}>
                  <MaterialIcons name={editingId ? 'save' : 'add-location'} size={22} color="#FFF" />
                  <Text style={styles.saveBtnText}>{editingId ? 'Saqlash' : 'Belgilash'}</Text>
                </LinearGradient>
              </TouchableOpacity>
            </ScrollView>
          </View>
        ) : (
          <View style={styles.sheetContent}>
            <View style={styles.listHeader}>
              <Text style={styles.listTitle}>📍 Binolar ({markers.length})</Text>
              <TouchableOpacity onPress={handleAddNewInitiate} style={styles.addNewBtn}>
                <MaterialIcons name="add" size={20} color="#FFF" />
                <Text style={styles.addNewBtnText}>Yangi</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
              {markers.length === 0 ? (
                <View style={styles.emptyState}>
                  <MaterialIcons name="touch-app" size={32} color={colors.textMuted} />
                  <Text style={styles.emptyText}>Xaritaga bosib binolarni belgilang</Text>
                </View>
              ) : (
                markers.map((m) => (
                  <TouchableOpacity
                    key={m.id}
                    style={styles.markerItem}
                    onPress={() => {
                      webviewRef.current?.injectJavaScript(`if(window.map){window.map.flyTo([${m.lat}, ${m.lng}], 18, {duration: 0.8});} true;`);
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.markerIcon, { backgroundColor: m.color + '20' }]}>
                      <Text style={{ fontSize: 20 }}>{m.icon}</Text>
                    </View>
                    <View style={styles.markerInfo}>
                      <Text style={styles.markerName}>{m.name}</Text>
                      <Text style={styles.markerCoord}>{Number(m.lat).toFixed(5)}, {Number(m.lng).toFixed(5)}</Text>
                    </View>
                    <TouchableOpacity onPress={() => editMarker(m)} style={styles.markerAction}>
                      <MaterialIcons name="edit" size={18} color={colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDeleteMarker(m.id)} style={styles.markerAction}>
                      <MaterialIcons name="delete" size={18} color={colors.error} />
                    </TouchableOpacity>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        )}
      </Animated.View>

      {/* Code Export Modal */}
      <Modal visible={showCode} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>📋 Koordinatalar kodi</Text>
              <TouchableOpacity onPress={() => setShowCode(false)}>
                <MaterialIcons name="close" size={24} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
            <Text style={styles.codeHint}>Bu kodni LeafletMap.js va NavigationMapView.js ga joylashtiring:</Text>
            <ScrollView style={[styles.codeBox, { backgroundColor: isDark ? '#1a1a2e' : '#f3f4f6' }]}>
              <Text style={[styles.codeText, { color: isDark ? '#e0e0e0' : '#333' }]}>
                {`const CAMPUS_BUILDINGS = [\n${codeText}\n];`}
              </Text>
            </ScrollView>
            <TouchableOpacity
              style={[styles.saveBtn, { marginTop: 12 }]}
              onPress={async () => {
                const text = `const CAMPUS_BUILDINGS = [\n${codeText}\n];`;
                try {
                  await Share.share({ message: text });
                } catch {}
                setShowCode(false);
              }}
            >
              <LinearGradient colors={['#6C63FF', '#6C63FFCC']} style={styles.saveBtnGrad}>
                <MaterialIcons name="content-copy" size={20} color="#FFF" />
                <Text style={styles.saveBtnText}>Nusxalash</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const createStyles = (colors, isEmbedded) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border
  },
  backBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { ...typography.h3, color: colors.textPrimary, flex: 1, textAlign: 'center' },
  exportBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary + '15', justifyContent: 'center', alignItems: 'center' },
  mapContainer: { flex: 1, position: 'relative' },
  floatingControls: {
    position: 'absolute',
    right: 12,
    top: 12,
    gap: 8,
    alignItems: 'center',
    zIndex: 999,
  },
  controlBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  zoomGroup: {
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 4,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  zoomBtn: {
    width: 40,
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
  },
  zoomDivider: {
    height: 1,
    width: 22,
    alignSelf: 'center',
  },
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 10,
    zIndex: 1000,
  },
  dragHandleContainer: {
    paddingVertical: 10,
    paddingHorizontal: 100,
    alignItems: 'center',
    width: '100%',
  },
  dragHandle: {
    width: 48,
    height: 5,
    backgroundColor: colors.border,
    borderRadius: 3,
  },
  sheetContent: {
    flex: 1,
    paddingHorizontal: spacing.md,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border
  },
  listTitle: { ...typography.h3, fontSize: 14, color: colors.textPrimary },
  addNewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: borderRadius.md,
    gap: 4
  },
  addNewBtnText: { color: '#FFF', fontSize: 12, fontWeight: '700' },
  list: { flex: 1, paddingHorizontal: 2 },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 20, gap: 6 },
  emptyText: { ...typography.bodySmall, color: colors.textMuted },
  markerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 10
  },
  markerIcon: { width: 38, height: 38, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  markerInfo: { flex: 1 },
  markerName: { ...typography.body, fontSize: 13, color: colors.textPrimary, fontWeight: '600' },
  markerCoord: { ...typography.caption, color: colors.textMuted, fontSize: 10 },
  markerAction: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.surfaceLight },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: spacing.lg, paddingBottom: 40, maxHeight: SH * 0.7 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs },
  modalTitle: { ...typography.h3, color: colors.textPrimary },
  coordText: { ...typography.bodySmall, color: colors.accent, marginBottom: spacing.xs, fontWeight: '600', fontSize: 12 },
  formInput: { height: 44, borderRadius: 10, paddingHorizontal: 14, fontSize: 14, fontWeight: '500', borderWidth: 1, marginBottom: spacing.sm },
  formLabel: { ...typography.bodySmall, color: colors.textSecondary, fontWeight: '600', marginBottom: 6, fontSize: 12 },
  pickerScroll: { marginBottom: spacing.sm, maxHeight: 65 },
  iconOption: { alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, borderWidth: 1.5, borderColor: 'transparent', marginRight: 8, minWidth: 54 },
  iconLabel: { fontSize: 8, marginTop: 2, fontWeight: '600' },
  colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: spacing.md },
  colorOption: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  colorSelected: { borderWidth: 3, borderColor: 'white', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 4 },
  saveBtn: { borderRadius: 12, overflow: 'hidden' },
  saveBtnGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, gap: 8, borderRadius: 12 },
  saveBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  // Code export
  codeHint: { ...typography.bodySmall, color: colors.textSecondary, marginBottom: spacing.sm },
  codeBox: { borderRadius: 12, padding: 14, maxHeight: 250 },
  codeText: { fontFamily: 'monospace', fontSize: 12, lineHeight: 20 },
});
