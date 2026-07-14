import React, { useRef, useState, useCallback, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView,
  PanResponder, Dimensions, Animated,
} from 'react-native';
import Svg, { Path, Circle, Defs, Marker } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { AppStackParamList } from '../types/navigation';
import { Colors } from '../constants/Colors';

type Props = {
  navigation: NativeStackNavigationProp<AppStackParamList, 'LineTracing'>;
  route: RouteProp<AppStackParamList, 'LineTracing'>;
};

const CANVAS_W = Math.min(Dimensions.get('window').width - 40, 340);
const CANVAS_H = 380;

type Exercise = {
  id: string;
  title: string;
  emoji: string;
  hint: string;
  color: string;
  bg: string;
  guidePath: string;
  start: { x: number; y: number };
  end: { x: number; y: number };
};

const cx = CANVAS_W / 2;

const EXERCISES: Exercise[] = [
  {
    id: 'standing',
    title: 'Standing Line',
    emoji: '|',
    hint: 'Draw from the green dot down to the red dot',
    color: '#4361EE',
    bg: '#EEF0FF',
    guidePath: `M ${cx},40 L ${cx},340`,
    start: { x: cx, y: 40 },
    end: { x: cx, y: 340 },
  },
  {
    id: 'sleeping',
    title: 'Sleeping Line',
    emoji: '—',
    hint: 'Draw from the green dot across to the red dot',
    color: '#0D9488',
    bg: '#CCFBF1',
    guidePath: `M 30,190 L ${CANVAS_W - 30},190`,
    start: { x: 30, y: 190 },
    end: { x: CANVAS_W - 30, y: 190 },
  },
  {
    id: 'left_curve',
    title: 'Left Curve',
    emoji: '(',
    hint: 'Draw a curve that bends to the left',
    color: '#7B2FBE',
    bg: '#F3E8FF',
    guidePath: `M ${cx + 60},40 Q ${cx - 100},190 ${cx + 60},340`,
    start: { x: cx + 60, y: 40 },
    end: { x: cx + 60, y: 340 },
  },
  {
    id: 'right_curve',
    title: 'Right Curve',
    emoji: ')',
    hint: 'Draw a curve that bends to the right',
    color: '#D97706',
    bg: '#FEF3C7',
    guidePath: `M ${cx - 60},40 Q ${cx + 100},190 ${cx - 60},340`,
    start: { x: cx - 60, y: 40 },
    end: { x: cx - 60, y: 340 },
  },
];

function pointsToPath(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return '';
  return pts.reduce((acc, p, i) =>
    i === 0 ? `M ${p.x.toFixed(1)},${p.y.toFixed(1)}` : `${acc} L ${p.x.toFixed(1)},${p.y.toFixed(1)}`, '');
}

