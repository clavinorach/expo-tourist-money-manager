import axios from 'axios';

const API_KEY = process.env.EXPO_PUBLIC_EXCHANGE_RATE_API_KEY;

export const fetchLatestRates = async (baseCurrency: string) => {
  try {
    const url = `https://v6.exchangerate-api.com/v6/${API_KEY}/latest/${baseCurrency}`;
    const response = await axios.get(url);
    if (response.data && response.data.result === 'success') {
      return response.data.conversion_rates;
    }
    throw new Error('Failed to fetch exchange rates.');
  } catch (error) {
    console.error("ExchangeRate API Error:", error);
    return null; // Handle error gracefully in the UI
  }
};