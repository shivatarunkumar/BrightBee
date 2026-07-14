import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  SafeAreaView, ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppStackParamList } from '../types/navigation';
import { Colors } from '../constants/Colors';
import { childApi, friendlyError } from '../services/api';

type Props = {
  navigation: NativeStackNavigationProp<AppStackParamList, 'AddChild'>;
};

const AVATARS = ['🐻', '🦊', '🐼', '🐨', '🦁', '🐸', '🐧', '🦄', '🐯', '🐮', '🐷', '🐙'];

const CLASSES = [
  { key: 'Nursery', label: 'Nursery' },
  { key: 'LKG',     label: 'LKG' },
  { key: 'UKG',     label: 'UKG' },
  { key: 'Class1',  label: 'Class 1' },
  { key: 'Class2',  label: 'Class 2' },
  { key: 'Class3',  label: 'Class 3' },
  { key: 'Class4',  label: 'Class 4' },
  { key: 'Class5',  label: 'Class 5' },
];

export default function AddChildScreen({ navigation }: Props) {
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState('🐻');
  const [dob, setDob] = useState('');          // YYYY-MM-DD
  const [currentClass, setCurrentClass] = useState('');
  const [loading, setLoading] = useState(false);

  const handleDobChange = (text: string) => {
    // Auto-insert dashes: YYYY-MM-DD
    const digits = text.replace(/\D/g, '').slice(0, 8);
    let formatted = digits;
    if (digits.length > 4) formatted = digits.slice(0, 4) + '-' + digits.slice(4);
    if (digits.length > 6) formatted = digits.slice(0, 4) + '-' + digits.slice(4, 6) + '-' + digits.slice(6);
    setDob(formatted);
  };

  const handleSave = async () => {
    if (!name.trim()) { Alert.alert('Required', 'Please enter the child\'s name.'); return; }
    if (!currentClass) { Alert.alert('Required', 'Please select a class.'); return; }

    // Validate DOB if provided
    let dobValue: string | null = null;
    if (dob.trim()) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dob)) {
        Alert.alert('Invalid date', 'Date of birth must be in YYYY-MM-DD format.'); return;
      }
      dobValue = dob;
    }

    setLoading(true);
    try {
      await childApi.create({
        name: name.trim(),
        avatar,
        date_of_birth: dobValue,
        current_class: currentClass,
      });
      navigation.goBack();
    } catch (err: any) {
      console.error('[AddChild]', err?.message);
      Alert.alert('Could not save', friendlyError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color={Colors.darkText} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Child</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        {/* Avatar picker */}
        <Text style={styles.label}>Choose an Avatar</Text>
        <View style={styles.avatarGrid}>
          {AVATARS.map((emoji) => (
            <TouchableOpacity
              key={emoji}
              style={[styles.avatarOption, avatar === emoji && styles.avatarSelected]}
              onPress={() => setAvatar(emoji)}
              activeOpacity={0.7}
            >
              <Text style={styles.avatarEmoji}>{emoji}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Preview */}
        <View style={styles.previewRow}>
          <View style={styles.previewCircle}>
            <Text style={styles.previewEmoji}>{avatar}</Text>
          </View>
          <Text style={styles.previewName}>{name || 'Your child'}</Text>
        </View>

        {/* Name */}
        <Text style={styles.label}>Child's Name <Text style={styles.required}>*</Text></Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Aarav"
          placeholderTextColor={Colors.placeholder}
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
          returnKeyType="next"
        />

        {/* Date of birth */}
        <Text style={styles.label}>Date of Birth <Text style={styles.optional}>(optional)</Text></Text>
        <TextInput
          style={styles.input}
          placeholder="YYYY-MM-DD  e.g. 2018-06-15"
          placeholderTextColor={Colors.placeholder}
          value={dob}
          onChangeText={handleDobChange}
          keyboardType="number-pad"
          returnKeyType="done"
        />

        {/* Class selector */}
        <Text style={styles.label}>Class <Text style={styles.required}>*</Text></Text>
        <View style={styles.classGrid}>
          {CLASSES.map((cls) => (
            <TouchableOpacity
              key={cls.key}
              style={[styles.classChip, currentClass === cls.key && styles.classChipSelected]}
              onPress={() => setCurrentClass(cls.key)}
              activeOpacity={0.8}
            >
              <Text style={[styles.classChipText, currentClass === cls.key && styles.classChipTextSelected]}>
                {cls.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Save button */}
        <TouchableOpacity
          style={[styles.saveBtn, loading && { opacity: 0.6 }]}
          onPress={handleSave}
          activeOpacity={0.85}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color={Colors.white} />
            : <Text style={styles.saveBtnText}>Save Child Profile</Text>
          }
        </TouchableOpacity>
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

  label: { fontSize: 14, fontWeight: '600', color: Colors.darkText, marginBottom: 10 },
  required: { color: '#DC2626' },
  optional: { fontSize: 12, fontWeight: '400', color: Colors.subtitle },

  avatarGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  avatarOption: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: Colors.lightGray,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: 'transparent',
  },
  avatarSelected: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  avatarEmoji: { fontSize: 28 },

  previewRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: Colors.white, borderRadius: 16, padding: 16,
    marginBottom: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  previewCircle: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: Colors.primaryLight, justifyContent: 'center', alignItems: 'center',
  },
  previewEmoji: { fontSize: 30 },
  previewName: { fontSize: 18, fontWeight: '700', color: Colors.darkText },

  input: {
    borderWidth: 1.5, borderColor: Colors.border, borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 15, color: Colors.darkText, backgroundColor: Colors.white, marginBottom: 24,
  },

  classGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 32 },
  classChip: {
    paddingHorizontal: 18, paddingVertical: 10, borderRadius: 50,
    backgroundColor: Colors.white, borderWidth: 1.5, borderColor: Colors.border,
  },
  classChipSelected: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  classChipText: { fontSize: 14, fontWeight: '600', color: Colors.subtitle },
  classChipTextSelected: { color: Colors.white },

  saveBtn: {
    backgroundColor: Colors.primary, paddingVertical: 16,
    borderRadius: 50, alignItems: 'center',
  },
  saveBtnText: { color: Colors.white, fontSize: 16, fontWeight: '700' },
});
