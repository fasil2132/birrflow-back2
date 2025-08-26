import express from 'express';
import db from '../db';
import { authenticate } from '../middleware/auth';
import { Budget, BudgetTransaction } from '../types';

const router = express.Router();

// Get all budget categories for a user
router.get('/categories', authenticate, (req, res) => {
  // console.log("req.userId: ", req.userId)
  try {
    const categories = db
      .prepare('SELECT * FROM budget_categories WHERE user_id = ?')
      .all(req.userId);
    // console.log("categories: ", categories)
    res.json(categories);
  } catch (error) {
    console.error('Error fetching budget categories:', error);
    res.status(500).json({ error: 'Failed to fetch budget categories' });
  }
});

// Create a new budget category
router.post('/categories', authenticate, (req, res) => {
  try {
    //  console.log('Received category data:', req.body);
    const { name, type, color, icon } = req.body;
    
    if (!name || !type) {
      console.log('Missing fields - name:', name, 'type:', type);
      return res.status(400).json({ error: 'Name and type are required' });
    }
    
    const result = db
      .prepare('INSERT INTO budget_categories (user_id, name, type, color, icon) VALUES (?, ?, ?, ?, ?)')
      .run(req.userId, name, type, color || '#3B82F6', icon || '💰');
    
    const newCategory = db
      .prepare('SELECT * FROM budget_categories WHERE id = ?')
      .get(result.lastInsertRowid);
    
    res.status(201).json(newCategory);
  } catch (error) {
    console.error('Error creating budget category:', error);
    res.status(500).json({ error: 'Failed to create budget category' });
  }
});

// Get all budgets for a user
router.get('/', authenticate, (req, res) => {
  try {
    const budgets = db
      .prepare(`
        SELECT b.*, bc.name as category_name, bc.type as category_type, bc.color, bc.icon
        FROM budgets b
        JOIN budget_categories bc ON b.category_id = bc.id
        WHERE b.user_id = ?
      `)
      .all(req.userId);
    
    res.json(budgets);
  } catch (error) {
    console.error('Error fetching budgets:', error);
    res.status(500).json({ error: 'Failed to fetch budgets' });
  }
});

// Create a new budget
router.post('/', authenticate, (req, res) => {
  try {
    const { category_id, amount, period, start_date, end_date, is_active } = req.body;
    
    if (!category_id || !amount || !period || !start_date) {
      return res.status(400).json({ error: 'Category, amount, period, and start date are required' });
    }
    
    const result = db
      .prepare(`
        INSERT INTO budgets (user_id, category_id, amount, period, start_date, end_date, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `)
      .run(req.userId, category_id, amount, period, start_date, end_date, Number(is_active) !== undefined ? Number(is_active) : 0);
    
    const newBudget = db
      .prepare(`
        SELECT b.*, bc.name as category_name, bc.type as category_type, bc.color, bc.icon
        FROM budgets b
        JOIN budget_categories bc ON b.category_id = bc.id
        WHERE b.id = ?
      `)
      .get(result.lastInsertRowid);
    
    res.status(201).json(newBudget);
  } catch (error) {
    console.error('Error creating budget:', error);
    res.status(500).json({ error: 'Failed to create budget' });
  }
});

// Update a budget
router.put('/:id', authenticate, (req, res) => {
  try {
    const { id } = req.params;
    const { category_id, amount, period, start_date, end_date, is_active } = req.body;
    
    // Check if budget exists and belongs to user
    const existingBudget = db
      .prepare('SELECT * FROM budgets WHERE id = ? AND user_id = ?')
      .get(id, req.userId) as Budget;
    
    if (!existingBudget) {
      return res.status(404).json({ error: 'Budget not found' });
    }
    
    db.prepare(`
      UPDATE budgets 
      SET category_id = ?, amount = ?, period = ?, start_date = ?, end_date = ?, is_active = ?
      WHERE id = ?
    `).run(
      category_id || existingBudget.category_id,
      amount || existingBudget.amount,
      period || existingBudget.period,
      start_date || existingBudget.start_date,
      end_date !== undefined ? end_date : existingBudget.end_date,
      Number(is_active) !== undefined ? Number(is_active) : Number(existingBudget.is_active),
      id
    );
    
    const updatedBudget = db
      .prepare(`
        SELECT b.*, bc.name as category_name, bc.type as category_type, bc.color, bc.icon
        FROM budgets b
        JOIN budget_categories bc ON b.category_id = bc.id
        WHERE b.id = ?
      `)
      .get(id);
    
    res.json(updatedBudget);
  } catch (error) {
    console.error('Error updating budget:', error);
    res.status(500).json({ error: 'Failed to update budget' });
  }
});

