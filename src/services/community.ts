import db from '../db';

export interface CommunityTip {
  id: number;
  user_id: number;
  content: string;
  region: string;
  created_at: string;
}

export interface PriceComparison {
  id: number;
  user_id: number;
  item_name: string;
  price: number;
  market: string;
  region: string;
  created_at: string;
}

export const shareTip = (userId: number, tip: Omit<CommunityTip, 'id' | 'user_id'>): CommunityTip => {
  const result = db.prepare(`
    INSERT INTO community_tips (user_id, content, region)
    VALUES (?, ?, ?)
  `).run(userId, tip.content, tip.region);
  
  return db.prepare('SELECT * FROM community_tips WHERE id = ?').get(result.lastInsertRowid) as CommunityTip;
};

export const sharePrice = (userId: number, price: Omit<PriceComparison, 'id' | 'user_id'>): PriceComparison => {
  const result = db.prepare(`
    INSERT INTO price_comparisons (user_id, item_name, price, market, region)
    VALUES (?, ?, ?, ?, ?)
  `).run(userId, price.item_name, price.price, price.market, price.region);
  
  return db.prepare('SELECT * FROM price_comparisons WHERE id = ?').get(result.lastInsertRowid) as PriceComparison;
};

export const getCommunityTips = (region?: string): CommunityTip[] => {
  if (region) {
    return db.prepare('SELECT * FROM community_tips WHERE region = ? ORDER BY created_at DESC LIMIT 50').all(region) as CommunityTip[] ;
  }
  return db.prepare('SELECT * FROM community_tips ORDER BY created_at DESC LIMIT 50').all() as CommunityTip[] ;
};

export const getPriceComparisons = (itemName?: string, region?: string): PriceComparison[] => {
  let query = 'SELECT * FROM price_comparisons';
  const params = [];
  
  if (itemName || region) {
    query += ' WHERE ';
    const conditions = [];
    
    if (itemName) {
      conditions.push('item_name LIKE ?');
      params.push(`%${itemName}%`);
    }
    
    if (region) {
      conditions.push('region = ?');
      params.push(region);
    }
    
    query += conditions.join(' AND ');
  }
  
  query += ' ORDER BY created_at DESC LIMIT 50';
  return db.prepare(query).all(params) as PriceComparison[];
};