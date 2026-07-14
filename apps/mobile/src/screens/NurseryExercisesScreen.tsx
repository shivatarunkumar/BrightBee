import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { AppStackParamList } from '../types/navigation';
import { Colors } from '../constants/Colors';

type Props = {
  navigation: NativeStackNavigationProp<AppStackParamList, 'NurseryExercises'>;
  route: RouteProp<AppStackParamList, 'NurseryExercises'>;
};

const CLASS_LABELS: Record<string, string> = {
  Nursery: 'Nursery', LKG: 'LKG', UKG: 'UKG',
};

const EXERCISES = [
  {
    id: 'lines',
    title: 'Lines Practice',
    subtitle: 'Standing · Sleeping · Left Curve · Right Curve',
    icon: '✏️',
    color: '#4361EE',
    bg: '#EEF0FF',
    desc: 'Trace 4 types of lines with your finger — the first step to writing!',
    screen: 'LineTracing' as const,
  },
  {
    id: 'alphabets',
    title: 'Alphabet Tracing',
    subtitle: 'A to Z — trace each letter',
    icon: '🔤',
    color: '#7B2FBE',
    bg: '#F3E8FF',
    desc: 'Trace dotted letters A to Z with your finger to learn writing.',
    screen: 'AlphabetTracing' as const,
  },
  {
    id: 'numbers',
    title: 'Number Tracing',
    subtitle: '1 to 10 — trace and count',
    icon: '🔢',
    color: '#EF4444',
    bg: '#FEF2F2',
    desc: 'Trace numbers 1 to 10 and count along with fun emojis!',
    screen: 'NumberTracing' as const,
  },
  {
    id: 'colours',
    title: 'Colours',
    subtitle: '10 colours to learn and spot',
    icon: '🎨',
    color: '#D97706',
    bg: '#FEF3C7',
    desc: 'Learn colour names and play a fun colour-spotting game!',
    screen: 'Colours' as const,
  },
  {
    id: 'shapes',
    title: 'Shape Tracing',
    subtitle: 'Circle · Square · Triangle and more',
    icon: '🔷',
    color: '#0D9488',
    bg: '#CCFBF1',
    desc: 'Trace circles, squares, triangles, rectangles, stars and hearts!',
    screen: 'ShapeTracing' as const,
  },
];

export default function NurseryExercisesScreen({ navigation, route }: Props) {
  const { childId, childName, childClass, avatar } = route.params;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color={Colors.darkText} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Learning Activities</Text>
        <View style={{ width: 34 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Child greeting */}
        <View style={styles.greetCard}>
          <Text style={styles.greetAvatar}>{avatar}</Text>
          <View>
            <Text style={styles.greetName}>Hi, {childName}!</Text>
            <Text style={styles.greetClass}>{CLASS_LABELS[childClass] ?? childClass} · Let's learn and play!</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Choose an activity</Text>

        {EXERCISES.map((ex) => (
          <TouchableOpacity
            key={ex.id}
            style={[styles.exerciseCard, { backgroundColor: ex.bg, borderColor: ex.color + '44' }]}
            onPress={() => navigation.navigate(ex.screen, { childName })}
            activeOpacity={0.85}
          >
            <View style={[styles.iconCircle, { backgroundColor: ex.color }]}>
              <Text style={styles.iconEmoji}>{ex.icon}</Text>
            </View>
            <View style={styles.meta}>
              <Text style={styles.exTitle}>{ex.title}</Text>
              <Text style={styles.exSubtitle}>{ex.subtitle}</Text>
              <Text style={styles.exDesc}>{ex.desc}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={ex.color} />
          </TouchableOpacity>
        ))}
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
  scroll: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 48 },

  greetCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: Colors.primaryLight, borderRadius: 20, padding: 18, marginBottom: 24,
  },
  greetAvatar: { fontSize: 44 },
  greetName: { fontSize: 20, fontWeight: '800', color: Colors.primary },
  greetClass: { fontSize: 13, color: Colors.subtitle, marginTop: 3 },

  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.darkText, marginBottom: 14 },

  exerciseCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    borderRadius: 20, padding: 16, marginBottom: 14, borderWidth: 1.5,
  },
  iconCircle: {
    width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center',
    flexShrink: 0,
  },
  iconEmoji: { fontSize: 26 },
  meta: { flex: 1 },
  exTitle: { fontSize: 16, fontWeight: '800', color: Colors.darkText, marginBottom: 2 },
  exSubtitle: { fontSize: 11, fontWeight: '600', color: Colors.subtitle, marginBottom: 4 },
  exDesc: { fontSize: 12, color: Colors.subtitle, lineHeight: 16 },
});
