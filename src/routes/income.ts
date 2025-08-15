// backend/src/routes/income.ts
import express from 'express';
import db from '../db';
import { authenticate } from '../middleware/auth';
import { IncomeSource } from '../types';

const router = express.Router();

router.use(authenticate);

// Create income source
router.post('/', (req, res) => {
  try {
    const userId = req.userId!;
    const { name, amount, frequency, next_pay_date } = req.body;
    
    if (!name || !amount || !frequency) {
      return res.status(400).json({ error: 'Name, amount and frequency are required' });
    }
    if (isNaN(parseFloat(amount))) {
      return res.status(400).json({ error: 'Amount must be a number' });
    }
    
    const result = db.prepare(`
      INSERT INTO income_sources (user_id, name, amount, frequency, next_pay_date)
      VALUES (?, ?, ?, ?, ?)
    `).run(userId, name, amount, frequency, next_pay_date);
    
    const newIncome = db.prepare('SELECT * FROM income_sources WHERE id = ?').get(result.lastInsertRowid) as IncomeSource;
    res.status(201).json(newIncome);
  } catch (error) {
    console.error('Create income error:', error);
    res.status(500).json({ error: 'Failed to create income source' });
  }
});

// Get all income sources
router.get('/', (req, res) => {
  try {
    const userId = req.userId!;
    const incomeSources = db.prepare(`
      SELECT * FROM income_sources WHERE user_id = ?
    `).all(userId) as IncomeSource[];
    
    res.json(incomeSources);
  } catch (error) {
    console.error('Get income error:', error);
    res.status(500).json({ error: 'Failed to get income sources' });
  }
});

// Delete income source
router.delete('/:id', (req, res) => {
  try {
    const userId = req.userId!;
    const incomeId = parseInt(req.params.id);
    
    const existingIncome = db.prepare(`
      SELECT * FROM income_sources WHERE id = ? AND user_id = ?
    `).get(incomeId, userId) as IncomeSource;
    
    if (!existingIncome) {
      return res.status(404).json({ error: 'Income source not found' });
    }
    
    db.prepare('DELETE FROM income_sources WHERE id = ?').run(incomeId);
    res.status(204).send();
  } catch (error) {
    console.error('Delete income error:', error);
    res.status(500).json({ error: 'Failed to delete income source' });
  }
});

export default router;