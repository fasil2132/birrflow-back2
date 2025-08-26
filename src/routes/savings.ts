import express from "express";
import { Request, Response } from "express";
import db from "../db";
import { authenticate } from "../middleware/auth";
import {
  createSavingsGoal,
  addToSavingsGoal,
  getSavingsGoals,
  getSavingsTransactions,
} from "../services/savings";

const router = express.Router();

router.use(authenticate);

// Create savings goal
router.post("/goals", (req: Request, res: Response) => {
  try {
    const userId = req.userId!;
    const { name, target_amount, target_date } = req.body;

    if (!name || target_amount <= 0) {
      return res
        .status(400)
        .json({ error: "Valid name and target amount required" });
    }

    const goal = createSavingsGoal(userId, {
      name,
      target_amount,
      target_date,
    });
    res.status(201).json(goal);
  } catch (error) {
    console.error("Create savings goal error:", error);
    res.status(500).json({ error: "Failed to create savings goal" });
  }
});

// Add to savings goal
router.post("/goals/:id/transactions", (req: Request, res: Response) => {
  try {
    const goalId = parseInt(req.params.id);
    const { amount } = req.body;

    if (amount <= 0) {
      return res.status(400).json({ error: "Positive amount required" });
    }

    // Verify goal belongs to user
    const goal = db
      .prepare("SELECT * FROM savings_goals WHERE id = ? AND user_id = ?")
      .get(goalId, req.userId);

    if (!goal) {
      return res.status(404).json({ error: "Savings goal not found" });
    }

    const transaction = addToSavingsGoal(goalId, amount);
    res.status(201).json(transaction);
  } catch (error) {
    console.error("Add to savings goal error:", error);
    res.status(500).json({ error: "Failed to add to savings goal" });
  }
});

// Get user's savings goals
router.get("/goals", (req: Request, res: Response) => {
  try {
    const goals = getSavingsGoals(req.userId!);
    res.json(goals);
  } catch (error) {
    console.error("Get savings goals error:", error);
    res.status(500).json({ error: "Failed to get savings goals" });
  }
});

// Get savings transactions
router.get("/goals/:id/transactions", (req: Request, res: Response) => {
  try {
    const goalId = parseInt(req.params.id);

    // Verify goal belongs to user
    const goal = db
      .prepare("SELECT * FROM savings_goals WHERE id = ? AND user_id = ?")
      .get(goalId, req.userId);

    if (!goal) {
      return res.status(404).json({ error: "Savings goal not found" });
    }

    const transactions = getSavingsTransactions(goalId);
    res.json(transactions);
  } catch (error) {
    console.error("Get savings transactions error:", error);
    res.status(500).json({ error: "Failed to get savings transactions" });
  }
});

router.delete("/goals/:id", (req: Request, res: Response) => {
  try {
    const savingsGoalId = parseInt(req.params.id);
    const userId = req.userId;
    db.prepare("DELETE FROM savings_goals WHERE id=? AND user_id=?").run(
      savingsGoalId,
      userId
    );
    res.json(204).send();
  } catch (error) {
    console.log("Delete SavingsGoal Error", error);
    res.status(500).json({ error: "Failed to Delete Savings Goal" });
  }
});

export default router;
