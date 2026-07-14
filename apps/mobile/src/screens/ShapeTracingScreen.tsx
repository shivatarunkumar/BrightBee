import React, { useRef, useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView,
  PanResponder, Dimensions, Animated,
} from 'react-native';
import Svg, { Path, Circle, Ellipse } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { AppStackParamList } from '../types/navigation';
import { Colors } from '../constants/Colors';

type Props = {
  navigation: NativeStackNavigationProp<AppStackParamList, 'ShapeTracing'>;
  route: RouteProp<AppStackParamList, 'ShapeTracing'>;
};

const CANVAS_W = Math.min(Dimensions.get('window').width - 40, 340);
const CANVAS_H = 340;
const cx = CANVAS_W / 2;
const cy = CANVAS_H / 2;

type Shape = {
  id: string;
  name: string;
  emoji: string;
  color: string;
  bg: string;
  guidePath: string;
  fact: string;
};

function starPath(x: number, y: number, R: number, r: number, pts: number): string {
  const coords = [];
  for (let i = 0; i < pts * 2; i++) {
    const angle = (i * Math.PI) / pts - Math.PI / 2;
    const radius = i % 2 === 0 ? R : r;
    coords.push({ x: x + radius * Math.cos(angle), y: y + radius * Math.sin(angle) });
  }
  return coords.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ') + ' Z';
}

function heartPath(x: number, y: number, s: number): string {
  const t = s / 100;
  return `M ${x},${y + 30 * t} C ${x},${y - 10 * t} ${x - 60 * t},${y - 60 * t} ${x - 60 * t},${y - 30 * t} C ${x - 60 * t},${y - 70 * t} ${x},${y - 50 * t} ${x},${y - 10 * t} C ${x},${y - 50 * t} ${x + 60 * t},${y - 70 * t} ${x + 60 * t},${y - 30 * t} C ${x + 60 * t},${y - 60 * t} ${x},${y - 10 * t} ${x},${y + 30 * t} Z`;
}

const SHAPES: Shape[] = [
  {
    id: 'circle',
    name: 'Circle',
    emoji: '⭕',
    color: '#EF4444',
    bg: '#FEF2F2',
    guidePath: `M ${cx},${cy - 110} A 110,110 0 1,1 ${cx - 0.01},${cy - 110} Z`,
    fact: 'A circle is perfectly round — like the sun!',
  },
  {
    id: 'square',
    name: 'Square',
    emoji: '⬜',
    color: '#3B82F6',
    bg: '#EFF6FF',
    guidePath: `M ${cx - 110},${cy - 110} L ${cx + 110},${cy - 110} L ${cx + 110},${cy + 110} L ${cx - 110},${cy + 110} Z`,
    fact: 'A square has 4 equal sides — like a window!',
  },
  {
    id: 'triangle',
    name: 'Triangle',
    emoji: '🔺',
    color: '#22C55E',
    bg: '#F0FDF4',
    guidePath: `M ${cx},${cy - 120} L ${cx + 120},${cy + 100} L ${cx - 120},${cy + 100} Z`,
    fact: 'A triangle has 3 sides — like a pizza slice!',
  },
  {
    id: 'rectangle',
    name: 'Rectangle',
    emoji: '▬',
    color: '#8B5CF6',
    bg: '#F5F3FF',
    guidePath: `M ${cx - 130},${cy - 80} L ${cx + 130},${cy - 80} L ${cx + 130},${cy + 80} L ${cx - 130},${cy + 80} Z`,
    fact: 'A rectangle has 4 sides but 2 are longer — like a door!',
  },
  {
    id: 'star',
    name: 'Star',
    emoji: '⭐',
    color: '#EAB308',
    bg: '#FEFCE8',
    guidePath: starPath(cx, cy, 110, 50, 5),
    fact: 'Stars have 5 points — like the ones in the sky!',
  },
  {
    id: 'heart',
    name: 'Heart',
    emoji: '❤️',
    color: '#EC4899',
    bg: '#FDF2F8',
    guidePath: heartPath(cx, cy + 20, 130),
    fact: 'Hearts mean love — you can draw one for someone special!',
  },
];

