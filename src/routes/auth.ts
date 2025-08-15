import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import db from '../db';
import { JWT_SECRET, BCRYPT_SALT_ROUNDS } from '../config';
import { User } from '../types';

const router = express.Router();

// User registration
router.post('/register', async (req, res) => {
  try {
    const { phone, email, password } = req.body;
    
    // Validate input
    if (!(phone || email)) {
      return res.status(400).json({ error: 'Phone or email is required' });
    }
    if (!password) {
      return res.status(400).json({ error: 'Password is required' });
    }

    // Check if user exists
    const existingUser = db
      .prepare('SELECT * FROM users WHERE phone = ? OR email = ?')
      .get(phone, email);
    
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

    // Create user
    const result = db
      .prepare('INSERT INTO users (phone, email, password_hash) VALUES (?, ?, ?)')
      .run(phone, email, hashedPassword);

    const newUser = db
      .prepare('SELECT id, phone, email, created_at FROM users WHERE id = ?')
      .get(result.lastInsertRowid) as User;

    // Generate JWT
    const token = jwt.sign({ userId: newUser.id }, JWT_SECRET, {
      expiresIn: '7d'
    });

    res.status(201).json({ user: newUser, token });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// User login
router.post('/login', async (req, res) => {
  try {
    const { identifier, password } = req.body;
    
    if (!identifier || !password) {
      return res.status(400).json({ error: 'Identifier and password are required' });
    }

    // Find user by phone or email
    const user = db
      .prepare('SELECT * FROM users WHERE phone = ? OR email = ?')
      .get(identifier, identifier) as User;

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Verify password
    const passwordMatch = await bcrypt.compare(password, user.password_hash || "");
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, {
      expiresIn: '7d'
    });

    // Return user without password hash
    const { password_hash, ...safeUser } = user;
    res.json({ user: safeUser, token });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

export default router;