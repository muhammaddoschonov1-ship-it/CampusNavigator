import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, Alert, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { getFullSchedule, addClassToSchedule, updateClassInSchedule, deleteClassFromSchedule } from '../api/scheduleService';
import { spacing, borderRadius, typography } from '../theme/colors';

export default function ScheduleAdminTab({ colors }) {
  const [scheduleData, setScheduleData] = useState({});
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState('');
  const [selectedDay, setSelectedDay] = useState('1'); // 1=Dushanba
  const [isLoading, setIsLoading] = useState(false);

  // Group selection states
  const [groupModalVisible, setGroupModalVisible] = useState(false);
  const [groupSearch, setGroupSearch] = useState('');

  // Form states
  const [modalVisible, setModalVisible] = useState(false);
  const [classId, setClassId] = useState(null);
  const [subject, setSubject] = useState('');
  const [time, setTime] = useState('');
  const [room, setRoom] = useState('');
  const [type, setType] = useState('Ma\'ruza');

  const daysList = [
    { id: '1', label: 'Dushanba' },
    { id: '2', label: 'Seshanba' },
    { id: '3', label: 'Chorshanba' },
    { id: '4', label: 'Payshanba' },
    { id: '5', label: 'Juma' },
    { id: '6', label: 'Shanba' },
  ];

  useEffect(() => {
    loadSchedule();
  }, []);

  const loadSchedule = async () => {
    setIsLoading(true);
    const res = await getFullSchedule();
    if (res.success) {
      const data = res.data || {};
      setScheduleData(data);
      const groupKeys = Object.keys(data).filter(k => k !== 'default');
      setGroups(['default', ...groupKeys]);
      if (!selectedGroup) setSelectedGroup('default');
    }
    setIsLoading(false);
  };

  const handleOpenModal = (item = null) => {
    if (item) {
      setClassId(item.id);
      setSubject(item.subject);
      setTime(item.time);
      setRoom(item.room);
      setType(item.type);
    } else {
      setClassId(null);
      setSubject('');
      setTime('08:30 - 09:50');
      setRoom('');
      setType('Ma\'ruza');
    }
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!subject.trim() || !time.trim() || !room.trim()) {
      Alert.alert('Xatolik', 'Barcha maydonlarni to\'ldiring');
      return;
    }
    const [start, end] = time.split('-');
    const classData = {
      subject: subject.trim(),
      time: time.trim(),
      room: room.trim(),
      type,
      startTime: start ? start.trim() : '',
      endTime: end ? end.trim() : ''
    };

    setIsLoading(true);
    if (classId) {
      const res = await updateClassInSchedule(selectedGroup, selectedDay, classId, classData);
      if (res.success) {
        setModalVisible(false);
        loadSchedule();
      } else {
        Alert.alert('Xato', res.error);
      }
    } else {
      const res = await addClassToSchedule(selectedGroup, selectedDay, classData);
      if (res.success) {
        setModalVisible(false);
        loadSchedule();
      } else {
        Alert.alert('Xato', res.error);
      }
    }
    setIsLoading(false);
  };

  const handleDelete = (id) => {
    Alert.alert("O'chirish", "Ushbu darsni o'chirmoqchimisiz?", [
      { text: "Bekor qilish", style: "cancel" },
      {
        text: "O'chirish", style: "destructive", onPress: async () => {
          setIsLoading(true);
          await deleteClassFromSchedule(selectedGroup, selectedDay, id);
          loadSchedule();
          setIsLoading(false);
        }
      }
    ]);
  };

  const currentClasses = (scheduleData[selectedGroup] && scheduleData[selectedGroup][selectedDay]) || [];

  return (
    <View style={styles.container}>
      {isLoading && (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}

      {/* Guruh tanlash */}
      <View style={styles.groupSelector}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>Guruhni tanlang:</Text>
        <TouchableOpacity
          style={[styles.dropdownBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => setGroupModalVisible(true)}
        >
          <Text style={[styles.dropdownBtnText, { color: colors.textPrimary }]}>
            {selectedGroup === 'default' ? 'Guruhlar' : selectedGroup || 'Guruhni tanlang'}
          </Text>
          <MaterialIcons name="arrow-drop-down" size={24} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Kun tanlash */}
      <View style={styles.daySelector}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {daysList.map(d => (
            <TouchableOpacity
              key={d.id}
              style={[styles.dayChip, selectedDay === d.id ? { borderBottomColor: colors.primary } : { borderBottomColor: 'transparent' }]}
              onPress={() => setSelectedDay(d.id)}
            >
              <Text style={[styles.dayText, { color: selectedDay === d.id ? colors.primary : colors.textMuted }]}>{d.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.actionRow}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{daysList.find(d => d.id === selectedDay)?.label} darslari</Text>
        <TouchableOpacity style={[styles.addBtn, { backgroundColor: colors.primary }]} onPress={() => handleOpenModal()}>
          <MaterialIcons name="add" size={22} color="#FFF" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
        {currentClasses.length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>Bu kunda darslar yo'q</Text>
        ) : (
          currentClasses.map((item) => (
            <View key={item.id} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={[styles.cardIcon, { backgroundColor: colors.primary + '15' }]}>
                <MaterialIcons name="event-note" size={24} color={colors.primary} />
              </View>
              <View style={styles.cardContent}>
                <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>{item.subject}</Text>
                <Text style={[styles.cardMeta, { color: colors.textSecondary }]}>{item.time} • {item.room}</Text>
                <Text style={[styles.cardType, { color: colors.accent }]}>{item.type}</Text>
              </View>
              <View style={styles.cardActions}>
                <TouchableOpacity style={styles.actionBtn} onPress={() => handleOpenModal(item)}>
                  <MaterialIcons name="edit" size={20} color={colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionBtn} onPress={() => handleDelete(item.id)}>
                  <MaterialIcons name="delete" size={20} color={colors.error} />
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Modal Form */}
      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <Text style={[styles.modalHeader, { color: colors.textPrimary }]}>{classId ? 'Darsni tahrirlash' : 'Yangi dars'}</Text>

            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Fan nomi</Text>
            <TextInput style={[styles.input, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.border }]} value={subject} onChangeText={setSubject} placeholder="Masalan: Fizika" placeholderTextColor={colors.textMuted} />

            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Vaqti (Masalan: 08:30 - 09:50)</Text>
            <TextInput style={[styles.input, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.border }]} value={time} onChangeText={setTime} placeholder="08:30 - 09:50" placeholderTextColor={colors.textMuted} />

            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Xona</Text>
            <TextInput style={[styles.input, { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.border }]} value={room} onChangeText={setRoom} placeholder="205-Auditoriya" placeholderTextColor={colors.textMuted} />

            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Dars turi</Text>
            <View style={styles.typeRow}>
              {['Ma\'ruza', 'Amaliyot', 'Laboratoriya'].map(t => (
                <TouchableOpacity key={t} style={[styles.typeBtn, type === t ? { backgroundColor: colors.primary } : { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => setType(t)}>
                  <Text style={[styles.typeBtnText, { color: type === t ? '#FFF' : colors.textPrimary }]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: colors.surface }]} onPress={() => setModalVisible(false)}>
                <Text style={[styles.modalBtnText, { color: colors.textPrimary }]}>Bekor qilish</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: colors.primary }]} onPress={handleSave}>
                <Text style={[styles.modalBtnText, { color: '#FFF' }]}>Saqlash</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Guruh Tanlash Modali */}
      <Modal visible={groupModalVisible} transparent animationType="fade" onRequestClose={() => setGroupModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background, maxHeight: '80%' }]}>
            <Text style={[styles.modalHeader, { color: colors.textPrimary, marginBottom: 10 }]}>Guruhni tanlang</Text>

            <View style={[styles.searchBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <MaterialIcons name="search" size={20} color={colors.textMuted} />
              <TextInput
                style={[styles.searchInput, { color: colors.textPrimary }]}
                placeholder="Guruhni qidirish yoki yangi yozish..."
                placeholderTextColor={colors.textMuted}
                value={groupSearch}
                onChangeText={setGroupSearch}
              />
            </View>

            <ScrollView style={{ marginTop: 10 }}>
              {groups
                .filter(g => g.toLowerCase().includes(groupSearch.toLowerCase()) || (g === 'default' && 'guruhlar'.includes(groupSearch.toLowerCase())))
                .map(g => (
                  <TouchableOpacity
                    key={g}
                    style={[styles.groupItem, { borderBottomColor: colors.border }]}
                    onPress={() => {
                      setSelectedGroup(g);
                      setGroupModalVisible(false);
                      setGroupSearch('');
                    }}
                  >
                    <Text style={[styles.groupItemText, { color: selectedGroup === g ? colors.primary : colors.textPrimary, fontWeight: selectedGroup === g ? '700' : '400' }]}>
                      {g === 'default' ? 'Guruhlar' : g}
                    </Text>
                    {selectedGroup === g && <MaterialIcons name="check" size={20} color={colors.primary} />}
                  </TouchableOpacity>
                ))}

              {/* Agar qidiruv natijasida guruh topilmasa, shuni o'zini qo'shish tugmasi */}
              {groupSearch.trim().length > 0 && !groups.some(g => g.toLowerCase() === groupSearch.toLowerCase()) && (
                <TouchableOpacity
                  style={[styles.groupItem, { borderBottomColor: colors.border }]}
                  onPress={() => {
                    setSelectedGroup(groupSearch.trim());
                    if (!groups.includes(groupSearch.trim())) {
                      setGroups([...groups, groupSearch.trim()]);
                    }
                    setGroupModalVisible(false);
                    setGroupSearch('');
                  }}
                >
                  <MaterialIcons name="add-circle-outline" size={20} color={colors.primary} style={{ marginRight: 10 }} />
                  <Text style={[styles.groupItemText, { color: colors.primary, fontWeight: '600' }]}>
                    "{groupSearch}" guruhini yaratish/tanlash
                  </Text>
                </TouchableOpacity>
              )}
            </ScrollView>

            <TouchableOpacity style={[styles.modalBtn, { backgroundColor: colors.surface, marginTop: 15 }]} onPress={() => setGroupModalVisible(false)}>
              <Text style={[styles.modalBtnText, { color: colors.textPrimary }]}>Yopish</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 10 },
  loader: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', zIndex: 10, backgroundColor: 'rgba(255,255,255,0.7)' },
  groupSelector: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md, paddingHorizontal: spacing.md },
  label: { ...typography.bodySmall, fontWeight: '600', marginRight: spacing.sm },
  dropdownBtn: { flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 15, paddingVertical: 10, borderWidth: 1, borderRadius: borderRadius.md },
  dropdownBtnText: { ...typography.body, fontWeight: '600' },
  searchBox: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: borderRadius.md, paddingHorizontal: 10, height: 45 },
  searchInput: { flex: 1, marginLeft: 8, ...typography.body },
  groupItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1 },
  groupItemText: { ...typography.body },
  daySelector: { borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)', marginBottom: spacing.md },
  dayChip: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 2 },
  dayText: { ...typography.bodySmall, fontWeight: '700' },
  actionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.md, marginBottom: spacing.sm },
  sectionTitle: { ...typography.h3 },
  addBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', elevation: 2 },
  list: { paddingHorizontal: spacing.md, paddingBottom: 100 },
  emptyText: { textAlign: 'center', marginTop: 30, ...typography.body },
  card: { flexDirection: 'row', padding: spacing.md, borderRadius: borderRadius.lg, borderWidth: 1, marginBottom: spacing.sm, alignItems: 'center' },
  cardIcon: { width: 44, height: 44, borderRadius: borderRadius.sm, justifyContent: 'center', alignItems: 'center', marginRight: spacing.md },
  cardContent: { flex: 1 },
  cardTitle: { ...typography.h3, marginBottom: 2 },
  cardMeta: { ...typography.caption, marginBottom: 2 },
  cardType: { ...typography.caption, fontWeight: '700' },
  cardActions: { flexDirection: 'row', gap: 10 },
  actionBtn: { padding: 5 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '90%', borderRadius: borderRadius.xl, padding: spacing.lg, elevation: 5 },
  modalHeader: { ...typography.h2, marginBottom: spacing.lg },
  inputLabel: { ...typography.caption, fontWeight: '600', marginBottom: 5 },
  input: { borderWidth: 1, borderRadius: borderRadius.md, padding: spacing.sm, marginBottom: spacing.md, ...typography.body },
  typeRow: { flexDirection: 'row', gap: 10, marginBottom: spacing.lg },
  typeBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: borderRadius.md, borderWidth: 1 },
  typeBtnText: { ...typography.caption, fontWeight: '700' },
  modalActions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md },
  modalBtn: { flex: 1, paddingVertical: 14, alignItems: 'center', borderRadius: borderRadius.lg },
  modalBtnText: { ...typography.body, fontWeight: '700' }
});
