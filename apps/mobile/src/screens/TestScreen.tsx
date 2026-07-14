import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView,
  ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { AppStackParamList, QuestionForClient } from '../types/navigation';
import { Colors } from '../constants/Colors';
import { testApi, friendlyError } from '../services/api';

type Props = {
  navigation: NativeStackNavigationProp<AppStackParamList, 'Test'>;
  route: RouteProp<AppStackParamList, 'Test'>;
};

const OPTION_LABELS = ['A', 'B', 'C', 'D'];

export default function TestScreen({ navigation, route }: Props) {
  const { testId, subject, difficulty, childName, questions } = route.params;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  // Store answers & time keyed by question id so we can go back and forth
  const [answerMap, setAnswerMap] = useState<Record<string, string>>({});
  const [timeMap, setTimeMap] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);

  const questionStartTime = useRef(Date.now());

  const question: QuestionForClient = questions[currentIndex];
  const isLast = currentIndex === questions.length - 1;
  const progress = (currentIndex + 1) / questions.length;
  const allAnswered = questions.every((q) =>
    q.id === question.id ? !!selectedOption : !!answerMap[q.id]
  );

  const goTo = useCallback((targetIndex: number) => {
    const timeTaken = Math.round((Date.now() - questionStartTime.current) / 1000);
    const newAnswerMap = selectedOption
      ? { ...answerMap, [question.id]: selectedOption }
      : answerMap;
    const newTimeMap = { ...timeMap, [question.id]: (timeMap[question.id] ?? 0) + timeTaken };

    setAnswerMap(newAnswerMap);
    setTimeMap(newTimeMap);
    setCurrentIndex(targetIndex);
    setSelectedOption(newAnswerMap[questions[targetIndex].id] ?? null);
    questionStartTime.current = Date.now();
  }, [selectedOption, answerMap, timeMap, question, questions]);

  const handleNext = useCallback(async () => {
    if (!selectedOption) return;

    const timeTaken = Math.round((Date.now() - questionStartTime.current) / 1000);
    const newAnswerMap = { ...answerMap, [question.id]: selectedOption };
    const newTimeMap = { ...timeMap, [question.id]: (timeMap[question.id] ?? 0) + timeTaken };

    if (!isLast) {
      setAnswerMap(newAnswerMap);
      setTimeMap(newTimeMap);
      setCurrentIndex((i) => i + 1);
      setSelectedOption(newAnswerMap[questions[currentIndex + 1].id] ?? null);
      questionStartTime.current = Date.now();
      return;
    }

    // Build final answers before showing dialog (so values are captured in closure)
    const finalAnswers = questions.map((q) => ({
      question_id: q.id,
      answer: newAnswerMap[q.id] ?? '',
      time_taken_seconds: newTimeMap[q.id] ?? 0,
    }));

    const doSubmit = async () => {
      setSubmitting(true);
      try {
        const result = await testApi.submit(testId, finalAnswers);
        navigation.replace('Results', {
          testId: result.test_id,
          score: result.score,
          total: result.total,
          percentage: result.percentage,
          results: result.results,
        });
      } catch (err: any) {
        console.error('[Test] submit error:', err?.message);
        Alert.alert('Submit failed', friendlyError(err));
        setSubmitting(false);
      }
    };

    Alert.alert(
      'Submit Test? 🎯',
      `You've answered all ${questions.length} questions. Once submitted you can't change your answers.\n\nReady to see your results?`,
      [
        { text: 'Review First', style: 'cancel' },
        { text: 'Submit Now! 🚀', onPress: doSubmit },
      ],
      { cancelable: true }
    );
  }, [selectedOption, answerMap, timeMap, question, isLast, currentIndex, questions, testId, navigation]);

  // Block ALL back navigation (swipe, hardware button, header close) during an active test
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      if (submitting) {
        // Don't interrupt while submitting
        e.preventDefault();
        return;
      }
      e.preventDefault();
      Alert.alert('Quit test?', 'Your progress will be lost.', [
        { text: 'Keep going', style: 'cancel' },
        { text: 'Quit', style: 'destructive', onPress: () => navigation.dispatch(e.data.action) },
      ]);
    });
    return unsubscribe;
  }, [navigation, submitting]);

  const handleQuit = () => {
    // Triggers beforeRemove which shows the confirmation
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleQuit} style={styles.quitBtn} activeOpacity={0.7}>
          <Ionicons name="close" size={22} color={Colors.subtitle} />
        </TouchableOpacity>
        <View style={styles.headerMeta}>
          <Text style={styles.headerSubject}>{subject}</Text>
          <Text style={styles.headerDiff}>{difficulty}</Text>
        </View>
        <Text style={styles.headerCount}>{currentIndex + 1}/{questions.length}</Text>
      </View>

      {/* Progress bar */}
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Question card */}
        <View style={styles.questionCard}>
          <Text style={styles.questionLabel}>Question {currentIndex + 1}</Text>
          <Text style={styles.questionText}>{question.question_text}</Text>
        </View>

        {/* Options */}
        <Text style={styles.chooseLabel}>Choose the correct answer</Text>
        {question.options.map((opt, idx) => {
          const isSelected = selectedOption === opt;
          return (
            <TouchableOpacity
              key={idx}
              style={[styles.optionCard, isSelected && styles.optionSelected]}
              onPress={() => setSelectedOption(opt)}
              activeOpacity={0.8}
            >
              <View style={[styles.optionLabel, isSelected && styles.optionLabelSelected]}>
                <Text style={[styles.optionLabelText, isSelected && styles.optionLabelTextSelected]}>
                  {OPTION_LABELS[idx]}
                </Text>
              </View>
              <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>{opt}</Text>
              {isSelected && (
                <Ionicons name="checkmark-circle" size={22} color={Colors.primary} style={styles.optionCheck} />
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Footer CTA */}
      <View style={styles.footer}>
        <View style={styles.footerRow}>
          {currentIndex > 0 && (
            <TouchableOpacity
              style={styles.prevBtn}
              onPress={() => goTo(currentIndex - 1)}
              activeOpacity={0.8}
              disabled={submitting}
            >
              <Ionicons name="arrow-back" size={18} color={Colors.subtitle} />
              <Text style={styles.prevBtnText}>Previous</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.nextBtn, (!selectedOption || submitting || (isLast && !allAnswered)) && styles.nextBtnDisabled]}
            onPress={handleNext}
            activeOpacity={0.85}
            disabled={!selectedOption || submitting || (isLast && !allAnswered)}
          >
            {submitting ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator color={Colors.white} />
                <Text style={styles.nextBtnText}>Submitting…</Text>
              </View>
            ) : (
              <Text style={styles.nextBtnText}>{isLast ? 'Submit Test' : 'Next Question'}</Text>
            )}
          </TouchableOpacity>
        </View>
        {isLast && !allAnswered && (
          <Text style={styles.unansweredHint}>Answer all questions before submitting</Text>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FF' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 12,
    backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  quitBtn: { padding: 6 },
  headerMeta: { alignItems: 'center' },
  headerSubject: { fontSize: 15, fontWeight: '700', color: Colors.darkText },
  headerDiff: { fontSize: 11, color: Colors.subtitle, marginTop: 1 },
  headerCount: { fontSize: 14, fontWeight: '600', color: Colors.subtitle },

  progressTrack: { height: 4, backgroundColor: Colors.border },
  progressFill: { height: 4, backgroundColor: Colors.primary, borderRadius: 2 },

  scroll: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 32 },

  questionCard: {
    backgroundColor: Colors.white, borderRadius: 20, padding: 24, marginBottom: 28,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
  },
  questionLabel: { fontSize: 11, fontWeight: '600', color: Colors.primary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 },
  questionText: { fontSize: 18, fontWeight: '700', color: Colors.darkText, lineHeight: 26 },

  chooseLabel: { fontSize: 13, color: Colors.subtitle, marginBottom: 12 },

  optionCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: Colors.white, borderRadius: 14, padding: 16, marginBottom: 12,
    borderWidth: 2, borderColor: Colors.border,
  },
  optionSelected: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  optionLabel: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: Colors.border, justifyContent: 'center', alignItems: 'center',
  },
  optionLabelSelected: { backgroundColor: Colors.primary },
  optionLabelText: { fontSize: 14, fontWeight: '700', color: Colors.subtitle },
  optionLabelTextSelected: { color: Colors.white },
  optionText: { flex: 1, fontSize: 15, fontWeight: '500', color: Colors.darkText },
  optionTextSelected: { color: Colors.primary, fontWeight: '700' },
  optionCheck: { marginLeft: 4 },

  footer: {
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16,
    backgroundColor: Colors.white, borderTopWidth: 1, borderTopColor: Colors.border,
  },
  footerRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  prevBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 16, paddingHorizontal: 18, borderRadius: 50,
    borderWidth: 2, borderColor: Colors.border,
  },
  prevBtnText: { fontSize: 14, fontWeight: '700', color: Colors.subtitle },
  nextBtn: {
    flex: 1, backgroundColor: Colors.primary, paddingVertical: 16, borderRadius: 50, alignItems: 'center',
  },
  nextBtnDisabled: { opacity: 0.4 },
  nextBtnText: { color: Colors.white, fontSize: 16, fontWeight: '700' },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  unansweredHint: { fontSize: 12, color: Colors.subtitle, textAlign: 'center', marginTop: 8 },
});
