import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, FlatList, TouchableOpacity, Alert, PanResponder, Animated, ActivityIndicator } from 'react-native';
import { Link, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getFinancialSummary, getRecentTransactions, Transaction, FinancialSummary, deleteTransaction } from '../../database';
import dayjs from 'dayjs';

export default function DashboardScreen() {
  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const swipeableRefs = useRef<{ [key: number]: Animated.Value }>({});

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const summaryData = await getFinancialSummary();
      const recentTxs = await getRecentTransactions(10);
      setSummary(summaryData);
      setTransactions(recentTxs);
      // Initialize swipeable refs for each transaction
      recentTxs.forEach(tx => {
        if (!swipeableRefs.current[tx.id]) {
          swipeableRefs.current[tx.id] = new Animated.Value(0);
        }
      });
    } catch (e) {
      console.error('Error loading dashboard data:', e);
      setError(e instanceof Error ? e.message : 'Could not load dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      loadData();
    }, [])
  );

  const handleDeleteTransaction = async (id: number) => {
    Alert.alert(
      "Delete Transaction",
      "Are you sure you want to delete this transaction?",
      [
        {
          text: "Cancel",
          style: "cancel",
          onPress: () => {
            // Reset swipe position
            Animated.spring(swipeableRefs.current[id], {
              toValue: 0,
              useNativeDriver: true,
            }).start();
          }
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setIsLoading(true);
              await deleteTransaction(id);
              await loadData(); // Reload data after deletion
            } catch (error) {
              console.error('Error deleting transaction:', error);
              Alert.alert("Error", "Failed to delete transaction");
            } finally {
              setIsLoading(false);
            }
          }
        }
      ]
    );
  };
  
  const formatCurrency = (amount: number, currency: string | undefined) => {
    return new Intl.NumberFormat('id-ID', { 
      style: 'currency', 
      currency: currency || 'IDR' 
    }).format(amount);
  }

  const remainingBudget = (summary?.budget || 0) - (summary?.totalSpent || 0);

  const createPanResponder = (id: number) => {
    return PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 10;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dx < 0) { // Only allow left swipe
          swipeableRefs.current[id].setValue(gestureState.dx);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx < -100) { // Threshold for delete action
          handleDeleteTransaction(id);
        } else {
          // Reset position
          Animated.spring(swipeableRefs.current[id], {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    });
  };

  const renderTransactionItem = ({ item }: { item: Transaction }) => {
    const panResponder = createPanResponder(item.id);
    const translateX = swipeableRefs.current[item.id].interpolate({
      inputRange: [-100, 0],
      outputRange: [-100, 0],
      extrapolate: 'clamp',
    });

    // Create animated value for delete button opacity
    const deleteButtonOpacity = swipeableRefs.current[item.id].interpolate({
      inputRange: [-100, -50, 0],
      outputRange: [1, 0.5, 0],
      extrapolate: 'clamp',
    });

    return (
      <View style={styles.txItemContainer}>
        <Animated.View
          style={[
            styles.txItem,
            { transform: [{ translateX }] }
          ]}
          {...panResponder.panHandlers}
        >
          <Link href={{ pathname: "/add-edit-transaction", params: { transactionId: item.id } }} asChild>
            <TouchableOpacity style={styles.txItemContent}>
              <View>
                <Text style={styles.txDescription}>{item.description}</Text>
                <Text style={styles.txCategory}>{item.category} - {dayjs(item.timestamp).format('MMM D, HH:mm')}</Text>
              </View>
              <Text style={styles.txAmount}>-{formatCurrency(item.amount, item.currency)}</Text>
            </TouchableOpacity>
          </Link>
        </Animated.View>
        <Animated.View style={[styles.deleteButton, { opacity: deleteButtonOpacity }]}>
          <Ionicons name="trash-outline" size={24} color="white" />
        </Animated.View>
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Dashboard</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3498db" />
          <Text style={styles.loadingText}>Loading dashboard data...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Dashboard</Text>
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#e74c3c" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadData}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Dashboard</Text>
         <Link href="/add-edit-transaction" asChild>
            <TouchableOpacity style={styles.addButton}>
                <Ionicons name="add-circle" size={32} color="#27ae60" />
            </TouchableOpacity>
        </Link>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.summaryGrid}>
            <View style={styles.card}>
                <Text style={styles.cardTitle}>Remaining Budget</Text>
                <Text style={styles.cardValue}>{formatCurrency(remainingBudget, summary?.homeCurrency)}</Text>
            </View>
             <View style={styles.card}>
                <Text style={styles.cardTitle}>Total Spent</Text>
                <Text style={styles.cardValue}>{formatCurrency(summary?.totalSpent || 0, summary?.homeCurrency)}</Text>
            </View>
             <View style={styles.card}>
                <Text style={styles.cardTitle}>Spent Today</Text>
                <Text style={styles.cardValue}>{formatCurrency(summary?.todaySpent || 0, summary?.homeCurrency)}</Text>
            </View>
             <View style={styles.card}>
                <Text style={styles.cardTitle}>Total Budget</Text>
                <Text style={styles.cardValue}>{formatCurrency(summary?.budget || 0, summary?.homeCurrency)}</Text>
            </View>
        </View>

        <Text style={styles.sectionTitle}>Recent Transactions</Text>
        <FlatList
          data={transactions}
          keyExtractor={item => item.id.toString()}
          scrollEnabled={false}
          renderItem={renderTransactionItem}
          ListEmptyComponent={<Text style={{textAlign: 'center', marginTop: 20}}>No transactions yet.</Text>}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#ecf0f1' },
    header: { paddingTop: 50, paddingHorizontal: 20, paddingBottom: 10, backgroundColor: 'white', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    headerTitle: { fontSize: 28, fontWeight: 'bold', color: '#34495e'},
    addButton: { padding: 5 },
    content: { padding: 20 },
    summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
    card: { backgroundColor: 'white', borderRadius: 8, padding: 15, width: '48%', marginBottom: 15, elevation: 2 },
    cardTitle: { fontSize: 14, color: '#95a5a6' },
    cardValue: { fontSize: 18, fontWeight: 'bold', color: '#2c3e50', marginTop: 5 },
    sectionTitle: { fontSize: 20, fontWeight: 'bold', color: '#34495e', marginTop: 20, marginBottom: 10 },
    txItemContainer: {
      position: 'relative',
      marginBottom: 10,
    },
    txItem: {
      backgroundColor: 'white',
      borderRadius: 8,
      overflow: 'hidden',
    },
    txItemContent: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 15,
    },
    txDescription: {
      fontSize: 16,
      color: '#2c3e50',
    },
    txCategory: {
      fontSize: 12,
      color: '#7f8c8d',
      marginTop: 4,
    },
    txAmount: {
      fontSize: 16,
      fontWeight: 'bold',
      color: '#e74c3c',
    },
    deleteButton: {
      position: 'absolute',
      right: 0,
      top: 0,
      bottom: 0,
      width: 100,
      backgroundColor: '#e74c3c',
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    loadingText: {
      marginTop: 10,
      fontSize: 16,
      color: '#7f8c8d',
    },
    errorContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    errorText: {
      marginTop: 10,
      fontSize: 16,
      color: '#e74c3c',
      textAlign: 'center',
    },
    retryButton: {
      marginTop: 20,
      backgroundColor: '#3498db',
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 5,
    },
    retryButtonText: {
      color: 'white',
      fontSize: 16,
      fontWeight: 'bold',
    },
});