// // backend/src/services/notification.ts
// import db from "../db";
// import { format } from "date-fns";
// import { User, Bill } from "../types";

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


import db from '../db';
import { format, addDays } from 'date-fns';
import { projectBalanceTimeline } from './forecast';
import { User, Account, Bill, IncomeSource } from '../types';


export async function checkAndSendAlerts() {
  try {
    console.log('[Notification] Starting daily alerts check');
    
    // Get all active users
    const users = db.prepare('SELECT id FROM users').all();
    
    for (const user of users) {
      console.log(`[Notification] Processing user: ${(user as User).id}`);
      
      // 1. Check upcoming bills (within 3 days)
      const threeDaysFromNow = addDays(new Date(), 3);
      const upcomingBills = db.prepare(`
        SELECT id, biller_name, amount, due_date 
        FROM bills 
        WHERE user_id = ? 
          AND is_paid = 0 
          AND due_date <= ?
      `).all((user as User).id, format(threeDaysFromNow, 'yyyy-MM-dd'));
      
      // 2. Generate and cache forecast
      const accounts = db.prepare('SELECT * FROM accounts WHERE user_id = ?').all((user as User).id) as Account[];
      const bills = db.prepare('SELECT * FROM bills WHERE user_id = ? AND is_paid = 0').all((user as User).id) as Bill[];
      const incomeSources = db.prepare('SELECT * FROM income_sources WHERE user_id = ?').all((user as User).id) as IncomeSource[];
      
      const startDate = format(new Date(), 'yyyy-MM-dd');
      const endDate = format(addDays(new Date(), 7), 'yyyy-MM-dd');
      const forecast = projectBalanceTimeline(
        startDate,
        endDate,
        accounts,
        bills,
        incomeSources
      );
      
      // Cache forecast
      db.prepare('DELETE FROM forecast_cache WHERE user_id = ?').run((user as User).id);
      const insertCache = db.prepare(`
        INSERT INTO forecast_cache (user_id, date, totalBalance)
        VALUES (?, ?, ?)
      `);
      
      for (const day of forecast) {
        insertCache.run((user as User).id, day.date, day.totalBalance);
      }
      
      // 3. Check for low balance
      const minBalance = Math.min(...forecast.map(d => d.totalBalance));
      
      // 4. Create notifications
      const notifications = [];
      
      if (upcomingBills.length > 0) {
        const billNames = upcomingBills.map(b => (b as Bill).biller_name).join(', ');
        notifications.push({
          type: 'bill',
          message: `You have ${upcomingBills.length} bills due soon: ${billNames}`,
          data: JSON.stringify({ billIds: upcomingBills.map(b => (b as Bill).id) })
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
        const insert = db.prepare(`
          INSERT INTO notifications (user_id, type, message, data)
          VALUES (?, ?, ?, ?)
        `);
        
        for (const notif of notifications) {
          insert.run((user as User).id, notif.type, notif.message, notif.data);
          console.log(`[Notification] Created notification for user ${(user as User).id}: ${notif.message}`);
        }
      }
    }
    
    console.log('[Notification] Daily alerts check completed');
  } catch (error) {
    console.error('[Notification] Error in daily alerts check:', error);
  }
}