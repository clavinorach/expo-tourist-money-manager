import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Picker } from '@react-native-picker/picker';
import { addTransaction, updateTransaction, getExchangeRate, getUserSettings, Transaction } from '../database';
import { debouncedFetchExchangeRate, formatCurrencyAmount } from '../services/exchangeRate';

const categories = ["Food", "Transport", "Accommodation", "Activities", "Shopping", "Other"];
const currencies = ["IDR", "USD", "EUR", "JPY", "SGD", "MYR", "GBP", "AUD"];

export default function AddEditTransactionScreen() {
    const { transactionId } = useLocalSearchParams();
    const router = useRouter();
    const [isEditMode, setIsEditMode] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [currency, setCurrency] = useState('USD');
    const [category, setCategory] = useState(categories[0]);
    const [convertedAmount, setConvertedAmount] = useState<string | null>(null);
    const [homeCurrency, setHomeCurrency] = useState('IDR');

    useEffect(() => {
        loadInitialData();
    }, []);

    const loadInitialData = async () => {
        const settings = await getUserSettings();
        if (settings) {
            setHomeCurrency(settings.home_currency);
            setCurrency(settings.home_currency);
        }

        if (transactionId) {
            setIsEditMode(true);
            // TODO: Implement fetching existing transaction
            Alert.alert("Edit Mode (Placeholder)", `This screen would now be editing transaction ${transactionId}.`);
        }
    };

    useEffect(() => {
        const convertAmount = async () => {
            if (!amount || isNaN(Number(amount)) || currency === homeCurrency) {
                setConvertedAmount(null);
                return;
            }

            setIsLoading(true);
            try {
                const rates = await debouncedFetchExchangeRate(homeCurrency);
                if (!rates || !rates[currency]) {
                    console.error('Exchange rate not found for currency:', currency);
                    setConvertedAmount(null);
                    return;
                }
                
                const rate = rates[currency];
                const converted = Number(amount) / rate;
                setConvertedAmount(formatCurrencyAmount(converted, homeCurrency));
            } catch (error) {
                console.error('Error converting amount:', error);
                setConvertedAmount(null);
            } finally {
                setIsLoading(false);
            }
        };

        convertAmount();
    }, [amount, currency, homeCurrency]);

    const handleSave = async () => {
        const amountNum = parseFloat(amount);
        if (!description || !amountNum || amountNum <= 0) {
            Alert.alert("Error", "Please fill all fields with valid values.");
            return;
        }

        let rate = 1.0;
        if (currency !== homeCurrency) {
            const rates = await debouncedFetchExchangeRate(homeCurrency);
            rate = rates[currency];
            if (!rate) {
                Alert.alert("Error", "Could not get exchange rate. Please try again.");
                return;
            }
        }

        const txData = {
            description,
            amount: amountNum,
            currency,
            category,
            amount_home_currency: amountNum / rate
        };

        try {
            if (isEditMode) {
                await updateTransaction({ id: Number(transactionId), ...txData });
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
            <TextInput 
                style={styles.input} 
                value={description} 
                onChangeText={setDescription} 
                placeholder="e.g., Lunch at a cafe" 
            />

            <Text style={styles.label}>Amount</Text>
            <TextInput 
                style={styles.input} 
                value={amount} 
                onChangeText={setAmount} 
                keyboardType="numeric" 
                placeholder="e.g., 25.50" 
            />
            {isLoading ? (
                <ActivityIndicator style={styles.loader} />
            ) : convertedAmount && (
                <Text style={styles.convertedAmount}>
                    ≈ {convertedAmount}
                </Text>
            )}

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
            <Button 
                title={isEditMode ? "Update Transaction" : "Save Transaction"} 
                onPress={handleSave} 
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { 
        flex: 1, 
        padding: 20, 
        backgroundColor: 'white' 
    },
    label: { 
        fontSize: 16, 
        color: '#34495e', 
        marginTop: 15, 
        marginBottom: 5, 
        fontWeight: '500' 
    },
    input: { 
        borderWidth: 1, 
        borderColor: '#bdc3c7', 
        padding: 12, 
        borderRadius: 8, 
        marginBottom: 10, 
        fontSize: 16 
    },
    pickerContainer: { 
        borderWidth: 1, 
        borderColor: '#bdc3c7', 
        borderRadius: 8, 
        marginBottom: 10 
    },
    convertedAmount: {
        fontSize: 14,
        color: '#7f8c8d',
        marginTop: -5,
        marginBottom: 10,
        fontStyle: 'italic'
    },
    loader: {
        marginVertical: 5
    }
});