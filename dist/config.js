"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BCRYPT_SALT_ROUNDS = exports.JWT_SECRET = exports.PORT = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const PORT = process.env.PORT || 5000;
exports.PORT = PORT;
const JWT_SECRET = process.env.JWT_SECRET || 'birrflow_super_secret';
exports.JWT_SECRET = JWT_SECRET;
const BCRYPT_SALT_ROUNDS = 10;
exports.BCRYPT_SALT_ROUNDS = BCRYPT_SALT_ROUNDS;
