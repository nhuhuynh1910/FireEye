/* App.js - Mobile App Root Entry Point */
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SystemProvider } from './src/store/SystemContext';
import { DashboardScreen } from './src/screens/DashboardScreen';

// Polyfill react-native-safe-area-context if not installed yet for mockup run
import { SafeAreaView, StyleSheet, View } from 'react-native';

export default function App() {
  return (
    <SystemProvider>
      <SafeAreaProvider>
        <SafeAreaView style={styles.container}>
          <StatusBar style="light" backgroundColor="#07080a" />
          <DashboardScreen />
        </SafeAreaView>
      </SafeAreaProvider>
    </SystemProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#07080a',
  },
});
