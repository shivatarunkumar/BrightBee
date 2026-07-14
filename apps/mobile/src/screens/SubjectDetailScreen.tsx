import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView,
  ScrollView, RefreshControl, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { AppStackParamList } from '../types/navigation';
import { Colors } from '../constants/Colors';
import { childApi, testApi, TestHistoryItem } from '../services/api';

type Props = {
  navigation: NativeStackNavigationProp<AppStackParamList, 'SubjectDetail'>;
  route: RouteProp<AppStackParamList, 'SubjectDetail'>;
};

const SUBJECTS = [
  { key: 'Math',    label: 'Math',    icon: '🔢', color: '#4361EE', bg: '#EEF0FF' },
  { key: 'English', label: 'English', icon: '📖', color: '#7B2FBE', bg: '#F3E8FF' },
  { key: 'Science', label: 'Science', icon: '🔬', color: '#0D9488', bg: '#CCFBF1' },
  { key: 'EVS',     label: 'EVS',     icon: '🌿', color: '#16A34A', bg: '#DCFCE7' },
  { key: 'GK',      label: 'GK',      icon: '🌍', color: '#D97706', bg: '#FEF3C7' },
];

const DIFF_COLORS: Record<string, string> = {
  Easy: '#16A34A', Medium: '#D97706', Hard: '#DC2626',
};

function scoreColor(pct: number) {
  if (pct >= 75) return '#16A34A';
  if (pct >= 50) return '#D97706';
  return '#DC2626';
}

function perfSummary(pct: number) {
  if (pct >= 80) return { label: 'Excellent',  color: '#16A34A', bg: '#F0FDF4', desc: 'Fantastic — keep it up!' };
  if (pct >= 65) return { label: 'Good',        color: '#2563EB', bg: '#EFF6FF', desc: 'Solid performance, room to grow.' };
  if (pct >= 50) return { label: 'Average',     color: '#D97706', bg: '#FFFBEB', desc: 'A little more practice will help.' };
  return              { label: 'Needs work',    color: '#DC2626', bg: '#FEF2F2', desc: 'Focus here — extra practice needed.' };
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}
function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

