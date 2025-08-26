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

import express from "express";
import db from "../db";
import { authenticate } from "../middleware/auth";
import { initiatePayment } from "../services/telebirr";
import { Bill, Payment, PaymentRequest } from "../types";

const router = express.Router();

router.use(authenticate);

// Initiate Telebirr payment
router.post("/pay-bill", async (req, res) => {
  try {
    const { bill_id, phone } = req.body;
    const userId = req.userId!;

    // Get bill
    const bill = db
      .prepare("SELECT * FROM bills WHERE id = ? AND user_id = ?")
      .get(bill_id, userId) as Bill;
    if (!bill) {
      return res.status(404).json({ error: "Bill not found" });
    }

    // Create payment record
    const paymentRecord = db
      .prepare(
        `
      INSERT INTO payments (user_id, bill_id, amount, status)
      VALUES (?, ?, ?, 'pending')
    `
      )
      .run(userId, bill_id, bill.amount);

    // Initiate Telebirr payment
    const payment = await initiatePayment({
      amount: bill.amount,
      phone,
      description: `Payment for ${bill.biller_name}`,
      callback_url: `${process.env.API_BASE_URL}/api/payment/webhook`,
      transaction_id: `bill-${bill_id}-${paymentRecord.lastInsertRowid}`,
    });

    // Update payment record with transaction ID
    db.prepare("UPDATE payments SET transaction_id = ? WHERE id = ?").run(
      // payment.transaction_id,
      "none",
      paymentRecord.lastInsertRowid
    );

    res.json({ payment_url: payment.payment_url });
  } catch (error) {
    console.error("Payment initiation error:", error);
    res.status(500).json({ error: "Payment initiation failed" });
  }
});

// Payment webhook
router.post("/webhook", async (req, res) => {
  try {
    const { transaction_id, status } = req.body;

    // Update payment status
    const payment = db
      .prepare("SELECT * FROM payments WHERE transaction_id = ?")
      .get(transaction_id) as Payment;
    if (!payment) {
      return res.status(404).json({ error: "Payment not found" });
    }

    if (status === "success") {
      // db.prepare('UPDATE users SET is_premium = 1 WHERE id = ?').run(payment.user_id);
      db.prepare('UPDATE payments SET status = "completed" WHERE id = ?').run(
        payment.id
      );

      // Mark bill as paid
      db.prepare("UPDATE bills SET is_paid = 1 WHERE id = ?").run(
        payment.bill_id
      );

      // Deduct from Telebirr balance
      db.prepare(
        `
        UPDATE accounts 
        SET balance = balance - ? 
        WHERE user_id = ? AND name LIKE '%Telebirr%'
      `
      ).run(payment.amount, payment.user_id);
    } else {
      db.prepare('UPDATE payments SET status = "failed" WHERE id = ?').run(
        payment.id
      );
    }

    res.status(200).send("OK");
  } catch (error) {
    console.error("Payment webhook error:", error);
    res.status(500).json({ error: "Webhook processing failed" });
  }
});

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


export default router;
