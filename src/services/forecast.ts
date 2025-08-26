import {
  Account,
  Bill,
  IncomeSource,
  TimelineEvent,
  TimelineDay,
} from "../types";
import db from "../db";
import {
  format,
  addDays,
  addMonths,
  addYears,
  isAfter,
  isBefore,
  differenceInDays,
} from "date-fns";

interface UserPreferences {
  commonEthiopianExpenses: Array<{
    name: string;
    amount: number;
    day: number;
    enabled: boolean;
  }>;
  ethiopianHolidays: Array<{
    name: string;
    date: string;
    additionalSpending: number;
    enabled: boolean;
  }>;
  loanPreferences: {
    defaultFacilitationFee: number;
    defaultInterestRate: number;
    defaultPenaltyRate: number;
  };
  dailySpendingMultipliers: {
    monthEnd: number;
    holiday: number;
    regular: number;
  };
  inflationRate: number;
  exchangeRate: number;
}

interface DailyExpenseResult {
  avgDaily: number;
}

// Get user preferences from database
function getUserPreferences(userId: number): UserPreferences {
  try {
    const prefs = db
      .prepare(
        `
      SELECT preferences FROM user_preferences WHERE user_id = ?
    `
      )
      .get(userId) as { preferences: string } | undefined;

    if (prefs) {
      return JSON.parse(prefs.preferences);
    }
  } catch (error) {
    console.error("Failed to get user preferences:", error);
  }

  // Return default preferences if none found
  return {
    commonEthiopianExpenses: [
      { name: "Ethio Telecom", amount: 350, day: 15, enabled: true },
      { name: "Water Bill", amount: 100, day: 10, enabled: true },
      { name: "Electricity", amount: 500, day: 20, enabled: true },
      { name: "House Rent", amount: 5000, day: 1, enabled: true },
      { name: "Internet", amount: 1000, day: 5, enabled: true },
    ],
    ethiopianHolidays: [
      {
        name: "Christmas",
        date: "01-07",
        additionalSpending: 500,
        enabled: true,
      },
      { name: "Timkat", date: "01-19", additionalSpending: 300, enabled: true },
      {
        name: "New Year",
        date: "09-11",
        additionalSpending: 400,
        enabled: true,
      },
      { name: "Meskel", date: "09-27", additionalSpending: 300, enabled: true },
    ],
    loanPreferences: {
      defaultFacilitationFee: 6,
      defaultInterestRate: 0.66,
      defaultPenaltyRate: 0.11,
    },
    dailySpendingMultipliers: {
      monthEnd: 1.3,
      holiday: 1.5,
      regular: 1,
    },
    inflationRate: 0.13,
    exchangeRate: 140.65,
  };
}

// Get Ethiopian financial context for a specific date
function getEthiopianFinancialContext(
  date: Date,
  userPreferences: UserPreferences
) {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const mmdd = `${month.toString().padStart(2, "0")}-${day
    .toString()
    .padStart(2, "0")}`;

  // Check if it's a holiday from user preferences
  const holiday = userPreferences.ethiopianHolidays.find(
    (h) => h.enabled && h.date === mmdd
  );

  return {
    isMonthEnd: day >= 25,
    isHoliday: !!holiday,
    holidaySpending: holiday ? holiday.additionalSpending : 0,
    inflationRate: userPreferences.inflationRate,
    exchangeRate: userPreferences.exchangeRate,
    dailySpendingMultipliers: userPreferences.dailySpendingMultipliers,
    telebirrFee: (amount: number) => (amount > 100 ? 2 : 0),
  };
}