// Delete a budget
router.delete('/:id', authenticate, (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if budget exists and belongs to user
    const existingBudget = db
      .prepare('SELECT * FROM budgets WHERE id = ? AND user_id = ?')
      .get(id, req.userId);
    
    if (!existingBudget) {
      return res.status(404).json({ error: 'Budget not found' });
    }
    
    db.prepare('DELETE FROM budgets WHERE id = ?').run(id);
    
    res.json({ message: 'Budget deleted successfully' });
  } catch (error) {
    console.error('Error deleting budget:', error);
    res.status(500).json({ error: 'Failed to delete budget' });
  }
});

// Get budget transactions
router.get('/transactions', authenticate, (req, res) => {
  try {
    const { startDate, endDate, categoryId } = req.query;
    
    let query = `
      SELECT bt.*, bc.name as category_name, bc.type as category_type, bc.color, bc.icon
      FROM budget_transactions bt
      JOIN budget_categories bc ON bt.category_id = bc.id
      WHERE bt.user_id = ?
    `;
    
    let params: any[] = [req.userId];
    
    if (startDate) {
      query += ' AND bt.date >= ?';
      params.push(startDate);
    }
    
    if (endDate) {
      query += ' AND bt.date <= ?';
      params.push(endDate);
    }
    
    if (categoryId) {
      query += ' AND bt.category_id = ?';
      params.push(categoryId);
    }
    
    query += ' ORDER BY bt.date DESC';
    
    const transactions = db.prepare(query).all(...params);
    
    res.json(transactions);
  } catch (error) {
    console.error('Error fetching budget transactions:', error);
    res.status(500).json({ error: 'Failed to fetch budget transactions' });
  }
});

// Add a budget transaction
router.post('/transactions', authenticate, (req, res) => {
  try {
    const { budget_id, category_id, amount, description, date, type } = req.body;
    
    if (!category_id || !amount || !description || !date || !type) {
      return res.status(400).json({ error: 'Category, amount, description, date, and type are required' });
    }
    
    const result = db
      .prepare(`
        INSERT INTO budget_transactions (user_id, budget_id, category_id, amount, description, date, type)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `)
      .run(req.userId, budget_id, category_id, amount, description, date, type);
    
    const newTransaction = db
      .prepare(`
        SELECT bt.*, bc.name as category_name, bc.type as category_type, bc.color, bc.icon
        FROM budget_transactions bt
        JOIN budget_categories bc ON bt.category_id = bc.id
        WHERE bt.id = ?
      `)
      .get(result.lastInsertRowid);
    
    res.status(201).json(newTransaction);
  } catch (error) {
    console.error('Error creating budget transaction:', error);
    res.status(500).json({ error: 'Failed to create budget transaction' });
  }
});

// Get budget summary
router.get('/summary', authenticate, (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    // Get total income and expenses
    const incomeExpenses = db
      .prepare(`
        SELECT 
          SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as total_income,
          SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as total_expenses
        FROM budget_transactions
        WHERE user_id = ? AND date BETWEEN ? AND ?
      `)
      .get(req.userId, startDate || '2000-01-01', endDate || '2100-12-31') as BudgetTransaction;
    
    // Get category-wise spending
    const categorySpending = db
      .prepare(`
        SELECT 
          bc.id,
          bc.name,
          bc.color,
          bc.icon,
          SUM(bt.amount) as total_amount,
          bc.type
        FROM budget_transactions bt
        JOIN budget_categories bc ON bt.category_id = bc.id
        WHERE bt.user_id = ? AND bt.date BETWEEN ? AND ?
        GROUP BY bc.id, bc.name, bc.color, bc.icon, bc.type
        ORDER BY total_amount DESC
      `)
      .all(req.userId, startDate || '2000-01-01', endDate || '2100-12-31');
    
    // Get budget vs actual
    const budgetVsActual = db
      .prepare(`
        SELECT 
          b.id,
          bc.name as category_name,
          bc.color,
          bc.icon,
          b.amount as budgeted_amount,
          COALESCE(SUM(CASE WHEN bt.type = 'expense' THEN bt.amount ELSE 0 END), 0) as actual_spent,
          b.period
        FROM budgets b
        JOIN budget_categories bc ON b.category_id = bc.id
        LEFT JOIN budget_transactions bt ON b.category_id = bt.category_id 
          AND bt.date BETWEEN b.start_date AND COALESCE(b.end_date, '2100-12-31')
        WHERE b.user_id = ? AND b.is_active = 1
        GROUP BY b.id, bc.name, bc.color, bc.icon, b.amount, b.period
      `)
      .all(req.userId);
    
    res.json({
      ...incomeExpenses,
      net_income: (incomeExpenses.total_income || 0) - (incomeExpenses.total_expenses || 0),
      category_spending: categorySpending,
      budget_vs_actual: budgetVsActual
    });
  } catch (error) {
    console.error('Error fetching budget summary:', error);
    res.status(500).json({ error: 'Failed to fetch budget summary' });
  }
});

export default router;