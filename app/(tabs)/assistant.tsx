import React, { useState, useRef } from 'react';
import { View, Text, TextInput, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { askGemini, ChatMessage } from '../../services/geminiApi';
import { getFinancialSummary, getUserSettings } from '../../database';

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID').format(amount);
}

export default function AssistantScreen() {
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const buildSystemPrompt = async (): Promise<string> => {
    try {
        const settings = await getUserSettings();
        const summary = await getFinancialSummary();
        const remainingBudget = (settings.travel_budget || 0) - (summary.totalSpent || 0);

        return `🤖 **Tour-Fin AI Assistant** - Travel Finance Expert
Anda adalah asisten perjalanan yang ahli dalam:
• Manajemen Keuangan Perjalanan
• Rekomendasi Destinasi Wisata Indonesia
• Tips Budgeting dan Penghematan
• Saran Kuliner dan Budaya Lokal
📊 **DATA KEUANGAN USER SAAT INI:**
┌─────────────────────────────────────┐
│ Mata Uang Utama     : ${settings.home_currency}              │
│ Total Pengeluaran   : ${formatCurrency(summary.totalSpent)} ${settings.home_currency}   │
│ Pengeluaran Hari Ini: ${formatCurrency(summary.todaySpent)} ${settings.home_currency}   │
│ Budget Perjalanan   : ${formatCurrency(settings.travel_budget)} ${settings.home_currency}   │
│ Sisa Budget         : ${formatCurrency(remainingBudget)} ${settings.home_currency} │
└─────────────────────────────────────┘
🎯 **INSTRUKSI RESPONS:**
✅ SELALU sebutkan data keuangan user dalam respons jika relevan
✅ Berikan analisis spending pattern berdasarkan data
✅ Saran penghematan atau peringatan jika budget menipis
✅ Respons dalam Bahasa Indonesia yang ramah dan informatif
✅ Berikan rekomendasi praktis dan actionable
Selalu responsif, helpful, dan personal dalam setiap jawaban!`;

    } catch (e) {
        console.error("Failed to build system prompt:", e);
        Alert.alert("Error", "Could not load financial data for the assistant.");
        return "";
    }
  };


  const handleSend = async () => {
    if (!prompt.trim() || isLoading) return;

    setIsLoading(true);

    const systemPromptText = await buildSystemPrompt();
    if (!systemPromptText) {
        setIsLoading(false);
        return;
    }
    
    const userMessage: ChatMessage = { role: 'user', parts: [{ text: prompt }] };
    setChatHistory(prev => [...prev, userMessage]);
    setPrompt('');

    const fullPromptWithSystemContext: ChatMessage = {
        role: 'user',
        parts: [{ text: `${systemPromptText}\n\n---\n\n${prompt}` }]
    };

    const apiPayload = [...chatHistory, fullPromptWithSystemContext];

    const responseText = await askGemini(apiPayload);
    const modelMessage: ChatMessage = { role: 'model', parts: [{ text: responseText }] };
    
    setChatHistory(prev => [...prev, modelMessage]);
    setIsLoading(false);
  };

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={chatHistory}
        style={styles.chatList}
        keyExtractor={(_, index) => index.toString()}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        renderItem={({ item }) => (
          <View style={[styles.messageBubble, item.role === 'user' ? styles.userBubble : styles.modelBubble]}>
            <Text style={styles.messageText}>{item.parts[0].text}</Text>
          </View>
        )}
        ListEmptyComponent={<View style={styles.emptyChat}><Text>Ask me anything about your trip!</Text></View>}
      />
      
      {isLoading && <ActivityIndicator size="small" color="#3498db" style={{marginVertical: 5}} />}

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={prompt}
          onChangeText={setPrompt}
          placeholder="Type your message..."
          onSubmitEditing={handleSend}
        />
        <TouchableOpacity onPress={handleSend} style={styles.sendButton} disabled={isLoading}>
          <Ionicons name="send" size={24} color="white" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f4f6f8' },
    chatList: { paddingHorizontal: 10, paddingTop: 10 },
    messageBubble: { padding: 12, borderRadius: 20, maxWidth: '85%', marginBottom: 10, elevation: 1 },
    userBubble: { backgroundColor: '#3498db', alignSelf: 'flex-end', borderBottomRightRadius: 5 },
    modelBubble: { backgroundColor: '#e5e5ea', alignSelf: 'flex-start', borderBottomLeftRadius: 5 },
    messageText: { fontSize: 16, color: 'black' },
    emptyChat: { flex: 1, paddingTop: 100, alignItems: 'center' },
    inputContainer: { flexDirection: 'row', alignItems: 'center', padding: 10, borderTopWidth: 1, borderTopColor: '#ddd', backgroundColor: '#f4f6f8'},
    input: { flex: 1, backgroundColor: 'white', borderRadius: 20, paddingHorizontal: 15, paddingVertical: 10, marginRight: 10, borderWidth: 1, borderColor: '#ddd' },
    sendButton: { backgroundColor: '#3498db', borderRadius: 25, width: 50, height: 50, justifyContent: 'center', alignItems: 'center' }
});