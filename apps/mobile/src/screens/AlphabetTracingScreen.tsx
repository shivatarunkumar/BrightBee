import React, { useRef, useState, useCallback, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView,
  PanResponder, Dimensions, ScrollView, Animated,
} from 'react-native';
import Svg, { Path, Text as SvgText } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { AppStackParamList } from '../types/navigation';
import { Colors } from '../constants/Colors';

type Props = {
  navigation: NativeStackNavigationProp<AppStackParamList, 'AlphabetTracing'>;
  route: RouteProp<AppStackParamList, 'AlphabetTracing'>;
};

const CANVAS_W = Math.min(Dimensions.get('window').width - 40, 340);
const CANVAS_H = 240;

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

// Cheerful color per letter (cycles)
const LETTER_COLORS = [
  '#4361EE', '#7B2FBE', '#0D9488', '#D97706', '#DC2626',
  '#16A34A', '#2563EB', '#9333EA', '#EA580C', '#0891B2',
];

function getColor(idx: number) {
  return LETTER_COLORS[idx % LETTER_COLORS.length];
}

const LETTER_WORDS: Record<string, { word: string; emoji: string }> = {
  A: { word: 'Apple',      emoji: '🍎' },
  B: { word: 'Ball',       emoji: '⚽' },
  C: { word: 'Cat',        emoji: '🐱' },
  D: { word: 'Dog',        emoji: '🐶' },
  E: { word: 'Elephant',   emoji: '🐘' },
  F: { word: 'Fish',       emoji: '🐟' },
  G: { word: 'Grapes',     emoji: '🍇' },
  H: { word: 'Hat',        emoji: '🎩' },
  I: { word: 'Ice Cream',  emoji: '🍦' },
  J: { word: 'Jellyfish',  emoji: '🪼' },
  K: { word: 'Kite',       emoji: '🪁' },
  L: { word: 'Lion',       emoji: '🦁' },
  M: { word: 'Monkey',     emoji: '🐒' },
  N: { word: 'Nest',       emoji: '🪺' },
  O: { word: 'Orange',     emoji: '🍊' },
  P: { word: 'Penguin',    emoji: '🐧' },
  Q: { word: 'Queen',      emoji: '👑' },
  R: { word: 'Rainbow',    emoji: '🌈' },
  S: { word: 'Sun',        emoji: '☀️' },
  T: { word: 'Tiger',      emoji: '🐯' },
  U: { word: 'Umbrella',   emoji: '☂️' },
  V: { word: 'Violin',     emoji: '🎻' },
  W: { word: 'Watermelon', emoji: '🍉' },
  X: { word: 'Xylophone',  emoji: '🎵' },
  Y: { word: 'Yak',        emoji: '🐃' },
  Z: { word: 'Zebra',      emoji: '🦓' },
};

function pointsToPath(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return '';
  return pts.reduce((acc, p, i) =>
    i === 0 ? `M ${p.x.toFixed(1)},${p.y.toFixed(1)}` : `${acc} L ${p.x.toFixed(1)},${p.y.toFixed(1)}`, '');
}

