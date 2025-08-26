// backend/src/middleware/auth.ts
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../config";
import db from "../db";

interface AuthRequest extends Request {
  userId?: number;
}

export const authenticate = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const token = req.header("Authorization")?.replace("Bearer ", "");
  if (!token) {
    return res.status(401).json({ error: "Authentication required" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
    const user = db
      .prepare("SELECT id FROM users WHERE id = ?")
      .get(decoded.userId);

    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    req.userId = decoded.userId;
    next();
  } catch (error) {
    console.error("Authentication error:", error);
    res.status(401).json({ error: "Invalid token" });
  }
};
