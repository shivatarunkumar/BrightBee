import React, { useState, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView,
  Animated, Dimensions, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { AppStackParamList } from '../types/navigation';
import { Colors } from '../constants/Colors';

type Props = {
  navigation: NativeStackNavigationProp<AppStackParamList, 'Colours'>;
  route: RouteProp<AppStackParamList, 'Colours'>;
};

const SCREEN_W = Dimensions.get('window').width;

const COLOURS = [
  { name: 'Red',    hex: '#EF4444', light: '#FEF2F2', emoji: '🍎🌹🍅',  fact: 'Apples and roses are red!' },
  { name: 'Orange', hex: '#F97316', light: '#FFF7ED', emoji: '🍊🥕🎃',  fact: 'Oranges and carrots are orange!' },
  { name: 'Yellow', hex: '#EAB308', light: '#FEFCE8', emoji: '🌞🍋🌻',  fact: 'The sun and lemons are yellow!' },
  { name: 'Green',  hex: '#22C55E', light: '#F0FDF4', emoji: '🌿🐸🥦',  fact: 'Leaves and frogs are green!' },
  { name: 'Blue',   hex: '#3B82F6', light: '#EFF6FF', emoji: '🌊💧🐬',  fact: 'The sky and ocean are blue!' },
  { name: 'Purple', hex: '#8B5CF6', light: '#F5F3FF', emoji: '🍇🌸🦄',  fact: 'Grapes and lavender are purple!' },
  { name: 'Pink',   hex: '#EC4899', light: '#FDF2F8', emoji: '🌸🩷🦩',  fact: 'Flamingos and flowers are pink!' },
  { name: 'Brown',  hex: '#92400E', light: '#FEF3C7', emoji: '🍫🐻🌰',  fact: 'Chocolate and bears are brown!' },
  { name: 'White',  hex: '#F0F0F0', light: '#F8FAFC', emoji: '☁️🐑⛄',  fact: 'Clouds and snow are white!' },
  { name: 'Black',  hex: '#1F2937', light: '#F1F5F9', emoji: '🐧🦓🌑',  fact: 'Penguins and night sky are black!' },
];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function getChoices(correct: typeof COLOURS[number], all: typeof COLOURS) {
  const wrong = shuffle(all.filter(c => c.name !== correct.name)).slice(0, 3);
  return shuffle([correct, ...wrong]);
}

export default function ColoursScreen({ navigation, route }: Props) {
  const { childName } = route.params;
  const [colIdx, setColIdx] = useState(0);
  const [phase, setPhase] = useState<'learn' | 'quiz'>('learn');
  const [choices, setChoices] = useState(() => getChoices(COLOURS[0], COLOURS));
  const [selected, setSelected] = useState<string | null>(null);
  const [wrongShake, setWrongShake] = useState<string | null>(null);
  const bounceAnim = useRef(new Animated.Value(1)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  const col = COLOURS[colIdx];
  const isWhite = col.name === 'White';

  const bounce = useCallback(() => {
    Animated.sequence([
      Animated.timing(bounceAnim, { toValue: 1.2, duration: 120, useNativeDriver: true }),
      Animated.timing(bounceAnim, { toValue: 1, duration: 120, useNativeDriver: true }),
    ]).start();
  }, [bounceAnim]);

  const shake = useCallback(() => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 4, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  }, [shakeAnim]);

  const goTo = (idx: number) => {
    setColIdx(idx);
    setPhase('learn');
    setSelected(null);
    setWrongShake(null);
    setChoices(getChoices(COLOURS[idx], COLOURS));
  };

  const handleStartQuiz = () => {
    setPhase('quiz');
    setSelected(null);
    setWrongShake(null);
  };

  const handleChoice = (choice: typeof COLOURS[number]) => {
    if (selected) return;
    setSelected(choice.name);
    if (choice.name === col.name) {
      bounce();
    } else {
      setWrongShake(choice.name);
      shake();
    }
  };

  const handleNext = () => {
    if (colIdx < COLOURS.length - 1) goTo(colIdx + 1);
    else navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color={Colors.darkText} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Colours</Text>
        <Text style={styles.headerCount}>{colIdx + 1}/{COLOURS.length}</Text>
      </View>

      {/* Colour prev/next */}
      <View style={styles.colNav}>
        {COLOURS.map((c, i) => (
          <TouchableOpacity
            key={c.name}
            style={[styles.navDot, { backgroundColor: c.hex }, i === colIdx && styles.navDotActive]}
            onPress={() => goTo(i)}
            activeOpacity={0.8}
          />
        ))}
      </View>

      {phase === 'learn' ? (
        <ScrollView contentContainerStyle={styles.learnView} showsVerticalScrollIndicator={false}>
          {/* Big colour swatch */}
          <Animated.View
            style={[styles.swatchBig, { backgroundColor: col.hex, transform: [{ scale: bounceAnim }] },
              isWhite && styles.swatchBorder]}
          >
            <Text style={styles.swatchEmoji}>{col.emoji.split('')[0]}</Text>
          </Animated.View>

          <Text style={[styles.colourName, { color: isWhite ? Colors.darkText : col.hex }]}>{col.name}</Text>
          <Text style={styles.colourFact}>{col.fact}</Text>
          <Text style={styles.colourEmojis}>{col.emoji}</Text>

          <View style={styles.learnBtns}>
            <TouchableOpacity
              style={[styles.quizBtn, { backgroundColor: col.hex }]}
              onPress={handleStartQuiz}
              activeOpacity={0.85}
            >
              <Text style={styles.quizBtnText}>Can you find {col.name}? 🎯</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.nextLearnBtn}
              onPress={handleNext}
              activeOpacity={0.85}
            >
              <Text style={styles.nextLearnBtnText}>
                {colIdx < COLOURS.length - 1 ? 'Next Colour →' : 'All Done! 🎉'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={styles.quizView} showsVerticalScrollIndicator={false}>
          <Text style={styles.quizQuestion}>
            Tap the <Text style={[styles.quizTarget, { color: isWhite ? Colors.darkText : col.hex }]}>{col.name}</Text> colour!
          </Text>

          {/* 2x2 colour grid */}
          <View style={styles.choicesGrid}>
            {choices.map((choice) => {
              const isCorrect = choice.name === col.name;
              const isSelected = selected === choice.name;
              const isWrong = wrongShake === choice.name;
              const userGotItRight = selected === col.name;
              const isWhiteChoice = choice.name === 'White';

              return (
                <Animated.View
                  key={choice.name}
                  style={[
                    styles.choiceWrap,
                    isWrong && { transform: [{ translateX: shakeAnim }] },
                  ]}
                >
                  <TouchableOpacity
                    style={[
                      styles.choiceBtn,
                      { backgroundColor: choice.hex },
                      isWhiteChoice && styles.choiceBtnBorder,
                      // Only show green if user picked correctly
                      userGotItRight && isCorrect && styles.choiceCorrect,
                      // Show red only on the wrong pick
                      isSelected && !isCorrect && styles.choiceWrong,
                    ]}
                    onPress={() => handleChoice(choice)}
                    activeOpacity={0.85}
                    disabled={!!selected}
                  >
                    {userGotItRight && isCorrect && (
                      <View style={styles.choiceCheckWrap}>
                        <Ionicons name="checkmark-circle" size={36} color="#fff" />
                      </View>
                    )}
                    {isSelected && !isCorrect && (
                      <View style={styles.choiceCheckWrap}>
                        <Ionicons name="close-circle" size={36} color="#fff" />
                      </View>
                    )}
                  </TouchableOpacity>
                  <Text style={styles.choiceName}>{choice.name}</Text>
                </Animated.View>
              );
            })}
          </View>

          {selected === col.name && (
            <View style={styles.correctBanner}>
              <Text style={styles.correctBannerText}>🌟 Brilliant! That's {col.name}!</Text>
              <TouchableOpacity
                style={[styles.nextBtn, { backgroundColor: col.hex }]}
                onPress={handleNext}
                activeOpacity={0.85}
              >
                <Text style={styles.nextBtnText}>
                  {colIdx < COLOURS.length - 1 ? 'Next Colour →' : 'All Done! 🎉'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {selected && selected !== col.name && (
            <View style={styles.tryAgainBanner}>
              <Text style={styles.tryAgainText}>Not quite — try again!</Text>
              <TouchableOpacity
                style={styles.retryBtn}
                onPress={() => { setSelected(null); setWrongShake(null); setChoices(getChoices(col, COLOURS)); }}
                activeOpacity={0.85}
              >
                <Text style={styles.retryBtnText}>Try Again</Text>
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity style={styles.backToLearnBtn} onPress={() => setPhase('learn')} activeOpacity={0.7}>
            <Text style={styles.backToLearnText}>← Back to learning</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const CHOICE_SIZE = (SCREEN_W - 80) / 2;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FF' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
    backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  backBtn: { padding: 6 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: Colors.darkText },
  headerCount: { fontSize: 14, fontWeight: '700', color: Colors.subtitle },

  colNav: { flexDirection: 'row', justifyContent: 'center', gap: 8, paddingVertical: 12, backgroundColor: Colors.white },
  navDot: { width: 18, height: 18, borderRadius: 9 },
  navDotActive: { transform: [{ scale: 1.4 }], borderWidth: 2, borderColor: Colors.darkText },

  learnView: { alignItems: 'center', paddingHorizontal: 24, paddingTop: 20, paddingBottom: 32 },
  swatchBig: {
    width: 160, height: 160, borderRadius: 80,
    justifyContent: 'center', alignItems: 'center', marginBottom: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 6,
  },
  swatchBorder: { borderWidth: 2, borderColor: Colors.border },
  swatchEmoji: { fontSize: 72 },
  colourName: { fontSize: 44, fontWeight: '900', marginBottom: 8 },
  colourFact: { fontSize: 15, color: Colors.subtitle, textAlign: 'center', lineHeight: 22, marginBottom: 12 },
  colourEmojis: { fontSize: 36, letterSpacing: 6, marginBottom: 28 },
  learnBtns: { width: '100%', gap: 12 },
  quizBtn: { paddingVertical: 16, borderRadius: 50, alignItems: 'center' },
  quizBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  nextLearnBtn: {
    paddingVertical: 14, borderRadius: 50, alignItems: 'center',
    borderWidth: 2, borderColor: Colors.border,
  },
  nextLearnBtnText: { fontSize: 15, fontWeight: '700', color: Colors.subtitle },

  quizView: { alignItems: 'center', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 32 },
  quizQuestion: { fontSize: 22, fontWeight: '700', color: Colors.darkText, textAlign: 'center', marginBottom: 24 },
  quizTarget: { fontWeight: '900', fontSize: 24 },

  choicesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, justifyContent: 'center', marginBottom: 20 },
  choiceWrap: { alignItems: 'center', gap: 6 },
  choiceBtn: {
    width: CHOICE_SIZE, height: CHOICE_SIZE, borderRadius: 20,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 3,
  },
  choiceBtnBorder: { borderWidth: 2, borderColor: Colors.border },
  choiceCorrect: { borderWidth: 4, borderColor: '#16A34A' },
  choiceWrong: { borderWidth: 4, borderColor: '#DC2626', opacity: 0.7 },
  choiceCheckWrap: { position: 'absolute' },
  choiceName: { fontSize: 13, fontWeight: '700', color: Colors.darkText },

  correctBanner: { alignItems: 'center', gap: 12 },
  correctBannerText: { fontSize: 18, fontWeight: '800', color: '#16A34A', textAlign: 'center' },
  nextBtn: { paddingHorizontal: 32, paddingVertical: 14, borderRadius: 50 },
  nextBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },

  tryAgainBanner: { alignItems: 'center', gap: 10 },
  tryAgainText: { fontSize: 16, fontWeight: '700', color: '#D97706' },
  retryBtn: { paddingHorizontal: 28, paddingVertical: 12, borderRadius: 50, backgroundColor: '#D97706' },
  retryBtnText: { color: '#fff', fontSize: 14, fontWeight: '800' },

  backToLearnBtn: { marginTop: 16 },
  backToLearnText: { fontSize: 13, color: Colors.subtitle, fontWeight: '600' },
});
