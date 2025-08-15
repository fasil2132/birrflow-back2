// // backend/src/routes/payment.ts
// import { Router } from 'express';
// import { authenticate } from '../middleware/auth';
// import axios from 'axios';

// import db from '../db';

// const router = Router();

// router.use(authenticate);

// router.post('/create-subscription', async (req, res) => {
//   const { phone, amount } = req.body;
  
//   // Call Telebirr API
//   try {
//     const response = await axios.post('https://api.telebirr.com/payment', {
//       phone,
//       amount,
//       callback_url: 'https://yourdomain.com/payment-callback'
//     });
    
//     // Save transaction to DB
//     db.prepare(`
//       INSERT INTO payments (user_id, amount, status, transaction_id)
//       VALUES (?, ?, 'pending', ?)
//     `).run(req.userId, amount, response.data.transactionId);
    
//     res.json({ paymentUrl: response.data.paymentUrl });
//   } catch (error) {
//     res.status(500).json({ error: 'Payment failed' });
//   }
// });

// router.post('/webhook', async (req, res) => {
//   // Handle Telebirr webhook
//   const { transactionId, status } = req.body;
  
//   if (status === 'success') {
//     const payment = db.prepare('SELECT * FROM payments WHERE transaction_id = ?').get(transactionId);
    
//     if (payment) {
//       db.prepare('UPDATE users SET is_premium = 1 WHERE id = ?').run(payment.user_id);
//       db.prepare('UPDATE payments SET status = "completed" WHERE id = ?').run(payment.id);
//     }
//   }
  
//   res.status(200).send();
// });