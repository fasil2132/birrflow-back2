// backend/src/routes/forecast.ts
import express from "express";
import db from "../db";
import { authenticate } from "../middleware/auth";
import { projectBalanceTimeline } from "../services/forecast";
import { Account, Bill, IncomeSource } from "../types";

const router = express.Router();

router.use(authenticate);

// Get cash flow forecast
router.get("/", (req, res) => {
  try {
    const userId = req.userId!;

    // Get user data
    const accounts = db
      .prepare(
        `
      SELECT id, name, balance FROM accounts 
      WHERE user_id = ?
    `
      )
      .all(userId) as Account[];

    const bills = db
      .prepare(
        `
      SELECT id, biller_name, amount, due_date, recurrence, is_paid,
       facilitation_fee, interest_rate, penalty_rate, 
       original_loan_amount, loan_start_date, bill_type
      FROM bills 
      WHERE user_id = ? AND is_paid = 0
    `
      )
      .all(userId) as Bill[];

    const incomeSources = db
      .prepare(
        `
      SELECT id, name, amount, frequency, next_pay_date 
      FROM income_sources 
      WHERE user_id = ?
    `
      )
      .all(userId) as IncomeSource[];

    // Set date range (next 30 days)
    const startDate = new Date().toISOString().split("T")[0];
    const endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];

    // Generate forecast
    const forecast = projectBalanceTimeline(
      startDate,
      endDate,
      accounts,
      bills,
      incomeSources,
      userId
    );

    res.json(forecast);
  } catch (error) {
    console.error("Forecast error:", error);
    res.status(500).json({ error: "Failed to generate forecast" });
  }
});

export default router;
