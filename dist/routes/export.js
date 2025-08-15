"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// backend/src/routes/export.ts
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const db_1 = __importDefault(require("../db"));
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
router.get('/financial-data', (req, res) => {
    const userId = req.userId;
    const data = {
        accounts: db_1.default.prepare('SELECT * FROM accounts WHERE user_id = ?').all(userId),
        bills: db_1.default.prepare('SELECT * FROM bills WHERE user_id = ?').all(userId),
        income: db_1.default.prepare('SELECT * FROM income_sources WHERE user_id = ?').all(userId),
        forecast: db_1.default.prepare('SELECT * FROM forecast_cache WHERE user_id = ?').all(userId),
    };
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename=birrflow-export.json');
    res.send(JSON.stringify(data));
});
exports.default = router;
