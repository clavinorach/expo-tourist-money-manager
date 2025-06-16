import React from 'react';
import { Stack } from 'expo-router';
import { useDatabase } from '../hooks/useDatabase';
import { View, ActivityIndicator, Text } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { enableScreens } from 'react-native-screens';

// Enable screens for better performance
enableScreens();

export default function RootLayout() {
  const { isDbLoading, dbError } = useDatabase();

  if (isDbLoading) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" />
        </View>
      </GestureHandlerRootView>
    );
  }

  if (dbError) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text>Error loading database.</Text>
        </View>
      </GestureHandlerRootView>
    );
  }
  
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack screenOptions={{ gestureEnabled: true }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="add-edit-transaction" options={{ presentation: 'modal', title: "Add/Edit Transaction" }} />
      </Stack>
    </GestureHandlerRootView>
  );
}