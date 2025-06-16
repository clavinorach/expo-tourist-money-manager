import { debounce } from 'lodash';

const EXCHANGE_RATE_API_KEY = process.env.EXPO_PUBLIC_EXCHANGE_RATE_API_KEY;
const BASE_URL = 'https://v6.exchangerate-api.com/v6';

interface ExchangeRateResponse {
  result: string;
  base_code: string;
  conversion_rates: { [key: string]: number };
}

export const fetchExchangeRate = async (baseCurrency: string): Promise<{ [key: string]: number }> => {
  try {
    const response = await fetch(`${BASE_URL}/${EXCHANGE_RATE_API_KEY}/latest/${baseCurrency}`);
    const data: ExchangeRateResponse = await response.json();
    
    if (data.result !== 'success') {
      throw new Error('Failed to fetch exchange rates');
    }

    return data.conversion_rates;
  } catch (error) {
    console.error('Error fetching exchange rates:', error);
    throw error;
  }
};

export const debouncedFetchExchangeRate = debounce(fetchExchangeRate, 500);

export const formatCurrencyAmount = (amount: number, currency: string): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}; 