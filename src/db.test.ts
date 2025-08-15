// backend/src/db.test.ts
import db from "./db";

// Test database connection
const testDB = () => {
  try {
    // Check tables exist
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table'")
      .all();
    
    console.log('Database Tables:');
    console.table(tables);

    // Test insert user
    const user = db
      .prepare(
        'INSERT INTO users (phone, password_hash) VALUES (?, ?)'
      )
      .run('0912345678', 'test_hash');
    
    console.log('\nTest User Created:');
    console.log(user);

    // Test insert account
    const account = db
      .prepare(
        'INSERT INTO accounts (user_id, name, balance) VALUES (?, ?, ?)'
      )
      .run(user.lastInsertRowid, 'Telebirr Wallet', 500);
    
    console.log('\nTest Account Created:');
    console.log(account);

    // Test insert bill
    const bill = db
      .prepare(
        'INSERT INTO bills (user_id, biller_name, bill_type, amount, due_date) VALUES (?, ?, ?, ?, ?)'
      )
      .run(
        user.lastInsertRowid,
        'Ethio Telecom',
        'utility',
        350,
        '2023-08-15'
      );
    
    console.log('\nTest Bill Created:');
    console.log(bill);

    // Cleanup
    db.prepare('DELETE FROM bills WHERE id = ?').run(bill.lastInsertRowid);
    db.prepare('DELETE FROM accounts WHERE id = ?').run(account.lastInsertRowid);
    db.prepare('DELETE FROM users WHERE id = ?').run(user.lastInsertRowid);

    console.log('\nTest data cleaned up');
  } catch (error) {
    console.error('Database test failed:', error);
  }
};

// testDB();