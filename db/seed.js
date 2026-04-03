const bcrypt = require('bcryptjs');
const db = require('./connection');
const config = require('../config');

// Check if seed data already exists
const { count } = db.prepare('SELECT COUNT(*) as count FROM users').get();
if (count > 0) {
  console.log('Database already seeded, skipping');
} else {
  const hash = (pw) => bcrypt.hashSync(pw, config.bcryptRounds);

  // Insert default users
  const insertUser = db.prepare(
    'INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)'
  );

  const seedUsers = db.transaction(() => {
    insertUser.run('admin', 'admin@finance.local', hash('Admin@123'), 'Admin');
    insertUser.run('analyst', 'analyst@finance.local', hash('Analyst@123'), 'Analyst');
    insertUser.run('viewer', 'viewer@finance.local', hash('Viewer@123'), 'Viewer');
  });

  seedUsers();

  // Insert sample transactions
  const sampleTransactions = [
    // Income entries
    { amount: 5000, type: 'income', category: 'salary', date: '2025-10-01', notes: 'October salary' },
    { amount: 5000, type: 'income', category: 'salary', date: '2025-11-01', notes: 'November salary' },
    { amount: 5000, type: 'income', category: 'salary', date: '2025-12-01', notes: 'December salary' },
    { amount: 5000, type: 'income', category: 'salary', date: '2026-01-01', notes: 'January salary' },
    { amount: 5000, type: 'income', category: 'salary', date: '2026-02-01', notes: 'February salary' },
    { amount: 5000, type: 'income', category: 'salary', date: '2026-03-01', notes: 'March salary' },
    { amount: 1200, type: 'income', category: 'freelance', date: '2025-10-15', notes: 'Web design project' },
    { amount: 800, type: 'income', category: 'freelance', date: '2025-12-20', notes: 'Logo design' },
    { amount: 1500, type: 'income', category: 'freelance', date: '2026-02-10', notes: 'Consulting work' },
    { amount: 350, type: 'income', category: 'investment', date: '2025-11-30', notes: 'Dividend payout' },
    { amount: 500, type: 'income', category: 'investment', date: '2026-01-31', notes: 'Stock dividends' },
    { amount: 2000, type: 'income', category: 'bonus', date: '2025-12-25', notes: 'Year-end bonus' },

    // Expense entries
    { amount: 1200, type: 'expense', category: 'rent', date: '2025-10-05', notes: 'Monthly rent' },
    { amount: 1200, type: 'expense', category: 'rent', date: '2025-11-05', notes: 'Monthly rent' },
    { amount: 1200, type: 'expense', category: 'rent', date: '2025-12-05', notes: 'Monthly rent' },
    { amount: 1200, type: 'expense', category: 'rent', date: '2026-01-05', notes: 'Monthly rent' },
    { amount: 1200, type: 'expense', category: 'rent', date: '2026-02-05', notes: 'Monthly rent' },
    { amount: 1200, type: 'expense', category: 'rent', date: '2026-03-05', notes: 'Monthly rent' },
    { amount: 300, type: 'expense', category: 'food', date: '2025-10-10', notes: 'Groceries' },
    { amount: 450, type: 'expense', category: 'food', date: '2025-11-12', notes: 'Groceries and dining' },
    { amount: 380, type: 'expense', category: 'food', date: '2025-12-15', notes: 'Holiday meals' },
    { amount: 320, type: 'expense', category: 'food', date: '2026-01-08', notes: 'Groceries' },
    { amount: 290, type: 'expense', category: 'food', date: '2026-02-14', notes: 'Valentine dinner' },
    { amount: 350, type: 'expense', category: 'food', date: '2026-03-10', notes: 'Groceries' },
    { amount: 150, type: 'expense', category: 'utilities', date: '2025-10-20', notes: 'Electric bill' },
    { amount: 180, type: 'expense', category: 'utilities', date: '2025-12-22', notes: 'Winter heating' },
    { amount: 130, type: 'expense', category: 'utilities', date: '2026-02-18', notes: 'Electric and water' },
    { amount: 60, type: 'expense', category: 'transport', date: '2025-11-08', notes: 'Bus pass' },
    { amount: 85, type: 'expense', category: 'transport', date: '2026-01-15', notes: 'Uber rides' },
    { amount: 200, type: 'expense', category: 'entertainment', date: '2025-11-25', notes: 'Concert tickets' },
    { amount: 150, type: 'expense', category: 'entertainment', date: '2026-03-20', notes: 'Movie and games' },
    { amount: 500, type: 'expense', category: 'healthcare', date: '2025-12-10', notes: 'Annual checkup' },
    { amount: 250, type: 'expense', category: 'education', date: '2026-01-20', notes: 'Online course' },
    { amount: 400, type: 'expense', category: 'shopping', date: '2025-12-26', notes: 'Holiday shopping' },
    { amount: 600, type: 'expense', category: 'travel', date: '2026-03-15', notes: 'Weekend trip' }
  ];

  const insertTxn = db.prepare(
    'INSERT INTO transactions (user_id, amount, type, category, date, notes) VALUES (?, ?, ?, ?, ?, ?)'
  );

  const seedTransactions = db.transaction(() => {
    for (const t of sampleTransactions) {
      insertTxn.run(1, t.amount, t.type, t.category, t.date, t.notes);
    }
  });

  seedTransactions();

  console.log('Database seeded with default users and sample transactions');
}