// Add common Ethiopian recurring expenses
function addCommonEthiopianExpenses(
  userId: number,
  allEvents: TimelineEvent[],
  startDate: string,
  endDate: string,
  userPreferences: UserPreferences
) {
  const start = new Date(startDate);
  const end = new Date(endDate);

  userPreferences.commonEthiopianExpenses.forEach((expense) => {
    if (!expense.enabled) return;

    // Create expense for each month in the forecast range
    let expenseDate = new Date(
      start.getFullYear(),
      start.getMonth(),
      expense.day
    );

    // Adjust for current month if day has passed
    if (expenseDate < start) {
      expenseDate = addMonths(expenseDate, 1);
    }

    // Generate for each month until end of forecast period
    while (expenseDate <= end) {
      if (expenseDate >= start) {
        const dateStr = format(expenseDate, "yyyy-MM-dd");

        allEvents.push({
          date: dateStr,
          type: "expense",
          amount: -expense.amount,
          id: -1000 - expense.day, // Unique ID for common expenses
          name: expense.name,
        });
      }

      // Move to next month
      expenseDate = addMonths(expenseDate, 1);
    }
  });
}

// Generate income dates based on frequency
function generateIncomeDates(
  income: IncomeSource,
  rangeStart: Date,
  rangeEnd: Date
): string[] {
  const dates: string[] = [];
  let current = new Date(income.next_pay_date ?? "");

  // If no pay date, start from tomorrow
  if (isNaN(current.getTime())) {
    current = addDays(new Date(), 1);
  }

  while (current <= rangeEnd) {
    if (current >= rangeStart) {
      dates.push(format(current, "yyyy-MM-dd"));
    }

    // Increment based on frequency
    switch (income.frequency) {
      case "daily":
        current = addDays(current, 1);
        break;
      case "weekly":
        current = addDays(current, 7);
        break;
      case "bi-weekly":
        current = addDays(current, 14);
        break;
      case "monthly":
        current = addMonths(current, 1);
        break;
      case "quarterly":
        current = addMonths(current, 3);
        break;
      case "yearly":
        current = addYears(current, 1);
        break;
      default:
        return dates; // Unknown frequency
    }
  }

  return dates;
}

// Calculate daily expense buffer based on historical spending
function calculateDailyExpense(userId: number): number {
  try {
    // Get average daily spend from expense history
    const result = db
      .prepare(
        `
      SELECT AVG(amount) as avgDaily 
      FROM (
        SELECT SUM(amount) as amount, date(created_at) as day
        FROM expenses
        WHERE user_id = ?
        GROUP BY date(created_at)
      )
    `
      )
      .get(userId) as DailyExpenseResult | undefined;

    return result?.avgDaily || 0;
  } catch (error) {
    console.error("Failed to calculate daily expense:", error);
    return 0;
  }
}

