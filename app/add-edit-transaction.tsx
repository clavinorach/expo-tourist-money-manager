import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Picker } from '@react-native-picker/picker';
import { addTransaction, updateTransaction, getExchangeRate, getUserSettings, Transaction } from '../database';

const categories = ["Food", "Transport", "Accommodation", "Activities", "Shopping", "Other"];
const currencies = ["IDR", "USD", "EUR", "JPY", "SGD", "MYR", "GBP", "AUD"];

export default function AddEditTransactionScreen() {
    const { transactionId } = useLocalSearchParams();
    const router = useRouter();
    const [isEditMode, setIsEditMode] = useState(false);

    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [currency, setCurrency] = useState('USD');
    const [category, setCategory] = useState(categories[0]);

    useEffect(() => {
        if (transactionId) {
             setIsEditMode(true);
             // In a full implementation, you would fetch the transaction by its ID
             // from the database here and pre-fill the state.
             Alert.alert("Edit Mode (Placeholder)", `This screen would now be editing transaction ${transactionId}.`);
        }
    }, [transactionId]);

    const handleSave = async () => {
        const amountNum = parseFloat(amount);
        if (!description || !amountNum || amountNum <= 0) {
            Alert.alert("Error", "Please fill all fields with valid values.");
            return;
        }

        const settings = await getUserSettings();
        let rate = 1.0;

        if (currency === settings.home_currency) {
            rate = 1.0;
        } else {
             // We need rate to convert FOREIGN to HOME. API gives rate HOME to FOREIGN. So we need 1/rate.
            const rateData = await getExchangeRate(settings.home_currency);
            if (!rateData) {
                Alert.alert("Error", `Exchange rate for your home currency not found. Please update rates in Settings.`);
                return;
            }
            rate = 1 / rateData.rate;
        }

        const txData = {
            description,
            amount: amountNum,
            currency,
            category,
            amount_home_currency: amountNum * rate
        };

        try {
            if (isEditMode) {
                // To implement this fully, you need the original transaction data
                // await updateTransaction({ id: Number(transactionId), ...txData });
                 Alert.alert("Success", "Transaction updated! (This is a placeholder action)");
            } else {
                await addTransaction(txData);
            }
            router.back();
        } catch (e) {
            console.error(e);
            Alert.alert("Database Error", "Could not save the transaction.");
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.label}>Description</Text>
            <TextInput style={styles.input} value={description} onChangeText={setDescription} placeholder="e.g., Lunch at a cafe" />

            <Text style={styles.label}>Amount</Text>
            <TextInput style={styles.input} value={amount} onChangeText={setAmount} keyboardType="numeric" placeholder="e.g., 25.50" />

            <Text style={styles.label}>Currency</Text>
             <View style={styles.pickerContainer}>
                <Picker selectedValue={currency} onValueChange={setCurrency}>
                    {currencies.map(c => <Picker.Item key={c} label={c} value={c} />)}
                </Picker>
            </View>

            <Text style={styles.label}>Category</Text>
             <View style={styles.pickerContainer}>
                <Picker selectedValue={category} onValueChange={setCategory}>
                    {categories.map(c => <Picker.Item key={c} label={c} value={c} />)}
                </Picker>
            </View>

            <View style={{marginTop: 20}} />
            <Button title={isEditMode ? "Update Transaction" : "Save Transaction"} onPress={handleSave} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20, backgroundColor: 'white' },
    label: { fontSize: 16, color: '#34495e', marginTop: 15, marginBottom: 5, fontWeight: '500' },
    input: { borderWidth: 1, borderColor: '#bdc3c7', padding: 12, borderRadius: 8, marginBottom: 10, fontSize: 16 },
    pickerContainer: { borderWidth: 1, borderColor: '#bdc3c7', borderRadius: 8, marginBottom: 10 }
});