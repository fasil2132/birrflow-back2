// backend/src/routes/bills.ts
import express from "express";
import db from "../db";
import { authenticate } from "../middleware/auth";
import { Bill } from "../types";

const router = express.Router();

router.use(authenticate);

// Create a new bill
router.post("/", (req, res) => {
  try {
    const userId = req.userId!;
    const {
      biller_name,
      bill_type,
      amount,
      due_date,
      recurrence = "none",
      facilitation_fee,
      interest_rate,
      penalty_rate,
      original_loan_amount,
      loan_start_date,
    } = req.body;

    // Validation
    if (!biller_name || !bill_type || !amount || !due_date) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    if (isNaN(parseFloat(amount))) {
      return res.status(400).json({ error: "Amount must be a number" });
    }

    // For loan bills, validate loan-specific fields
    if (bill_type === "loan") {
      if (!original_loan_amount || !loan_start_date) {
        return res.status(400).json({
          error: "Loan bills require original_loan_amount and loan_start_date",
        });
      }
    }

    // Create bill
    const result = db
      .prepare(
        `
      INSERT INTO bills (user_id, biller_name, bill_type, amount, due_date, recurrence,
      facilitation_fee, interest_rate, penalty_rate, original_loan_amount, loan_start_date
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
      )
      .run(
        userId,
        biller_name,
        bill_type,
        amount,
        due_date,
        recurrence,
        facilitation_fee || 0,
        interest_rate || 0,
        penalty_rate || 0,
        original_loan_amount || amount,
        loan_start_date || due_date
      );

    const newBill = db
      .prepare("SELECT * FROM bills WHERE id = ?")
      .get(result.lastInsertRowid) as Bill;
    res.status(201).json(newBill);
  } catch (error) {
    console.error("Create bill error:", error);
    res.status(500).json({ error: "Failed to create bill" });
  }
});

// Get all bills for user
router.get("/", (req, res) => {
  try {
    const userId = req.userId!;
    const bills = db
      .prepare(
        `
      SELECT * FROM bills 
      WHERE user_id = ?
      ORDER BY due_date ASC
    `
      )
      .all(userId) as Bill[];

    res.json(bills);
  } catch (error) {
    console.error("Get bills error:", error);
    res.status(500).json({ error: "Failed to get bills" });
  }
});

// Update a bill
router.put("/:id", (req, res) => {
  try {
    const userId = req.userId!;
    const billId = parseInt(req.params.id);
    const {
      biller_name,
      bill_type,
      amount,
      due_date,
      recurrence,
      is_paid,
      facilitation_fee,
      interest_rate,
      penalty_rate,
      original_loan_amount,
      loan_start_date,
    } = req.body;

    // Verify bill exists and belongs to user
    const existingBill = db
      .prepare(
        `
      SELECT * FROM bills WHERE id = ? AND user_id = ?
    `
      )
      .get(billId, userId) as Bill;

    if (!existingBill) {
      return res.status(404).json({ error: "Bill not found" });
    }

    // Update bill
    db.prepare(
      `
      UPDATE bills 
      SET biller_name = ?, bill_type = ?, amount = ?, due_date = ?, recurrence = ?, is_paid = ?,
      facilitation_fee = ?, interest_rate = ?, penalty_rate = ?, original_loan_amount = ?, loan_start_date = ?
      WHERE id = ?
    `
    ).run(
      biller_name || existingBill.biller_name,
      bill_type || existingBill.bill_type,
      amount || existingBill.amount,
      due_date || existingBill.due_date,
      recurrence || existingBill.recurrence,
      is_paid !== undefined ? is_paid : existingBill.is_paid,
      facilitation_fee !== undefined ? facilitation_fee : existingBill.facilitation_fee,
      interest_rate !== undefined ? interest_rate : existingBill.interest_rate,
      penalty_rate !== undefined ? penalty_rate : existingBill.penalty_rate,
      original_loan_amount !== undefined ? original_loan_amount : existingBill.original_loan_amount,
      loan_start_date !== undefined ? loan_start_date : existingBill.loan_start_date,
      billId
    );

    const updatedBill = db
      .prepare("SELECT * FROM bills WHERE id = ?")
      .get(billId) as Bill;
    res.json(updatedBill);
  } catch (error) {
    console.error("Update bill error:", error);
    res.status(500).json({ error: "Failed to update bill" });
  }
});

// Mark bill as paid
router.patch("/:id/paid", (req, res) => {
  try {
    const userId = req.userId!;
    const billId = parseInt(req.params.id);

    // Verify bill exists and belongs to user
    const existingBill = db
      .prepare(
        `
      SELECT * FROM bills WHERE id = ? AND user_id = ?
    `
      )
      .get(billId, userId) as Bill;

    if (!existingBill) {
      return res.status(404).json({ error: "Bill not found" });
    }

    // Update payment status
    db.prepare("UPDATE bills SET is_paid = 1 WHERE id = ?").run(billId);

    const updatedBill = db
      .prepare("SELECT * FROM bills WHERE id = ?")
      .get(billId) as Bill;
    res.json(updatedBill);
  } catch (error) {
    console.error("Mark bill paid error:", error);
    res.status(500).json({ error: "Failed to mark bill as paid" });
  }
});

// Delete a bill
router.delete("/:id", (req, res) => {
  try {
    const userId = req.userId!;
    const billId = parseInt(req.params.id);

    // Verify bill exists and belongs to user
    const existingBill = db
      .prepare(
        `
      SELECT * FROM bills WHERE id = ? AND user_id = ?
    `
      )
      .get(billId, userId) as Bill;

    if (!existingBill) {
      return res.status(404).json({ error: "Bill not found" });
    }

    db.prepare("DELETE FROM bills WHERE id = ?").run(billId);
    res.status(204).send();
  } catch (error) {
    console.error("Delete bill error:", error);
    res.status(500).json({ error: "Failed to delete bill" });
  }
});

export default router;
