// backend/src/routes/export.ts
import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import db from '../db';

const router = Router();

router.use(authenticate);

router.get('/financial-data', (req, res) => {
  const userId = req.userId!;
  
  const data = {
    accounts: db.prepare('SELECT * FROM accounts WHERE user_id = ?').all(userId),
    bills: db.prepare('SELECT * FROM bills WHERE user_id = ?').all(userId),
    income: db.prepare('SELECT * FROM income_sources WHERE user_id = ?').all(userId),
    forecast: db.prepare('SELECT * FROM forecast_cache WHERE user_id = ?').all(userId),
  };
  
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', 'attachment; filename=birrflow-export.json');
  res.send(JSON.stringify(data));
});

export default router;