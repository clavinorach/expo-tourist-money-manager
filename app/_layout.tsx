import React from 'react';
import { Stack } from 'expo-router';
import { useDatabase } from '../hooks/useDatabase';
import { View, ActivityIndicator, Text } from 'react-native';

export default function RootLayout() {
  const { isDbLoading, dbError } = useDatabase();

  if (isDbLoading) {
    return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator size="large" /></View>;
  }

  if (dbError) {
    return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><Text>Error loading database.</Text></View>;
  }
  
  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="add-edit-transaction" options={{ presentation: 'modal', title: "Add/Edit Transaction" }} />
    </Stack>
  );
}