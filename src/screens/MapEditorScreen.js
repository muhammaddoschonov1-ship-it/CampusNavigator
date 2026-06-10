import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView,
  Dimensions, Alert, Modal, Share, Animated, PanResponder
} from 'react-native';
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
const MAP_H = SH * 0.55;
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
  const [panelHeight] = useState(new Animated.Value(SH * 0.45));
  const currentHeight = useRef(SH * 0.45);

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
        if (finalHeight > SH * 0.6) finalHeight = SH * 0.85;
        else if (finalHeight < SH * 0.25) finalHeight = SH * 0.15;
        else finalHeight = SH * 0.45;

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
    const loadBuildings = async () => {
      const data = await getBuildings();
      setMarkers(data);
    };
    loadBuildings();
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
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Highest });
        setUserLocation({ lat: loc.coords.latitude, lng: loc.coords.longitude });

        // Real-time kuzatish
        subscription = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.Highest, distanceInterval: 1, timeInterval: 2000 },
          (loc) => setUserLocation({ lat: loc.coords.latitude, lng: loc.coords.longitude })
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
          Animated.spring(panelHeight, { toValue: SH * 0.45, useNativeDriver: false }).start(() => {
            currentHeight.current = SH * 0.45;
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
                Animated.spring(panelHeight, { toValue: SH * 0.15, useNativeDriver: false }).start(() => {
                  currentHeight.current = SH * 0.15;
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
  }, [markers, showForm, panelHeight, relocatingId]);

  const handleAddNewInitiate = () => {
    setPendingCoord(null);
    setShowForm(false);
    setFormName('');
    setEditingId(null);
    Animated.spring(panelHeight, { toValue: SH * 0.15, useNativeDriver: false }).start(() => {
      currentHeight.current = SH * 0.15;
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
              // Vaqtincha ID beramiz, saqlangach haqiqiy ID keladi
              const tempId = Date.now().toString();
              updatedMarker.id = tempId;
              setMarkers(prev => [...prev, updatedMarker]);
            }

            setShowForm(false);
            setPendingCoord(null);
            setEditingId(null);

            // Bazaga saqlash
            if (updatedMarker) {
              const result = await saveBuilding(updatedMarker);
              if (result.success && result.id) {
                setMarkers(prev => prev.map(m => m.id === updatedMarker.id ? { ...m, id: result.id } : m));
              } else {
                console.log("Bazaga saqlanmadi (yoki local ishlayapti):", result.error);
              }
            }
          }
        }
      ]
    );
  };

  // Marker o'chirish
  const handleDeleteMarker = async (id) => {
    setMarkers(prev => prev.filter(m => m.id !== id));
    await deleteBuilding(id);
  };

  // Marker tahrirlash
  const editMarker = (marker) => {
    setFormName(marker.name);
    setFormIcon(marker.icon);
    setFormColor(marker.color);
    setEditingId(marker.id);
    setPendingCoord({ lat: marker.lat, lng: marker.lng });
    setShowForm(true);
    Animated.spring(panelHeight, { toValue: SH * 0.45, useNativeDriver: false }).start(() => {
      currentHeight.current = SH * 0.45;
    });
  };

  // Kodni ko'rsatish (koordinatalarni eksport)
  const exportCode = () => {
    setShowCode(true);
  };

  const codeText = markers.map(m =>
    `  { id: '${m.id}', name: '${m.name}', lat: ${m.lat.toFixed(6)}, lng: ${m.lng.toFixed(6)}, icon: '${m.icon}', color: '${m.color}' },`
  ).join('\n');

  const webviewRef = useRef(null);

  // Leaflet HTML (faqat bir marta yuklanadi)
  const mapHTML = useMemo(() => {
    const tile = isDark
      ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
      : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

    const htmlParts = [
      '<!DOCTYPE html><html><head>',
      '<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">',
      '<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>',
      '<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"><\/script>',
      '<style>',
      '*{margin:0;padding:0}html,body,#map{width:100%;height:100%}',
      'body{background:' + (isDark ? '#1a1a2e' : '#f0f4f8') + '}',
      '.cm{background:none!important;border:none!important}',
      '.label{background:' + (isDark ? 'rgba(30,30,50,0.9)' : 'rgba(255,255,255,0.9)') + ' !important;border:1px solid ' + (isDark ? '#444' : '#ddd') + ' !important;border-radius:8px !important;padding:3px 8px !important;font-size:11px !important;font-weight:700 !important;color:' + (isDark ? '#fff' : '#333') + ' !important;font-family:system-ui !important;box-shadow:0 2px 8px rgba(0,0,0,0.15) !important}',
      '@keyframes gps{0%,100%{transform:scale(1);opacity:0.6}50%{transform:scale(2);opacity:0}}',
      '.hint{position:fixed;top:10px;left:50%;transform:translateX(-50%);z-index:1000;background:' + (isDark ? 'rgba(30,30,50,0.9)' : 'rgba(255,255,255,0.9)') + ';padding:8px 16px;border-radius:20px;font-size:12px;font-weight:600;color:' + (isDark ? '#a78bfa' : '#6C63FF') + ';font-family:system-ui;box-shadow:0 2px 12px rgba(0,0,0,0.15);border:1px solid ' + (isDark ? '#3a3a4e' : '#e0e0e0') + '}',
      '.my-loc{position:fixed;bottom:16px;right:16px;z-index:1000;width:44px;height:44px;background:' + (isDark ? 'rgba(30,30,50,0.95)' : 'rgba(255,255,255,0.95)') + ';border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 2px 12px rgba(0,0,0,0.2);border:1px solid ' + (isDark ? '#3a3a4e' : '#ddd') + ';font-size:20px}',
      '</style></head><body>',
      '<div class="hint">\ud83d\udccd Xaritaga bosib bino belgilang</div>',
      '<div id="my-loc-btn"></div>',
      '<div id="map"></div>',
      '<script>',
      'var map=L.map("map",{center:[' + NDTU_CENTER.lat + ',' + NDTU_CENTER.lng + '],zoom:' + NDTU.zoom + ',zoomControl:true});',
      'L.tileLayer("' + tile + '",{maxZoom:19}).addTo(map);',
      'L.circle([' + NDTU_CENTER.lat + ',' + NDTU_CENTER.lng + '],{radius:380,color:"#6C63FF",fillColor:"#6C63FF",fillOpacity:0.04,weight:1.5,dashArray:"8,6"}).addTo(map);',
      'var markersLayer = L.layerGroup().addTo(map);',
      'var pendingLayer = L.layerGroup().addTo(map);',
      'var gpsLayer = L.layerGroup().addTo(map);',
      'window.updateMap = function(markers, pending, userLoc, flyToPending) {',
      '  markersLayer.clearLayers(); pendingLayer.clearLayers(); gpsLayer.clearLayers();',
      '  markers.forEach(function(m) {',
      '    var mk = L.marker([m.lat,m.lng],{icon:L.divIcon({className:"cm",',
      '      html:"<div style=\\"width:38px;height:38px;background:"+m.color+";border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:20px;border:3px solid white;box-shadow:0 3px 12px "+m.color+"80;cursor:pointer\\">"+m.icon+"</div>",',
      '      iconSize:[38,38],iconAnchor:[19,19]})}).addTo(markersLayer)',
      '      .bindTooltip(m.name,{permanent:true,direction:"top",offset:[0,-22],className:"label"});',
      '    mk.on("click", function(e){',
      '      L.DomEvent.stopPropagation(e);',
      '      window.ReactNativeWebView.postMessage(JSON.stringify({type:"markerClick", id: m.id}));',
      '    });',
      '  });',
      '  if(pending) {',
      '    L.circleMarker([pending.lat,pending.lng],{radius:8,color:"#FF0000",fillColor:"#FF0000",fillOpacity:0.5,weight:2}).addTo(pendingLayer);',
      '    if(flyToPending) { map.flyTo([pending.lat, pending.lng], 18, { duration: 0.5 }); }',
      '  }',
      '  if(userLoc) {',
      '    L.marker([userLoc.lat,userLoc.lng],{icon:L.divIcon({className:"cm",',
      '      html:"<div style=\\"position:relative\\"><div style=\\"width:18px;height:18px;background:#3B82F6;border-radius:50%;border:3px solid white;box-shadow:0 0 0 6px rgba(59,130,246,0.25),0 2px 8px rgba(0,0,0,0.3)\\"></div><div style=\\"position:absolute;top:-3px;left:-3px;width:24px;height:24px;border-radius:50%;background:rgba(59,130,246,0.2);animation:gps 2s infinite\\"></div></div>",',
      '      iconSize:[18,18],iconAnchor:[9,9]})}).addTo(gpsLayer)',
      '      .bindTooltip("📍 Siz shu yerdasiz",{direction:"top",offset:[0,-14],className:"label"});',
      '    document.getElementById("my-loc-btn").innerHTML = "<div class=\\"my-loc\\" onclick=\\"map.setView([" + userLoc.lat + "," + userLoc.lng + "],18)\\">\ud83d\udccd</div>";',
      '  } else { document.getElementById("my-loc-btn").innerHTML = ""; }',
      '};',
      'map.on("click",function(e){',
      '  var msg=JSON.stringify({type:"mapClick",lat:e.latlng.lat,lng:e.latlng.lng});',
      '  try{window.ReactNativeWebView.postMessage(msg)}catch(err){window.parent.postMessage(msg,"*")}',
      '});',
      '<\/script></body></html>',
    ].join('\n');

    return htmlParts;
  }, [isDark]);

  useEffect(() => {
    if (webviewRef.current) {
      const js = `window.updateMap(${JSON.stringify(markers)}, ${JSON.stringify(pendingCoord)}, ${JSON.stringify(userLocation)}, ${showForm}); true;`;
      webviewRef.current.injectJavaScript(js);
    }
  }, [markers, pendingCoord, userLocation, showForm]);

  const styles = createStyles(colors);

  return (
    <View style={styles.container}>
      {/* Header */}
      {!isEmbedded && (
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <MaterialIcons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>🗺️ Xarita Editor</Text>
          <TouchableOpacity style={styles.exportBtn} onPress={exportCode}>
            <MaterialIcons name="code" size={22} color={colors.primary} />
          </TouchableOpacity>
        </View>
      )}

      {/* Map */}
      <View style={styles.mapContainer}>
        <WebView
          ref={webviewRef}
          source={{ html: mapHTML }}
          style={{ flex: 1 }}
          javaScriptEnabled
          domStorageEnabled
          originWhitelist={['*']}
          onMessage={(event) => {
            try {
              const data = JSON.parse(event.nativeEvent.data);
              handleMapMessage(data);
            } catch {}
          }}
        />
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
              <TouchableOpacity onPress={() => { setShowForm(false); setPendingCoord(null); }}>
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
              <Text style={styles.listTitle}>📍 Belgilangan binolar ({markers.length})</Text>
              <TouchableOpacity onPress={handleAddNewInitiate} style={styles.addNewBtn}>
                <MaterialIcons name="add" size={24} color="#FFF" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
              {markers.length === 0 ? (
                <View style={styles.emptyState}>
                  <MaterialIcons name="touch-app" size={36} color={colors.textMuted} />
                  <Text style={styles.emptyText}>Xaritaga bosib binolarni belgilang</Text>
                </View>
              ) : (
                markers.map((m) => (
                  <View key={m.id} style={styles.markerItem}>
                    <View style={[styles.markerIcon, { backgroundColor: m.color + '20' }]}>
                      <Text style={{ fontSize: 20 }}>{m.icon}</Text>
                    </View>
                    <View style={styles.markerInfo}>
                      <Text style={styles.markerName}>{m.name}</Text>
                      <Text style={styles.markerCoord}>{m.lat.toFixed(5)}, {m.lng.toFixed(5)}</Text>
                    </View>
                    <TouchableOpacity onPress={() => editMarker(m)} style={styles.markerAction}>
                      <MaterialIcons name="edit" size={18} color={colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDeleteMarker(m.id)} style={styles.markerAction}>
                      <MaterialIcons name="delete" size={18} color={colors.error} />
                    </TouchableOpacity>
                  </View>
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

const createStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: 50, paddingHorizontal: spacing.md, paddingBottom: spacing.sm, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  backBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { ...typography.h2, color: colors.textPrimary, flex: 1, textAlign: 'center' },
  exportBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary + '15', justifyContent: 'center', alignItems: 'center' },
  mapContainer: { flex: 1 },
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 10,
  },
  dragHandleContainer: {
    paddingVertical: 20,
    paddingHorizontal: 100,
    alignItems: 'center',
    width: '100%',
  },
  dragHandle: {
    width: 60,
    height: 6,
    backgroundColor: colors.border,
    borderRadius: 3,
  },
  sheetContent: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  listTitle: { ...typography.h3, color: colors.textPrimary },
  addNewBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: borderRadius.md, gap: 4 },
  addNewBtnText: { color: '#FFF', fontSize: 12, fontWeight: '700' },
  list: { flex: 1, paddingHorizontal: spacing.md },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40, gap: 10 },
  emptyText: { ...typography.body, color: colors.textMuted },
  markerItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border, gap: 10 },
  markerIcon: { width: 42, height: 42, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  markerInfo: { flex: 1 },
  markerName: { ...typography.body, color: colors.textPrimary, fontWeight: '600' },
  markerCoord: { ...typography.caption, color: colors.textMuted, fontSize: 11 },
  markerAction: { width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.surfaceLight },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: spacing.lg, paddingBottom: 40, maxHeight: SH * 0.7 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  modalTitle: { ...typography.h2, color: colors.textPrimary },
  coordText: { ...typography.bodySmall, color: colors.accent, marginBottom: spacing.sm, fontWeight: '600' },
  formInput: { height: 50, borderRadius: 12, paddingHorizontal: 16, fontSize: 16, fontWeight: '500', borderWidth: 1, marginBottom: spacing.md },
  formLabel: { ...typography.bodySmall, color: colors.textSecondary, fontWeight: '600', marginBottom: 8 },
  pickerScroll: { marginBottom: spacing.md, maxHeight: 72 },
  iconOption: { alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1.5, borderColor: 'transparent', marginRight: 8, minWidth: 60 },
  iconLabel: { fontSize: 9, marginTop: 2, fontWeight: '600' },
  colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: spacing.lg },
  colorOption: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  colorSelected: { borderWidth: 3, borderColor: 'white', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 4 },
  saveBtn: { borderRadius: 14, overflow: 'hidden' },
  saveBtnGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, gap: 8, borderRadius: 14 },
  saveBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  // Code export
  codeHint: { ...typography.bodySmall, color: colors.textSecondary, marginBottom: spacing.sm },
  codeBox: { borderRadius: 12, padding: 14, maxHeight: 250 },
  codeText: { fontFamily: 'monospace', fontSize: 12, lineHeight: 20 },
});
