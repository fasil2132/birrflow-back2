import express from 'express';
import db from '../db';
import { authenticate } from '../middleware/auth';
import { adminAuth } from '../middleware/adminAuth';

const router = express.Router();

router.use(authenticate);
router.use(adminAuth);

// redirect to admin dashboard
router.get('/', (req, res) => {
  try {
    // Total users count
    const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
    
    // New users in the last 30 days
    const newUsers = db.prepare(`
      SELECT COUNT(*) as count FROM users 
      WHERE created_at >= date('now', '-30 days')
    `).get() as { count: number };
    
    // Total bills count
    const totalBills = db.prepare('SELECT COUNT(*) as count FROM bills').get() as { count: number };
    
    // Total income sources count
    const totalIncomes = db.prepare('SELECT COUNT(*) as count FROM income_sources').get() as { count: number };
    
    // Total payments processed
    const totalPayments = db.prepare('SELECT COUNT(*) as count FROM payments').get() as { count: number };
    
    // User growth by month
    const userGrowth = db.prepare(`
      SELECT 
        strftime('%Y-%m', created_at) as month,
        COUNT(*) as count
      FROM users 
      GROUP BY strftime('%Y-%m', created_at)
      ORDER BY month
    `).all() as Array<{ month: string; count: number }>;
    
    // Bill types distribution
    const billTypes = db.prepare(`
      SELECT 
        bill_type,
        COUNT(*) as count
      FROM bills 
      GROUP BY bill_type
      ORDER BY count DESC
    `).all() as Array<{ bill_type: string; count: number }>;
    
    // Recent activity (last 10 actions)
    const recentActivity = db.prepare(`
      SELECT 
        'bill' as type,
        biller_name as name,
        amount,
        created_at
      FROM bills
      UNION ALL
      SELECT 
        'income' as type,
        name,
        amount,
        created_at
      FROM income_sources
      ORDER BY created_at DESC
      LIMIT 10
    `).all();
    
    res.json({
      totalUsers: totalUsers.count,
      newUsers: newUsers.count,
      totalBills: totalBills.count,
      totalIncomes: totalIncomes.count,
      totalPayments: totalPayments.count,
      userGrowth,
      billTypes,
      recentActivity
    });
  } catch (error) {
    console.error('Admin dashboard error:', error);
    res.status(500).json({ error: 'Failed to fetch admin metrics' });
  }
});

// Get admin dashboard metrics
router.get('/dashboard', (req, res) => {
  try {
    // Total users count
    const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
    
    // New users in the last 30 days
    const newUsers = db.prepare(`
      SELECT COUNT(*) as count FROM users 
      WHERE created_at >= date('now', '-30 days')
    `).get() as { count: number };
    
    // Total bills count
    const totalBills = db.prepare('SELECT COUNT(*) as count FROM bills').get() as { count: number };
    
    // Total income sources count
    const totalIncomes = db.prepare('SELECT COUNT(*) as count FROM income_sources').get() as { count: number };
    
    // Total payments processed
    const totalPayments = db.prepare('SELECT COUNT(*) as count FROM payments').get() as { count: number };
    
    // User growth by month
    const userGrowth = db.prepare(`
      SELECT 
        strftime('%Y-%m', created_at) as month,
        COUNT(*) as count
      FROM users 
      GROUP BY strftime('%Y-%m', created_at)
      ORDER BY month
    `).all() as Array<{ month: string; count: number }>;
    
    // Bill types distribution
    const billTypes = db.prepare(`
      SELECT 
        bill_type,
        COUNT(*) as count
      FROM bills 
      GROUP BY bill_type
      ORDER BY count DESC
    `).all() as Array<{ bill_type: string; count: number }>;
    
    // Recent activity (last 10 actions)
    const recentActivity = db.prepare(`
      SELECT 
        'bill' as type,
        biller_name as name,
        amount,
        created_at
      FROM bills
      UNION ALL
      SELECT 
        'income' as type,
        name,
        amount,
        created_at
      FROM income_sources
      ORDER BY created_at DESC
      LIMIT 10
    `).all();
    
    res.json({
      totalUsers: totalUsers.count,
      newUsers: newUsers.count,
      totalBills: totalBills.count,
      totalIncomes: totalIncomes.count,
      totalPayments: totalPayments.count,
      userGrowth,
      billTypes,
      recentActivity
    });
  } catch (error) {
    console.error('Admin dashboard error:', error);
    res.status(500).json({ error: 'Failed to fetch admin metrics' });
  }
});

// Get all users with their details
router.get('/users', (req, res) => {
  try {
    const users = db.prepare(`
      SELECT 
        id, 
        phone, 
        email, 
        created_at, 
        last_login,
        is_admin
      FROM users 
      ORDER BY created_at DESC
    `).all();
    
    res.json(users);
  } catch (error) {
    console.error('Admin users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Update user admin status
router.put('/users/:id/admin', (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    // console.log("userId", userId)
    const { is_admin } = req.body;
    // console.log("is_admin: ", is_admin);
    
    db.prepare('UPDATE users SET is_admin = ? WHERE id = ?').run(Number(is_admin), userId);
    
    res.json({ message: 'User admin status updated successfully' });
  } catch (error) {
    console.error('Update user admin error:', error);
    res.status(500).json({ error: 'Failed to update user admin status' });
  }
});

// delete user
router.delete('/users/:id', (req, res) => {
  const userId = req.params.id;
  try{
    db.prepare("DELETE FROM users WHERE id = ?").run(userId);
    return res.status(204).json()
  }
  catch(er){
    console.error("Failed to delete user with id: ", userId?.toString())
    return res.json({"error":`Failed to delete user with id:  ${userId?.toString()}?`})
  }
});

export default router;