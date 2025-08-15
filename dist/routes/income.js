"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// backend/src/routes/income.ts
const express_1 = __importDefault(require("express"));
const db_1 = __importDefault(require("../db"));
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
router.use(auth_1.authenticate);
// Create income source
router.post('/', (req, res) => {
    try {
        const userId = req.userId;
        const { name, amount, frequency, next_pay_date } = req.body;
        if (!name || !amount || !frequency) {
            return res.status(400).json({ error: 'Name, amount and frequency are required' });
        }
        if (isNaN(parseFloat(amount))) {
            return res.status(400).json({ error: 'Amount must be a number' });
        }
        const result = db_1.default.prepare(`
      INSERT INTO income_sources (user_id, name, amount, frequency, next_pay_date)
      VALUES (?, ?, ?, ?, ?)
    `).run(userId, name, amount, frequency, next_pay_date);
        const newIncome = db_1.default.prepare('SELECT * FROM income_sources WHERE id = ?').get(result.lastInsertRowid);
        res.status(201).json(newIncome);
    }
    catch (error) {
        console.error('Create income error:', error);
        res.status(500).json({ error: 'Failed to create income source' });
    }
});
// Get all income sources
router.get('/', (req, res) => {
    try {
        const userId = req.userId;
        const incomeSources = db_1.default.prepare(`
      SELECT * FROM income_sources WHERE user_id = ?
    `).all(userId);
        res.json(incomeSources);
    }
    catch (error) {
        console.error('Get income error:', error);
        res.status(500).json({ error: 'Failed to get income sources' });
    }
});
// Delete income source
router.delete('/:id', (req, res) => {
    try {
        const userId = req.userId;
        const incomeId = parseInt(req.params.id);
        const existingIncome = db_1.default.prepare(`
      SELECT * FROM income_sources WHERE id = ? AND user_id = ?
    `).get(incomeId, userId);
        if (!existingIncome) {
            return res.status(404).json({ error: 'Income source not found' });
        }
        db_1.default.prepare('DELETE FROM income_sources WHERE id = ?').run(incomeId);
        res.status(204).send();
    }
    catch (error) {
        console.error('Delete income error:', error);
        res.status(500).json({ error: 'Failed to delete income source' });
    }
});
exports.default = router;
