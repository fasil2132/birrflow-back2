import express from 'express';
import db from '../db';
import { authenticate } from '../middleware/auth';

const router = express.Router();

router.use(authenticate);

// Get user notifications
router.get('/', (req, res) => {
  try {
    const notifications = db.prepare(`
      SELECT * FROM notifications 
      WHERE user_id = ?
      ORDER BY created_at DESC
    `).all(req.userId);
    
    res.json(notifications);
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ error: 'Failed to get notifications' });
  }
});

// Mark notification as read
router.patch('/:id/read', (req, res) => {
  try {
    const notificationId = parseInt(req.params.id);
    
    // Verify notification belongs to user
    const notification = db.prepare(`
      SELECT * FROM notifications 
      WHERE id = ? AND user_id = ?
    `).get(notificationId, req.userId);
    
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    
    db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ?').run(notificationId);
    res.status(204).send();
  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json({ error: 'Failed to update notification' });
  }
});

export default router;