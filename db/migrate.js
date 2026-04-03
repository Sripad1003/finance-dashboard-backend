const db = require('./connection');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    username   TEXT    NOT NULL UNIQUE,
    email      TEXT    NOT NULL UNIQUE,
    password   TEXT    NOT NULL,
    role       TEXT    NOT NULL DEFAULT 'Viewer'
                       CHECK(role IN ('Viewer', 'Analyst', 'Admin')),
    is_active  INTEGER NOT NULL DEFAULT 1,
    created_at TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT    NOT NULL DEFAULT (datetime('now')),
    deleted_at TEXT
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL REFERENCES users(id),
    amount     REAL    NOT NULL CHECK(amount > 0),
    type       TEXT    NOT NULL CHECK(type IN ('income', 'expense')),
    category   TEXT    NOT NULL,
    date       TEXT    NOT NULL,
    notes      TEXT,
    created_at TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT    NOT NULL DEFAULT (datetime('now')),
    deleted_at TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_transactions_user_id  ON transactions(user_id);
  CREATE INDEX IF NOT EXISTS idx_transactions_type     ON transactions(type);
  CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category);
  CREATE INDEX IF NOT EXISTS idx_transactions_date     ON transactions(date);
  CREATE INDEX IF NOT EXISTS idx_users_email           ON users(email);
  CREATE INDEX IF NOT EXISTS idx_users_role            ON users(role);
`);

console.log('Database migrated successfully');
