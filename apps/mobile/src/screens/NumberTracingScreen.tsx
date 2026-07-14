import React, { useRef, useState, useCallback } from 'react';
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
  navigation: NativeStackNavigationProp<AppStackParamList, 'NumberTracing'>;
  route: RouteProp<AppStackParamList, 'NumberTracing'>;
};

const CANVAS_W = Math.min(Dimensions.get('window').width - 40, 320);
const CANVAS_H = 240;

const NUMBERS = [
  { n: 1,  emoji: '🍎',  color: '#EF4444', bg: '#FEF2F2' },
  { n: 2,  emoji: '🍊🍊', color: '#F97316', bg: '#FFF7ED' },
  { n: 3,  emoji: '⭐⭐⭐', color: '#EAB308', bg: '#FEFCE8' },
  { n: 4,  emoji: '🐸🐸🐸🐸', color: '#22C55E', bg: '#F0FDF4' },
  { n: 5,  emoji: '🫐🫐🫐🫐🫐', color: '#3B82F6', bg: '#EFF6FF' },
  { n: 6,  emoji: '🍇🍇🍇🍇🍇🍇', color: '#8B5CF6', bg: '#F5F3FF' },
  { n: 7,  emoji: '🌸🌸🌸🌸🌸🌸🌸', color: '#EC4899', bg: '#FDF2F8' },
  { n: 8,  emoji: '🦋🦋🦋🦋🦋🦋🦋🦋', color: '#0D9488', bg: '#F0FDFA' },
  { n: 9,  emoji: '🌙🌙🌙🌙🌙🌙🌙🌙🌙', color: '#6366F1', bg: '#EEF2FF' },
  { n: 10, emoji: '🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉', color: '#D97706', bg: '#FFFBEB' },
];

function pointsToPath(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return '';
  return pts.reduce((acc, p, i) =>
    i === 0 ? `M ${p.x.toFixed(1)},${p.y.toFixed(1)}` : `${acc} L ${p.x.toFixed(1)},${p.y.toFixed(1)}`, '');
}

