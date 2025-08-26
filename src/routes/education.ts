import express from 'express';
import { getFinancialTips } from '../services/education';

const router = express.Router();

router.get('/tips', (req, res) => {
  try {
    const { category, language } = req.query;
    const tips = getFinancialTips(
      category as string | undefined, 
      language as string | undefined
    );
    res.json(tips);
  } catch (error) {
    console.error('Get financial tips error:', error);
    res.status(500).json({ error: 'Failed to get financial tips' });
  }
});

export default router;