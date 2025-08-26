import db from '../db';

export interface SavingsGoal {
  id: number;
  user_id: number;
  name: string;
  target_amount: number;
  current_amount: number;
  target_date: string | null;
  created_at: string;
}

export interface SavingsTransaction {
  id: number;
  goal_id: number;
  amount: number;
  transaction_date: string;
}

export const createSavingsGoal = (userId: number, goal: Omit<SavingsGoal, 'id' | 'user_id' | 'current_amount' | 'created_at'>): SavingsGoal => {
  const result = db.prepare(`
    INSERT INTO savings_goals (user_id, name, target_amount, target_date)
    VALUES (?, ?, ?, ?)
  `).run(userId, goal.name, goal.target_amount, goal.target_date);
  
  return db.prepare('SELECT * FROM savings_goals WHERE id = ?').get(result.lastInsertRowid) as SavingsGoal;
};

export const addToSavingsGoal = (goalId: number, amount: number): SavingsTransaction => {
  const result = db.prepare(`
    INSERT INTO savings_transactions (goal_id, amount)
    VALUES (?, ?)
  `).run(goalId, amount);
  
  return db.prepare('SELECT * FROM savings_transactions WHERE id = ?').get(result.lastInsertRowid) as SavingsTransaction;
};

export const getSavingsGoals = (userId: number): SavingsGoal[] => {
  return db.prepare('SELECT * FROM savings_goals WHERE user_id = ?').all(userId) as SavingsGoal[];
};

export const getSavingsTransactions = (goalId: number): SavingsTransaction[] => {
  return db.prepare('SELECT * FROM savings_transactions WHERE goal_id = ?').all(goalId) as SavingsTransaction[];
};