export default function NumberTracingScreen({ navigation, route }: Props) {
  const { childName } = route.params;
  const [numIdx, setNumIdx] = useState(0);
  const [drawnPaths, setDrawnPaths] = useState<string[]>([]);
  const [currentPoints, setCurrentPoints] = useState<{ x: number; y: number }[]>([]);
  const [traced, setTraced] = useState(false);
  const [practiceMode, setPracticeMode] = useState(false);
  const [practiceCount, setPracticeCount] = useState(0);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const autoClearTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const practiceModeRef = useRef(false);

  const item = NUMBERS[numIdx];
  practiceModeRef.current = practiceMode;

  const NUMBER_WORDS = ['one','two','three','four','five','six','seven','eight','nine','ten'];

  const speakNumber = () => {
    Speech.stop();
    const word = NUMBER_WORDS[numIdx];
    const spelled = word.toUpperCase().split('').join('.  ');
    // "1" → pause → "O. N. E." → pause → "1!"
    Speech.speak(`${item.n}`, {
      language: 'en-US', pitch: 1.5, rate: 0.7,
      onDone: () => setTimeout(() => {
        Speech.speak(spelled, {
          language: 'en-US', pitch: 1.35, rate: 0.6,
          onDone: () => setTimeout(() => {
            Speech.speak(`${item.n}!`, {
              language: 'en-US', pitch: 1.5, rate: 0.7,
            });
          }, 350),
        });
      }, 350),
    });
  };

  const celebrate = useCallback(() => {
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 1.12, duration: 120, useNativeDriver: true }),
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

  const goTo = (idx: number) => {
    if (autoClearTimer.current) clearTimeout(autoClearTimer.current);
    Speech.stop();
    setPracticeMode(false);
    setPracticeCount(0);
    setNumIdx(idx);
    setDrawnPaths([]);
    setCurrentPoints([]);
    setTraced(false);
  };

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

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color={Colors.darkText} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Number Tracing</Text>
        <View style={{ width: 34 }} />
      </View>

      {/* Number nav */}
      <View style={[styles.numNav, { backgroundColor: item.bg }]}>
        <TouchableOpacity
          onPress={() => numIdx > 0 && goTo(numIdx - 1)}
          disabled={numIdx === 0}
          style={[styles.navArrow, numIdx === 0 && styles.navDisabled]}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={28} color={numIdx === 0 ? Colors.border : item.color} />
        </TouchableOpacity>
        <View style={styles.numInfo}>
          <Text style={[styles.numDisplay, { color: item.color }]}>{item.n}</Text>
          <Text style={styles.numWord}>{item.n} of 10</Text>
        </View>
        <TouchableOpacity
          onPress={() => numIdx < 9 && goTo(numIdx + 1)}
          disabled={numIdx === 9}
          style={[styles.navArrow, numIdx === 9 && styles.navDisabled]}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-forward" size={28} color={numIdx === 9 ? Colors.border : item.color} />
        </TouchableOpacity>
      </View>

      {/* Instruction */}
      <View style={styles.instructRow}>
        <Text style={styles.instructText}>
          ✏️ Trace the number{' '}
          <Text style={[styles.instructNum, { color: item.color }]}>{item.n}</Text>
        </Text>
        {traced && <Text style={styles.starBadge}>⭐ Well done!</Text>}
      </View>

      {/* Tracing canvas — outside ScrollView so vertical swipes draw, not scroll */}
      <View style={styles.canvasWrap}>
        <View
          style={[styles.canvas, { width: CANVAS_W, height: CANVAS_H }]}
          {...panResponder.panHandlers}
        >
          <Svg width={CANVAS_W} height={CANVAS_H} pointerEvents="none">
            {/* Ghost fill */}
            <SvgText fill={item.color + '18'} fontSize={190} fontWeight="bold"
              x={CANVAS_W / 2} y={200} textAnchor="middle">{item.n}</SvgText>
            {/* Dashed outline */}
            <SvgText fill="none" stroke={item.color + '55'} strokeWidth={5}
              strokeDasharray="12,7" fontSize={190} fontWeight="bold"
              x={CANVAS_W / 2} y={200} textAnchor="middle">{item.n}</SvgText>
            {/* Drawn paths */}
            {drawnPaths.map((p, i) => (
              <Path key={i} d={p} stroke={item.color} strokeWidth={10}
                strokeLinecap="round" strokeLinejoin="round" fill="none" opacity={0.9} />
            ))}
            {currentPoints.length > 1 && (
              <Path d={pointsToPath(currentPoints)} stroke={item.color} strokeWidth={10}
                strokeLinecap="round" strokeLinejoin="round" fill="none" opacity={0.9} />
            )}
          </Svg>
        </View>
      </View>

      {/* Scrollable section: count box + buttons + quick jump */}
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Counting objects — tap to hear */}
        <TouchableOpacity
          style={[styles.countBox, { backgroundColor: item.bg }]}
          onPress={speakNumber}
          activeOpacity={0.8}
        >
          <View style={styles.countHeader}>
            <Text style={[styles.countLabel, { color: item.color }]}>Count with me!</Text>
            <Ionicons name="volume-medium-outline" size={18} color={item.color} />
          </View>
          <Text style={styles.countEmojis}>{item.emoji}</Text>
          <Text style={[styles.countNum, { color: item.color }]}>{item.n}</Text>
        </TouchableOpacity>

        {/* Keep Practising toggle */}
        <TouchableOpacity
          style={[styles.practiceToggle, practiceMode && { backgroundColor: item.color + '18', borderColor: item.color }]}
          onPress={togglePracticeMode}
          activeOpacity={0.8}
        >
          <Ionicons name={practiceMode ? 'repeat' : 'repeat-outline'} size={16} color={practiceMode ? item.color : Colors.subtitle} />
          <Text style={[styles.practiceToggleText, practiceMode && { color: item.color }]}>
            {practiceMode ? `Keep Practising  ·  ${practiceCount} time${practiceCount !== 1 ? 's' : ''}` : 'Keep Practising'}
          </Text>
          <View style={[styles.togglePill, practiceMode && { backgroundColor: item.color }]}>
            <View style={[styles.toggleDot, practiceMode && styles.toggleDotOn]} />
          </View>
        </TouchableOpacity>

        {/* Buttons */}
        <View style={styles.btnRow}>
          {!practiceMode && (
            <TouchableOpacity style={styles.clearBtn} onPress={handleClear} activeOpacity={0.8}>
              <Ionicons name="refresh" size={18} color={Colors.subtitle} />
              <Text style={styles.clearBtnText}>Clear</Text>
            </TouchableOpacity>
          )}
          {numIdx < 9 ? (
            <TouchableOpacity
              style={[styles.nextBtn, { backgroundColor: item.color }, (!traced || practiceMode) && styles.nextBtnDisabled]}
              onPress={() => goTo(numIdx + 1)}
              disabled={!traced || practiceMode}
              activeOpacity={0.85}
            >
              <Text style={styles.nextBtnText}>Next Number →</Text>
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

        {/* 1-10 quick jump */}
        <View style={styles.quickRow}>
          {NUMBERS.map((num, i) => (
            <TouchableOpacity
              key={num.n}
              style={[styles.quickChip, i === numIdx && { backgroundColor: item.color, borderColor: item.color }]}
              onPress={() => goTo(i)}
              activeOpacity={0.7}
            >
              <Text style={[styles.quickChipText, i === numIdx && { color: '#fff' }]}>{num.n}</Text>
            </TouchableOpacity>
          ))}
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
  headerTitle: { fontSize: 17, fontWeight: '700', color: Colors.darkText },

  numNav: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 10,
  },
  navArrow: { padding: 8 },
  navDisabled: { opacity: 0.3 },
  numInfo: { alignItems: 'center' },
  numDisplay: { fontSize: 40, fontWeight: '900', lineHeight: 48 },
  numWord: { fontSize: 12, color: Colors.subtitle },

  canvasWrap: { alignItems: 'center', paddingHorizontal: 20, marginBottom: 4 },
  scroll: { alignItems: 'center', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 32 },

  instructRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, marginBottom: 10,
  },
  instructText: { fontSize: 14, color: Colors.subtitle, fontWeight: '600', flex: 1 },
  instructNum: { fontWeight: '900', fontSize: 16 },
  starBadge: { fontSize: 14, fontWeight: '800', color: '#D97706' },

  canvas: {
    backgroundColor: Colors.white, borderRadius: 20, overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
  },

  countBox: {
    width: '100%', borderRadius: 18, padding: 16, alignItems: 'center', marginBottom: 16,
  },
  countHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8,
  },
  countLabel: { fontSize: 13, fontWeight: '700' },
  countEmojis: { fontSize: 22, textAlign: 'center', lineHeight: 34, marginBottom: 6 },
  countNum: { fontSize: 28, fontWeight: '900' },

  practiceToggle: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    width: '100%', paddingHorizontal: 16, paddingVertical: 11,
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
  btnRow: { flexDirection: 'row', gap: 12, width: '100%', marginBottom: 16 },
  clearBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 13, paddingHorizontal: 18, borderRadius: 50,
    borderWidth: 2, borderColor: Colors.border,
  },
  clearBtnText: { fontSize: 14, fontWeight: '700', color: Colors.subtitle },
  nextBtn: { flex: 1, paddingVertical: 13, borderRadius: 50, alignItems: 'center' },
  nextBtnDisabled: { opacity: 0.35 },
  nextBtnText: { color: '#fff', fontSize: 14, fontWeight: '800' },

  quickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', width: '100%' },
  quickChip: {
    width: 38, height: 38, borderRadius: 19,
    borderWidth: 1.5, borderColor: Colors.border,
    justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.white,
  },
  quickChipText: { fontSize: 14, fontWeight: '800', color: Colors.darkText },
});
