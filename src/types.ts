// User type
export interface User {
  id: number;
  phone?: string;
  email?: string;
  password_hash?: string;
  created_at: string;
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
  bill_type: 'utility' | 'loan' | 'school' | 'rent' | 'insurance' | 'other';
  amount: number;
  due_date: string; // ISO date string
  recurrence: 'none' | 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  is_paid: boolean;
  created_at: string;
  updated_at: string;
}

// Income source
export interface IncomeSource {
  id: number;
  user_id: number;
  name: string;
  amount: number;
  frequency: 'daily' | 'weekly' | 'bi-weekly' | 'monthly' | 'quarterly' | 'yearly';
  next_pay_date?: string; // ISO date string
  created_at: string;
}

export interface TimelineEvent {
  date: string;
  type: 'bill' | 'income';
  amount: number;
  id: number;
  name: string;
}

export interface TimelineDay {
  date: string;
  totalBalance: number;
  events: TimelineEvent[];
}