export default function LineTracingScreen({ navigation, route }: Props) {
  const { childName } = route.params;
  const [exIdx, setExIdx] = useState(0);
  const [drawnPaths, setDrawnPaths] = useState<string[]>([]);
  const [currentPoints, setCurrentPoints] = useState<{ x: number; y: number }[]>([]);
  const [done, setDone] = useState(false);
  const [allDone, setAllDone] = useState(false);
  const [practiceMode, setPracticeMode] = useState(false);
  const [practiceCount, setPracticeCount] = useState(0);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const autoClearTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const practiceModeRef = useRef(false);

  const ex = EXERCISES[exIdx];
  const isLast = exIdx === EXERCISES.length - 1;
  practiceModeRef.current = practiceMode;

  // Clear pending auto-clear timer whenever exercise changes or component unmounts
  useEffect(() => {
    return () => {
      if (autoClearTimer.current) clearTimeout(autoClearTimer.current);
    };
  }, [exIdx]);
  const speakLine = () => {
    Speech.stop();
    Speech.speak(`${ex.title}!`, {
      language: 'en-US',
      pitch: 1.45,
      rate: 0.7,
      onDone: () => {
        Speech.speak(ex.hint, { language: 'en-US', pitch: 1.2, rate: 0.75 });
      },
    });
  };

  const celebrate = useCallback(() => {
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 1.12, duration: 150, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
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
            const path = pointsToPath(prev);
            setDrawnPaths((d) => [...d, path]);
            setDone(true);
            celebrate();
            // In practice mode: show "Great!" for 1s then auto-clear
            // We read practiceMode via ref so the stale closure gets the live value
            if (practiceModeRef.current) {
              if (autoClearTimer.current) clearTimeout(autoClearTimer.current);
              autoClearTimer.current = setTimeout(() => {
                setDrawnPaths([]);
                setCurrentPoints([]);
                setDone(false);
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
    setDone(false);
  };

  const togglePracticeMode = () => {
    if (autoClearTimer.current) clearTimeout(autoClearTimer.current);
    setPracticeMode((v) => !v);
    setPracticeCount(0);
    setDrawnPaths([]);
    setCurrentPoints([]);
    setDone(false);
  };

  const handleNext = () => {
    Speech.stop();
    if (autoClearTimer.current) clearTimeout(autoClearTimer.current);
    setPracticeMode(false);
    setPracticeCount(0);
    if (isLast) {
      setAllDone(true);
    } else {
      setExIdx((i) => i + 1);
      handleClear();
    }
  };

  if (allDone) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={22} color={Colors.darkText} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Lines Practice</Text>
          <View style={{ width: 34 }} />
        </View>
        <View style={styles.celebrationView}>
          <Text style={styles.celebrationEmoji}>🌟</Text>
          <Text style={styles.celebrationTitle}>Amazing, {childName}!</Text>
          <Text style={styles.celebrationSubtitle}>You practised all 4 lines!</Text>
          <TouchableOpacity
            style={styles.doneBtn}
            onPress={() => { setAllDone(false); setExIdx(0); handleClear(); }}
            activeOpacity={0.85}
          >
            <Text style={styles.doneBtnText}>Practise Again</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.backHomeBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.85}
          >
            <Text style={styles.backHomeBtnText}>Back to Activities</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color={Colors.darkText} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Lines Practice</Text>
        <Text style={styles.progress}>{exIdx + 1}/{EXERCISES.length}</Text>
      </View>

      {/* Progress dots */}
      <View style={styles.progressDots}>
        {EXERCISES.map((_, i) => (
          <View key={i} style={[styles.dot, i <= exIdx && { backgroundColor: ex.color }]} />
        ))}
      </View>

      <View style={styles.body}>
        {/* Exercise label */}
        <Animated.View style={[styles.exLabel, { transform: [{ scale: scaleAnim }], backgroundColor: ex.bg }]}>
          <Text style={styles.exEmoji}>{ex.emoji}</Text>
          <View style={{ flex: 1 }}>
            <Text style={[styles.exTitle, { color: ex.color }]}>{ex.title}</Text>
            <Text style={styles.exHint}>{ex.hint}</Text>
          </View>
          <TouchableOpacity
            style={[styles.speakBtn, { backgroundColor: ex.color + '22', borderColor: ex.color }]}
            onPress={speakLine}
            activeOpacity={0.7}
          >
            <Ionicons name="volume-medium-outline" size={18} color={ex.color} />
          </TouchableOpacity>
        </Animated.View>

        {/* Drawing canvas */}
        <View
          style={[styles.canvas, { width: CANVAS_W, height: CANVAS_H }]}
          {...panResponder.panHandlers}
        >
          <Svg width={CANVAS_W} height={CANVAS_H} pointerEvents="none">
            {/* Guide path — dashed */}
            <Path
              d={ex.guidePath}
              stroke="#D1D5DB"
              strokeWidth={18}
              strokeDasharray="22,14"
              strokeLinecap="round"
              fill="none"
            />
            {/* Start dot — green */}
            <Circle cx={ex.start.x} cy={ex.start.y} r={16} fill="#22C55E" />
            <Circle cx={ex.start.x} cy={ex.start.y} r={8} fill="#fff" />
            {/* End dot — red */}
            <Circle cx={ex.end.x} cy={ex.end.y} r={16} fill="#EF4444" />
            <Circle cx={ex.end.x} cy={ex.end.y} r={8} fill="#fff" />

            {/* Drawn paths */}
            {drawnPaths.map((p, i) => (
              <Path key={i} d={p} stroke={ex.color} strokeWidth={10} strokeLinecap="round" strokeLinejoin="round" fill="none" opacity={0.85} />
            ))}
            {/* Current stroke */}
            {currentPoints.length > 1 && (
              <Path
                d={pointsToPath(currentPoints)}
                stroke={ex.color}
                strokeWidth={10}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
                opacity={0.85}
              />
            )}
          </Svg>

          {done && (
            <View style={styles.doneOverlay}>
              <Text style={styles.doneOverlayText}>⭐ Great job!</Text>
            </View>
          )}
        </View>

        {/* Practice mode toggle */}
        <TouchableOpacity
          style={[styles.practiceToggle, practiceMode && { backgroundColor: ex.color + '18', borderColor: ex.color }]}
          onPress={togglePracticeMode}
          activeOpacity={0.8}
        >
          <Ionicons
            name={practiceMode ? 'repeat' : 'repeat-outline'}
            size={16}
            color={practiceMode ? ex.color : Colors.subtitle}
          />
          <Text style={[styles.practiceToggleText, practiceMode && { color: ex.color }]}>
            {practiceMode
              ? `Keep Practising  ·  ${practiceCount} time${practiceCount !== 1 ? 's' : ''}`
              : 'Keep Practising'}
          </Text>
          <View style={[styles.togglePill, practiceMode && { backgroundColor: ex.color }]}>
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
          <TouchableOpacity
            style={[
              styles.nextBtn,
              { backgroundColor: ex.color },
              (!done || practiceMode) && styles.nextBtnDisabled,
            ]}
            onPress={handleNext}
            activeOpacity={0.85}
            disabled={!done || practiceMode}
          >
            <Text style={styles.nextBtnText}>{isLast ? 'Finish 🎉' : 'Next →'}</Text>
          </TouchableOpacity>
        </View>
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
  progress: { fontSize: 14, fontWeight: '700', color: Colors.subtitle },

  progressDots: { flexDirection: 'row', justifyContent: 'center', gap: 8, paddingVertical: 12 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.border },

  body: { flex: 1, alignItems: 'center', paddingTop: 8, paddingHorizontal: 20 },

  exLabel: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    width: '100%', borderRadius: 16, paddingHorizontal: 18, paddingVertical: 14, marginBottom: 16,
  },
  exEmoji: { fontSize: 32, fontWeight: '900' },
  exTitle: { fontSize: 18, fontWeight: '800' },
  exHint: { fontSize: 12, color: Colors.subtitle, marginTop: 2 },
  speakBtn: {
    width: 36, height: 36, borderRadius: 18, borderWidth: 1.5,
    justifyContent: 'center', alignItems: 'center',
  },

  canvas: {
    backgroundColor: Colors.white, borderRadius: 20, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
    position: 'relative',
  },

  doneOverlay: {
    position: 'absolute', bottom: 16, alignSelf: 'center',
    backgroundColor: '#22C55E', paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20,
  },
  doneOverlayText: { color: '#fff', fontWeight: '800', fontSize: 15 },

  practiceToggle: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    width: '100%', paddingHorizontal: 16, paddingVertical: 11,
    borderRadius: 14, borderWidth: 1.5, borderColor: Colors.border,
    backgroundColor: Colors.white, marginTop: 14,
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

  btnRow: { flexDirection: 'row', gap: 12, marginTop: 12, width: '100%' },
  clearBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 14, paddingHorizontal: 20, borderRadius: 50,
    borderWidth: 2, borderColor: Colors.border,
  },
  clearBtnText: { fontSize: 14, fontWeight: '700', color: Colors.subtitle },
  nextBtn: { flex: 1, paddingVertical: 14, borderRadius: 50, alignItems: 'center' },
  nextBtnDisabled: { opacity: 0.35 },
  nextBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },

  celebrationView: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  celebrationEmoji: { fontSize: 80, marginBottom: 16 },
  celebrationTitle: { fontSize: 28, fontWeight: '900', color: Colors.darkText, textAlign: 'center', marginBottom: 8 },
  celebrationSubtitle: { fontSize: 16, color: Colors.subtitle, textAlign: 'center', marginBottom: 36 },
  doneBtn: {
    backgroundColor: Colors.primary, paddingHorizontal: 36, paddingVertical: 16, borderRadius: 50, marginBottom: 14,
  },
  doneBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  backHomeBtn: {
    paddingHorizontal: 24, paddingVertical: 12, borderRadius: 50,
    borderWidth: 2, borderColor: Colors.border,
  },
  backHomeBtnText: { fontSize: 14, fontWeight: '700', color: Colors.subtitle },
});
