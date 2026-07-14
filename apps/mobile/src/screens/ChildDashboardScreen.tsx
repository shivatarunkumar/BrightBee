import React, { useCallback, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView,
  ScrollView, RefreshControl, ActivityIndicator, Modal, TextInput, Alert,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { AppStackParamList } from '../types/navigation';
import { Colors } from '../constants/Colors';
import { childApi, ChildStats, SubjectStat } from '../services/api';

type Props = {
  navigation: NativeStackNavigationProp<AppStackParamList, 'ChildDashboard'>;
  route: RouteProp<AppStackParamList, 'ChildDashboard'>;
};

const SUBJECTS = [
  { key: 'Math',    label: 'Mathematics',      icon: '🔢', color: '#4361EE', bg: '#EEF0FF' },
  { key: 'English', label: 'English',           icon: '📖', color: '#7B2FBE', bg: '#F3E8FF' },
  { key: 'Science', label: 'Science',           icon: '🔬', color: '#0D9488', bg: '#CCFBF1' },
  { key: 'EVS',     label: 'EVS',               icon: '🌿', color: '#16A34A', bg: '#DCFCE7' },
  { key: 'GK',      label: 'General Knowledge', icon: '🌍', color: '#D97706', bg: '#FEF3C7' },
];

const SUGGESTED_ACTIVITIES = [
  { title: 'Hindi',    emoji: '🇮🇳' },
  { title: 'Drawing',  emoji: '🎨' },
  { title: 'Music',    emoji: '🎵' },
  { title: 'Dance',    emoji: '💃' },
  { title: 'Science',  emoji: '🔬' },
  { title: 'Math',     emoji: '🔢' },
  { title: 'English',  emoji: '📖' },
  { title: 'GK',       emoji: '🌍' },
  { title: 'Rhymes',   emoji: '🎤' },
  { title: 'Sports',   emoji: '⚽' },
  { title: 'Computer', emoji: '💻' },
  { title: 'Craft',    emoji: '✂️' },
];

const NURSERY_ACTIVITIES = [
  { id: 'alphabets', title: 'Alphabets', emoji: '🔤', color: '#4361EE', bg: '#EEF0FF', screen: 'AlphabetTracing' },
  { id: 'numbers',   title: 'Numbers',   emoji: '🔢', color: '#0D9488', bg: '#CCFBF1', screen: 'NumberTracing' },
  { id: 'lines',     title: 'Lines',     emoji: '✏️', color: '#D97706', bg: '#FEF3C7', screen: 'LineTracing' },
  { id: 'colours',   title: 'Colours',   emoji: '🎨', color: '#EC4899', bg: '#FDF2F8', screen: 'Colours' },
  { id: 'shapes',    title: 'Shapes',    emoji: '⭕', color: '#8B5CF6', bg: '#F5F3FF', screen: 'ShapeTracing' },
] as const;

const CLASS_LABELS: Record<string, string> = {
  Nursery: 'Nursery', LKG: 'LKG', UKG: 'UKG',
  Class1: 'Class 1', Class2: 'Class 2', Class3: 'Class 3', Class4: 'Class 4', Class5: 'Class 5',
};

function perfLevel(pct: number): { label: string; color: string; bg: string; icon: string } {
  if (pct >= 75) return { label: 'Doing great',   color: '#16A34A', bg: '#F0FDF4', icon: 'checkmark-circle' };
  if (pct >= 50) return { label: 'Getting there', color: '#D97706', bg: '#FFFBEB', icon: 'time-outline' };
  return              { label: 'Needs attention', color: '#DC2626', bg: '#FEF2F2', icon: 'alert-circle' };
}

function scoreColor(pct: number) {
  if (pct >= 75) return '#16A34A';
  if (pct >= 50) return '#D97706';
  return '#DC2626';
}


export default function ChildDashboardScreen({ navigation, route }: Props) {
  const { childId, childName, childClass, avatar } = route.params;

  const [stats, setStats] = useState<ChildStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [customActivities, setCustomActivities] = useState<{ title: string; emoji: string }[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newActivityTitle, setNewActivityTitle] = useState('');
  const [newActivityEmoji, setNewActivityEmoji] = useState('');

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const statsData = await childApi.stats(childId);
      setStats(statsData);
    } catch (err: any) {
      console.error('[ChildDashboard] fetch error:', err?.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [childId]);

  useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));

  const goToSubject = (sub: typeof SUBJECTS[number]) => {
    navigation.navigate('SubjectDetail', {
      childId, childName, childClass,
      subject: sub.key, subjectIcon: sub.icon, subjectColor: sub.color,
    });
  };

  const addCustomActivity = () => {
    const title = newActivityTitle.trim();
    if (!title) { Alert.alert('Please enter an activity name'); return; }
    setCustomActivities(prev => [...prev, { title, emoji: newActivityEmoji.trim() || '📌' }]);
    setNewActivityTitle('');
    setNewActivityEmoji('');
    setShowAddModal(false);
  };

  const isYoungChild = ['Nursery', 'LKG', 'UKG'].includes(childClass);

  const subjectStatMap: Record<string, SubjectStat> = {};
  stats?.subject_stats.forEach((s) => { subjectStatMap[s.subject] = s; });

  const needsAttention = SUBJECTS.filter((s) => {
    const st = subjectStatMap[s.key];
    return st && st.avg_percentage < 60;
  });

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color={Colors.darkText} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{childName}'s Report</Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('ChildHistory', { childId, childName })}
          style={styles.historyBtn} activeOpacity={0.7}
        >
          <Ionicons name="time-outline" size={22} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchData(true)} tintColor={Colors.primary} />}
      >
        {/* Profile card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarEmoji}>{avatar}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.childName}>{childName}</Text>
            <Text style={styles.childClass}>{CLASS_LABELS[childClass] ?? childClass}</Text>
          </View>
          {stats && stats.streak_count > 0 && (
            <View style={styles.streakBadge}>
              <Text style={styles.streakText}>🔥 {stats.streak_count} days</Text>
            </View>
          )}
        </View>

{/* nothing — nursery activities shown below inline */}

        {loading ? (
          <View style={styles.loadingBox}><ActivityIndicator color={Colors.primary} size="large" /></View>
        ) : (
          <>
            {/* Overall stats — "Tests taken" is tappable → goes to full history */}
            {stats && stats.total_tests > 0 ? (
              <View style={styles.statsRow}>
                <TouchableOpacity
                  style={styles.statCard}
                  onPress={() => navigation.navigate('ChildHistory', { childId, childName })}
                  activeOpacity={0.8}
                >
                  <Text style={styles.statNum}>{stats.total_tests}</Text>
                  <Text style={styles.statLbl}>Tests taken</Text>
                  <Ionicons name="chevron-forward" size={12} color={Colors.primary} style={{ marginTop: 2 }} />
                </TouchableOpacity>
                <View style={styles.statCard}>
                  <Text style={[styles.statNum, { color: scoreColor(stats.avg_percentage) }]}>
                    {Math.round(stats.avg_percentage)}%
                  </Text>
                  <Text style={styles.statLbl}>Overall avg</Text>
                </View>
                <View style={styles.statCard}>
                  <Text style={styles.statNum}>
                    {SUBJECTS.find(s => s.key === stats.best_subject)?.icon ?? '🏅'}
                  </Text>
                  <Text style={styles.statLbl}>{stats.best_subject ?? '—'}</Text>
                </View>
              </View>
            ) : (
              <View style={styles.noTestsBanner}>
                <Text style={styles.noTestsEmoji}>📊</Text>
                <Text style={styles.noTestsText}>No tests yet. Tap a subject below to begin!</Text>
              </View>
            )}

            {/* Needs attention */}
            {needsAttention.length > 0 && (
              <View style={styles.alertCard}>
                <View style={styles.alertHeader}>
                  <Ionicons name="alert-circle" size={18} color="#DC2626" />
                  <Text style={styles.alertTitle}>Needs Attention</Text>
                </View>
                {needsAttention.map((s) => {
                  const st = subjectStatMap[s.key];
                  return (
                    <TouchableOpacity key={s.key} onPress={() => goToSubject(s)} style={styles.alertRow} activeOpacity={0.8}>
                      <Text style={styles.alertIcon}>{s.icon}</Text>
                      <Text style={styles.alertSubject}>{s.label}</Text>
                      <Text style={styles.alertScore}>{Math.round(st.avg_percentage)}% avg</Text>
                      <Ionicons name="chevron-forward" size={14} color="#DC2626" />
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {isYoungChild ? (
              <>
                {/* Nursery activity grid */}
                <Text style={styles.sectionTitle}>Learning Activities</Text>
                <View style={styles.activityGrid}>
                  {NURSERY_ACTIVITIES.map((act) => (
                    <TouchableOpacity
                      key={act.id}
                      style={[styles.activityCard, { backgroundColor: act.bg }]}
                      onPress={() => navigation.navigate(act.screen as any, { childName })}
                      activeOpacity={0.85}
                    >
                      <Text style={styles.activityEmoji}>{act.emoji}</Text>
                      <Text style={[styles.activityTitle, { color: act.color }]}>{act.title}</Text>
                    </TouchableOpacity>
                  ))}
                  {customActivities.map((ca, i) => (
                    <TouchableOpacity
                      key={`custom-${i}`}
                      style={[styles.activityCard, { backgroundColor: '#F8F9FF', borderWidth: 1.5, borderColor: Colors.border }]}
                      onLongPress={() => {
                        Alert.alert('Remove Activity', `Remove "${ca.title}"?`, [
                          { text: 'Cancel', style: 'cancel' },
                          { text: 'Remove', style: 'destructive', onPress: () => setCustomActivities(prev => prev.filter((_, j) => j !== i)) },
                        ]);
                      }}
                      activeOpacity={0.85}
                    >
                      <Text style={styles.activityEmoji}>{ca.emoji}</Text>
                      <Text style={[styles.activityTitle, { color: Colors.darkText }]}>{ca.title}</Text>
                    </TouchableOpacity>
                  ))}
                  <TouchableOpacity
                    style={styles.addActivityCard}
                    onPress={() => setShowAddModal(true)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.addActivityPlus}>+</Text>
                    <Text style={styles.addActivityLabel}>Add Activity</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                {/* Subject grid for older kids */}
                <Text style={styles.sectionTitle}>Subjects</Text>
                <View style={styles.subjectGrid}>
                  {SUBJECTS.map((sub) => {
                    const st = subjectStatMap[sub.key];
                    const perf = st ? perfLevel(st.avg_percentage) : null;
                    return (
                      <TouchableOpacity
                        key={sub.key}
                        style={[styles.subjectCard, { backgroundColor: sub.bg }]}
                        onPress={() => goToSubject(sub)}
                        activeOpacity={0.85}
                      >
                        <Text style={styles.subjectCardIcon}>{sub.icon}</Text>
                        <Text style={styles.subjectCardLabel}>{sub.label}</Text>
                        {st ? (
                          <>
                            <Text style={[styles.subjectAvg, { color: scoreColor(st.avg_percentage) }]}>
                              {Math.round(st.avg_percentage)}%
                            </Text>
                            <View style={[styles.perfBadge, { backgroundColor: perf!.bg }]}>
                              <Ionicons name={perf!.icon as any} size={10} color={perf!.color} />
                              <Text style={[styles.perfBadgeText, { color: perf!.color }]}>{perf!.label}</Text>
                            </View>
                            <Text style={styles.subjectTests}>{st.tests} test{st.tests !== 1 ? 's' : ''}</Text>
                          </>
                        ) : (
                          <View style={styles.noTestBadge}>
                            <Text style={styles.noTestBadgeText}>No tests yet</Text>
                          </View>
                        )}
                        <TouchableOpacity
                          style={[styles.startBtn, { backgroundColor: sub.color }]}
                          activeOpacity={0.85}
                          onPress={() => navigation.navigate('TestConfig', { childId, childName, childClass, subject: sub.key })}
                        >
                          <Text style={styles.startBtnText}>Start Test</Text>
                        </TouchableOpacity>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </>
            )}

          </>
        )}
      </ScrollView>

      {/* Add Custom Activity Modal */}
      <Modal visible={showAddModal} transparent animationType="slide" onRequestClose={() => setShowAddModal(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowAddModal(false)}>
          <TouchableOpacity style={styles.modalSheet} activeOpacity={1} onPress={() => {}}>
            <Text style={styles.modalTitle}>Add Activity</Text>
            <Text style={styles.modalSubtitle}>Choose from suggestions or type your own</Text>

            {/* Suggested activities */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.suggestionsScroll} contentContainerStyle={styles.suggestionsInner}>
              {SUGGESTED_ACTIVITIES.map((s) => (
                <TouchableOpacity
                  key={s.title}
                  style={[styles.suggestionChip, newActivityTitle === s.title && { backgroundColor: Colors.primary, borderColor: Colors.primary }]}
                  onPress={() => { setNewActivityTitle(s.title); setNewActivityEmoji(s.emoji); }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.suggestionEmoji}>{s.emoji}</Text>
                  <Text style={[styles.suggestionLabel, newActivityTitle === s.title && { color: '#fff' }]}>{s.title}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.modalLabel}>Or type a custom name</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. Hindi, Drawing, Music…"
              placeholderTextColor={Colors.subtitle}
              value={newActivityTitle}
              onChangeText={(t) => { setNewActivityTitle(t); setNewActivityEmoji(''); }}
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => { setShowAddModal(false); setNewActivityTitle(''); setNewActivityEmoji(''); }} activeOpacity={0.8}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalAddBtn} onPress={addCustomActivity} activeOpacity={0.85}>
                <Text style={styles.modalAddText}>Add Activity</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FF' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
    backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  backBtn: { padding: 6 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: Colors.darkText },
  historyBtn: { padding: 6 },
  scroll: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 48 },

  profileCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: Colors.white, borderRadius: 18, padding: 16, marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: 4, elevation: 2,
  },
  avatarCircle: { width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.primaryLight, justifyContent: 'center', alignItems: 'center' },
  avatarEmoji: { fontSize: 28 },
  childName: { fontSize: 17, fontWeight: '700', color: Colors.darkText },
  childClass: { fontSize: 12, color: Colors.subtitle, marginTop: 2 },
  streakBadge: { backgroundColor: '#FEF3C7', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  streakText: { fontSize: 12, fontWeight: '600', color: '#D97706' },

  activityGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 28 },
  activityCard: {
    width: '47%', borderRadius: 20, padding: 18, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  activityEmoji: { fontSize: 38, marginBottom: 8 },
  activityTitle: { fontSize: 14, fontWeight: '800', textAlign: 'center' },
  addActivityCard: {
    width: '47%', borderRadius: 20, padding: 18, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: Colors.border, borderStyle: 'dashed',
    backgroundColor: Colors.white,
  },
  addActivityPlus: { fontSize: 32, color: Colors.primary, fontWeight: '300', lineHeight: 38 },
  addActivityLabel: { fontSize: 13, fontWeight: '700', color: Colors.primary, marginTop: 4 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: Colors.white, borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 28, paddingBottom: 40,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: Colors.darkText, marginBottom: 4 },
  modalSubtitle: { fontSize: 13, color: Colors.subtitle, marginBottom: 22, lineHeight: 18 },
  suggestionsScroll: { marginBottom: 18 },
  suggestionsInner: { gap: 8, paddingVertical: 4 },
  suggestionChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 50,
    borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.white,
  },
  suggestionEmoji: { fontSize: 16 },
  suggestionLabel: { fontSize: 13, fontWeight: '700', color: Colors.darkText },
  modalLabel: { fontSize: 13, fontWeight: '700', color: Colors.darkText, marginBottom: 6 },
  modalInput: {
    borderWidth: 1.5, borderColor: Colors.border, borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 12, fontSize: 15, color: Colors.darkText,
    marginBottom: 16,
  },
  modalBtnRow: { flexDirection: 'row', gap: 12, marginTop: 4 },
  modalCancelBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 50, alignItems: 'center',
    borderWidth: 2, borderColor: Colors.border,
  },
  modalCancelText: { fontSize: 14, fontWeight: '700', color: Colors.subtitle },
  modalAddBtn: { flex: 2, paddingVertical: 14, borderRadius: 50, alignItems: 'center', backgroundColor: Colors.primary },
  modalAddText: { fontSize: 14, fontWeight: '800', color: '#fff' },

  loadingBox: { paddingVertical: 60, alignItems: 'center' },

  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statCard: {
    flex: 1, backgroundColor: Colors.white, borderRadius: 14, paddingVertical: 14,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3, elevation: 2,
  },
  statNum: { fontSize: 20, fontWeight: '800', color: Colors.darkText },
  statLbl: { fontSize: 10, color: Colors.subtitle, marginTop: 3, textAlign: 'center' },

  noTestsBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: Colors.primaryLight, borderRadius: 14, padding: 14, marginBottom: 16,
  },
  noTestsEmoji: { fontSize: 22 },
  noTestsText: { fontSize: 13, color: Colors.primary, fontWeight: '600', flex: 1 },

  alertCard: {
    backgroundColor: '#FEF2F2', borderRadius: 14, padding: 14, marginBottom: 20,
    borderWidth: 1, borderColor: '#FECACA',
  },
  alertHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  alertTitle: { fontSize: 14, fontWeight: '700', color: '#DC2626' },
  alertRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
  alertIcon: { fontSize: 16 },
  alertSubject: { flex: 1, fontSize: 13, fontWeight: '600', color: Colors.darkText },
  alertScore: { fontSize: 13, fontWeight: '700', color: '#DC2626' },

  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.darkText, marginBottom: 12 },
  subjectGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 28 },
  subjectCard: {
    width: '47%', borderRadius: 20, padding: 16, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  subjectCardIcon: { fontSize: 34, marginBottom: 6 },
  subjectCardLabel: { fontSize: 13, fontWeight: '700', color: Colors.darkText, textAlign: 'center', marginBottom: 8 },
  subjectAvg: { fontSize: 22, fontWeight: '900', marginBottom: 4 },
  perfBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, marginBottom: 4 },
  perfBadgeText: { fontSize: 10, fontWeight: '700' },
  subjectTests: { fontSize: 10, color: Colors.subtitle, marginBottom: 12 },
  noTestBadge: { backgroundColor: '#F1F5F9', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, marginBottom: 12 },
  noTestBadgeText: { fontSize: 10, color: Colors.subtitle, fontWeight: '600' },
  startBtn: { width: '100%', paddingVertical: 9, borderRadius: 50, alignItems: 'center' },
  startBtnText: { color: Colors.white, fontSize: 12, fontWeight: '700' },

});
