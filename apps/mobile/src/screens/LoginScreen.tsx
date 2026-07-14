import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons, AntDesign } from '@expo/vector-icons';
import Checkbox from 'expo-checkbox';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../types/navigation';
import { Colors } from '../constants/Colors';
import { authApi, TokenStorage, friendlyError } from '../services/api';

type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'Login'>;
  onLogin: (name: string) => void;
};

export default function LoginScreen({ navigation, onLogin }: Props) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!identifier || !password) {
      Alert.alert('Missing fields', 'Please enter your email or username and password.');
      return;
    }
    setLoading(true);
    try {
      const tokens = await authApi.login({ identifier: identifier.trim(), password });
      await TokenStorage.saveTokens(tokens.access_token, tokens.refresh_token);
      onLogin(identifier.includes('@') ? identifier.split('@')[0] : identifier);
    } catch (err: any) {
      console.error('[Login] error:', err?.message, err?.body);
      Alert.alert('Login failed', friendlyError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!identifier.trim() || !identifier.includes('@')) {
      Alert.alert('Enter your email', 'Type your email address above then tap Forgot Password.');
      return;
    }
    try {
      const res = await authApi.forgotPassword(identifier.trim());
      // In dev mode the token is returned directly
      const msg = res.reset_token
        ? `Reset token (dev):\n${res.reset_token}`
        : res.message;
      Alert.alert('Password Reset', msg);
    } catch {
      Alert.alert('Error', 'Could not send reset link. Please try again.');
    }
  };

  const handleGoogleSignIn = () => {
    Alert.alert('Coming soon', 'Google sign-in will be added in a future update.');
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <Text style={styles.title}>Login</Text>
          <Text style={styles.subtitle}>Welcome back to the app</Text>

          {/* Email or Username */}
          <Text style={styles.label}>Email or Username</Text>
          <TextInput
            style={styles.input}
            placeholder="hello@example.com or username"
            placeholderTextColor={Colors.placeholder}
            value={identifier}
            onChangeText={setIdentifier}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="next"
          />

          {/* Password row label */}
          <View style={styles.passwordLabelRow}>
            <Text style={styles.label}>Password</Text>
            <TouchableOpacity onPress={handleForgotPassword} activeOpacity={0.7}>
              <Text style={styles.forgotPassword}>Forgot Password?</Text>
            </TouchableOpacity>
          </View>

          {/* Password input */}
          <View style={styles.passwordInputContainer}>
            <TextInput
              style={styles.passwordInput}
              placeholder="••••••••••••••"
              placeholderTextColor={Colors.placeholder}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              returnKeyType="done"
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              style={styles.eyeButton}
              activeOpacity={0.7}
            >
              <Ionicons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={22}
                color={Colors.subtitle}
              />
            </TouchableOpacity>
          </View>

          {/* Remember me */}
          <View style={styles.rememberMeRow}>
            <Checkbox
              value={rememberMe}
              onValueChange={setRememberMe}
              color={rememberMe ? Colors.primary : undefined}
              style={styles.checkbox}
            />
            <Text style={styles.rememberMeText}>Keep me signed in</Text>
          </View>

          {/* Login button */}
          <TouchableOpacity
            style={[styles.loginButton, loading && { opacity: 0.6 }]}
            onPress={handleLogin}
            activeOpacity={0.85}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color={Colors.white} />
              : <Text style={styles.loginButtonText}>Login</Text>
            }
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or sign in with</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Google button */}
          <TouchableOpacity
            style={styles.googleButton}
            onPress={handleGoogleSignIn}
            activeOpacity={0.8}
          >
            <AntDesign name="google" size={20} color="#EA4335" />
            <Text style={styles.googleButtonText}>Continue with Google</Text>
          </TouchableOpacity>

          {/* Create account */}
          <TouchableOpacity
            onPress={() => navigation.navigate('Register')}
            style={styles.createAccountButton}
            activeOpacity={0.7}
          >
            <Text style={styles.createAccountText}>Create an account</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 40,
  },
  title: {
    fontSize: 34,
    fontWeight: '700',
    color: Colors.darkText,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.subtitle,
    marginBottom: 36,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.darkText,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: Colors.darkText,
    marginBottom: 20,
    backgroundColor: Colors.white,
  },
  passwordLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  forgotPassword: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '600',
  },
  passwordInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 16,
    marginBottom: 20,
    backgroundColor: Colors.white,
  },
  passwordInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 15,
    color: Colors.darkText,
  },
  eyeButton: {
    padding: 4,
  },
  rememberMeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 28,
    gap: 10,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
  },
  rememberMeText: {
    fontSize: 14,
    color: Colors.darkText,
  },
  loginButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 50,
    alignItems: 'center',
    marginBottom: 28,
  },
  loginButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  dividerText: {
    fontSize: 13,
    color: Colors.subtitle,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.lightGray,
    paddingVertical: 15,
    borderRadius: 50,
    gap: 10,
    marginBottom: 36,
  },
  googleButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.darkText,
  },
  createAccountButton: {
    alignItems: 'center',
  },
  createAccountText: {
    color: Colors.primary,
    fontSize: 15,
    fontWeight: '600',
  },
});
