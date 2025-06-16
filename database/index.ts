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

const db = SQLite.openDatabaseSync('tourist_money.db');


export const initDatabase = () => {
  db.execSync(`
    CREATE TABLE IF NOT EXISTS UserSettings (id INTEGER PRIMARY KEY NOT NULL, home_currency TEXT NOT NULL, travel_budget REAL NOT NULL);
    CREATE TABLE IF NOT EXISTS Transactions (id INTEGER PRIMARY KEY AUTOINCREMENT, description TEXT NOT NULL, amount REAL NOT NULL, currency TEXT NOT NULL, amount_home_currency REAL NOT NULL, category TEXT NOT NULL, timestamp TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS ExchangeRates (currency_code TEXT PRIMARY KEY NOT NULL, rate REAL NOT NULL, last_updated TEXT NOT NULL);
  `);

  const settings = db.getFirstSync<UserSettings>('SELECT * FROM UserSettings WHERE id = 1');
  if (!settings) {
    db.runSync('INSERT INTO UserSettings (id, home_currency, travel_budget) VALUES (1, ?, ?)', ['IDR', 0]);
  }
};

export const addTransaction = (txData: Omit<Transaction, 'id' | 'timestamp'>) => {
  db.runSync(
    'INSERT INTO Transactions (description, amount, currency, amount_home_currency, category, timestamp) VALUES (?, ?, ?, ?, ?, ?);',
    [txData.description, txData.amount, txData.currency, txData.amount_home_currency, txData.category, dayjs().toISOString()]
  );
};

export const updateTransaction = (txData: Transaction) => {
  db.runSync(
    'UPDATE Transactions SET description = ?, amount = ?, currency = ?, amount_home_currency = ?, category = ? WHERE id = ?;',
    [txData.description, txData.amount, txData.currency, txData.amount_home_currency, txData.category, txData.id]
  );
}

export const deleteTransaction = (id: number) => {
  db.runSync('DELETE FROM Transactions WHERE id = ?;', [id]);
};

export const getRecentTransactions = (limit: number = 50): Transaction[] => {
    return db.getAllSync<Transaction>('SELECT * FROM Transactions ORDER BY timestamp DESC LIMIT ?;', [limit]);
}

export const getFinancialSummary = (): FinancialSummary => {
    const settings = db.getFirstSync<UserSettings>('SELECT travel_budget, home_currency FROM UserSettings WHERE id = 1');
    const totalSpentResult = db.getFirstSync<{ totalSpent: number }>('SELECT SUM(amount_home_currency) as totalSpent FROM Transactions');
    
    const todayStart = dayjs().startOf('day').toISOString();
    const todaySpentResult = db.getFirstSync<{ todaySpent: number }>('SELECT SUM(amount_home_currency) as todaySpent FROM Transactions WHERE timestamp >= ?;', [todayStart]);

    return {
        budget: settings?.travel_budget || 0,
        homeCurrency: settings?.home_currency || 'IDR',
        totalSpent: totalSpentResult?.totalSpent || 0,
        todaySpent: todaySpentResult?.todaySpent || 0,
    };
};

export const getUserSettings = (): UserSettings | null => {
   return db.getFirstSync<UserSettings>('SELECT home_currency, travel_budget FROM UserSettings WHERE id = 1;');
}

export const updateUserSettings = async (settings: UserSettings) => {
    const oldSettings = await getUserSettings();
    
    // If home currency changed, we need to update all transactions
    if (oldSettings && oldSettings.home_currency !== settings.home_currency) {
        await updateAllTransactionsForNewHomeCurrency(oldSettings.home_currency, settings.home_currency);
    }

    db.runSync(
        'UPDATE UserSettings SET home_currency = ?, travel_budget = ? WHERE id = 1;',
        [settings.home_currency, settings.travel_budget]
    );
}

const updateAllTransactionsForNewHomeCurrency = async (oldHomeCurrency: string, newHomeCurrency: string) => {
    try {
        // Get all transactions
        const transactions = db.getAllSync<Transaction>('SELECT * FROM Transactions;');
        
        // Get new exchange rates
        const rates = await fetchExchangeRate(newHomeCurrency);
        
        // Update each transaction
        db.runSync('BEGIN TRANSACTION');
        
        for (const tx of transactions) {
            let newAmountHomeCurrency: number;
            
            if (tx.currency === newHomeCurrency) {
                // If transaction is in new home currency, use amount directly
                newAmountHomeCurrency = tx.amount;
            } else if (tx.currency === oldHomeCurrency) {
                // If transaction was in old home currency, convert using new rates
                const rate = rates[tx.currency];
                newAmountHomeCurrency = tx.amount / rate;
            } else {
                // For other currencies, convert using new rates
                const rate = rates[tx.currency];
                newAmountHomeCurrency = tx.amount / rate;
            }
            
            db.runSync(
                'UPDATE Transactions SET amount_home_currency = ? WHERE id = ?;',
                [newAmountHomeCurrency, tx.id]
            );
        }
        
        db.runSync('COMMIT');
    } catch (error) {
        db.runSync('ROLLBACK');
        console.error('Error updating transactions for new home currency:', error);
        throw error;
    }
}

export const getExchangeRate = (currencyCode: string): { rate: number } | null => {
   return db.getFirstSync<{ rate: number }>('SELECT rate FROM ExchangeRates WHERE currency_code = ?;', [currencyCode]);
}

export const updateExchangeRates = (rates: { [key: string]: number }) => {
    const statement = db.prepareSync('INSERT OR REPLACE INTO ExchangeRates (currency_code, rate, last_updated) VALUES (?, ?, ?);');
    const lastUpdated = dayjs().toISOString();

    // Use manual transaction for sync API
    db.runSync('BEGIN TRANSACTION');
    for (const [code, rate] of Object.entries(rates)) {
        statement.executeSync([code, rate, lastUpdated]);
    }
    db.runSync('COMMIT');

    statement.finalizeSync();
};