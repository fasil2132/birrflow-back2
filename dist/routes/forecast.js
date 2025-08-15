"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// backend/src/routes/forecast.ts
const express_1 = __importDefault(require("express"));
const db_1 = __importDefault(require("../db"));
const auth_1 = require("../middleware/auth");
const forecast_1 = require("../services/forecast");
const router = express_1.default.Router();
router.use(auth_1.authenticate);
// Get cash flow forecast
router.get('/', (req, res) => {
    try {
        const userId = req.userId;
        // Get user data
        const accounts = db_1.default.prepare(`
      SELECT id, name, balance FROM accounts 
      WHERE user_id = ?
    `).all(userId);
        const bills = db_1.default.prepare(`
      SELECT id, biller_name, amount, due_date, recurrence, is_paid 
      FROM bills 
      WHERE user_id = ? AND is_paid = 0
    `).all(userId);
        const incomeSources = db_1.default.prepare(`
      SELECT id, name, amount, frequency, next_pay_date 
      FROM income_sources 
      WHERE user_id = ?
    `).all(userId);
        // Set date range (next 30 days)
        const startDate = new Date().toISOString().split('T')[0];
        const endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        // Generate forecast
        const forecast = (0, forecast_1.projectBalanceTimeline)(startDate, endDate, accounts, bills, incomeSources);
        res.json(forecast);
    }
    catch (error) {
        console.error('Forecast error:', error);
        res.status(500).json({ error: 'Failed to generate forecast' });
    }
});
exports.default = router;
