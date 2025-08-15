"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// backend/src/routes/bills.ts
const express_1 = __importDefault(require("express"));
const db_1 = __importDefault(require("../db"));
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
router.use(auth_1.authenticate);
// Create a new bill
router.post("/", (req, res) => {
    try {
        const userId = req.userId;
        const { biller_name, bill_type, amount, due_date, recurrence = "none", } = req.body;
        // Validation
        if (!biller_name || !bill_type || !amount || !due_date) {
            return res.status(400).json({ error: "Missing required fields" });
        }
        if (isNaN(parseFloat(amount))) {
            return res.status(400).json({ error: "Amount must be a number" });
        }
        // Create bill
        const result = db_1.default
            .prepare(`
      INSERT INTO bills (user_id, biller_name, bill_type, amount, due_date, recurrence)
      VALUES (?, ?, ?, ?, ?, ?)
    `)
            .run(userId, biller_name, bill_type, amount, due_date, recurrence);
        const newBill = db_1.default
            .prepare("SELECT * FROM bills WHERE id = ?")
            .get(result.lastInsertRowid);
        res.status(201).json(newBill);
    }
    catch (error) {
        console.error("Create bill error:", error);
        res.status(500).json({ error: "Failed to create bill" });
    }
});
// Get all bills for user
router.get("/", (req, res) => {
    try {
        const userId = req.userId;
        const bills = db_1.default
            .prepare(`
      SELECT * FROM bills 
      WHERE user_id = ?
      ORDER BY due_date ASC
    `)
            .all(userId);
        res.json(bills);
    }
    catch (error) {
        console.error("Get bills error:", error);
        res.status(500).json({ error: "Failed to get bills" });
    }
});
// Update a bill
router.put("/:id", (req, res) => {
    try {
        const userId = req.userId;
        const billId = parseInt(req.params.id);
        const { biller_name, bill_type, amount, due_date, recurrence, is_paid } = req.body;
        // Verify bill exists and belongs to user
        const existingBill = db_1.default
            .prepare(`
      SELECT * FROM bills WHERE id = ? AND user_id = ?
    `)
            .get(billId, userId);
        if (!existingBill) {
            return res.status(404).json({ error: "Bill not found" });
        }
        // Update bill
        db_1.default.prepare(`
      UPDATE bills 
      SET biller_name = ?, bill_type = ?, amount = ?, due_date = ?, recurrence = ?, is_paid = ?
      WHERE id = ?
    `).run(biller_name || existingBill.biller_name, bill_type || existingBill.bill_type, amount || existingBill.amount, due_date || existingBill.due_date, recurrence || existingBill.recurrence, is_paid !== undefined ? is_paid : existingBill.is_paid, billId);
        const updatedBill = db_1.default
            .prepare("SELECT * FROM bills WHERE id = ?")
            .get(billId);
        res.json(updatedBill);
    }
    catch (error) {
        console.error("Update bill error:", error);
        res.status(500).json({ error: "Failed to update bill" });
    }
});
// Mark bill as paid
router.patch("/:id/paid", (req, res) => {
    try {
        const userId = req.userId;
        const billId = parseInt(req.params.id);
        // Verify bill exists and belongs to user
        const existingBill = db_1.default
            .prepare(`
      SELECT * FROM bills WHERE id = ? AND user_id = ?
    `)
            .get(billId, userId);
        if (!existingBill) {
            return res.status(404).json({ error: "Bill not found" });
        }
        // Update payment status
        db_1.default.prepare("UPDATE bills SET is_paid = 1 WHERE id = ?").run(billId);
        const updatedBill = db_1.default
            .prepare("SELECT * FROM bills WHERE id = ?")
            .get(billId);
        res.json(updatedBill);
    }
    catch (error) {
        console.error("Mark bill paid error:", error);
        res.status(500).json({ error: "Failed to mark bill as paid" });
    }
});
// Delete a bill
router.delete("/:id", (req, res) => {
    try {
        const userId = req.userId;
        const billId = parseInt(req.params.id);
        // Verify bill exists and belongs to user
        const existingBill = db_1.default
            .prepare(`
      SELECT * FROM bills WHERE id = ? AND user_id = ?
    `)
            .get(billId, userId);
        if (!existingBill) {
            return res.status(404).json({ error: "Bill not found" });
        }
        db_1.default.prepare("DELETE FROM bills WHERE id = ?").run(billId);
        res.status(204).send();
    }
    catch (error) {
        console.error("Delete bill error:", error);
        res.status(500).json({ error: "Failed to delete bill" });
    }
});
exports.default = router;
