# Complete API Communication Flow - Active Code Traces

This document traces every API endpoint from the HTTP request through route → middleware → controller → service → database and back. Every code snippet shown is the **actual code** running in the project.

---

## Table of Contents

1. [Server Startup](#1-server-startup)
2. [Authentication Flow](#2-authentication-flow)
   - [Register](#21-post-apiauthregister)
   - [Login](#22-post-apiauthlogin)
3. [Middleware Pipeline](#3-middleware-pipeline)
   - [authenticate.js](#31-authenticatejs)
   - [authorize.js](#32-authorizejs)
   - [validate.js](#33-validatejs)
4. [Users Flow](#4-users-flow)
   - [Get My Profile](#41-get-apiusersme)
   - [List Users](#42-get-apiusers)
   - [Create User](#43-post-apiusers)
   - [Update User](#44-put-apiusersid)
   - [Toggle Status](#45-patch-apiusersidstatus)
   - [Delete User](#46-delete-apiusersid)
5. [Transactions Flow](#5-transactions-flow)
   - [List Transactions](#51-get-apitransactions)
   - [Get Transaction](#52-get-apitransactionsid)
   - [Create Transaction](#53-post-apitransactions)
   - [Update Transaction](#54-put-apitransactionsid)
   - [Delete Transaction](#55-delete-apitransactionsid)
6. [Dashboard Flow](#6-dashboard-flow)
   - [Summary](#61-get-apidashboardsummary)
   - [Category Totals](#62-get-apidashboardcategory-totals)
   - [Monthly Trends](#63-get-apidashboardmonthly-trends)
   - [Recent Activity](#64-get-apidashboardrecent-activity)
7. [Error Handling Flow](#7-error-handling-flow)

---

## 1. Server Startup

**File: `server.js`**
```javascript
require('./db/migrate');   // Creates tables if they don't exist
require('./db/seed');      // Inserts default users + sample transactions

const app = require('./app');
const config = require('./config');

app.listen(config.port, () => {
  console.log(`Finance API server running on port ${config.port}`);
});
```

**File: `app.js`** — Builds the Express middleware stack
```javascript
const app = express();

app.use(express.json({ limit: '1mb' }));  // Parse JSON bodies
app.use(rateLimiter);                      // Rate limit per IP

app.use('/api', routes);                   // Mount all route files

// 404 catch-all
app.use((req, res, next) => {
  next(new ApiError(404, `Route ${req.method} ${req.path} not found`));
});

app.use(errorHandler);                     // Central error handler (must be last)
```

**File: `routes/index.js`** — Master router splits requests by resource
```javascript
router.use('/auth', require('./auth.routes'));
router.use('/users', require('./users.routes'));
router.use('/transactions', require('./transactions.routes'));
router.use('/dashboard', require('./dashboard.routes'));
```

---

## 2. Authentication Flow

### 2.1 POST /api/auth/register

**Request:**
```json
POST /api/auth/register
Content-Type: application/json

{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "SecureP@ss1"
}
```

**Step 1 — Route definition** (`routes/auth.routes.js`)
```javascript
router.post('/register', validate(authValidator.register), authController.register);
```

**Step 2 — Validation runs** (`validators/auth.validator.js`)
```javascript
exports.register = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 30 }).withMessage('Username must be 3-30 characters')
    .matches(/^[a-zA-Z0-9_]+$/).withMessage('Username can only contain letters, numbers, and underscores'),
  body('email')
    .isEmail().withMessage('Must be a valid email address')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 8, max: 128 }).withMessage('Password must be 8-128 characters')
    .matches(/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).withMessage('Password must contain uppercase, lowercase, and a number')
];
```

The `validate` middleware wrapper runs each rule and collects errors:
```javascript
// middleware/validate.js
const validate = (validations) => async (req, res, next) => {
  for (const validation of validations) {
    await validation.run(req);
  }
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const details = errors.array().map(e => ({ field: e.path, message: e.msg }));
    return next(new ApiError(400, 'Validation failed', details));
  }
  next();  // Validation passed → continue to controller
};
```

**Step 3 — Controller** (`controllers/auth.controller.js`)
```javascript
exports.register = (req, res, next) => {
  try {
    const { username, email, password } = req.body;       // Extract validated data
    const data = authService.register(username, email, password);  // Call service
    createdResponse(res, data);                            // Send 201 response
  } catch (err) {
    next(err);  // Forward error to errorHandler
  }
};
```

**Step 4 — Service** (`services/auth.service.js`)
```javascript
exports.register = (username, email, password) => {
  // Check for duplicate
  const existing = db.prepare(
    'SELECT id FROM users WHERE (email = ? OR username = ?) AND deleted_at IS NULL'
  ).get(email, username);

  if (existing) {
    throw new ApiError(409, 'User with this email or username already exists');
  }

  // Hash password and insert
  const hashedPassword = bcrypt.hashSync(password, config.bcryptRounds);

  const result = db.prepare(
    'INSERT INTO users (username, email, password) VALUES (?, ?, ?)'
  ).run(username, email, hashedPassword);

  // Fetch the created user (without password)
  const user = db.prepare(
    'SELECT id, username, email, role, is_active, created_at FROM users WHERE id = ?'
  ).get(result.lastInsertRowid);

  // Generate JWT token
  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    config.jwtSecret,
    { expiresIn: config.jwtExpiry }
  );

  return { ...user, token };
};
```

**Step 5 — Response** (`utils/response.js`)
```javascript
exports.createdResponse = (res, data) => {
  res.status(201).json({ success: true, data });
};
```

**Response sent:**
```json
HTTP 201 Created
{
  "success": true,
  "data": {
    "id": 4,
    "username": "john_doe",
    "email": "john@example.com",
    "role": "Viewer",
    "is_active": 1,
    "created_at": "2026-04-03 12:00:00",
    "token": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

---

### 2.2 POST /api/auth/login

**Request:**
```json
POST /api/auth/login
{
  "email": "admin@finance.local",
  "password": "Admin@123"
}
```

**Route:** `router.post('/login', validate(authValidator.login), authController.login)`

**Validation rules:**
```javascript
exports.login = [
  body('email').isEmail().withMessage('Must be a valid email address').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required')
];
```

**Controller:**
```javascript
exports.login = (req, res, next) => {
  try {
    const { email, password } = req.body;
    const data = authService.login(email, password);
    successResponse(res, data);    // 200 OK
  } catch (err) {
    next(err);
  }
};
```

**Service — Full login logic:**
```javascript
exports.login = (email, password) => {
  // 1. Find user by email
  const user = db.prepare(
    'SELECT * FROM users WHERE email = ? AND deleted_at IS NULL'
  ).get(email);

  if (!user) {
    throw new ApiError(401, 'Invalid email or password');
  }

  // 2. Check if account is active
  if (!user.is_active) {
    throw new ApiError(401, 'Account is deactivated');
  }

  // 3. Compare password with bcrypt hash
  const isMatch = bcrypt.compareSync(password, user.password);
  if (!isMatch) {
    throw new ApiError(401, 'Invalid email or password');
  }

  // 4. Generate JWT
  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    config.jwtSecret,
    { expiresIn: config.jwtExpiry }
  );

  return { id: user.id, username: user.username, email: user.email, role: user.role, token };
};
```

**Response:**
```json
HTTP 200 OK
{
  "success": true,
  "data": {
    "id": 1,
    "username": "admin",
    "email": "admin@finance.local",
    "role": "Admin",
    "token": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

---

## 3. Middleware Pipeline

Every protected endpoint runs through these middleware functions **in order**. If any middleware fails, the rest are skipped and the error handler runs.

### 3.1 authenticate.js

Runs on every protected route. Verifies the JWT token and loads the user from the database.

```javascript
const authenticate = (req, res, next) => {
  // 1. Extract token from header
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new ApiError(401, 'Authentication required'));  // STOPS HERE
  }

  const token = authHeader.split(' ')[1];

  try {
    // 2. Verify JWT signature and expiry
    const decoded = jwt.verify(token, config.jwtSecret);
    // decoded = { id: 1, email: "admin@finance.local", role: "Admin", iat: ..., exp: ... }

    // 3. Load user from database (ensures user still exists and is active)
    const user = db.prepare(
      'SELECT id, username, email, role, is_active FROM users WHERE id = ? AND deleted_at IS NULL'
    ).get(decoded.id);

    if (!user) {
      return next(new ApiError(401, 'User not found'));  // STOPS HERE
    }

    if (!user.is_active) {
      return next(new ApiError(401, 'Account is deactivated'));  // STOPS HERE
    }

    // 4. Attach user to request object (available to all subsequent middleware/controllers)
    req.user = user;
    // req.user = { id: 1, username: "admin", email: "admin@finance.local", role: "Admin", is_active: 1 }

    next();  // CONTINUE to next middleware
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return next(new ApiError(401, 'Token has expired'));
    }
    return next(new ApiError(401, 'Invalid token'));
  }
};
```

### 3.2 authorize.js

Runs after `authenticate`. Checks if the authenticated user's role is in the allowed list.

```javascript
const authorize = (allowedRoles) => (req, res, next) => {
  // req.user was set by authenticate middleware
  if (!req.user) {
    return next(new ApiError(401, 'Authentication required'));
  }
  if (!allowedRoles.includes(req.user.role)) {
    return next(new ApiError(403, 'Insufficient permissions'));  // STOPS HERE → 403 Forbidden
  }
  next();  // Role is allowed → CONTINUE
};
```

**Usage in routes:**
```javascript
authorize(['Admin'])                  // Only Admin can access
authorize(['Analyst', 'Admin'])       // Analyst or Admin
authorize(['Viewer', 'Analyst', 'Admin'])  // All authenticated users
```

### 3.3 validate.js

Runs the express-validator rules and collects any validation errors.

```javascript
const validate = (validations) => async (req, res, next) => {
  // Run each validation rule against the request
  for (const validation of validations) {
    await validation.run(req);
  }

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // Format errors as { field, message } pairs
    const details = errors.array().map(e => ({ field: e.path, message: e.msg }));
    return next(new ApiError(400, 'Validation failed', details));  // STOPS HERE → 400
  }
  next();  // All valid → CONTINUE to controller
};
```

---

## 4. Users Flow

### 4.1 GET /api/users/me

**Middleware chain:** `authenticate → usersController.getMe`

No `authorize` needed — any authenticated user can view their own profile.

```javascript
// Route
router.get('/me', usersController.getMe);

// Controller
exports.getMe = (req, res, next) => {
  try {
    const user = usersService.getById(req.user.id);  // req.user set by authenticate
    successResponse(res, user);
  } catch (err) {
    next(err);
  }
};

// Service
exports.getById = (id) => {
  const user = db.prepare(
    'SELECT id, username, email, role, is_active, created_at, updated_at FROM users WHERE id = ? AND deleted_at IS NULL'
  ).get(id);

  if (!user) {
    throw new ApiError(404, 'User not found');
  }
  return user;
};
```

### 4.2 GET /api/users

**Middleware chain:** `authenticate → authorize(Admin) → validate → usersController.list`

```javascript
// Route
router.get('/', authorize(['Admin']), validate(usersValidator.list), usersController.list);

// Validation
exports.list = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be 1-100'),
  query('role').optional().isIn(['Viewer', 'Analyst', 'Admin']).withMessage('Invalid role'),
  query('is_active').optional().isIn(['0', '1']).withMessage('is_active must be 0 or 1')
];

// Controller
exports.list = (req, res, next) => {
  try {
    const { role, is_active, page, limit } = req.query;
    const result = usersService.list({
      role,
      is_active: is_active !== undefined ? parseInt(is_active) : undefined,
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20
    });
    successResponse(res, {
      users: result.users,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: Math.ceil(result.total / result.limit)
      }
    });
  } catch (err) {
    next(err);
  }
};

// Service — builds dynamic SQL based on filters
exports.list = ({ role, is_active, page = 1, limit = 20 }) => {
  const conditions = ['deleted_at IS NULL'];
  const params = [];

  if (role) {
    conditions.push('role = ?');
    params.push(role);
  }
  if (is_active !== undefined && is_active !== null) {
    conditions.push('is_active = ?');
    params.push(is_active);
  }

  const where = conditions.join(' AND ');
  const offset = (page - 1) * limit;

  // Count total for pagination
  const { total } = db.prepare(
    `SELECT COUNT(*) as total FROM users WHERE ${where}`
  ).get(...params);

  // Fetch page of results
  const users = db.prepare(
    `SELECT id, username, email, role, is_active, created_at, updated_at
     FROM users WHERE ${where}
     ORDER BY created_at DESC LIMIT ? OFFSET ?`
  ).all(...params, limit, offset);

  return { users, total, page, limit };
};
```

### 4.3 POST /api/users

**Middleware chain:** `authenticate → authorize(Admin) → validate → usersController.create`

```javascript
// Controller
exports.create = (req, res, next) => {
  try {
    const { username, email, password, role } = req.body;
    const user = usersService.create({ username, email, password, role });
    createdResponse(res, user);  // 201
  } catch (err) {
    next(err);
  }
};

// Service
exports.create = ({ username, email, password, role }) => {
  // Check for duplicates
  const existing = db.prepare(
    'SELECT id FROM users WHERE (email = ? OR username = ?) AND deleted_at IS NULL'
  ).get(email, username);

  if (existing) {
    throw new ApiError(409, 'User with this email or username already exists');
  }

  const hashedPassword = bcrypt.hashSync(password, config.bcryptRounds);

  const result = db.prepare(
    'INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)'
  ).run(username, email, hashedPassword, role || 'Viewer');

  return db.prepare(
    'SELECT id, username, email, role, is_active, created_at FROM users WHERE id = ?'
  ).get(result.lastInsertRowid);
};
```

### 4.4 PUT /api/users/:id

**Middleware chain:** `authenticate → authorize(Admin) → validate → usersController.update`

```javascript
// Controller
exports.update = (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const user = usersService.update(id, req.body);
    successResponse(res, user);
  } catch (err) {
    next(err);
  }
};

// Service — builds UPDATE query dynamically from provided fields only
exports.update = (id, data) => {
  const user = exports.getById(id);  // Throws 404 if not found

  const fields = [];
  const params = [];

  if (data.username !== undefined) {
    // Check duplicate
    const dup = db.prepare(
      'SELECT id FROM users WHERE username = ? AND id != ? AND deleted_at IS NULL'
    ).get(data.username, id);
    if (dup) throw new ApiError(409, 'Username already taken');
    fields.push('username = ?');
    params.push(data.username);
  }
  if (data.email !== undefined) {
    const dup = db.prepare(
      'SELECT id FROM users WHERE email = ? AND id != ? AND deleted_at IS NULL'
    ).get(data.email, id);
    if (dup) throw new ApiError(409, 'Email already taken');
    fields.push('email = ?');
    params.push(data.email);
  }
  if (data.role !== undefined)     { fields.push('role = ?');      params.push(data.role); }
  if (data.is_active !== undefined){ fields.push('is_active = ?'); params.push(data.is_active); }
  if (data.password !== undefined) {
    fields.push('password = ?');
    params.push(bcrypt.hashSync(data.password, config.bcryptRounds));
  }

  if (fields.length === 0) return user;  // Nothing to update

  fields.push("updated_at = datetime('now')");
  params.push(id);

  // Generated SQL example: UPDATE users SET username = ?, role = ?, updated_at = datetime('now') WHERE id = ?
  db.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`).run(...params);

  return exports.getById(id);  // Return updated user
};
```

### 4.5 PATCH /api/users/:id/status

**Middleware chain:** `authenticate → authorize(Admin) → validate → usersController.toggleStatus`

```javascript
// Controller
exports.toggleStatus = (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const { is_active } = req.body;
    const user = usersService.toggleStatus(id, is_active);
    successResponse(res, user);
  } catch (err) {
    next(err);
  }
};

// Service
exports.toggleStatus = (id, is_active) => {
  exports.getById(id);  // Throws 404 if not found

  db.prepare(
    "UPDATE users SET is_active = ?, updated_at = datetime('now') WHERE id = ?"
  ).run(is_active, id);

  return exports.getById(id);
};
```

### 4.6 DELETE /api/users/:id

**Middleware chain:** `authenticate → authorize(Admin) → validate → usersController.remove`

```javascript
// Controller
exports.remove = (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    usersService.softDelete(id);
    successResponse(res, { message: 'User deleted successfully' });
  } catch (err) {
    next(err);
  }
};

// Service — soft delete sets deleted_at instead of removing the row
exports.softDelete = (id) => {
  exports.getById(id);  // Throws 404 if not found

  db.prepare(
    "UPDATE users SET deleted_at = datetime('now'), updated_at = datetime('now') WHERE id = ?"
  ).run(id);
  // Row still exists in DB, but all queries filter WHERE deleted_at IS NULL
};
```

---

## 5. Transactions Flow

### 5.1 GET /api/transactions

**Middleware chain:** `authenticate → authorize(Analyst, Admin) → validate → txnController.list`

**Example request:** `GET /api/transactions?type=income&category=salary&startDate=2026-01-01&page=1&limit=5`

```javascript
// Route
router.get('/', authorize(['Analyst', 'Admin']), validate(transactionsValidator.list), transactionsController.list);

// Validation rules for query params
exports.list = [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('type').optional().isIn(['income', 'expense']),
  query('category').optional().isString().trim().notEmpty(),
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
  query('sortBy').optional().isIn(['date', 'amount', 'created_at', 'category', 'type']),
  query('order').optional().isIn(['asc', 'desc'])
];

// Controller
exports.list = (req, res, next) => {
  try {
    const { type, category, startDate, endDate, sortBy, order, page, limit } = req.query;
    const result = transactionsService.list({
      type, category, startDate, endDate, sortBy, order,
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20
    });
    successResponse(res, {
      transactions: result.transactions,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: Math.ceil(result.total / result.limit)
      }
    });
  } catch (err) {
    next(err);
  }
};

// Service — builds WHERE clause dynamically
exports.list = ({ type, category, startDate, endDate, sortBy = 'date', order = 'desc', page = 1, limit = 20 }) => {
  const conditions = ['deleted_at IS NULL'];
  const params = [];

  if (type)      { conditions.push('type = ?');     params.push(type); }
  if (category)  { conditions.push('category = ?'); params.push(category); }
  if (startDate) { conditions.push('date >= ?');    params.push(startDate); }
  if (endDate)   { conditions.push('date <= ?');    params.push(endDate); }

  // Prevent SQL injection on ORDER BY by allowlisting column names
  const allowedSorts = ['date', 'amount', 'created_at', 'category', 'type'];
  const safeSort = allowedSorts.includes(sortBy) ? sortBy : 'date';
  const safeOrder = order === 'asc' ? 'ASC' : 'DESC';

  const where = conditions.join(' AND ');
  const offset = (page - 1) * limit;

  // Generated SQL:
  // SELECT COUNT(*) as total FROM transactions WHERE deleted_at IS NULL AND type = ? AND category = ? AND date >= ?
  const { total } = db.prepare(
    `SELECT COUNT(*) as total FROM transactions WHERE ${where}`
  ).get(...params);

  // SELECT ... FROM transactions WHERE deleted_at IS NULL AND type = ? AND category = ? AND date >= ? ORDER BY date DESC LIMIT 5 OFFSET 0
  const transactions = db.prepare(
    `SELECT id, user_id, amount, type, category, date, notes, created_at, updated_at
     FROM transactions WHERE ${where}
     ORDER BY ${safeSort} ${safeOrder} LIMIT ? OFFSET ?`
  ).all(...params, limit, offset);

  return { transactions, total, page, limit };
};
```

### 5.2 GET /api/transactions/:id

**Middleware chain:** `authenticate → authorize(Analyst, Admin) → validate → txnController.getById`

```javascript
// Controller
exports.getById = (req, res, next) => {
  try {
    const txn = transactionsService.getById(parseInt(req.params.id));
    successResponse(res, txn);
  } catch (err) {
    next(err);
  }
};

// Service
exports.getById = (id) => {
  const txn = db.prepare(
    'SELECT id, user_id, amount, type, category, date, notes, created_at, updated_at FROM transactions WHERE id = ? AND deleted_at IS NULL'
  ).get(id);

  if (!txn) {
    throw new ApiError(404, 'Transaction not found');
  }
  return txn;
};
```

### 5.3 POST /api/transactions

**Middleware chain:** `authenticate → authorize(Admin) → validate → txnController.create`

```javascript
// Validation
exports.create = [
  body('amount').isFloat({ gt: 0 }).withMessage('Amount must be a positive number'),
  body('type').isIn(['income', 'expense']).withMessage('Type must be income or expense'),
  body('category').trim().notEmpty().withMessage('Category is required').isLength({ max: 50 }),
  body('date').isISO8601().withMessage('Date must be a valid date (YYYY-MM-DD)'),
  body('notes').optional({ values: 'null' }).isString().isLength({ max: 500 })
];

// Controller
exports.create = (req, res, next) => {
  try {
    const { amount, type, category, date, notes } = req.body;
    const txn = transactionsService.create(req.user.id, { amount, type, category, date, notes });
    //                                     ^^^^^^^^^^^ user ID from JWT (set by authenticate)
    createdResponse(res, txn);
  } catch (err) {
    next(err);
  }
};

// Service
exports.create = (userId, { amount, type, category, date, notes }) => {
  const result = db.prepare(
    'INSERT INTO transactions (user_id, amount, type, category, date, notes) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(userId, amount, type, category, date, notes || null);

  return exports.getById(result.lastInsertRowid);  // Return the created record
};
```

### 5.4 PUT /api/transactions/:id

**Middleware chain:** `authenticate → authorize(Admin) → validate → txnController.update`

```javascript
// Controller
exports.update = (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const txn = transactionsService.update(id, req.body);
    successResponse(res, txn);
  } catch (err) {
    next(err);
  }
};

// Service — only updates fields that are provided
exports.update = (id, data) => {
  exports.getById(id);  // Throws 404 if not found

  const fields = [];
  const params = [];

  if (data.amount !== undefined)   { fields.push('amount = ?');   params.push(data.amount); }
  if (data.type !== undefined)     { fields.push('type = ?');     params.push(data.type); }
  if (data.category !== undefined) { fields.push('category = ?'); params.push(data.category); }
  if (data.date !== undefined)     { fields.push('date = ?');     params.push(data.date); }
  if (data.notes !== undefined)    { fields.push('notes = ?');    params.push(data.notes); }

  if (fields.length === 0) return exports.getById(id);

  fields.push("updated_at = datetime('now')");
  params.push(id);

  db.prepare(`UPDATE transactions SET ${fields.join(', ')} WHERE id = ?`).run(...params);

  return exports.getById(id);
};
```

### 5.5 DELETE /api/transactions/:id

**Middleware chain:** `authenticate → authorize(Admin) → validate → txnController.remove`

```javascript
// Controller
exports.remove = (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    transactionsService.softDelete(id);
    successResponse(res, { message: 'Transaction deleted successfully' });
  } catch (err) {
    next(err);
  }
};

// Service
exports.softDelete = (id) => {
  exports.getById(id);  // Throws 404 if not found

  db.prepare(
    "UPDATE transactions SET deleted_at = datetime('now'), updated_at = datetime('now') WHERE id = ?"
  ).run(id);
};
```

---

## 6. Dashboard Flow

### 6.1 GET /api/dashboard/summary

**Middleware chain:** `authenticate → authorize(Viewer, Analyst, Admin) → dashController.summary`

```javascript
// Controller
exports.summary = (req, res, next) => {
  try {
    const data = dashboardService.getSummary();
    successResponse(res, data);
  } catch (err) {
    next(err);
  }
};

// Service — single SQL query using CASE WHEN for income/expense split
exports.getSummary = () => {
  const row = db.prepare(`
    SELECT
      COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) AS totalIncome,
      COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) AS totalExpenses,
      COUNT(*) AS transactionCount
    FROM transactions
    WHERE deleted_at IS NULL
  `).get();

  return {
    totalIncome: row.totalIncome,
    totalExpenses: row.totalExpenses,
    netBalance: row.totalIncome - row.totalExpenses,  // Computed in JavaScript
    transactionCount: row.transactionCount
  };
};
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalIncome": 36350,
    "totalExpenses": 11995,
    "netBalance": 24355,
    "transactionCount": 35
  }
}
```

### 6.2 GET /api/dashboard/category-totals

**Middleware chain:** `authenticate → authorize(Analyst, Admin) → validate → dashController.categoryTotals`

**Example:** `GET /api/dashboard/category-totals?type=expense`

```javascript
// Controller
exports.categoryTotals = (req, res, next) => {
  try {
    const { type } = req.query;
    const data = dashboardService.getCategoryTotals(type);
    successResponse(res, data);
  } catch (err) {
    next(err);
  }
};

// Service — GROUP BY category with optional type filter
exports.getCategoryTotals = (type) => {
  const conditions = ['deleted_at IS NULL'];
  const params = [];

  if (type) {
    conditions.push('type = ?');
    params.push(type);
  }

  return db.prepare(`
    SELECT category, SUM(amount) AS total, COUNT(*) AS count
    FROM transactions
    WHERE ${conditions.join(' AND ')}
    GROUP BY category
    ORDER BY total DESC
  `).all(...params);
};
```

**Response:**
```json
{
  "success": true,
  "data": [
    { "category": "rent", "total": 7200, "count": 6 },
    { "category": "food", "total": 2090, "count": 6 },
    { "category": "travel", "total": 600, "count": 1 }
  ]
}
```

### 6.3 GET /api/dashboard/monthly-trends

**Middleware chain:** `authenticate → authorize(Analyst, Admin) → validate → dashController.monthlyTrends`

**Example:** `GET /api/dashboard/monthly-trends?year=2026`

```javascript
// Controller
exports.monthlyTrends = (req, res, next) => {
  try {
    const { year } = req.query;
    const data = dashboardService.getMonthlyTrends(year);
    successResponse(res, data);
  } catch (err) {
    next(err);
  }
};

// Service — strftime groups dates by YYYY-MM
exports.getMonthlyTrends = (year) => {
  const conditions = ['deleted_at IS NULL'];
  const params = [];

  if (year) {
    conditions.push("strftime('%Y', date) = ?");
    params.push(String(year));
  }

  return db.prepare(`
    SELECT
      strftime('%Y-%m', date) AS month,
      COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) AS income,
      COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) AS expense
    FROM transactions
    WHERE ${conditions.join(' AND ')}
    GROUP BY month
    ORDER BY month ASC
  `).all(...params).map(row => ({
    ...row,
    net: row.income - row.expense  // Computed per month in JavaScript
  }));
};
```

**Response:**
```json
{
  "success": true,
  "data": [
    { "month": "2026-01", "income": 5500, "expense": 1855, "net": 3645 },
    { "month": "2026-02", "income": 6500, "expense": 1620, "net": 4880 },
    { "month": "2026-03", "income": 5000, "expense": 2300, "net": 2700 }
  ]
}
```

### 6.4 GET /api/dashboard/recent-activity

**Middleware chain:** `authenticate → authorize(Viewer, Analyst, Admin) → validate → dashController.recentActivity`

```javascript
// Controller
exports.recentActivity = (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const data = dashboardService.getRecentActivity(limit);
    successResponse(res, data);
  } catch (err) {
    next(err);
  }
};

// Service
exports.getRecentActivity = (limit = 10) => {
  return db.prepare(`
    SELECT id, amount, type, category, date, notes, created_at
    FROM transactions
    WHERE deleted_at IS NULL
    ORDER BY date DESC, created_at DESC
    LIMIT ?
  `).all(limit);
};
```

---

## 7. Error Handling Flow

When any error occurs anywhere in the pipeline, it flows to the central error handler:

```javascript
// middleware/errorHandler.js
const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  const details = err.details || undefined;

  if (statusCode === 500) {
    console.error('Unhandled error:', err);  // Log unexpected errors
  }

  res.status(statusCode).json({
    success: false,
    error: { message, ...(details && { details }) }
  });
};
```

**Error flow examples:**

| Scenario | Where it's thrown | Error |
|----------|------------------|-------|
| No token sent | `authenticate.js` | `401 Authentication required` |
| Expired token | `authenticate.js` | `401 Token has expired` |
| Viewer tries to create transaction | `authorize.js` | `403 Insufficient permissions` |
| Missing required field | `validate.js` | `400 Validation failed` + details array |
| Transaction ID not found | `transactions.service.js` | `404 Transaction not found` |
| Duplicate email on register | `auth.service.js` | `409 User already exists` |
| Unknown route | `app.js` 404 handler | `404 Route GET /api/xyz not found` |
| Unhandled exception | `errorHandler.js` | `500 Internal Server Error` |

**All error responses follow the same format:**
```json
{
  "success": false,
  "error": {
    "message": "Description of what went wrong",
    "details": [...]  // Only present for validation errors
  }
}
```