// Calculate loan amount with facilitation fee, interest, and penalty
function calculateLoanAmount(
  bill: Bill,
  targetDate: Date
): { amount: number; interest: number; penalty: number } {
  // console.log("bill.bill_type: ", bill.bill_type);
  // console.log(" bill.loan_start_date: ", bill.loan_start_date);
  if (bill.bill_type !== "loan" || !bill.loan_start_date) {
    return { amount: bill.amount, interest: 0, penalty: 0 };
  }

  const startDate = new Date(bill.loan_start_date);
  const dueDate = new Date(bill.due_date);
  const daysUntilDue = Math.ceil(
    (dueDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
  );
  const daysAfterDue = Math.max(
    0,
    Math.ceil(
      (targetDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
    )
  );

  // Calculate base amount with facilitation fee (deducted from received amount)
  const baseAmount = bill.original_loan_amount || bill.amount;
  const amountAfterFee = baseAmount * (1 - (bill.facilitation_fee || 0) / 100);

  // Calculate interest on the original amount
  const dailyInterestRate = (bill.interest_rate || 0) / 100;
  const interest = baseAmount * dailyInterestRate * daysUntilDue;

  // Calculate penalty if applicable (on the original amount)
  const dailyPenaltyRate = (bill.penalty_rate || 0) / 100;
  const penalty =
    daysAfterDue > 0 ? baseAmount * dailyPenaltyRate * daysAfterDue : 0;

  // Total amount due (what you need to pay back)
  const totalAmount = amountAfterFee + interest + penalty;

  return { amount: totalAmount, interest, penalty };
}

// Add daily interest events for loans
function addLoanInterestEvents(
  bill: Bill,
  allEvents: TimelineEvent[],
  startDate: Date,
  endDate: Date
) {
  if (bill.bill_type !== "loan" || !bill.loan_start_date) return;

  const start = new Date(bill.loan_start_date);
  const dueDate = new Date(bill.due_date);
  const baseAmount = bill.original_loan_amount || bill.amount;
  const dailyInterestRate = (bill.interest_rate || 0) / 100;
  const dailyInterest = baseAmount * dailyInterestRate;

  // Add daily interest events from start date to due date or end date (whichever comes first)
  let currentDate = new Date(start);
  const lastInterestDate = dueDate < endDate ? dueDate : endDate;

  while (currentDate <= lastInterestDate && currentDate <= endDate) {
    if (currentDate >= startDate) {
      const dateStr = format(currentDate, "yyyy-MM-dd");

      allEvents.push({
        date: dateStr,
        type: "interest",
        amount: -dailyInterest,
        id: bill.id * 1000 + differenceInDays(currentDate, start), // Unique ID for interest events
        name: `${bill.biller_name} Daily Interest`,
        bill_type: bill.bill_type,
        facilitation_fee: bill.facilitation_fee,
        interest_rate: bill.interest_rate,
        penalty_rate: bill.penalty_rate,
        original_loan_amount: bill.original_loan_amount,
        loan_start_date: bill.loan_start_date,
      } as TimelineEvent);
    }

    currentDate = addDays(currentDate, 1);
  }

  // Add penalty events after due date
  if (dueDate < endDate) {
    const dailyPenaltyRate = (bill.penalty_rate || 0) / 100;
    const dailyPenalty = baseAmount * dailyPenaltyRate;
    let penaltyDate = addDays(dueDate, 1);

    while (penaltyDate <= endDate) {
      if (penaltyDate >= startDate) {
        const dateStr = format(penaltyDate, "yyyy-MM-dd");

        allEvents.push({
          date: dateStr,
          type: "penalty",
          amount: -dailyPenalty,
          id: bill.id * 1000 + 10000 + differenceInDays(penaltyDate, dueDate), // Unique ID for penalty events
          name: `${bill.biller_name} Daily Penalty`,
          bill_type: bill.bill_type,
          facilitation_fee: bill.facilitation_fee,
          interest_rate: bill.interest_rate,
          penalty_rate: bill.penalty_rate,
          original_loan_amount: bill.original_loan_amount,
          loan_start_date: bill.loan_start_date,
        } as TimelineEvent);
      }

      penaltyDate = addDays(penaltyDate, 1);
    }
  }
}

export function projectBalanceTimeline(
  startDate: string,
  endDate: string,
  accounts: Account[],
  bills: Bill[],
  incomeSources: IncomeSource[],
  userId: number
): TimelineDay[] {
  const timeline: TimelineDay[] = [];
  const start = new Date(startDate);
  const end = new Date(endDate);

  // Get user preferences
  const userPreferences = getUserPreferences(userId);

  // Calculate daily expense buffer
  const dailySpendBuffer = calculateDailyExpense(userId);

  // Clone starting balances
  const currentBalances: Record<string, number> = {};
  accounts.forEach((acc) => {
    currentBalances[acc.name] = acc.balance;
  });

  // Create combined event timeline
  const allEvents: TimelineEvent[] = [];

  // Add bills and loan interest events
  bills.forEach((bill) => {
    const billDate = new Date(bill.due_date);

    // Add daily interest events for loans
    if (bill.bill_type === "loan") {
      addLoanInterestEvents(bill, allEvents, start, end);
    }

    // Add the main bill event on the due date
    if (billDate >= start && billDate <= end) {
      const calculatedAmount = calculateLoanAmount(bill, billDate);

      allEvents.push({
        date: format(billDate, "yyyy-MM-dd"),
        type: "bill",
        amount: -calculatedAmount.amount,
        id: bill.id,
        name: bill.biller_name,
        bill_type: bill.bill_type,
        facilitation_fee: bill.facilitation_fee,
        interest_rate: bill.interest_rate,
        penalty_rate: bill.penalty_rate,
        original_loan_amount: bill.original_loan_amount,
        loan_start_date: bill.loan_start_date,
      } as TimelineEvent);
    }
  });

  // Add income
  incomeSources.forEach((income) => {
    const payDates = generateIncomeDates(income, start, end);

    payDates.forEach((date) => {
      allEvents.push({
        date,
        type: "income",
        amount: income.amount,
        id: income.id,
        name: income.name,
      } as TimelineEvent);
    });
  });

  // Add common Ethiopian expenses
  addCommonEthiopianExpenses(
    userId,
    allEvents,
    startDate,
    endDate,
    userPreferences
  );

  // Sort events by date
  allEvents.sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  // Initialize with starting balances
  timeline.push({
    date: startDate,
    totalBalance: Object.values(currentBalances).reduce(
      (sum, bal) => sum + bal,
      0
    ),
    events: [],
  });

  // Process each day in the range
  const currentDate = new Date(start);
  currentDate.setDate(currentDate.getDate() + 1); // Start from next day

  while (currentDate <= end) {
    const dateStr = format(currentDate, "yyyy-MM-dd");
    const ethContext = getEthiopianFinancialContext(
      currentDate,
      userPreferences
    );

    // Apply daily spend buffer with user-specific multipliers
    if (dailySpendBuffer > 0) {
      // Apply to primary account (Telebirr by default)
      const primaryAccount = accounts[0]?.name || "Telebirr";
      if (currentBalances[primaryAccount] !== undefined) {
        // Apply user-specific spending multipliers
        let spendingMultiplier =
          userPreferences.dailySpendingMultipliers.regular;
        if (ethContext.isMonthEnd) {
          spendingMultiplier =
            userPreferences.dailySpendingMultipliers.monthEnd;
        }
        if (ethContext.isHoliday) {
          spendingMultiplier = userPreferences.dailySpendingMultipliers.holiday;
        }

        const adjustedSpend = dailySpendBuffer * spendingMultiplier;

        // Add holiday-specific spending if applicable
        const holidaySpending = ethContext.isHoliday
          ? ethContext.holidaySpending
          : 0;

        currentBalances[primaryAccount] -= adjustedSpend + holidaySpending;

        // Record as events
        allEvents.push({
          date: dateStr,
          type: "expense",
          amount: -adjustedSpend,
          id: -999,
          name: "Daily Expenses",
        } as TimelineEvent);

        if (holidaySpending > 0) {
          allEvents.push({
            date: dateStr,
            type: "expense",
            amount: -holidaySpending,
            id: -998,
            name: "Holiday Spending",
          } as TimelineEvent);
        }
      }
    }

    // Apply today's events (bills/income)
    const todaysEvents = allEvents.filter((event) => event.date === dateStr);
    todaysEvents.forEach((event) => {
      const primaryAccount = accounts[0]?.name || "Telebirr";
      if (currentBalances[primaryAccount] !== undefined) {
        currentBalances[primaryAccount] += event.amount;

        // Apply Telebirr fee for payments
        if (event.amount < 0 && event.id !== -999 && event.id !== -998) {
          const fee = ethContext.telebirrFee(Math.abs(event.amount));
          if (fee > 0) {
            currentBalances[primaryAccount] -= fee;

            todaysEvents.push({
              date: dateStr,
              type: "fee",
              amount: -fee,
              id: event.id * -1,
              name: "Telebirr Fee",
            } as TimelineEvent);
          }
        }
      }
    });

    // Apply inflation adjustment at end of day
    Object.keys(currentBalances).forEach((account) => {
      if (!account.toLowerCase().includes("usd")) {
        currentBalances[account] *= 1 - userPreferences.inflationRate / 365;
      }
    });

    // Record state at end of day
    timeline.push({
      date: dateStr,
      totalBalance: Object.values(currentBalances).reduce(
        (sum, bal) => sum + bal,
        0
      ),
      events: [...todaysEvents],
    });

    // Next day
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return timeline;
}
