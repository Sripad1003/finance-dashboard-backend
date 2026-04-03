# Finance Data Processing and Access Control Backend

A RESTful backend API for a finance dashboard system with role-based access control, financial records management, and analytics.

## 🚀 Live Demo

The API is deployed and live on Render: **[Live Demo URL](https://finance-dashboard-backend-h601.onrender.com)**

*(Note: The database is pre-seeded with sample data. Since this is on a free tier, the first request may take a few seconds to wake the server up.)*

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: SQLite (via better-sqlite3)
- **Authentication**: JWT (jsonwebtoken)
- **Password Hashing**: bcryptjs
- **Validation**: express-validator


## Getting Started

### Prerequisites

- Node.js (v16 or higher)

### Installation

```bash
cd assignment
npm install
```

### Configuration

Copy `.env.example` to `.env` and update values as needed:

```bash
cp .env.example .env
```

Environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| PORT | 3000 | Server port |
| JWT_SECRET | (set in .env) | Secret key for JWT signing |
| JWT_EXPIRY | 24h | Token expiration time |
| DB_PATH | data.db | SQLite database file path |
| BCRYPT_ROUNDS | 10 | Password hashing rounds |
| RATE_LIMIT_WINDOW_MS | 60000 | Rate limit window (ms) |
| RATE_LIMIT_MAX | 100 | Max requests per window |

### Running the Server

```bash
# Production
npm start

# Development (with auto-reload via nodemon)
npm run dev
```

The server starts on `http://localhost:3000`. On first run, the database is automatically created, migrated, and seeded with sample data.

### Default Users (Seeded)

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@finance.local | Admin@123 |
| Analyst | analyst@finance.local | Analyst@123 |
| Viewer | viewer@finance.local | Viewer@123 |

---

## Project Structure

```
assignment/
├── server.js                  # Entry point
├── app.js                     # Express app setup
├── config/index.js            # Environment configuration
├── db/
│   ├── connection.js          # SQLite connection
│   ├── migrate.js             # Table creation (DDL)
│   └── seed.js                # Default users + sample transactions
├── middleware/
│   ├── authenticate.js        # JWT verification
│   ├── authorize.js           # Role-based access control
│   ├── validate.js            # Input validation wrapper
│   ├── errorHandler.js        # Central error handler
│   └── rateLimiter.js         # In-memory rate limiter
├── routes/                    # Route definitions
├── controllers/               # Request handlers (thin layer)
├── services/                  # Business logic + DB queries
├── validators/                # Validation rules (express-validator)
└── utils/
    ├── ApiError.js            # Custom error class
    ├── response.js            # Standardized response helpers
    └── constants.js           # Enums and constants
```

### Architecture

The application follows a layered architecture:

1. **Routes** - Define endpoints and attach middleware (auth, authorization, validation)
2. **Controllers** - Parse request data, call services, send responses
3. **Services** - Contain all business logic and database operations
4. **Middleware** - Cross-cutting concerns (auth, RBAC, validation, errors)

---

## Access Control

Three roles with different permission levels:

| Action | Viewer | Analyst | Admin |
|--------|--------|---------|-------|
| View dashboard summary | Yes | Yes | Yes |
| View recent activity | Yes | Yes | Yes |
| View category totals / trends | - | Yes | Yes |
| List / view transactions | - | Yes | Yes |
| Create / update / delete transactions | - | - | Yes |
| Manage users | - | - | Yes |
| View own profile | Yes | Yes | Yes |

---

## API Reference

For detailed documentation on the internal API behavior, code traces, and routing implementation, please see:
- [API Request Flow](API_FLOW.md) - Comprehensive trace of all API endpoints.
- [Routing Documentation](ROUTES.md) - Detailed explanation of how routing and middleware function.

All endpoints are prefixed with `/api`. Authenticated endpoints require:
```
Authorization: Bearer <token>
```


## Validation

All inputs are validated using express-validator:

- **Username**: 3-30 alphanumeric characters (letters, numbers, underscores)
- **Email**: Must be a valid email address
- **Password**: 8-128 characters, must contain uppercase, lowercase, and a number
- **Amount**: Must be a positive number
- **Type**: Must be `income` or `expense`
- **Date**: Must be ISO 8601 format (YYYY-MM-DD)
- **Role**: Must be `Viewer`, `Analyst`, or `Admin`

Validation errors return 400 with field-level details:
```json
{
  "success": false,
  "error": {
    "message": "Validation failed",
    "details": [
      { "field": "email", "message": "Must be a valid email address" },
      { "field": "password", "message": "Password must be 8-128 characters" }
    ]
  }
}
```

## Error Handling

| Status Code | Meaning |
|-------------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Validation error |
| 401 | Unauthorized (missing/invalid token, deactivated account) |
| 403 | Forbidden (insufficient role) |
| 404 | Not found |
| 409 | Conflict (duplicate email/username) |
| 429 | Rate limited |
| 500 | Internal server error |

---

## Design Decisions and Assumptions

1. **SQLite** was chosen for zero-configuration setup. The synchronous nature of better-sqlite3 simplifies the code and is appropriate for this scale.

2. **Soft delete** is implemented for both users and transactions. Deleted records are excluded from all queries by default.

3. **JWT authentication** with 24-hour expiry. The `authenticate` middleware re-checks user status on every request to handle deactivation.

4. **Roles are assigned at registration** (defaults to Viewer). Only Admins can create users with elevated roles.

5. **Rate limiting** uses a simple in-memory store. In production, this would use Redis or a similar external store.

6. **Password requirements**: minimum 8 characters with at least one uppercase letter, one lowercase letter, and one digit.

7. **All transactions belong to the admin who creates them** (via `user_id` from the JWT). The system tracks who created each record.

8. **Pagination** defaults to 20 items per page with a maximum of 100. All list endpoints support pagination.

9. **Categories are free-form text** rather than a fixed enum, providing flexibility while the seed data uses common categories like salary, rent, food, etc.

10. **No CORS middleware** is included by default since this is a backend-only assessment. It can be added with `npm install cors` if needed.

---

## Database

### Storage Engine

This project uses **SQLite** via the [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) library. SQLite was chosen for:

- **Zero configuration** - No separate database server to install, configure, or manage
- **File-based** - The entire database lives in a single file (`data.db`), making it portable and easy to inspect
- **Synchronous API** - `better-sqlite3` provides a synchronous interface, simplifying error handling and eliminating callback/promise overhead
- **Production-capable** - SQLite handles millions of rows and is used in production at many companies for read-heavy workloads

### Database File

The database is stored at the project root as `data.db` (configurable via `DB_PATH` in `.env`). This file is:

- **Auto-created** on first server start if it doesn't exist
- **Auto-migrated** - Tables and indexes are created automatically using `CREATE TABLE IF NOT EXISTS`
- **Auto-seeded** - Default users and sample transactions are inserted if the database is empty
- **Excluded from git** via `.gitignore`

### Schema

Two tables are used:

**users** - Stores user accounts with bcrypt-hashed passwords

```sql
CREATE TABLE users (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    username   TEXT    NOT NULL UNIQUE,
    email      TEXT    NOT NULL UNIQUE,
    password   TEXT    NOT NULL,
    role       TEXT    NOT NULL DEFAULT 'Viewer'
                       CHECK(role IN ('Viewer', 'Analyst', 'Admin')),
    is_active  INTEGER NOT NULL DEFAULT 1,
    created_at TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT    NOT NULL DEFAULT (datetime('now')),
    deleted_at TEXT    -- NULL means active, timestamp means soft-deleted
);
```

**transactions** - Stores financial records linked to the user who created them

```sql
CREATE TABLE transactions (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL REFERENCES users(id),
    amount     REAL    NOT NULL CHECK(amount > 0),
    type       TEXT    NOT NULL CHECK(type IN ('income', 'expense')),
    category   TEXT    NOT NULL,
    date       TEXT    NOT NULL,  -- ISO 8601 format: YYYY-MM-DD
    notes      TEXT,
    created_at TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT    NOT NULL DEFAULT (datetime('now')),
    deleted_at TEXT    -- soft delete
);
```

### Indexes

Indexes are created for frequently queried columns:

```sql
CREATE INDEX idx_transactions_user_id  ON transactions(user_id);
CREATE INDEX idx_transactions_type     ON transactions(type);
CREATE INDEX idx_transactions_category ON transactions(category);
CREATE INDEX idx_transactions_date     ON transactions(date);
CREATE INDEX idx_users_email           ON users(email);
CREATE INDEX idx_users_role            ON users(role);
```

### Pragmas

- **WAL mode** (`journal_mode = WAL`) - Enables concurrent reads while writing, improving performance
- **Foreign keys** (`foreign_keys = ON`) - Enforces referential integrity between transactions and users

### Resetting the Database

To reset the database and start fresh:

```bash
# Delete the database file (server will recreate it on next start)
rm data.db

# Or just restart the server - it recreates and re-seeds automatically
npm start
```

### Migrating to a Production Database

To switch from SQLite to PostgreSQL/MySQL in production:

1. Replace `better-sqlite3` with a client library (e.g., `pg`, `mysql2`)
2. Update `db/connection.js` with the new connection config
3. Adjust SQL syntax in `db/migrate.js` (e.g., `AUTOINCREMENT` → `SERIAL`, `datetime('now')` → `NOW()`)
4. Update parameterized queries in services (SQLite uses `?`, PostgreSQL uses `$1`)

The layered architecture ensures these changes are isolated to the `db/` and `services/` directories.

