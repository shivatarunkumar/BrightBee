import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../types/navigation';
import { Colors } from '../constants/Colors';

type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'Welcome'>;
};

export default function WelcomeScreen({ navigation }: Props) {
  return (
    <SafeAreaView style={styles.container}>
      {/* Illustration */}
      <View style={styles.illustrationSection}>
        <View style={styles.illustrationBox}>
          <View style={styles.banner}>
            <Text style={styles.bannerText}>WELCOME</Text>
          </View>
          <Text style={styles.beeEmoji}>🐝</Text>
          {/* Decorative shapes */}
          <View style={styles.shapeCircle} />
          <View style={styles.shapeRect} />
        </View>
      </View>

      {/* Content */}
      <View style={styles.contentSection}>
        <Text style={styles.title}>Welcome to BrightBee</Text>
        <Text style={styles.subtitle}>
          We're excited to help your child learn and grow with fun AI-powered tests.
        </Text>

        {/* Pagination dots */}
        <View style={styles.dotsContainer}>
          <View style={[styles.dot, styles.dotActive]} />
          <View style={styles.dot} />
          <View style={styles.dot} />
        </View>

        {/* Login button */}
        <TouchableOpacity
          style={styles.loginButton}
          onPress={() => navigation.navigate('Login')}
          activeOpacity={0.85}
        >
          <Text style={styles.loginButtonText}>Login</Text>
        </TouchableOpacity>

        {/* Create account */}
        <TouchableOpacity
          onPress={() => navigation.navigate('Register')}
          activeOpacity={0.7}
        >
          <Text style={styles.createAccountText}>Create an account</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  illustrationSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingTop: 20,
  },
  illustrationBox: {
    width: '78%',
    aspectRatio: 1,
    backgroundColor: Colors.primaryLight,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  banner: {
    position: 'absolute',
    top: 24,
    backgroundColor: Colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 7,
    borderRadius: 8,
    zIndex: 1,
  },
  bannerText: {
    color: Colors.white,
    fontWeight: '700',
    fontSize: 13,
    letterSpacing: 1.5,
  },
  beeEmoji: {
    fontSize: 80,
    marginTop: 24,
  },
  shapeCircle: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(67,97,238,0.15)',
  },
  shapeRect: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: 'rgba(67,97,238,0.1)',
  },
  contentSection: {
    paddingHorizontal: 32,
    paddingBottom: 44,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.darkText,
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.subtitle,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 8,
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginVertical: 28,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.border,
  },
  dotActive: {
    width: 22,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
  loginButton: {
    width: '100%',
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 50,
    alignItems: 'center',
    marginBottom: 22,
  },
  loginButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  createAccountText: {
    color: Colors.primary,
    fontSize: 15,
    fontWeight: '600',
  },
});
