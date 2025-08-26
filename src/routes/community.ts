import express from 'express';
import db from '../db';
import { authenticate } from '../middleware/auth';
import { getCommunityTips, getPriceComparisons, shareTip, sharePrice } from '../services/community';

const router = express.Router();

router.use(authenticate);

router.get('/tips', (req, res) => {
  try {
    const tips = getCommunityTips();
    res.json(tips);
  } catch (error) {
    console.error('Get community tips error:', error);
    res.status(500).json({ error: 'Failed to get community tips' });
  }
});

router.get('/prices', (req, res) => {
  try {
    const prices = getPriceComparisons();
    res.json(prices);
  } catch (error) {
    console.error('Get price comparisons error:', error);
    res.status(500).json({ error: 'Failed to get price comparisons' });
  }
});

router.post('/tips', (req, res) => {
  try {
    const userId = req.userId!;
    const { content, region } = req.body;
    
    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }
    
    const tip = shareTip(userId, {
        content, region,
        created_at: ''
    });
    res.status(201).json(tip);
  } catch (error) {
    console.error('Share tip error:', error);
    res.status(500).json({ error: 'Failed to share tip' });
  }
});

router.post('/prices', (req, res) => {
  try {
    const userId = req.userId!;
    const { item_name, price, market, region } = req.body;
    
    if (!item_name || !price || !market) {
      return res.status(400).json({ error: 'Item name, price, and market are required' });
    }
    
    const priceComparison = sharePrice(userId, {
        item_name, price, market, region,
        created_at: ''
    });
    res.status(201).json(priceComparison);
  } catch (error) {
    console.error('Share price error:', error);
    res.status(500).json({ error: 'Failed to share price' });
  }
});

export default router;