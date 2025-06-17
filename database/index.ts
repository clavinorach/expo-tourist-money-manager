import * as SQLite from 'expo-sqlite';
import dayjs from 'dayjs';

// --- Type Definitions (No Change) ---
export interface Transaction {
  id: number;
  description: string;
  amount: number;
  currency: string;
  amount_home_currency: number;
  category: string;
  timestamp: string;
}
export interface UserSettings {
  home_currency: string;
  travel_budget: number;
}
export interface FinancialSummary {
  totalSpent: number;
  todaySpent: number;
  budget: number;
  homeCurrency: string;
}

let db: SQLite.SQLiteDatabase | null = null;

const getDatabase = async () => {
  if (!db) {
    try {
      db = await SQLite.openDatabaseAsync('tourist_money.db');
    } catch (error) {
      console.error('Error opening database:', error);
      throw new Error('Failed to open database');
    }
  }
  return db;
};

export const initDatabase = async () => {
  try {
    const database = await getDatabase();
    
    // Drop existing tables if they exist to ensure clean schema
    await database.execAsync(`
      DROP TABLE IF EXISTS Transactions;
      DROP TABLE IF EXISTS UserSettings;
      DROP TABLE IF EXISTS ExchangeRates;
    `);

    // Create tables with proper schema
    await database.execAsync(`
      CREATE TABLE IF NOT EXISTS UserSettings (
        id INTEGER PRIMARY KEY NOT NULL,
        home_currency TEXT NOT NULL,
        travel_budget REAL NOT NULL
      );

      CREATE TABLE IF NOT EXISTS Transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        description TEXT NOT NULL,
        amount REAL NOT NULL,
        currency TEXT NOT NULL,
        amount_home_currency REAL NOT NULL,
        category TEXT NOT NULL,
        timestamp TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS ExchangeRates (
        currency_code TEXT PRIMARY KEY NOT NULL,
        rate REAL NOT NULL,
        last_updated TEXT NOT NULL
      );
    `);

    // Initialize default settings if they don't exist
    const settings = await database.getFirstAsync<UserSettings>('SELECT * FROM UserSettings WHERE id = 1');
    if (!settings) {
      await database.runAsync(
        'INSERT INTO UserSettings (id, home_currency, travel_budget) VALUES (1, ?, ?)',
        ['IDR', 0]
      );
    }

    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw new Error('Failed to initialize database');
  }
};

export const addTransaction = async (txData: Omit<Transaction, 'id' | 'timestamp'>) => {
  const database = await getDatabase();
  await database.runAsync(
    'INSERT INTO Transactions (description, amount, currency, amount_home_currency, category, timestamp) VALUES (?, ?, ?, ?, ?, ?);',
    [txData.description, txData.amount, txData.currency, txData.amount_home_currency, txData.category, dayjs().toISOString()]
  );
};

export const updateTransaction = async (txData: Transaction) => {
  const database = await getDatabase();
  await database.runAsync(
    'UPDATE Transactions SET description = ?, amount = ?, currency = ?, amount_home_currency = ?, category = ? WHERE id = ?;',
    [txData.description, txData.amount, txData.currency, txData.amount_home_currency, txData.category, txData.id]
  );
};

export const deleteTransaction = async (id: number) => {
  const database = await getDatabase();
  await database.runAsync('DELETE FROM Transactions WHERE id = ?;', [id]);
};

export const getRecentTransactions = async (limit: number = 50): Promise<Transaction[]> => {
  const database = await getDatabase();
  return await database.getAllAsync<Transaction>('SELECT * FROM Transactions ORDER BY timestamp DESC LIMIT ?;', [limit]);
};

export const getFinancialSummary = async (): Promise<FinancialSummary> => {
  const database = await getDatabase();
  const settings = await database.getFirstAsync<UserSettings>('SELECT travel_budget, home_currency FROM UserSettings WHERE id = 1');
  const totalSpentResult = await database.getFirstAsync<{ totalSpent: number }>('SELECT SUM(amount_home_currency) as totalSpent FROM Transactions');
  
  const todayStart = dayjs().startOf('day').toISOString();
  const todaySpentResult = await database.getFirstAsync<{ todaySpent: number }>('SELECT SUM(amount_home_currency) as todaySpent FROM Transactions WHERE timestamp >= ?;', [todayStart]);

  return {
    budget: settings?.travel_budget || 0,
    homeCurrency: settings?.home_currency || 'IDR',
    totalSpent: totalSpentResult?.totalSpent || 0,
    todaySpent: todaySpentResult?.todaySpent || 0,
  };
};

export const getUserSettings = async (): Promise<UserSettings | null> => {
  const database = await getDatabase();
  return await database.getFirstAsync<UserSettings>('SELECT home_currency, travel_budget FROM UserSettings WHERE id = 1;');
};

export const updateUserSettings = async (settings: UserSettings) => {
  const database = await getDatabase();
  const oldSettings = await getUserSettings();
  
  if (oldSettings && oldSettings.home_currency !== settings.home_currency) {
    await updateAllTransactionsForNewHomeCurrency(oldSettings.home_currency, settings.home_currency);
  }

  await database.runAsync(
    'UPDATE UserSettings SET home_currency = ?, travel_budget = ? WHERE id = 1;',
    [settings.home_currency, settings.travel_budget]
  );
};

const updateAllTransactionsForNewHomeCurrency = async (oldHomeCurrency: string, newHomeCurrency: string) => {
  const database = await getDatabase();
  try {
    const transactions = await database.getAllAsync<Transaction>('SELECT * FROM Transactions;');
    const rates = await fetchExchangeRate(newHomeCurrency);
    
    await database.runAsync('BEGIN TRANSACTION');
    
    for (const tx of transactions) {
      let newAmountHomeCurrency: number;
      
      if (tx.currency === newHomeCurrency) {
        newAmountHomeCurrency = tx.amount;
      } else if (tx.currency === oldHomeCurrency) {
        const rate = rates[tx.currency];
        newAmountHomeCurrency = tx.amount / rate;
      } else {
        const rate = rates[tx.currency];
        newAmountHomeCurrency = tx.amount / rate;
      }
      
      await database.runAsync(
        'UPDATE Transactions SET amount_home_currency = ? WHERE id = ?;',
        [newAmountHomeCurrency, tx.id]
      );
    }
    
    await database.runAsync('COMMIT');
  } catch (error) {
    await database.runAsync('ROLLBACK');
    console.error('Error updating transactions for new home currency:', error);
    throw error;
  }
};

export const getExchangeRate = async (currencyCode: string): Promise<{ rate: number } | null> => {
  const database = await getDatabase();
  return await database.getFirstAsync<{ rate: number }>('SELECT rate FROM ExchangeRates WHERE currency_code = ?;', [currencyCode]);
};

export const updateExchangeRates = async (rates: { [key: string]: number }) => {
  const database = await getDatabase();
  const statement = await database.prepareAsync('INSERT OR REPLACE INTO ExchangeRates (currency_code, rate, last_updated) VALUES (?, ?, ?);');
  const lastUpdated = dayjs().toISOString();

  await database.runAsync('BEGIN TRANSACTION');
  for (const [code, rate] of Object.entries(rates)) {
    await statement.executeAsync([code, rate, lastUpdated]);
  }
  await database.runAsync('COMMIT');

  await statement.finalizeAsync();
};