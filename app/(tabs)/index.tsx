import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, FlatList, TouchableOpacity, Alert } from 'react-native';
import { Link, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getFinancialSummary, getRecentTransactions, Transaction, FinancialSummary } from '../../database';
import dayjs from 'dayjs';

export default function DashboardScreen() {
  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useFocusEffect(
    React.useCallback(() => {
      const loadData = async () => {
        try {
          const summaryData = await getFinancialSummary();
          const recentTxs = await getRecentTransactions(10);
          setSummary(summaryData);
          setTransactions(recentTxs);
        } catch (e) {
            Alert.alert("Error", "Could not load dashboard data.");
        }
      };
      loadData();
    }, [])
  );
  
  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: currency || 'IDR' }).format(amount);
  }

  const remainingBudget = (summary?.budget || 0) - (summary?.totalSpent || 0);

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
          renderItem={({ item }) => (
            <Link href={{ pathname: "/add-edit-transaction", params: { transactionId: item.id } }} asChild>
                <TouchableOpacity style={styles.txItem}>
                    <View>
                        <Text style={styles.txDescription}>{item.description}</Text>
                        <Text style={styles.txCategory}>{item.category} - {dayjs(item.timestamp).format('MMM D, HH:mm')}</Text>
                    </View>
                    <Text style={styles.txAmount}>-{formatCurrency(item.amount, item.currency)}</Text>
                </TouchableOpacity>
            </Link>
          )}
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
    txItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'white', padding: 15, borderRadius: 8, marginBottom: 10 },
    txDescription: { fontSize: 16, fontWeight: '500' },
    txCategory: { fontSize: 12, color: '#7f8c8d' },
    txAmount: { fontSize: 16, fontWeight: 'bold', color: '#e74c3c' },
});