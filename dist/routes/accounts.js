"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const db_1 = __importDefault(require("../db"));
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
router.use(auth_1.authenticate);
// Create new account
router.post('/', (req, res) => {
    try {
        const userId = (req.userId);
        const { name, balance } = req.body;
        if (!name) {
            return res.status(400).json({ error: 'Account name is required' });
        }
        const result = db_1.default
            .prepare('INSERT INTO accounts (user_id, name, balance) VALUES (?, ?, ?)')
            .run(userId, name, balance || 0);
        const newAccount = db_1.default
            .prepare('SELECT * FROM accounts WHERE id = ?')
            .get(result.lastInsertRowid);
        res.status(201).json(newAccount);
    }
    catch (error) {
        console.error('Create account error:', error);
        res.status(500).json({ error: 'Failed to create account' });
    }
});
// Get all accounts for user
router.get('/', (req, res) => {
    try {
        const userId = req.userId;
        const accounts = db_1.default
            .prepare('SELECT * FROM accounts WHERE user_id = ?')
            .all(userId);
        res.json(accounts);
    }
    catch (error) {
        console.error('Get accounts error:', error);
        res.status(500).json({ error: 'Failed to get accounts' });
    }
});
// Update account balance
router.patch('/:id/balance', (req, res) => {
    try {
        const userId = req.userId;
        const accountId = parseInt(req.params.id);
        const { balance } = req.body;
        if (isNaN(balance)) {
            return res.status(400).json({ error: 'Valid balance is required' });
        }
        // Verify account belongs to user
        const account = db_1.default
            .prepare('SELECT * FROM accounts WHERE id = ? AND user_id = ?')
            .get(accountId, userId);
        if (!account) {
            return res.status(404).json({ error: 'Account not found' });
        }
        db_1.default.prepare('UPDATE accounts SET balance = ? WHERE id = ?')
            .run(balance, accountId);
        const updatedAccount = db_1.default
            .prepare('SELECT * FROM accounts WHERE id = ?')
            .get(accountId);
        res.json(updatedAccount);
    }
    catch (error) {
        console.error('Update balance error:', error);
        res.status(500).json({ error: 'Failed to update balance' });
    }
});
exports.default = router;
