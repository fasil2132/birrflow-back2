import db from '../db';

export interface FinancialTip {
  id: number;
  title: string;
  content: string;
  category: 'saving' | 'investing' | 'inflation' | 'budgeting';
  language: 'en' | 'am';
}

export const getFinancialTips = (category?: string, language?: string): FinancialTip[] => {
  let query = 'SELECT * FROM financial_education';
  const params = [];
  
  if (category || language) {
    query += ' WHERE ';
    const conditions = [];
    
    if (category) {
      conditions.push('category = ?');
      params.push(category);
    }
    
    if (language) {
      conditions.push('language = ?');
      params.push(language);
    }
    
    query += conditions.join(' AND ');
  }
  
  return db.prepare(query).all(params) as FinancialTip[];
};