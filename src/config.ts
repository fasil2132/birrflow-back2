import dotenv from 'dotenv';
dotenv.config();

const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'birrflow_super_secret';
const BCRYPT_SALT_ROUNDS = 10;

export { PORT, JWT_SECRET, BCRYPT_SALT_ROUNDS };