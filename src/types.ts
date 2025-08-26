// User type
export interface User {
  id: number;
  phone?: string;
  email?: string;
  password_hash?: string;
  created_at: string;
  is_admin: boolean;
  last_login: string;
}

// Financial account
export interface Account {
  id: number;
  user_id: number;
  name: string;
  balance: number;
  created_at: string;
  updated_at: string;
}

// Bill payment
export interface Bill {
  id: number;
  user_id: number;
  biller_name: string;
  bill_type: "utility" | "loan" | "school" | "rent" | "insurance" | "other";
  amount: number;
  due_date: string; // ISO date string
  recurrence: "none" | "daily" | "weekly" | "monthly" | "quarterly" | "yearly";
  is_paid: boolean;
  created_at: string;
  updated_at: string;
  facilitation_fee: number;
  interest_rate: number;
  penalty_rate: number;
  original_loan_amount: number;
  loan_start_date: string;
}

// Income source
export interface IncomeSource {
  id: number;
  user_id: number;
  name: string;
  amount: number;
  frequency:
    | "daily"
    | "weekly"
    | "bi-weekly"
    | "monthly"
    | "quarterly"
    | "yearly";
  next_pay_date?: string; // ISO date string
  created_at: string;
}

export interface Payment {
  id: number;
  user_id: number;
  bill_id: number;
  amount: number;
  transaction_id: string;
  status: string;
  created_at: string;
}

export interface PaymentRequest {
  amount: number;
  phone: string;
  description: string;
  callback_url: string;
  transaction_id?: string;
}

export interface TimelineEvent {
  date: string;
  type: "bill" | "income" | "expense" | "fee" | "interest" | "penalty";
  amount: number;
  id: number;
  name: string;
  // Loan-specific properties
  bill_type?: string;
  facilitation_fee?: number;
  interest_rate?: number;
  penalty_rate?: number;
  original_loan_amount?: number;
  loan_start_date?: string;
}

export interface TimelineDay {
  date: string;
  totalBalance: number;
  events: TimelineEvent[];
}

interface UserPreferences {
  loanPreferences: {
    defaultFacilitationFee: number;
    defaultInterestRate: number;
    defaultPenaltyRate: number;
  };
}

export interface Budget {
  id: number;
  user_id: number;
  category_id: number;
  amount: number;
  period: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface BudgetTransaction {
  id: number;
  user_id: number;
  budget_id: number;
  category_id: number;
  amount: number;
  description: string;
  date: string;
  type: string;
  created_at: string;
  total_income?: number;
  total_expenses?: number;
}
