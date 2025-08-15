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
// Get user notifications
router.get('/', (req, res) => {
    try {
        const notifications = db_1.default.prepare(`
      SELECT * FROM notifications 
      WHERE user_id = ?
      ORDER BY created_at DESC
    `).all(req.userId);
        res.json(notifications);
    }
    catch (error) {
        console.error('Get notifications error:', error);
        res.status(500).json({ error: 'Failed to get notifications' });
    }
});
// Mark notification as read
router.patch('/:id/read', (req, res) => {
    try {
        const notificationId = parseInt(req.params.id);
        // Verify notification belongs to user
        const notification = db_1.default.prepare(`
      SELECT * FROM notifications 
      WHERE id = ? AND user_id = ?
    `).get(notificationId, req.userId);
        if (!notification) {
            return res.status(404).json({ error: 'Notification not found' });
        }
        db_1.default.prepare('UPDATE notifications SET is_read = 1 WHERE id = ?').run(notificationId);
        res.status(204).send();
    }
    catch (error) {
        console.error('Mark notification read error:', error);
        res.status(500).json({ error: 'Failed to update notification' });
    }
});
exports.default = router;