function pointsToPath(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return '';
  return pts.reduce((acc, p, i) =>
    i === 0 ? `M ${p.x.toFixed(1)},${p.y.toFixed(1)}` : `${acc} L ${p.x.toFixed(1)},${p.y.toFixed(1)}`, '');
}

export default function ShapeTracingScreen({ navigation, route }: Props) {
  const { childName } = route.params;
  const [shapeIdx, setShapeIdx] = useState(0);
  const [drawnPaths, setDrawnPaths] = useState<string[]>([]);
  const [currentPoints, setCurrentPoints] = useState<{ x: number; y: number }[]>([]);
  const [done, setDone] = useState(false);
  const [allDone, setAllDone] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const shape = SHAPES[shapeIdx];
  const isLast = shapeIdx === SHAPES.length - 1;
  const speakShape = () => {
    Speech.stop();
    Speech.speak(`${shape.name}!`, {
      language: 'en-US',
      pitch: 1.45,
      rate: 0.7,
      onDone: () => {
        Speech.speak(shape.fact, { language: 'en-US', pitch: 1.2, rate: 0.78 });
      },
    });
  };

  const celebrate = useCallback(() => {
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 1.1, duration: 130, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 130, useNativeDriver: true }),
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
            setDone(true);
            celebrate();
          }
          return [];
        });
      },
    })
  ).current;

  const handleClear = () => {
    setDrawnPaths([]);
    setCurrentPoints([]);
    setDone(false);
  };

  const handleNext = () => {
    Speech.stop();
    if (isLast) {
      setAllDone(true);
    } else {
      setShapeIdx((i) => i + 1);
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
          <Text style={styles.headerTitle}>Shape Tracing</Text>
          <View style={{ width: 34 }} />
        </View>
        <View style={styles.celebrationView}>
          <Text style={styles.celebrationEmoji}>🌟🔷🌟</Text>
          <Text style={styles.celebrationTitle}>Amazing, {childName}!</Text>
          <Text style={styles.celebrationSub}>You traced all 6 shapes!</Text>
          <View style={styles.shapesRow}>
            {SHAPES.map(s => <Text key={s.id} style={styles.shapeEmoji}>{s.emoji}</Text>)}
          </View>
          <TouchableOpacity
            style={styles.againBtn}
            onPress={() => { setAllDone(false); setShapeIdx(0); handleClear(); }}
            activeOpacity={0.85}
          >
            <Text style={styles.againBtnText}>Practise Again</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.backBtn2}
            onPress={() => navigation.goBack()}
            activeOpacity={0.85}
          >
            <Text style={styles.backBtn2Text}>Back to Activities</Text>
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
        <Text style={styles.headerTitle}>Shape Tracing</Text>
        <Text style={styles.progress}>{shapeIdx + 1}/{SHAPES.length}</Text>
      </View>

      {/* Progress dots */}
      <View style={styles.progressDots}>
        {SHAPES.map((s, i) => (
          <TouchableOpacity
            key={s.id}
            style={[styles.dot, i <= shapeIdx && { backgroundColor: shape.color }]}
            onPress={() => { setShapeIdx(i); handleClear(); }}
            activeOpacity={0.7}
          />
        ))}
      </View>

      <View style={styles.body}>
        {/* Shape info */}
        <Animated.View style={[styles.shapeInfo, { backgroundColor: shape.bg, transform: [{ scale: scaleAnim }] }]}>
          <Text style={styles.shapeEmojiBig}>{shape.emoji}</Text>
          <View style={{ flex: 1 }}>
            <Text style={[styles.shapeName, { color: shape.color }]}>{shape.name}</Text>
            <Text style={styles.shapeFact}>{shape.fact}</Text>
          </View>
          <TouchableOpacity
            style={[styles.speakBtn, { backgroundColor: shape.color + '22', borderColor: shape.color }]}
            onPress={speakShape}
            activeOpacity={0.7}
          >
            <Ionicons name="volume-medium-outline" size={18} color={shape.color} />
          </TouchableOpacity>
        </Animated.View>

        {/* Drawing canvas */}
        <View
          style={[styles.canvas, { width: CANVAS_W, height: CANVAS_H }]}
          {...panResponder.panHandlers}
        >
          <Svg width={CANVAS_W} height={CANVAS_H} pointerEvents="none">
            {/* Guide shape — dashed */}
            <Path
              d={shape.guidePath}
              stroke="#D1D5DB"
              strokeWidth={16}
              strokeDasharray="20,12"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill={shape.color + '0C'}
            />
            {/* User's drawn paths */}
            {drawnPaths.map((p, i) => (
              <Path key={i} d={p} stroke={shape.color} strokeWidth={9}
                strokeLinecap="round" strokeLinejoin="round" fill="none" opacity={0.9} />
            ))}
            {currentPoints.length > 1 && (
              <Path d={pointsToPath(currentPoints)} stroke={shape.color} strokeWidth={9}
                strokeLinecap="round" strokeLinejoin="round" fill="none" opacity={0.9} />
            )}
          </Svg>
          {done && (
            <View style={[styles.doneOverlay, { backgroundColor: shape.color }]}>
              <Text style={styles.doneOverlayText}>⭐ Great shape!</Text>
            </View>
          )}
        </View>

        {/* Buttons */}
        <View style={styles.btnRow}>
          <TouchableOpacity style={styles.clearBtn} onPress={handleClear} activeOpacity={0.8}>
            <Ionicons name="refresh" size={18} color={Colors.subtitle} />
            <Text style={styles.clearBtnText}>Clear</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.nextBtn, { backgroundColor: shape.color }, !done && styles.nextBtnDisabled]}
            onPress={handleNext}
            activeOpacity={0.85}
            disabled={!done}
          >
            <Text style={styles.nextBtnText}>{isLast ? 'Finish 🎉' : 'Next Shape →'}</Text>
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

  progressDots: { flexDirection: 'row', justifyContent: 'center', gap: 10, paddingVertical: 12 },
  dot: { width: 12, height: 12, borderRadius: 6, backgroundColor: Colors.border },

  body: { flex: 1, alignItems: 'center', paddingHorizontal: 20, paddingTop: 4 },

  shapeInfo: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    width: '100%', borderRadius: 16, padding: 14, marginBottom: 12,
  },
  shapeEmojiBig: { fontSize: 36 },
  shapeName: { fontSize: 18, fontWeight: '800', marginBottom: 2 },
  shapeFact: { fontSize: 11, color: Colors.subtitle, lineHeight: 16 },
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
    position: 'absolute', bottom: 14, alignSelf: 'center',
    paddingHorizontal: 20, paddingVertical: 7, borderRadius: 20,
  },
  doneOverlayText: { color: '#fff', fontWeight: '800', fontSize: 14 },

  btnRow: { flexDirection: 'row', gap: 12, marginTop: 14, width: '100%' },
  clearBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 13, paddingHorizontal: 18, borderRadius: 50,
    borderWidth: 2, borderColor: Colors.border,
  },
  clearBtnText: { fontSize: 14, fontWeight: '700', color: Colors.subtitle },
  nextBtn: { flex: 1, paddingVertical: 13, borderRadius: 50, alignItems: 'center' },
  nextBtnDisabled: { opacity: 0.35 },
  nextBtnText: { color: '#fff', fontSize: 14, fontWeight: '800' },

  celebrationView: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  celebrationEmoji: { fontSize: 52, marginBottom: 16 },
  celebrationTitle: { fontSize: 26, fontWeight: '900', color: Colors.darkText, textAlign: 'center', marginBottom: 8 },
  celebrationSub: { fontSize: 15, color: Colors.subtitle, marginBottom: 20 },
  shapesRow: { flexDirection: 'row', gap: 10, marginBottom: 32 },
  shapeEmoji: { fontSize: 30 },
  againBtn: {
    backgroundColor: Colors.primary, paddingHorizontal: 36, paddingVertical: 16, borderRadius: 50, marginBottom: 14,
  },
  againBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  backBtn2: {
    paddingHorizontal: 24, paddingVertical: 12, borderRadius: 50,
    borderWidth: 2, borderColor: Colors.border,
  },
  backBtn2Text: { fontSize: 14, fontWeight: '700', color: Colors.subtitle },
});
