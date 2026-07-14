import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { AppStackParamList, QuestionResult } from '../types/navigation';
import { Colors } from '../constants/Colors';

type Props = {
  navigation: NativeStackNavigationProp<AppStackParamList, 'Results'>;
  route: RouteProp<AppStackParamList, 'Results'>;
};

function scoreMeta(pct: number): { emoji: string; title: string; color: string; bg: string } {
  if (pct >= 90) return { emoji: '🏆', title: 'Outstanding!', color: '#16A34A', bg: '#F0FDF4' };
  if (pct >= 70) return { emoji: '⭐', title: 'Great job!',    color: '#2563EB', bg: '#EFF6FF' };
  if (pct >= 50) return { emoji: '👍', title: 'Good effort!', color: '#D97706', bg: '#FFFBEB' };
  return              { emoji: '💪', title: 'Keep practising!', color: '#DC2626', bg: '#FEF2F2' };
}

export default function ResultsScreen({ navigation, route }: Props) {
  const { score, total, percentage, results } = route.params;
  const meta = scoreMeta(percentage);

  const canGoBack = navigation.canGoBack();

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        {canGoBack ? (
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={22} color={Colors.darkText} />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 34 }} />
        )}
        <Text style={styles.headerTitle}>Test Results</Text>
        <TouchableOpacity onPress={() => navigation.popToTop()} style={styles.homeBtn} activeOpacity={0.7}>
          <Ionicons name="home-outline" size={22} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Score hero card */}
        <View style={[styles.heroCard, { backgroundColor: meta.bg }]}>
          <Text style={styles.heroEmoji}>{meta.emoji}</Text>
          <Text style={[styles.heroTitle, { color: meta.color }]}>{meta.title}</Text>
          <Text style={[styles.heroScore, { color: meta.color }]}>
            {score} / {total}
          </Text>
          <Text style={[styles.heroPct, { color: meta.color }]}>{Math.round(percentage)}%</Text>
        </View>

        {/* Quick stats */}
        <View style={styles.statsRow}>
          <View style={styles.statChip}>
            <Ionicons name="checkmark-circle" size={20} color="#16A34A" />
            <Text style={[styles.statNum, { color: '#16A34A' }]}>{score}</Text>
            <Text style={styles.statLbl}>Correct</Text>
          </View>
          <View style={styles.statChip}>
            <Ionicons name="close-circle" size={20} color="#DC2626" />
            <Text style={[styles.statNum, { color: '#DC2626' }]}>{total - score}</Text>
            <Text style={styles.statLbl}>Wrong</Text>
          </View>
          <View style={styles.statChip}>
            <Ionicons name="list" size={20} color={Colors.subtitle} />
            <Text style={[styles.statNum, { color: Colors.darkText }]}>{total}</Text>
            <Text style={styles.statLbl}>Total</Text>
          </View>
        </View>

        {/* Per-question breakdown */}
        <Text style={styles.sectionTitle}>Question Breakdown</Text>
        {results.map((r: QuestionResult, idx: number) => (
          <View key={r.question_id} style={[styles.qCard, r.is_correct ? styles.qCardCorrect : styles.qCardWrong]}>
            <View style={styles.qHeader}>
              <View style={[styles.qBadge, r.is_correct ? styles.qBadgeCorrect : styles.qBadgeWrong]}>
                <Ionicons
                  name={r.is_correct ? 'checkmark' : 'close'}
                  size={14}
                  color={Colors.white}
                />
              </View>
              <Text style={styles.qNum}>Q{idx + 1}</Text>
              <Text style={[styles.qStatus, { color: r.is_correct ? '#16A34A' : '#DC2626' }]}>
                {r.is_correct ? 'Correct' : 'Incorrect'}
              </Text>
            </View>

            <Text style={styles.qText}>{r.question_text}</Text>

            {/* Options with highlights */}
            <View style={styles.optionsWrap}>
              {r.options.map((opt, i) => {
                const isCorrect = opt === r.correct_answer;
                const isChild = opt === r.child_answer;
                const showCorrect = isCorrect && !r.is_correct;
                const showWrong = isChild && !r.is_correct;
                return (
                  <View
                    key={i}
                    style={[
                      styles.optRow,
                      showCorrect && styles.optRowCorrect,
                      showWrong && styles.optRowWrong,
                      r.is_correct && isCorrect && styles.optRowCorrect,
                    ]}
                  >
                    <Text style={[
                      styles.optText,
                      showCorrect && { color: '#16A34A', fontWeight: '700' },
                      showWrong && { color: '#DC2626', fontWeight: '700' },
                      r.is_correct && isCorrect && { color: '#16A34A', fontWeight: '700' },
                    ]}>
                      {opt}
                    </Text>
                    {showCorrect && <Ionicons name="checkmark-circle" size={16} color="#16A34A" />}
                    {showWrong && <Ionicons name="close-circle" size={16} color="#DC2626" />}
                    {r.is_correct && isCorrect && <Ionicons name="checkmark-circle" size={16} color="#16A34A" />}
                  </View>
                );
              })}
            </View>

            {/* Explanation */}
            {r.explanation ? (
              <View style={styles.explanationBox}>
                <Text style={styles.explanationLabel}>Explanation</Text>
                <Text style={styles.explanationText}>{r.explanation}</Text>
              </View>
            ) : null}

            {/* Help note for wrong answers */}
            {!r.is_correct && r.help_note ? (
              <View style={styles.helpBox}>
                <Text style={styles.helpLabel}>Tip for next time 💡</Text>
                <Text style={styles.helpText}>{r.help_note}</Text>
              </View>
            ) : null}
          </View>
        ))}

        {/* Footer buttons */}
        <View style={styles.footerRow}>
          {canGoBack && (
            <TouchableOpacity
              style={styles.backFooterBtn}
              onPress={() => navigation.goBack()}
              activeOpacity={0.85}
            >
              <Ionicons name="arrow-back" size={16} color={Colors.primary} />
              <Text style={styles.backFooterBtnText}>Back</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.doneBtn, !canGoBack && { flex: 1 }]}
            onPress={() => navigation.popToTop()}
            activeOpacity={0.85}
          >
            <Ionicons name="home-outline" size={16} color={Colors.white} />
            <Text style={styles.doneBtnText}>Home</Text>
          </TouchableOpacity>
        </View>
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
  homeBtn: { padding: 6 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: Colors.darkText },

  scroll: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 48 },

  heroCard: {
    borderRadius: 24, padding: 32, alignItems: 'center', marginBottom: 20,
  },
  heroEmoji: { fontSize: 56, marginBottom: 8 },
  heroTitle: { fontSize: 22, fontWeight: '800', marginBottom: 8 },
  heroScore: { fontSize: 48, fontWeight: '900', lineHeight: 56 },
  heroPct: { fontSize: 18, fontWeight: '700', marginTop: 4, opacity: 0.75 },

  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 28 },
  statChip: {
    flex: 1, backgroundColor: Colors.white, borderRadius: 14, paddingVertical: 14,
    alignItems: 'center', gap: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  statNum: { fontSize: 20, fontWeight: '800' },
  statLbl: { fontSize: 11, color: Colors.subtitle },

  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.darkText, marginBottom: 14 },

  qCard: {
    backgroundColor: Colors.white, borderRadius: 16, padding: 18, marginBottom: 14,
    borderWidth: 2, borderColor: Colors.border,
  },
  qCardCorrect: { borderColor: '#BBF7D0' },
  qCardWrong: { borderColor: '#FECACA' },

  qHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  qBadge: {
    width: 22, height: 22, borderRadius: 11, justifyContent: 'center', alignItems: 'center',
  },
  qBadgeCorrect: { backgroundColor: '#16A34A' },
  qBadgeWrong: { backgroundColor: '#DC2626' },
  qNum: { fontSize: 13, fontWeight: '700', color: Colors.subtitle },
  qStatus: { fontSize: 13, fontWeight: '700' },

  qText: { fontSize: 15, fontWeight: '600', color: Colors.darkText, lineHeight: 22, marginBottom: 14 },

  optionsWrap: { gap: 6, marginBottom: 12 },
  optRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: '#F8F9FF',
  },
  optRowCorrect: { backgroundColor: '#F0FDF4' },
  optRowWrong: { backgroundColor: '#FEF2F2' },
  optText: { fontSize: 14, color: Colors.darkText, flex: 1 },

  explanationBox: {
    backgroundColor: '#EFF6FF', borderRadius: 10, padding: 12, marginTop: 4,
  },
  explanationLabel: { fontSize: 11, fontWeight: '700', color: '#2563EB', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  explanationText: { fontSize: 13, color: '#1E3A8A', lineHeight: 19 },

  helpBox: {
    backgroundColor: '#FFFBEB', borderRadius: 10, padding: 12, marginTop: 8,
  },
  helpLabel: { fontSize: 11, fontWeight: '700', color: '#D97706', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  helpText: { fontSize: 13, color: '#92400E', lineHeight: 19 },

  footerRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
  backFooterBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 16, paddingHorizontal: 24, borderRadius: 50,
    borderWidth: 2, borderColor: Colors.primary,
  },
  backFooterBtnText: { color: Colors.primary, fontSize: 15, fontWeight: '700' },
  doneBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: Colors.primary, paddingVertical: 16, borderRadius: 50,
  },
  doneBtnText: { color: Colors.white, fontSize: 15, fontWeight: '700' },
});
