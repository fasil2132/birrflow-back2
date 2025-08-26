// backend/src/db.ts
import Database from "better-sqlite3";

// Initialize database
const db = new Database("birrflow.db");

// declare const db: any;

// Enable foreign keys and WAL mode for better performance
db.pragma("foreign_keys = ON");
db.pragma("journal_mode = WAL");

// Create tables
db.exec(`
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    phone TEXT UNIQUE,
    email TEXT UNIQUE,
    username TEXT,
    password_hash TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login TEXT,
    is_admin BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    balance REAL NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS bills (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    biller_name TEXT NOT NULL,
    bill_type TEXT CHECK(bill_type IN ('utility', 'loan', 'school', 'rent', 'insurance', 'other')),
    amount REAL NOT NULL,
    due_date DATE NOT NULL,
    recurrence TEXT CHECK(recurrence IN ('none', 'daily', 'weekly', 'monthly', 'quarterly', 'yearly')),
    is_paid BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    facilitation_fee REAL DEFAULT 6,
    interest_rate REAL DEFAULT 0.66,
    penalty_rate REAL DEFAULT 0.11,
    original_loan_amount REAL DEFAULT 0,
    loan_start_date TEXT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS income_sources (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    amount REAL NOT NULL,
    frequency TEXT CHECK(frequency IN ('daily', 'weekly', 'bi-weekly', 'monthly', 'quarterly', 'yearly')),
    next_pay_date DATE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS balance_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_id INTEGER NOT NULL,
    balance REAL NOT NULL,
    recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('bill', 'balance', 'system')),
    message TEXT NOT NULL,
    messageAm TEXT NOT NULL,
    data TEXT,
    is_read BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS forecast_cache (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    date DATE NOT NULL,
    totalBalance REAL NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    account_id INTEGER NOT NULL,
    amount REAL NOT NULL,
    description TEXT NOT NULL,
    category TEXT CHECK(category IN ('food', 'transport', 'shopping', 'entertainment', 'other')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS savings_goals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    target_amount REAL NOT NULL,
    current_amount REAL DEFAULT 0,
    target_date DATE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS savings_transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    goal_id INTEGER NOT NULL,
    amount REAL NOT NULL,
    transaction_date DATE DEFAULT CURRENT_DATE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (goal_id) REFERENCES savings_goals(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    bill_id INTEGER,
    amount REAL NOT NULL,
    transaction_id TEXT UNIQUE,
    status TEXT CHECK(status IN ('pending', 'completed', 'failed')) DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (bill_id) REFERENCES bills(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS financial_education (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT NOT NULL CHECK(category IN ('saving', 'investing', 'inflation', 'budgeting')),
    language TEXT NOT NULL CHECK(language IN ('en', 'am')) DEFAULT 'en',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS community_tips (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    region TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS price_comparisons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    item_name TEXT NOT NULL,
    price REAL NOT NULL,
    market TEXT NOT NULL,
    region TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS user_preferences (
  user_id INTEGER PRIMARY KEY,
  preferences TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS budget_categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    type TEXT CHECK(type IN ('income', 'expense')) NOT NULL,
    color TEXT DEFAULT '#3B82F6',
    icon TEXT DEFAULT '💰',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS budgets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    category_id INTEGER NOT NULL,
    amount REAL NOT NULL,
    period TEXT CHECK(period IN ('weekly', 'bi-weekly', 'monthly', 'quarterly', 'yearly')) DEFAULT 'monthly',
    start_date DATE NOT NULL,
    end_date DATE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES budget_categories(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS budget_transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    budget_id INTEGER,
    category_id INTEGER NOT NULL,
    amount REAL NOT NULL,
    description TEXT NOT NULL,
    date DATE NOT NULL,
    type TEXT CHECK(type IN ('income', 'expense')) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (budget_id) REFERENCES budgets(id) ON DELETE SET NULL,
    FOREIGN KEY (category_id) REFERENCES budget_categories(id) ON DELETE CASCADE
);
`);

// Create triggers for automatic updated_at
db.exec(`
CREATE TRIGGER IF NOT EXISTS accounts_after_update
AFTER UPDATE ON accounts
BEGIN
    UPDATE accounts SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    INSERT INTO balance_history (account_id, balance) VALUES (NEW.id, NEW.balance);
END;

CREATE TRIGGER IF NOT EXISTS bills_after_update
AFTER UPDATE ON bills
BEGIN
    UPDATE bills SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_savings_after_transaction
AFTER INSERT ON savings_transactions
BEGIN
    UPDATE savings_goals 
    SET current_amount = current_amount + NEW.amount
    WHERE id = NEW.goal_id;
END;

CREATE TRIGGER IF NOT EXISTS budgets_after_update
AFTER UPDATE ON budgets
BEGIN
    UPDATE budgets SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;
`);


console.log("Database initialized successfully");

export default db;
