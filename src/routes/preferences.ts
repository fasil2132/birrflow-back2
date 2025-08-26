import express from 'express';
import db from '../db';
import { authenticate } from '../middleware/auth';

const router = express.Router();

router.use(authenticate);

// Get user preferences
router.get('/', (req, res) => {
  try {
    const userId = req.userId!;
    
    const prefs = db.prepare(`
      SELECT preferences FROM user_preferences WHERE user_id = ?
    `).get(userId) as { preferences: string } | undefined;
    
    if (prefs) {
      res.json(JSON.parse(prefs.preferences));
    } else {
      // Return default preferences
      res.json({
        commonEthiopianExpenses: [
          { name: "Ethio Telecom", amount: 350, day: 15, enabled: true },
          { name: "Water Bill", amount: 100, day: 10, enabled: true },
          { name: "Electricity", amount: 500, day: 20, enabled: true },
          { name: "House Rent", amount: 5000, day: 1, enabled: true },
          { name: "Internet", amount: 1000, day: 5, enabled: true }
        ],
        ethiopianHolidays: [
          { name: "Christmas", date: "01-07", additionalSpending: 500, enabled: true },
          { name: "Timkat", date: "01-19", additionalSpending: 300, enabled: true },
          { name: "New Year", date: "09-11", additionalSpending: 400, enabled: true },
          { name: "Meskel", date: "09-27", additionalSpending: 300, enabled: true }
        ],
        dailySpendingMultipliers: {
          monthEnd: 1.3,
          holiday: 1.5,
          regular: 1
        },
        inflationRate: 0.13,
        exchangeRate: 140.65
      });
    }
  } catch (error) {
    console.error('Preferences error:', error);
    res.status(500).json({ error: 'Failed to get preferences' });
  }
});

// Update user preferences
router.put('/', (req, res) => {
  try {
    const userId = req.userId!;
    const preferences = req.body;
    
    // Upsert preferences
    db.prepare(`
      INSERT OR REPLACE INTO user_preferences (user_id, preferences)
      VALUES (?, ?)
    `).run(userId, JSON.stringify(preferences));
    
    res.json(preferences);
  } catch (error) {
    console.error('Preferences error:', error);
    res.status(500).json({ error: 'Failed to update preferences' });
  }
});

export default router;