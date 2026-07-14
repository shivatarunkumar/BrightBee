import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView,
  Alert, ScrollView, Animated, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { AppStackParamList } from '../types/navigation';
import { Colors } from '../constants/Colors';
import { testApi, friendlyError } from '../services/api';

type Props = {
  navigation: NativeStackNavigationProp<AppStackParamList, 'TestConfig'>;
  route: RouteProp<AppStackParamList, 'TestConfig'>;
};

const QUESTION_COUNTS = [3, 5, 7, 10];
const DIFFICULTIES = [
  { key: 'Easy',   label: 'Easy',   icon: '🌱', desc: 'Basic concepts' },
  { key: 'Medium', label: 'Medium', icon: '🌟', desc: 'A bit challenging' },
  { key: 'Hard',   label: 'Hard',   icon: '🚀', desc: 'Push the limits' },
];

const SUBJECT_ICONS: Record<string, string> = {
  Math: '🔢', English: '📖', Science: '🔬', EVS: '🌿', GK: '🌍',
};

export default function TestConfigScreen({ navigation, route }: Props) {
  const { childId, childName, childClass, subject } = route.params;

  const [questionCount, setQuestionCount] = useState(5);
  const [difficulty, setDifficulty] = useState('Easy');
  const [loading, setLoading] = useState(false);

  const LOADING_MESSAGES = [
    { emoji: '🧠', text: 'Thinking of the perfect questions…' },
    { emoji: '📚', text: 'Searching through textbooks…' },
    { emoji: '✨', text: 'Crafting something special for you…' },
    { emoji: '🎯', text: 'Making it just the right level…' },
    { emoji: '🤖', text: 'AI is working its magic…' },
    { emoji: '🚀', text: 'Almost ready, hang tight!' },
  ];
  const [msgIdx, setMsgIdx] = useState(0);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const dotAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!loading) return;
    setMsgIdx(0);
    // Cycle messages every 2s
    const msgTimer = setInterval(() => {
      setMsgIdx((i) => (i + 1) % LOADING_MESSAGES.length);
    }, 2000);
    // Pulse the emoji
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.25, duration: 700, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
      ])
    );
    pulse.start();
    // Animate the dot bar 0→1 over ~15s (typical generation time)
    dotAnim.setValue(0);
    Animated.timing(dotAnim, { toValue: 0.92, duration: 15000, useNativeDriver: false }).start();

    return () => {
      clearInterval(msgTimer);
      pulse.stop();
    };
  }, [loading]);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const result = await testApi.generate({
        child_id: childId,
        subject,
        difficulty,
        question_count: questionCount,
      });
      navigation.replace('Test', {
        testId: result.test_id,
        subject: result.subject,
        difficulty: result.difficulty,
        childName,
        questions: result.questions,
      });
    } catch (err: any) {
      console.error('[TestConfig] generate error:', err?.message);
      Alert.alert('Could not generate test', friendlyError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color={Colors.darkText} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Configure Test</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Subject badge */}
        <View style={styles.subjectBadge}>
          <Text style={styles.subjectIcon}>{SUBJECT_ICONS[subject] ?? '📚'}</Text>
          <View>
            <Text style={styles.subjectName}>{subject}</Text>
            <Text style={styles.childInfo}>for {childName}</Text>
          </View>
        </View>

        {/* Number of questions */}
        <Text style={styles.sectionLabel}>How many questions?</Text>
        <View style={styles.optionRow}>
          {QUESTION_COUNTS.map((n) => (
            <TouchableOpacity
              key={n}
              style={[styles.countChip, questionCount === n && styles.chipSelected]}
              onPress={() => setQuestionCount(n)}
              activeOpacity={0.8}
            >
              <Text style={[styles.countChipText, questionCount === n && styles.chipTextSelected]}>
                {n}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Difficulty */}
        <Text style={styles.sectionLabel}>Difficulty</Text>
        {DIFFICULTIES.map((d) => (
          <TouchableOpacity
            key={d.key}
            style={[styles.difficultyCard, difficulty === d.key && styles.difficultySelected]}
            onPress={() => setDifficulty(d.key)}
            activeOpacity={0.8}
          >
            <Text style={styles.difficultyIcon}>{d.icon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.difficultyLabel, difficulty === d.key && { color: Colors.primary }]}>
                {d.label}
              </Text>
              <Text style={styles.difficultyDesc}>{d.desc}</Text>
            </View>
            {difficulty === d.key && (
              <Ionicons name="checkmark-circle" size={22} color={Colors.primary} />
            )}
          </TouchableOpacity>
        ))}

        {/* Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryText}>
            {questionCount} {difficulty.toLowerCase()} {subject} questions for {childName}
          </Text>
          <Text style={styles.summaryNote}>AI will generate your questions now ✨</Text>
        </View>

        {/* Generate button */}
        <TouchableOpacity
          style={styles.generateBtn}
          onPress={handleGenerate}
          activeOpacity={0.85}
          disabled={loading}
        >
          <Text style={styles.generateBtnText}>🚀  Start Test</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Animated loading overlay */}
      <Modal visible={loading} transparent animationType="fade">
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingCard}>
            {/* Pulsing emoji */}
            <Animated.Text style={[styles.loadingEmoji, { transform: [{ scale: pulseAnim }] }]}>
              {LOADING_MESSAGES[msgIdx].emoji}
            </Animated.Text>

            {/* Cycling message */}
            <Text style={styles.loadingTitle}>Generating your test</Text>
            <Text style={styles.loadingMsg}>{LOADING_MESSAGES[msgIdx].text}</Text>

            {/* Animated progress bar */}
            <View style={styles.loadingTrack}>
              <Animated.View
                style={[styles.loadingFill, {
                  width: dotAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
                }]}
              />
            </View>

            {/* Subject context */}
            <Text style={styles.loadingContext}>
              {questionCount} {difficulty.toLowerCase()} {subject} questions for {childName}
            </Text>
          </View>
        </View>
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
  scroll: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 48 },

  subjectBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: Colors.white, borderRadius: 18, padding: 18, marginBottom: 28,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: 4, elevation: 2,
  },
  subjectIcon: { fontSize: 40 },
  subjectName: { fontSize: 20, fontWeight: '700', color: Colors.darkText },
  childInfo: { fontSize: 13, color: Colors.subtitle, marginTop: 2 },

  sectionLabel: { fontSize: 15, fontWeight: '700', color: Colors.darkText, marginBottom: 12 },

  optionRow: { flexDirection: 'row', gap: 12, marginBottom: 28 },
  countChip: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: Colors.white, justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: Colors.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1,
  },
  chipSelected: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  countChipText: { fontSize: 20, fontWeight: '700', color: Colors.subtitle },
  chipTextSelected: { color: Colors.primary },

  difficultyCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: Colors.white, borderRadius: 14, padding: 16, marginBottom: 12,
    borderWidth: 2, borderColor: Colors.border,
  },
  difficultySelected: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  difficultyIcon: { fontSize: 28 },
  difficultyLabel: { fontSize: 15, fontWeight: '700', color: Colors.darkText },
  difficultyDesc: { fontSize: 12, color: Colors.subtitle, marginTop: 2 },

  summaryCard: {
    backgroundColor: '#F0FDF4', borderRadius: 14, padding: 16,
    marginTop: 8, marginBottom: 24, alignItems: 'center', gap: 4,
  },
  summaryText: { fontSize: 14, fontWeight: '600', color: '#16A34A', textAlign: 'center' },
  summaryNote: { fontSize: 12, color: Colors.subtitle },

  generateBtn: {
    backgroundColor: Colors.primary, paddingVertical: 18, borderRadius: 50, alignItems: 'center',
  },
  generateBtnText: { color: Colors.white, fontSize: 16, fontWeight: '700' },

  loadingOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center', alignItems: 'center', padding: 32,
  },
  loadingCard: {
    backgroundColor: Colors.white, borderRadius: 28, padding: 36,
    alignItems: 'center', width: '100%',
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 20, elevation: 10,
  },
  loadingEmoji: { fontSize: 64, marginBottom: 20 },
  loadingTitle: { fontSize: 20, fontWeight: '900', color: Colors.darkText, marginBottom: 8 },
  loadingMsg: { fontSize: 14, color: Colors.subtitle, textAlign: 'center', lineHeight: 20, marginBottom: 24, minHeight: 40 },
  loadingTrack: { width: '100%', height: 8, backgroundColor: Colors.border, borderRadius: 4, marginBottom: 16, overflow: 'hidden' },
  loadingFill: { height: 8, backgroundColor: Colors.primary, borderRadius: 4 },
  loadingContext: { fontSize: 12, color: Colors.subtitle, fontWeight: '600', textAlign: 'center' },
});
