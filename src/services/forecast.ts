// backend/src/services/forecast.ts
import { Account, Bill, IncomeSource } from '../types';
import db from '../db';

interface TimelineEvent {
  date: string;
  type: 'bill' | 'income';
  amount: number;
  id: number;
  name: string;
}

interface TimelineDay {
  date: string;
  totalBalance: number;
  events: TimelineEvent[];
}

export function projectBalanceTimeline(
  startDate: string,
  endDate: string,
  accounts: Account[],
  bills: Bill[],
  incomeSources: IncomeSource[],
  dailySpendBuffer = 0
): TimelineDay[] {
  const timeline: TimelineDay[] = [];
  
  // Clone starting balances
  const currentBalances: Record<string, number> = {};
  accounts.forEach(acc => {
    currentBalances[acc.name] = acc.balance;
  });
  
  // Create combined event timeline
  const allEvents: TimelineEvent[] = [];
  
  // Add bills
  bills.forEach(bill => {
    if (bill.due_date >= startDate && bill.due_date <= endDate) {
      allEvents.push({
        date: bill.due_date,
        type: 'bill',
        amount: -bill.amount,
        id: bill.id,
        name: bill.biller_name
      });
    }
  });
  
  // Add income
  incomeSources.forEach(income => {
    const payDates = generateIncomeDates(
      income.next_pay_date || startDate,
      income.frequency,
      startDate,
      endDate
    );
    
    payDates.forEach(date => {
      allEvents.push({
        date,
        type: 'income',
        amount: income.amount,
        id: income.id,
        name: income.name
      });
    });
  });
  
  // Sort events by date
  allEvents.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  // Initialize with starting balances
  timeline.push({
    date: startDate,
    totalBalance: Object.values(currentBalances).reduce((sum, bal) => sum + bal, 0),
    events: []
  });
  
  // Process each day
  const currentDate = new Date(startDate);
  const end = new Date(endDate);
  
  while (currentDate <= end) {
    const dateStr = currentDate.toISOString().split('T')[0];
    
    // Apply daily spend buffer
    if (dailySpendBuffer > 0) {
      // Deduct from first account (Telebirr by default)
      const primaryAccount = accounts[0]?.name || 'Telebirr';
      if (currentBalances[primaryAccount] !== undefined) {
        currentBalances[primaryAccount] -= dailySpendBuffer;
      }
    }
    
    // Apply events for this date
    const todaysEvents = allEvents.filter(event => event.date === dateStr);
    todaysEvents.forEach(event => {
      // Apply to primary account
      const primaryAccount = accounts[0]?.name || 'Telebirr';
      if (currentBalances[primaryAccount] !== undefined) {
        currentBalances[primaryAccount] += event.amount;
      }
    });
    
    // Record daily state
    timeline.push({
      date: dateStr,
      totalBalance: Object.values(currentBalances).reduce((sum, bal) => sum + bal, 0),
      events: todaysEvents
    });
    
    // Next day
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return timeline;
}

function generateIncomeDates(
  startDate: string,
  frequency: string,
  rangeStart: string,
  rangeEnd: string
): string[] {
  const dates: string[] = [];
  let current = new Date(startDate);
  const end = new Date(rangeEnd);
  
  while (current <= end) {
    const dateStr = current.toISOString().split('T')[0];
    if (dateStr >= rangeStart) {
      dates.push(dateStr);
    }
    
    // Increment based on frequency
    switch (frequency) {
      case 'daily':
        current.setDate(current.getDate() + 1);
        break;
      case 'weekly':
        current.setDate(current.getDate() + 7);
        break;
      case 'bi-weekly':
        current.setDate(current.getDate() + 14);
        break;
      case 'monthly':
        current.setMonth(current.getMonth() + 1);
        break;
      case 'quarterly':
        current.setMonth(current.getMonth() + 3);
        break;
      case 'yearly':
        current.setFullYear(current.getFullYear() + 1);
        break;
      default:
        return dates; // Unknown frequency
    }
  }
  
  return dates;
}

// function calculateDailyExpense(userId: number): number {
//   // Calculate average daily spend from historical data
//   const result = db.prepare(`
//     SELECT AVG(amount) as avgDaily 
//     FROM (
//       SELECT SUM(amount) as amount, date(created_at) as day
//       FROM expenses
//       WHERE user_id = ?
//       GROUP BY date(created_at)
//     )
//   `).get(userId);
  
//   return result.avgDaily || 0;
// }

function generateIncomeDates2(income: IncomeSource, start: Date, end: Date): Date[] {
  const dates: Date[] = [];
  let current = new Date(income.next_pay_date || "");
  
  while (current <= end) {
    if (current >= start) dates.push(new Date(current));
    
    // Increment based on frequency
    switch (income.frequency) {
      case 'weekly': current.setDate(current.getDate() + 7); break;
      case 'bi-weekly': current.setDate(current.getDate() + 14); break;
      case 'monthly': current.setMonth(current.getMonth() + 1); break;
      // ... other frequencies
    }
  }
  
  return dates;
}