export default function AlphabetTracingScreen({ navigation, route }: Props) {
  const { childName } = route.params;
  const [letterIdx, setLetterIdx] = useState(0);
  const [drawnPaths, setDrawnPaths] = useState<string[]>([]);
  const [currentPoints, setCurrentPoints] = useState<{ x: number; y: number }[]>([]);
  const [traced, setTraced] = useState(false);
  const [practiceMode, setPracticeMode] = useState(false);
  const [practiceCount, setPracticeCount] = useState(0);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const wordAnim = useRef(new Animated.Value(0)).current;
  const autoClearTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const practiceModeRef = useRef(false);

  const letter = LETTERS[letterIdx];
  const color = getColor(letterIdx);
  const wordInfo = LETTER_WORDS[letter];
  practiceModeRef.current = practiceMode;

  // Bounce the word card in whenever the letter changes
  useEffect(() => {
    wordAnim.setValue(0);
    Animated.spring(wordAnim, {
      toValue: 1,
      tension: 60,
      friction: 6,
      useNativeDriver: true,
    }).start();
  }, [letterIdx]);

  // Word card tap — "A! ... A for Apple!" in two chained calls
  const speakWord = () => {
    Speech.stop();
    Speech.speak(`${letter}!`, {
      language: 'en-US',
      pitch: 1.5,
      rate: 0.7,
      onDone: () => {
        Speech.speak(`${letter}  for  ${wordInfo.word}!`, {
          language: 'en-US',
          pitch: 1.3,
          rate: 0.68,
        });
      },
    });
  };

  const celebrate = useCallback(() => {
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 1.1, duration: 120, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 120, useNativeDriver: true }),
    ]).start();
  }, [scaleAnim]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderGrant: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        setCurrentPoints([{ x: locationX, y: locationY }]);
      },
      onPanResponderMove: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        setCurrentPoints((prev) => [...prev, { x: locationX, y: locationY }]);
      },
      onPanResponderRelease: () => {
        setCurrentPoints((prev) => {
          if (prev.length > 2) {
            setDrawnPaths((d) => [...d, pointsToPath(prev)]);
            setTraced(true);
            celebrate();
            if (practiceModeRef.current) {
              if (autoClearTimer.current) clearTimeout(autoClearTimer.current);
              autoClearTimer.current = setTimeout(() => {
                setDrawnPaths([]);
                setCurrentPoints([]);
                setTraced(false);
                setPracticeCount((c) => c + 1);
              }, 1000);
            }
          }
          return [];
        });
      },
    })
  ).current;

  const handleClear = () => {
    if (autoClearTimer.current) clearTimeout(autoClearTimer.current);
    setDrawnPaths([]);
    setCurrentPoints([]);
    setTraced(false);
  };

  const togglePracticeMode = () => {
    if (autoClearTimer.current) clearTimeout(autoClearTimer.current);
    setPracticeMode((v) => !v);
    setPracticeCount(0);
    setDrawnPaths([]);
    setCurrentPoints([]);
    setTraced(false);
  };

  const goTo = (idx: number) => {
    if (autoClearTimer.current) clearTimeout(autoClearTimer.current);
    Speech.stop();
    setPracticeMode(false);
    setPracticeCount(0);
    setLetterIdx(idx);
    setDrawnPaths([]);
    setCurrentPoints([]);
    setTraced(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color={Colors.darkText} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Alphabet Tracing</Text>
        <View style={{ width: 34 }} />
      </View>

      {/* Letter navigator — prev / letter counter / next */}
      <View style={[styles.letterNav, { backgroundColor: color + '18' }]}>
        <TouchableOpacity
          style={[styles.navArrow, letterIdx === 0 && styles.navArrowDisabled]}
          onPress={() => letterIdx > 0 && goTo(letterIdx - 1)}
          activeOpacity={0.7}
          disabled={letterIdx === 0}
        >
          <Ionicons name="chevron-back" size={26} color={letterIdx === 0 ? Colors.border : color} />
        </TouchableOpacity>

        <View style={styles.letterInfo}>
          <Text style={[styles.letterCounter, { color }]}>{letter}</Text>
          <Text style={styles.letterIndex}>{letterIdx + 1} of {LETTERS.length}</Text>
        </View>

        <TouchableOpacity
          style={[styles.navArrow, letterIdx === LETTERS.length - 1 && styles.navArrowDisabled]}
          onPress={() => letterIdx < LETTERS.length - 1 && goTo(letterIdx + 1)}
          activeOpacity={0.7}
          disabled={letterIdx === LETTERS.length - 1}
        >
          <Ionicons name="chevron-forward" size={26} color={letterIdx === LETTERS.length - 1 ? Colors.border : color} />
        </TouchableOpacity>
      </View>

      {/* Instruction */}
      <View style={styles.instructionRow}>
        <Text style={styles.instructionText}>
          ✏️  Trace the letter <Text style={[styles.instructionLetter, { color }]}>{letter}</Text> with your finger
        </Text>
        {traced && (
          <Animated.Text style={[styles.starBadge, { transform: [{ scale: scaleAnim }] }]}>⭐ Brilliant!</Animated.Text>
        )}
      </View>

      {/* Canvas */}
      <View style={styles.canvasWrap}>
        <View
          style={[styles.canvas, { width: CANVAS_W, height: CANVAS_H }]}
          {...panResponder.panHandlers}
        >
          <Svg width={CANVAS_W} height={CANVAS_H} pointerEvents="none">
            {/* Ghost filled letter — light background guide */}
            <SvgText
              fill={color + '18'}
              fontSize={200}
              fontWeight="bold"
              x={CANVAS_W / 2}
              y={200}
              textAnchor="middle"
            >
              {letter}
            </SvgText>
            {/* Dashed outline guide */}
            <SvgText
              fill="none"
              stroke={color + '55'}
              strokeWidth={6}
              strokeDasharray="14,8"
              fontSize={200}
              fontWeight="bold"
              x={CANVAS_W / 2}
              y={200}
              textAnchor="middle"
            >
              {letter}
            </SvgText>

            {/* User's drawn paths */}
            {drawnPaths.map((p, i) => (
              <Path
                key={i}
                d={p}
                stroke={color}
                strokeWidth={10}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
                opacity={0.9}
              />
            ))}
            {currentPoints.length > 1 && (
              <Path
                d={pointsToPath(currentPoints)}
                stroke={color}
                strokeWidth={10}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
                opacity={0.9}
              />
            )}
          </Svg>
        </View>
      </View>

      {/* Keep Practising toggle */}
      <TouchableOpacity
        style={[styles.practiceToggle, practiceMode && { backgroundColor: color + '18', borderColor: color }]}
        onPress={togglePracticeMode}
        activeOpacity={0.8}
      >
        <Ionicons name={practiceMode ? 'repeat' : 'repeat-outline'} size={16} color={practiceMode ? color : Colors.subtitle} />
        <Text style={[styles.practiceToggleText, practiceMode && { color }]}>
          {practiceMode ? `Keep Practising  ·  ${practiceCount} time${practiceCount !== 1 ? 's' : ''}` : 'Keep Practising'}
        </Text>
        <View style={[styles.togglePill, practiceMode && { backgroundColor: color }]}>
          <View style={[styles.toggleDot, practiceMode && styles.toggleDotOn]} />
        </View>
      </TouchableOpacity>

      {/* Clear + action buttons */}
      <View style={styles.btnRow}>
        {!practiceMode && (
          <TouchableOpacity style={styles.clearBtn} onPress={handleClear} activeOpacity={0.8}>
            <Ionicons name="refresh" size={18} color={Colors.subtitle} />
            <Text style={styles.clearBtnText}>Clear</Text>
          </TouchableOpacity>
        )}
        {letterIdx < LETTERS.length - 1 ? (
          <TouchableOpacity
            style={[styles.nextBtn, { backgroundColor: color }, (!traced || practiceMode) && styles.nextBtnDisabled]}
            onPress={() => goTo(letterIdx + 1)}
            disabled={!traced || practiceMode}
            activeOpacity={0.85}
          >
            <Text style={styles.nextBtnText}>Next Letter →</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.nextBtn, { backgroundColor: '#16A34A' }, practiceMode && styles.nextBtnDisabled]}
            onPress={() => navigation.goBack()}
            disabled={practiceMode}
            activeOpacity={0.85}
          >
            <Text style={styles.nextBtnText}>All Done! 🎉</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Word card — A is for Apple */}
      <Animated.View
        style={[
          styles.wordCard,
          { backgroundColor: color + '15', borderColor: color + '40' },
          { transform: [{ scale: wordAnim }, { translateY: wordAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }], opacity: wordAnim },
        ]}
      >
        <TouchableOpacity style={styles.wordCardInner} onPress={speakWord} activeOpacity={0.8}>
          <Animated.Text style={styles.wordEmoji}>{wordInfo.emoji}</Animated.Text>
          <Text style={styles.wordForText}>
            <Text style={[styles.wordLetter, { color }]}>{letter}</Text>
            {' '}is for{' '}
            <Text style={[styles.wordName, { color }]}>{wordInfo.word}</Text>
          </Text>
          <View style={[styles.wordSpeakIcon, { backgroundColor: color + '22' }]}>
            <Ionicons name="volume-medium-outline" size={20} color={color} />
          </View>
        </TouchableOpacity>
      </Animated.View>

      {/* A-Z quick jump */}
      <View style={styles.quickJump}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickJumpInner}>
          {LETTERS.map((l, i) => (
            <TouchableOpacity
              key={l}
              style={[
                styles.quickChip,
                i === letterIdx && { backgroundColor: color, borderColor: color },
              ]}
              onPress={() => goTo(i)}
              activeOpacity={0.7}
            >
              <Text style={[styles.quickChipText, i === letterIdx && { color: '#fff' }]}>{l}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
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

  letterNav: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 12,
  },
  navArrow: { padding: 8 },
  navArrowDisabled: { opacity: 0.3 },
  letterInfo: { alignItems: 'center' },
  letterCounter: { fontSize: 36, fontWeight: '900' },
  letterIndex: { fontSize: 12, color: Colors.subtitle, marginTop: 2 },
  instructionRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, marginBottom: 8,
  },
  instructionText: { fontSize: 14, color: Colors.subtitle, fontWeight: '600' },
  instructionLetter: { fontWeight: '900', fontSize: 16 },
  starBadge: { fontSize: 14, fontWeight: '800', color: '#D97706' },

  canvasWrap: { alignItems: 'center', paddingHorizontal: 20, marginBottom: 12 },
  canvas: {
    backgroundColor: Colors.white, borderRadius: 20, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
  },

  practiceToggle: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 20, paddingHorizontal: 16, paddingVertical: 11,
    borderRadius: 14, borderWidth: 1.5, borderColor: Colors.border,
    backgroundColor: Colors.white, marginBottom: 10,
  },
  practiceToggleText: { flex: 1, fontSize: 13, fontWeight: '700', color: Colors.subtitle },
  togglePill: {
    width: 36, height: 20, borderRadius: 10, backgroundColor: Colors.border,
    justifyContent: 'center', paddingHorizontal: 2,
  },
  toggleDot: {
    width: 16, height: 16, borderRadius: 8, backgroundColor: Colors.white,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 2, elevation: 2,
  },
  toggleDotOn: { alignSelf: 'flex-end' },
  btnRow: { flexDirection: 'row', gap: 12, paddingHorizontal: 20, marginBottom: 12 },
  clearBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 12, paddingHorizontal: 18, borderRadius: 50,
    borderWidth: 2, borderColor: Colors.border,
  },
  clearBtnText: { fontSize: 14, fontWeight: '700', color: Colors.subtitle },
  nextBtn: { flex: 1, paddingVertical: 12, borderRadius: 50, alignItems: 'center' },
  nextBtnDisabled: { opacity: 0.35 },
  nextBtnText: { color: '#fff', fontSize: 14, fontWeight: '800' },

  wordCard: {
    marginHorizontal: 20, marginBottom: 12, borderRadius: 20, borderWidth: 1.5,
    overflow: 'hidden',
  },
  wordCardInner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 16,
  },
  wordEmoji: { fontSize: 44 },
  wordForText: { fontSize: 16, color: Colors.subtitle, fontWeight: '600', textAlign: 'center' },
  wordLetter: { fontSize: 20, fontWeight: '900' },
  wordName: { fontSize: 20, fontWeight: '900' },
  wordSpeakIcon: {
    width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center',
  },

  quickJump: { borderTopWidth: 1, borderTopColor: Colors.border, backgroundColor: Colors.white },
  quickJumpInner: { paddingHorizontal: 12, paddingVertical: 10, gap: 6 },
  quickChip: {
    width: 34, height: 34, borderRadius: 17, borderWidth: 1.5,
    borderColor: Colors.border, justifyContent: 'center', alignItems: 'center',
    backgroundColor: Colors.white,
  },
  quickChipText: { fontSize: 13, fontWeight: '700', color: Colors.darkText },
});
