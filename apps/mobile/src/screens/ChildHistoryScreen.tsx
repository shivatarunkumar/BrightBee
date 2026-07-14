import React, { useCallback, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView,
  ScrollView, ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp, useFocusEffect } from '@react-navigation/native';
import { AppStackParamList } from '../types/navigation';
import { Colors } from '../constants/Colors';
import { childApi, testApi, TestHistoryItem } from '../services/api';

type Props = {
  navigation: NativeStackNavigationProp<AppStackParamList, 'ChildHistory'>;
  route: RouteProp<AppStackParamList, 'ChildHistory'>;
};

const SUBJECT_ICONS: Record<string, string> = {
  Math: '🔢', English: '📖', Science: '🔬', EVS: '🌿', GK: '🌍',
};

const DIFF_COLORS: Record<string, string> = {
  Easy: '#16A34A', Medium: '#D97706', Hard: '#DC2626',
};

function scoreColor(pct: number): string {
  if (pct >= 80) return '#16A34A';
  if (pct >= 60) return '#D97706';
  return '#DC2626';
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function ChildHistoryScreen({ navigation, route }: Props) {
  const { childId, childName } = route.params;
  const [history, setHistory] = useState<TestHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingTestId, setLoadingTestId] = useState<string | null>(null);

  const fetchHistory = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const data = await childApi.history(childId);
      setHistory(data);
    } catch (err: any) {
      console.error('[ChildHistory] fetch error:', err?.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [childId]);

  useFocusEffect(useCallback(() => { fetchHistory(); }, [fetchHistory]));

  const handleViewResult = async (item: TestHistoryItem) => {
    setLoadingTestId(item.test_id);
    try {
      const result = await testApi.results(item.test_id);
      navigation.navigate('Results', {
        testId: result.test_id,
        score: result.score,
        total: result.total,
        percentage: result.percentage,
        results: result.results,
      });
    } catch (err: any) {
      console.error('[ChildHistory] load result error:', err?.message);
    } finally {
      setLoadingTestId(null);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color={Colors.darkText} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{childName}'s History</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchHistory(true)} tintColor={Colors.primary} />}
      >
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        ) : history.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>📋</Text>
            <Text style={styles.emptyTitle}>No tests yet</Text>
            <Text style={styles.emptySubtitle}>Complete a test to see results here.</Text>
          </View>
        ) : (
          history.map((item) => {
            const pct = Math.round(item.percentage);
            const isLoading = loadingTestId === item.test_id;
            return (
              <TouchableOpacity
                key={item.test_id}
                style={styles.card}
                onPress={() => handleViewResult(item)}
                activeOpacity={0.85}
                disabled={isLoading}
              >
                <View style={styles.cardLeft}>
                  <Text style={styles.subjectIcon}>{SUBJECT_ICONS[item.subject] ?? '📚'}</Text>
                  <View style={styles.cardMeta}>
                    <Text style={styles.subjectName}>{item.subject}</Text>
                    <View style={styles.tagsRow}>
                      <View style={[styles.diffTag, { backgroundColor: DIFF_COLORS[item.difficulty] + '22' }]}>
                        <Text style={[styles.diffTagText, { color: DIFF_COLORS[item.difficulty] }]}>
                          {item.difficulty}
                        </Text>
                      </View>
                      <Text style={styles.dateText}>{formatDate(item.completed_at)}</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.cardRight}>
                  <Text style={[styles.scoreText, { color: scoreColor(pct) }]}>
                    {item.score}/{item.total}
                  </Text>
                  <Text style={[styles.pctText, { color: scoreColor(pct) }]}>{pct}%</Text>
                  {isLoading
                    ? <ActivityIndicator size="small" color={Colors.subtitle} />
                    : <Ionicons name="chevron-forward" size={18} color={Colors.subtitle} />
                  }
                </View>
              </TouchableOpacity>
            );
          })
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
    backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  backBtn: { padding: 6 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: Colors.darkText },
  scroll: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40 },

  loadingBox: { paddingVertical: 60, alignItems: 'center' },

  emptyState: {
    backgroundColor: Colors.white, borderRadius: 20, padding: 32,
    alignItems: 'center', marginTop: 20,
  },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: Colors.darkText, marginBottom: 6 },
  emptySubtitle: { fontSize: 13, color: Colors.subtitle, textAlign: 'center' },

  card: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.white, borderRadius: 16, padding: 16, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  cardLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  subjectIcon: { fontSize: 32 },
  cardMeta: { flex: 1 },
  subjectName: { fontSize: 15, fontWeight: '700', color: Colors.darkText, marginBottom: 5 },
  tagsRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  diffTag: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  diffTagText: { fontSize: 11, fontWeight: '700' },
  dateText: { fontSize: 11, color: Colors.subtitle },

  cardRight: { alignItems: 'flex-end', gap: 2 },
  scoreText: { fontSize: 16, fontWeight: '800' },
  pctText: { fontSize: 12, fontWeight: '600' },
});
