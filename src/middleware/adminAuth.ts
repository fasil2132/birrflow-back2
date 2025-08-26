import { Request, Response, NextFunction } from 'express';
import db from '../db';
import { User } from '../types';

export const adminAuth = (req: Request, res: Response, next: NextFunction) => {
  const userId = req.userId;

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as User;

  if (!user || !user.is_admin) {
    return res.status(403).json({ error: 'Forbidden: Admin access required' });
  }

  next();
};