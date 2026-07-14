import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AppStackParamList } from '../types/navigation';
import HomeScreen from '../screens/HomeScreen';
import AddChildScreen from '../screens/AddChildScreen';
import ChildDashboardScreen from '../screens/ChildDashboardScreen';
import ChildHistoryScreen from '../screens/ChildHistoryScreen';
import SubjectDetailScreen from '../screens/SubjectDetailScreen';
import TestConfigScreen from '../screens/TestConfigScreen';
import TestScreen from '../screens/TestScreen';
import ResultsScreen from '../screens/ResultsScreen';
import NurseryExercisesScreen from '../screens/NurseryExercisesScreen';
import LineTracingScreen from '../screens/LineTracingScreen';
import AlphabetTracingScreen from '../screens/AlphabetTracingScreen';
import NumberTracingScreen from '../screens/NumberTracingScreen';
import ColoursScreen from '../screens/ColoursScreen';
import ShapeTracingScreen from '../screens/ShapeTracingScreen';

const Stack = createNativeStackNavigator<AppStackParamList>();

export default function AppNavigator({ parentName, onLogout }: { parentName: string; onLogout?: () => void }) {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Home" initialParams={{ parentName, onLogout }}>
        {(props) => <HomeScreen {...props} onLogout={onLogout} />}
      </Stack.Screen>
      <Stack.Screen name="AddChild" component={AddChildScreen} />
      <Stack.Screen name="ChildDashboard" component={ChildDashboardScreen} />
      <Stack.Screen name="SubjectDetail" component={SubjectDetailScreen} />
      <Stack.Screen name="ChildHistory" component={ChildHistoryScreen} />
      <Stack.Screen name="TestConfig" component={TestConfigScreen} />
      <Stack.Screen name="Test" component={TestScreen} />
      <Stack.Screen name="Results" component={ResultsScreen} />
      {/* Nursery / early learning */}
      <Stack.Screen name="NurseryExercises" component={NurseryExercisesScreen} />
      <Stack.Screen name="LineTracing" component={LineTracingScreen} />
      <Stack.Screen name="AlphabetTracing" component={AlphabetTracingScreen} />
      <Stack.Screen name="NumberTracing" component={NumberTracingScreen} />
      <Stack.Screen name="Colours" component={ColoursScreen} />
      <Stack.Screen name="ShapeTracing" component={ShapeTracingScreen} />
    </Stack.Navigator>
  );
}
