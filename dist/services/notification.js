"use strict";
// // backend/src/services/notification.ts
// import db from "../db";
// import { format } from "date-fns";
// import { User, Bill } from "../types";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkAndSendAlerts = checkAndSendAlerts;
// export async function checkAndSendAlerts() {
//   // 1. Get all users
//   const users = db.prepare("SELECT id FROM users").all();
//   for (const user of users) {
//     // 2. Get upcoming bills (within 3 days)
//     const threeDaysFromNow = new Date();
//     threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
//     const upcomingBills = db
//       .prepare(
//         `
//       SELECT * FROM bills 
//       WHERE user_id = ? 
//         AND is_paid = 0 
//         AND due_date <= ?
//     `
//       )
//       .all((user as User).id, format(threeDaysFromNow, "yyyy-MM-dd"));
//     // 3. Get low balance forecast
//     const forecast = db
//       .prepare(
//         `
//       SELECT MIN(totalBalance) as minBalance 
//       FROM forecast_cache 
//       WHERE user_id = ? 
//         AND date BETWEEN date('now') AND date('now', '+7 days')
//     `
//       )
//       .get((user as User).id);
//     // 4. Send notifications
//     if (upcomingBills.length > 0 || (forecast && forecast.minBalance < 100)) {
//       const notifications = [];
//       if (upcomingBills.length > 0) {
//         notifications.push({
//           type: "bill",
//           message: `You have ${upcomingBills.length} bills due soon`,
//           data: JSON.stringify({ billIds: upcomingBills.map((b) => (b as Bill).id) }),
//         });
//       }
//       if (forecast.minBalance < 100) {
//         notifications.push({
//           type: "balance",
//           message: `Low balance predicted: ETB ${forecast.minBalance.toFixed(
//             2
//           )}`,
//           data: JSON.stringify({ minBalance: forecast.minBalance }),
//         });
//       }
//       // Save to notifications table
//       const insert = db.prepare(`
//         INSERT INTO notifications (user_id, type, message, data, is_read)
//         VALUES (?, ?, ?, ?, 0)
//       `);
//       for (const notif of notifications) {
//         insert.run((user as User).id, notif.type, notif.message, notif.data);
//       }
//     }
//   }
// }
const db_1 = __importDefault(require("../db"));
const date_fns_1 = require("date-fns");
const forecast_1 = require("./forecast");
async function checkAndSendAlerts() {
    try {
        console.log('[Notification] Starting daily alerts check');
        // Get all active users
        const users = db_1.default.prepare('SELECT id FROM users').all();
        for (const user of users) {
            console.log(`[Notification] Processing user: ${user.id}`);
            // 1. Check upcoming bills (within 3 days)
            const threeDaysFromNow = (0, date_fns_1.addDays)(new Date(), 3);
            const upcomingBills = db_1.default.prepare(`
        SELECT id, biller_name, amount, due_date 
        FROM bills 
        WHERE user_id = ? 
          AND is_paid = 0 
          AND due_date <= ?
      `).all(user.id, (0, date_fns_1.format)(threeDaysFromNow, 'yyyy-MM-dd'));
            // 2. Generate and cache forecast
            const accounts = db_1.default.prepare('SELECT * FROM accounts WHERE user_id = ?').all(user.id);
            const bills = db_1.default.prepare('SELECT * FROM bills WHERE user_id = ? AND is_paid = 0').all(user.id);
            const incomeSources = db_1.default.prepare('SELECT * FROM income_sources WHERE user_id = ?').all(user.id);
            const startDate = (0, date_fns_1.format)(new Date(), 'yyyy-MM-dd');
            const endDate = (0, date_fns_1.format)((0, date_fns_1.addDays)(new Date(), 7), 'yyyy-MM-dd');
            const forecast = (0, forecast_1.projectBalanceTimeline)(startDate, endDate, accounts, bills, incomeSources);
            // Cache forecast
            db_1.default.prepare('DELETE FROM forecast_cache WHERE user_id = ?').run(user.id);
            const insertCache = db_1.default.prepare(`
        INSERT INTO forecast_cache (user_id, date, totalBalance)
        VALUES (?, ?, ?)
      `);
            for (const day of forecast) {
                insertCache.run(user.id, day.date, day.totalBalance);
            }
            // 3. Check for low balance
            const minBalance = Math.min(...forecast.map(d => d.totalBalance));
            // 4. Create notifications
            const notifications = [];
            if (upcomingBills.length > 0) {
                const billNames = upcomingBills.map(b => b.biller_name).join(', ');
                notifications.push({
                    type: 'bill',
                    message: `You have ${upcomingBills.length} bills due soon: ${billNames}`,
                    data: JSON.stringify({ billIds: upcomingBills.map(b => b.id) })
                });
            }
            if (minBalance < 100) {
                notifications.push({
                    type: 'balance',
                    message: `Low balance predicted: ETB ${minBalance.toFixed(2)} in the next 7 days`,
                    data: JSON.stringify({ minBalance })
                });
            }
            // Save notifications to DB
            if (notifications.length > 0) {
                const insert = db_1.default.prepare(`
          INSERT INTO notifications (user_id, type, message, data)
          VALUES (?, ?, ?, ?)
        `);
                for (const notif of notifications) {
                    insert.run(user.id, notif.type, notif.message, notif.data);
                    console.log(`[Notification] Created notification for user ${user.id}: ${notif.message}`);
                }
            }
        }
        console.log('[Notification] Daily alerts check completed');
    }
    catch (error) {
        console.error('[Notification] Error in daily alerts check:', error);
    }
}
