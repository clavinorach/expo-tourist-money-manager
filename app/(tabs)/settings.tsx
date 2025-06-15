import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Picker } from '@react-native-picker/picker';
import { getUserSettings, updateUserSettings, UserSettings, updateExchangeRates } from '../../database';
import { fetchLatestRates } from '../../services/exchangeRateApi';

const availableCurrencies = ['IDR', 'USD', 'EUR', 'JPY', 'GBP', 'AUD', 'SGD', 'MYR'];

export default function SettingsScreen() {
    const [settings, setSettings] = useState<Partial<UserSettings>>({});
    const [isUpdatingRates, setIsUpdatingRates] = useState(false);

    useFocusEffect(
        React.useCallback(() => {
            const loadSettings = async () => {
                const currentSettings = await getUserSettings();
                setSettings(currentSettings);
            }
            loadSettings();
        }, [])
    );

    const handleSave = async () => {
        if (settings.home_currency === undefined || settings.travel_budget === undefined) {
            Alert.alert("Invalid Input", "Please fill all fields.");
            return;
        }
        await updateUserSettings(settings as UserSettings);
        Alert.alert("Success", "Settings saved!");
    };

    const handleUpdateRates = async () => {
        if (!settings.home_currency) {
            Alert.alert("Error", "Please set a home currency first.");
            return;
        }
        setIsUpdatingRates(true);
        const rates = await fetchLatestRates(settings.home_currency);
        if (rates) {
            await updateExchangeRates(rates);
            Alert.alert("Success", "Exchange rates have been updated.");
        } else {
            Alert.alert("Error", "Failed to fetch new exchange rates.");
        }
        setIsUpdatingRates(false);
    };

    return (
        <View style={styles.container}>
            <Text style={styles.label}>Home Currency</Text>
            <View style={styles.pickerContainer}>
               <Picker
                    selectedValue={settings.home_currency}
                    onValueChange={(itemValue) => setSettings(s => ({...s, home_currency: itemValue}))}
                >
                    {availableCurrencies.map(c => <Picker.Item key={c} label={c} value={c} />)}
                </Picker>
            </View>

            <Text style={styles.label}>Travel Budget</Text>
            <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={settings.travel_budget?.toString() || ''}
                onChangeText={(text) => setSettings(s => ({...s, travel_budget: parseFloat(text) || 0}))}
                placeholder="Enter your total budget"
            />

            <Button title="Save Settings" onPress={handleSave} />

            <View style={{marginTop: 40}}/>

            {isUpdatingRates 
                ? <ActivityIndicator size="large" color="#3498db" />
                : <Button title="Update Exchange Rates" onPress={handleUpdateRates} />
            }
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20, backgroundColor: 'white' },
    label: { fontSize: 16, color: '#34495e', marginTop: 15, marginBottom: 5, fontWeight: '500' },
    input: { borderWidth: 1, borderColor: '#bdc3c7', padding: 12, borderRadius: 8, marginBottom: 20, fontSize: 16 },
    pickerContainer: { borderWidth: 1, borderColor: '#bdc3c7', borderRadius: 8, marginBottom: 10 }
});