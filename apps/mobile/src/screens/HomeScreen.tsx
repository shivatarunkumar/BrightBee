import React, { useCallback, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView,
  ScrollView, Alert, ActivityIndicator, RefreshControl,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { AppStackParamList } from '../types/navigation';
import { Colors } from '../constants/Colors';
import { Child, childApi } from '../services/api';

type Props = {
  navigation: NativeStackNavigationProp<AppStackParamList, 'Home'>;
  route: RouteProp<AppStackParamList, 'Home'>;
  onLogout?: () => void;
};

const CLASS_LABELS: Record<string, string> = {
  Nursery: 'Nursery', LKG: 'LKG', UKG: 'UKG',
  Class1: 'Class 1', Class2: 'Class 2', Class3: 'Class 3',
  Class4: 'Class 4', Class5: 'Class 5',
};

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function HomeScreen({ navigation, route, onLogout }: Props) {
  const parentName = route.params?.parentName ?? 'Parent';
  const firstName = parentName.split(' ')[0];

  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchChildren = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const data = await childApi.list();
      setChildren(data);
    } catch (err: any) {
      console.error('[Home] fetch children error:', err?.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Re-fetch every time the screen comes into focus (e.g. after AddChild)
  useFocusEffect(useCallback(() => { fetchChildren(); }, [fetchChildren]));

  const handleLogout = () => {
    Alert.alert('Log out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: () => onLogout?.() },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>{greeting()}, {firstName}! 👋</Text>
          <Text style={styles.subGreeting}>Let's keep the learning going</Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn} activeOpacity={0.7}>
          <Ionicons name="log-out-outline" size={22} color={Colors.subtitle} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchChildren(true)} tintColor={Colors.primary} />}
      >
        {/* Stats bar */}
        {children.length > 0 && (
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{children.length}</Text>
              <Text style={styles.statLabel}>Children</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{Math.max(...children.map((c) => c.streak_count), 0)}</Text>
              <Text style={styles.statLabel}>Best Streak 🔥</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>5</Text>
              <Text style={styles.statLabel}>Subjects</Text>
            </View>
          </View>
        )}

        {/* Section header */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Your Children</Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('AddChild')}
            style={styles.addBtn}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={18} color={Colors.white} />
            <Text style={styles.addBtnText}>Add Child</Text>
          </TouchableOpacity>
        </View>

        {/* Loading state */}
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        ) : children.length === 0 ? (
          /* Empty state */
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🐝</Text>
            <Text style={styles.emptyTitle}>No children yet</Text>
            <Text style={styles.emptySubtitle}>
              Add your child's profile to start generating AI-powered tests!
            </Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('AddChild')}
              style={styles.emptyAddBtn}
              activeOpacity={0.85}
            >
              <Text style={styles.emptyAddBtnText}>+ Add your first child</Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* Child cards */
          children.map((child) => (
            <TouchableOpacity
              key={child.id}
              style={styles.childCard}
              activeOpacity={0.85}
              onPress={() =>
                navigation.navigate('ChildDashboard', {
                  childId: child.id,
                  childName: child.name,
                  childClass: child.current_class,
                  avatar: child.avatar,
                })
              }
            >
              <View style={styles.childLeft}>
                <View style={styles.avatarCircle}>
                  <Text style={styles.avatarEmoji}>{child.avatar}</Text>
                </View>
                <View>
                  <Text style={styles.childName}>{child.name}</Text>
                  <Text style={styles.childClass}>{CLASS_LABELS[child.current_class] ?? child.current_class}</Text>
                </View>
              </View>
              <View style={styles.childRight}>
                {child.streak_count > 0 && <Text style={styles.streak}>🔥 {child.streak_count}</Text>}
                <Ionicons name="chevron-forward" size={20} color={Colors.subtitle} />
              </View>
            </TouchableOpacity>
          ))
        )}

        {/* Tip card */}
        <View style={styles.tipCard}>
          <Text style={styles.tipEmoji}>💡</Text>
          <View style={styles.tipText}>
            <Text style={styles.tipTitle}>Daily practice makes a difference</Text>
            <Text style={styles.tipBody}>
              Just 10–15 minutes of AI-powered practice each day improves scores significantly.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FF' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 24, paddingTop: 16, paddingBottom: 12,
    backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  greeting: { fontSize: 20, fontWeight: '700', color: Colors.darkText },
  subGreeting: { fontSize: 13, color: Colors.subtitle, marginTop: 2 },
  logoutBtn: { padding: 8 },
  scroll: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40 },

  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  statCard: {
    flex: 1, backgroundColor: Colors.white, borderRadius: 14,
    paddingVertical: 16, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  statNumber: { fontSize: 22, fontWeight: '700', color: Colors.primary },
  statLabel: { fontSize: 11, color: Colors.subtitle, marginTop: 4, textAlign: 'center' },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: Colors.darkText },
  addBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.primary, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, gap: 4,
  },
  addBtnText: { color: Colors.white, fontSize: 13, fontWeight: '600' },

  loadingBox: { paddingVertical: 48, alignItems: 'center' },

  emptyState: {
    backgroundColor: Colors.white, borderRadius: 20, padding: 32, alignItems: 'center', marginBottom: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  emptyEmoji: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.darkText, marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: Colors.subtitle, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  emptyAddBtn: { backgroundColor: Colors.primary, paddingHorizontal: 28, paddingVertical: 14, borderRadius: 50 },
  emptyAddBtnText: { color: Colors.white, fontSize: 15, fontWeight: '600' },

  childCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.white, borderRadius: 16, padding: 16, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  childLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatarCircle: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: Colors.primaryLight, justifyContent: 'center', alignItems: 'center',
  },
  avatarEmoji: { fontSize: 28 },
  childName: { fontSize: 16, fontWeight: '700', color: Colors.darkText },
  childClass: { fontSize: 13, color: Colors.subtitle, marginTop: 2 },
  childRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  streak: { fontSize: 14, fontWeight: '600', color: Colors.darkText },

  tipCard: {
    flexDirection: 'row', backgroundColor: Colors.primaryLight,
    borderRadius: 16, padding: 16, marginTop: 8, gap: 12, alignItems: 'flex-start',
  },
  tipEmoji: { fontSize: 28, marginTop: 2 },
  tipText: { flex: 1 },
  tipTitle: { fontSize: 14, fontWeight: '700', color: Colors.primary, marginBottom: 4 },
  tipBody: { fontSize: 13, color: Colors.darkText, lineHeight: 18 },
});
