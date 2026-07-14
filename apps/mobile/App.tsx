import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator } from 'react-native';
import AuthNavigator from './src/navigation/AuthNavigator';
import AppNavigator from './src/navigation/AppNavigator';
import { TokenStorage } from './src/services/api';
import { Colors } from './src/constants/Colors';

type AuthState =
  | { status: 'loading' }
  | { status: 'unauthenticated' }
  | { status: 'authenticated'; parentName: string };

export default function App() {
  const [auth, setAuth] = useState<AuthState>({ status: 'loading' });

  useEffect(() => {
    TokenStorage.getAccessToken().then((token) => {
      setAuth(token ? { status: 'authenticated', parentName: 'Parent' } : { status: 'unauthenticated' });
    });
  }, []);

  const handleLogin = (name: string) => setAuth({ status: 'authenticated', parentName: name });

  const handleLogout = async () => {
    await TokenStorage.clearTokens();
    setAuth({ status: 'unauthenticated' });
  };

  if (auth.status === 'loading') {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.white }}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <StatusBar style="dark" />
      {auth.status === 'authenticated' ? (
        <AppNavigator parentName={auth.parentName} onLogout={handleLogout} />
      ) : (
        <AuthNavigator onLogin={handleLogin} />
      )}
    </NavigationContainer>
  );
}