export default function SubjectDetailScreen({ navigation, route }: Props) {
  const { childId, childName, childClass } = route.params;

  const [activeSubject, setActiveSubject] = useState(route.params.subject);
  const [allHistory, setAllHistory] = useState<TestHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingTestId, setLoadingTestId] = useState<string | null>(null);

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const data = await childApi.history(childId);
      setAllHistory(data);
    } catch (err: any) {
      console.error('[SubjectDetail] fetch error:', err?.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [childId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleViewTest = async (testId: string) => {
    setLoadingTestId(testId);
    try {
      const result = await testApi.results(testId);
      navigation.navigate('Results', {
        testId: result.test_id, score: result.score,
        total: result.total, percentage: result.percentage, results: result.results,
      });
    } catch (err: any) {
      console.error('[SubjectDetail] load result error:', err?.message);
    } finally {
      setLoadingTestId(null);
    }
  };

  const activeSub = SUBJECTS.find(s => s.key === activeSubject)!;
  const history = allHistory.filter(t => t.subject === activeSubject);

  const totalTests = history.length;
  const avgPct = totalTests > 0
    ? Math.round(history.reduce((s, t) => s + t.percentage, 0) / totalTests)
    : 0;
  const bestPct = totalTests > 0 ? Math.round(Math.max(...history.map(t => t.percentage))) : 0;
  const perf = totalTests > 0 ? perfSummary(avgPct) : null;

  // Per-difficulty breakdown
  const diffStats: Record<string, { tests: number; totalPct: number }> = {};
  history.forEach(t => {
    if (!diffStats[t.difficulty]) diffStats[t.difficulty] = { tests: 0, totalPct: 0 };
    diffStats[t.difficulty].tests++;
    diffStats[t.difficulty].totalPct += t.percentage;
  });

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: activeSub.color }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerIcon}>{activeSub.icon}</Text>
          <View>
            <Text style={styles.headerTitle}>{childName}'s Subjects</Text>
            <Text style={styles.headerSub}>Tap a subject to switch</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.newTestBtn}
          onPress={() => navigation.navigate('TestConfig', { childId, childName, childClass, subject: activeSubject })}
          activeOpacity={0.85}
        >
          <Text style={styles.newTestBtnText}>+ Test</Text>
        </TouchableOpacity>
      </View>

      {/* Subject tab bar */}
      <View style={styles.tabBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabBarInner}>
          {SUBJECTS.map(sub => {
            const subHistory = allHistory.filter(t => t.subject === sub.key);
            const subAvg = subHistory.length > 0
              ? Math.round(subHistory.reduce((s, t) => s + t.percentage, 0) / subHistory.length)
              : null;
            const isActive = sub.key === activeSubject;
            return (
              <TouchableOpacity
                key={sub.key}
                style={[styles.tab, isActive && { borderBottomColor: activeSub.color, borderBottomWidth: 3 }]}
                onPress={() => setActiveSubject(sub.key)}
                activeOpacity={0.8}
              >
                <Text style={styles.tabIcon}>{sub.icon}</Text>
                <Text style={[styles.tabLabel, isActive && { color: activeSub.color, fontWeight: '700' }]}>
                  {sub.label}
                </Text>
                {subAvg !== null ? (
                  <Text style={[styles.tabAvg, { color: scoreColor(subAvg) }]}>{subAvg}%</Text>
                ) : (
                  <Text style={styles.tabNoData}>—</Text>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchData(true)} tintColor={activeSub.color} />}
      >
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={activeSub.color} />
          </View>
        ) : totalTests === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>{activeSub.icon}</Text>
            <Text style={styles.emptyTitle}>No {activeSub.key} tests yet</Text>
            <Text style={styles.emptySubtitle}>
              Start a test to track {childName}'s progress in {activeSub.key}.
            </Text>
            <TouchableOpacity
              style={[styles.emptyStartBtn, { backgroundColor: activeSub.color }]}
              onPress={() => navigation.navigate('TestConfig', { childId, childName, childClass, subject: activeSubject })}
              activeOpacity={0.85}
            >
              <Text style={styles.emptyStartBtnText}>Start First Test</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Summary card */}
            <View style={[styles.summaryCard, { backgroundColor: perf!.bg }]}>
              <View style={styles.summaryTop}>
                <View>
                  <Text style={[styles.summaryAvg, { color: scoreColor(avgPct) }]}>{avgPct}%</Text>
                  <Text style={styles.summaryAvgLbl}>Average score</Text>
                </View>
                <View style={[styles.perfPill, { backgroundColor: perf!.color + '22' }]}>
                  <Text style={[styles.perfPillText, { color: perf!.color }]}>{perf!.label}</Text>
                </View>
              </View>
              <Text style={[styles.summaryDesc, { color: perf!.color }]}>{perf!.desc}</Text>
              <View style={styles.summaryStats}>
                <View style={styles.summaryStatItem}>
                  <Text style={styles.summaryStatNum}>{totalTests}</Text>
                  <Text style={styles.summaryStatLbl}>Tests</Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryStatItem}>
                  <Text style={[styles.summaryStatNum, { color: '#16A34A' }]}>{bestPct}%</Text>
                  <Text style={styles.summaryStatLbl}>Best</Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryStatItem}>
                  <Text style={[styles.summaryStatNum, { color: scoreColor(avgPct) }]}>{avgPct}%</Text>
                  <Text style={styles.summaryStatLbl}>Avg</Text>
                </View>
              </View>
            </View>

            {/* By difficulty */}
            {Object.keys(diffStats).length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Performance by Difficulty</Text>
                <View style={styles.diffRow}>
                  {['Easy', 'Medium', 'Hard'].map(diff => {
                    const ds = diffStats[diff];
                    if (!ds) return null;
                    const avg = Math.round(ds.totalPct / ds.tests);
                    return (
                      <View key={diff} style={styles.diffCard}>
                        <Text style={[styles.diffName, { color: DIFF_COLORS[diff] }]}>{diff}</Text>
                        <Text style={[styles.diffPct, { color: scoreColor(avg) }]}>{avg}%</Text>
                        <Text style={styles.diffTests}>{ds.tests} test{ds.tests !== 1 ? 's' : ''}</Text>
                        <View style={styles.diffBar}>
                          <View style={[styles.diffBarFill, { width: `${avg}%`, backgroundColor: DIFF_COLORS[diff] }]} />
                        </View>
                      </View>
                    );
                  })}
                </View>
              </>
            )}

            {/* All tests */}
            <Text style={styles.sectionTitle}>All Tests  ({totalTests})</Text>
            {history.map((item, idx) => {
              const pct = Math.round(item.percentage);
              const isLoading = loadingTestId === item.test_id;
              return (
                <TouchableOpacity
                  key={item.test_id}
                  style={styles.testCard}
                  onPress={() => handleViewTest(item.test_id)}
                  activeOpacity={0.85}
                  disabled={isLoading}
                >
                  <View style={[styles.testIndex, { backgroundColor: activeSub.color + '22' }]}>
                    <Text style={[styles.testIndexNum, { color: activeSub.color }]}>#{totalTests - idx}</Text>
                  </View>
                  <View style={styles.testMeta}>
                    <Text style={styles.testDate}>{formatDate(item.completed_at)}</Text>
                    <Text style={styles.testTime}>{formatTime(item.completed_at)}</Text>
                    <View style={[styles.diffTag, { backgroundColor: DIFF_COLORS[item.difficulty] + '22' }]}>
                      <Text style={[styles.diffTagText, { color: DIFF_COLORS[item.difficulty] }]}>{item.difficulty}</Text>
                    </View>
                  </View>
                  <View style={styles.testScore}>
                    <Text style={[styles.testPct, { color: scoreColor(pct) }]}>{pct}%</Text>
                    <Text style={styles.testFrac}>{item.score}/{item.total}</Text>
                  </View>
                  {isLoading
                    ? <ActivityIndicator size="small" color={Colors.subtitle} style={{ marginLeft: 8 }} />
                    : <Ionicons name="chevron-forward" size={18} color={Colors.subtitle} style={{ marginLeft: 8 }} />
                  }
                  {/* Score bar at bottom */}
                  <View style={styles.testBarWrap}>
                    <View style={[styles.testBarFill, { width: `${pct}%`, backgroundColor: scoreColor(pct) }]} />
                  </View>
                </TouchableOpacity>
              );
            })}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FF' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
  },
  backBtn: { padding: 6 },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, marginLeft: 4 },
  headerIcon: { fontSize: 28 },
  headerTitle: { fontSize: 16, fontWeight: '800', color: '#fff' },
  headerSub: { fontSize: 11, color: 'rgba(255,255,255,0.75)', marginTop: 1 },
  newTestBtn: { backgroundColor: 'rgba(255,255,255,0.25)', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20 },
  newTestBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  tabBar: {
    backgroundColor: Colors.white,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  tabBarInner: { paddingHorizontal: 8 },
  tab: {
    alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10,
    borderBottomWidth: 3, borderBottomColor: 'transparent', minWidth: 70,
  },
  tabIcon: { fontSize: 20, marginBottom: 2 },
  tabLabel: { fontSize: 11, fontWeight: '600', color: Colors.subtitle },
  tabAvg: { fontSize: 12, fontWeight: '800', marginTop: 2 },
  tabNoData: { fontSize: 11, color: Colors.border, marginTop: 2 },

  scroll: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 48 },
  loadingBox: { paddingVertical: 80, alignItems: 'center' },

  emptyState: { alignItems: 'center', paddingTop: 40 },
  emptyEmoji: { fontSize: 56, marginBottom: 14 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.darkText, marginBottom: 8 },
  emptySubtitle: { fontSize: 13, color: Colors.subtitle, textAlign: 'center', lineHeight: 20, marginBottom: 24, paddingHorizontal: 20 },
  emptyStartBtn: { paddingHorizontal: 28, paddingVertical: 14, borderRadius: 50 },
  emptyStartBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  summaryCard: { borderRadius: 20, padding: 20, marginBottom: 24 },
  summaryTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  summaryAvg: { fontSize: 44, fontWeight: '900', lineHeight: 50 },
  summaryAvgLbl: { fontSize: 12, color: Colors.subtitle },
  perfPill: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
  perfPillText: { fontSize: 13, fontWeight: '700' },
  summaryDesc: { fontSize: 13, fontWeight: '600', marginBottom: 16 },
  summaryStats: { flexDirection: 'row', alignItems: 'center' },
  summaryStatItem: { flex: 1, alignItems: 'center' },
  summaryStatNum: { fontSize: 18, fontWeight: '800', color: Colors.darkText },
  summaryStatLbl: { fontSize: 10, color: Colors.subtitle, marginTop: 2 },
  summaryDivider: { width: 1, height: 30, backgroundColor: Colors.border },

  sectionTitle: { fontSize: 15, fontWeight: '700', color: Colors.darkText, marginBottom: 12 },

  diffRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  diffCard: {
    flex: 1, backgroundColor: Colors.white, borderRadius: 14, padding: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1,
  },
  diffName: { fontSize: 12, fontWeight: '700', marginBottom: 4 },
  diffPct: { fontSize: 20, fontWeight: '900' },
  diffTests: { fontSize: 10, color: Colors.subtitle, marginBottom: 8 },
  diffBar: { height: 4, backgroundColor: Colors.border, borderRadius: 2, overflow: 'hidden' },
  diffBarFill: { height: 4, borderRadius: 2 },

  testCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.white, borderRadius: 16, padding: 14, marginBottom: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
    overflow: 'hidden', position: 'relative',
  },
  testBarWrap: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, backgroundColor: Colors.border },
  testBarFill: { height: 3, borderRadius: 1 },
  testIndex: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  testIndexNum: { fontSize: 12, fontWeight: '800' },
  testMeta: { flex: 1, gap: 3 },
  testDate: { fontSize: 13, fontWeight: '700', color: Colors.darkText },
  testTime: { fontSize: 11, color: Colors.subtitle },
  diffTag: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, marginTop: 2 },
  diffTagText: { fontSize: 10, fontWeight: '700' },
  testScore: { alignItems: 'flex-end', marginRight: 4 },
  testPct: { fontSize: 18, fontWeight: '900' },
  testFrac: { fontSize: 11, color: Colors.subtitle },
});
