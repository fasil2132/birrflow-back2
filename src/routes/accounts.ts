import express from 'express';
import { Request, Response } from 'express';
import db from '../db';
import { authenticate } from '../middleware/auth';
import { Account } from '../types';

// Extend Express Request interface to include userId
declare global {
  namespace Express {
    interface Request {
      userId?: number;
    }
  }
}

const router = express.Router();

router.use(authenticate);

// Create new account
router.post('/', (req: Request, res: Response) => {
  try {
    const userId = (req.userId)!;
    const { name, balance } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Account name is required' });
    }
    
    const result = db
      .prepare('INSERT INTO accounts (user_id, name, balance) VALUES (?, ?, ?)')
      .run(userId, name, balance || 0);
    
    const newAccount = db
      .prepare('SELECT * FROM accounts WHERE id = ?')
      .get(result.lastInsertRowid) as Account;
    
    res.status(201).json(newAccount);
  } catch (error) {
    console.error('Create account error:', error);
    res.status(500).json({ error: 'Failed to create account' });
  }
});

// Get all accounts for user
router.get('/', (req, res) => {
  try {
    const userId = req.userId!;
    const accounts = db
      .prepare('SELECT * FROM accounts WHERE user_id = ?')
      .all(userId) as Account[];
    
    res.json(accounts);
  } catch (error) {
    console.error('Get accounts error:', error);
    res.status(500).json({ error: 'Failed to get accounts' });
  }
});

// Update account balance
router.patch('/:id/balance', (req, res) => {
  try {
    const userId = req.userId!;
    const accountId = parseInt(req.params.id);
    const { balance } = req.body;
    
    if (isNaN(balance)) {
      return res.status(400).json({ error: 'Valid balance is required' });
    }
    
    // Verify account belongs to user
    const account = db
      .prepare('SELECT * FROM accounts WHERE id = ? AND user_id = ?')
      .get(accountId, userId) as Account;
    
    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }
    
    db.prepare('UPDATE accounts SET balance = ? WHERE id = ?')
      .run(balance, accountId);
    
    const updatedAccount = db
      .prepare('SELECT * FROM accounts WHERE id = ?')
      .get(accountId) as Account;
    
    res.json(updatedAccount);
  } catch (error) {
    console.error('Update balance error:', error);
    res.status(500).json({ error: 'Failed to update balance' });
  }
});

export default router;