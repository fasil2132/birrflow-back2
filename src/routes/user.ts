import express from 'express';
import bcrypt from 'bcrypt';
import db from '../db';
import { authenticate } from '../middleware/auth';
import { BCRYPT_SALT_ROUNDS } from '../config';
import { User } from '../types';

const router = express.Router();

// Get user profile
router.get('/profile', authenticate, (req, res) => {
  const user = db
    .prepare('SELECT id, phone, email, username, created_at, is_admin FROM users WHERE id = ?')
    .get(req.userId);
  
  res.json(user);
});

// Update user profile
router.put('/profile', authenticate, async (req, res) => {
  try {
    const { phone, email, username } = req.body;
    
    // Check if email or phone already exists (excluding current user)
    const existingUser = db
      .prepare('SELECT id FROM users WHERE (email = ? OR phone = ?) AND id != ?')
      .get(email, phone, req.userId);
    
    if (existingUser) {
      return res.status(400).json({ error: 'Email or phone already in use' });
    }

    db.prepare('UPDATE users SET phone = ?, email = ?, username = ? WHERE id = ?')
      .run(phone, email, username, req.userId);

    const updatedUser = db
      .prepare('SELECT id, phone, email, username, created_at, is_admin FROM users WHERE id = ?')
      .get(req.userId);

    res.json(updatedUser);
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ error: 'Profile update failed' });
  }
});


// Change password
router.put('/password', authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    const user = db
      .prepare('SELECT * FROM users WHERE id = ?')
      .get(req.userId) as User;
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const passwordMatch = await bcrypt.compare(currentPassword, user.password_hash || "");
    if (!passwordMatch) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, BCRYPT_SALT_ROUNDS);
    
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?')
      .run(hashedPassword, req.userId);

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Password change error:', error);
    res.status(500).json({ error: 'Password change failed' });
  }
});

export default router;