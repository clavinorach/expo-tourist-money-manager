import axios from 'axios';

const API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;

// The ChatMessage type remains the same
export interface ChatMessage {
  role: 'user' | 'model';
  parts: [{ text: string }];
}

export const askGemini = async (contents: ChatMessage[]): Promise<string> => {
  try {
    const payload = {
      contents, // Pass the pre-built contents array directly
       generationConfig: {
        temperature: 0.9,
        topK: 1,
        topP: 1,
        maxOutputTokens: 2048,
      },
    };

    const response = await axios.post(API_URL, payload);
    // Check for candidates and content before accessing parts
    const candidates = response.data.candidates;
    if (candidates && candidates.length > 0 && candidates[0].content && candidates[0].content.parts) {
         return candidates[0].content.parts[0].text;
    }
   
    return "Sorry, I received an empty response. Please try again.";

  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('Gemini API Error:', error.response?.data || error.message);
    } else if (error instanceof Error) {
      console.error('Gemini API Error:', error.message);
    } else {
      console.error('Gemini API Error:', error);
    }
    return "Sorry, I encountered an error. Please check your connection or API key.";
  }
};