"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const db_1 = __importDefault(require("../db"));
const config_1 = require("../config");
const router = express_1.default.Router();
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
        const existingUser = db_1.default
            .prepare('SELECT * FROM users WHERE phone = ? OR email = ?')
            .get(phone, email);
        if (existingUser) {
            return res.status(400).json({ error: 'User already exists' });
        }
        // Hash password
        const hashedPassword = await bcrypt_1.default.hash(password, config_1.BCRYPT_SALT_ROUNDS);
        // Create user
        const result = db_1.default
            .prepare('INSERT INTO users (phone, email, password_hash) VALUES (?, ?, ?)')
            .run(phone, email, hashedPassword);
        const newUser = db_1.default
            .prepare('SELECT id, phone, email, created_at FROM users WHERE id = ?')
            .get(result.lastInsertRowid);
        // Generate JWT
        const token = jsonwebtoken_1.default.sign({ userId: newUser.id }, config_1.JWT_SECRET, {
            expiresIn: '7d'
        });
        res.status(201).json({ user: newUser, token });
    }
    catch (error) {
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
        const user = db_1.default
            .prepare('SELECT * FROM users WHERE phone = ? OR email = ?')
            .get(identifier, identifier);
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        // Verify password
        const passwordMatch = await bcrypt_1.default.compare(password, user.password_hash || "");
        if (!passwordMatch) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        // Generate JWT
        const token = jsonwebtoken_1.default.sign({ userId: user.id }, config_1.JWT_SECRET, {
            expiresIn: '7d'
        });
        // Return user without password hash
        const { password_hash, ...safeUser } = user;
        res.json({ user: safeUser, token });
    }
    catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});
exports.default = router;
