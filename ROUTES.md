# How Routes Work in This Project

## Overview

Routes are the entry points for every API request. They define **which URL** maps to **which function**, and **what middleware** runs before that function executes.

In Express.js, a route is a combination of:
- An **HTTP method** (GET, POST, PUT, PATCH, DELETE)
- A **URL path** (`/api/auth/login`)
- One or more **handler functions** (middleware + controller)

---

## How a Request Flows Through the System

When a client sends a request like `POST /api/transactions`, here is exactly what happens:

```
Client Request
     │
     ▼
┌─────────────────────────┐
│  server.js               │  ← Starts the HTTP server on port 3000
│  app.listen(3000)        │
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│  app.js                  │  ← Express app processes the request
│  express.json()          │  ← Step 1: Parse JSON body
│  rateLimiter             │  ← Step 2: Check rate limit
│  app.use('/api', routes) │  ← Step 3: Match URL prefix /api
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│  routes/index.js         │  ← Master router splits by resource
│  /auth → auth.routes     │
│  /users → users.routes   │
│  /transactions → txn     │  ← Matches /api/transactions
│  /dashboard → dash       │
└────────────┬────────────┘
             │
             ▼
┌──────────────────────────────────────┐
│  routes/transactions.routes.js        │
│                                       │
│  router.use(authenticate)  ← Step 4: Verify JWT token
│                                       │
│  POST / →                             │
│    authorize(['Admin'])    ← Step 5: Check role = Admin
│    validate(create rules)  ← Step 6: Validate request body
│    controller.create       ← Step 7: Call controller function
└────────────┬─────────────────────────┘
             │
             ▼
┌─────────────────────────┐
│  controllers/             │  ← Step 8: Parse request, call service
│  transactions.controller  │
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│  services/                │  ← Step 9: Business logic + DB query
│  transactions.service     │
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│  db/connection.js         │  ← Step 10: SQLite executes SQL
│  better-sqlite3           │
└────────────┬────────────┘
             │
             ▼
        JSON Response sent back to client
```

---

## Route File Structure

### Master Router (`routes/index.js`)

This file acts as a traffic controller. It takes the URL after `/api` and sends it to the correct sub-router:

```
/api/auth/*          →  auth.routes.js
/api/users/*         →  users.routes.js
/api/transactions/*  →  transactions.routes.js
/api/dashboard/*     →  dashboard.routes.js
```

### Individual Route Files

Each route file defines endpoints for one resource. Every route definition has this pattern:

```
router.METHOD(PATH, ...middleware, controllerFunction)
```

**Example:**
```javascript
router.get('/', authorize(['Analyst', 'Admin']), validate(listRules), controller.list);
//     │    │         │                              │                    │
//     │    │         │                              │                    └─ Final handler
//     │    │         │                              └─ Middleware 2: validate input
//     │    │         └─ Middleware 1: check role
//     │    └─ URL path (relative to mount point)
//     └─ HTTP method
```

---

## Middleware Chain

Middleware functions run **in order, left to right**. Each one can:
- **Pass** the request to the next function via `next()`
- **Block** the request by sending an error via `next(new ApiError(...))`

### Global Middleware (runs on EVERY request)

Applied in `app.js` before any routes:

| Order | Middleware | Purpose |
|-------|-----------|---------|
| 1 | `express.json()` | Parse the JSON request body into `req.body` |
| 2 | `rateLimiter` | Block if too many requests from same IP |

### Route-Level Middleware (runs on specific routes)

Applied in individual route files:

| Order | Middleware | Purpose |
|-------|-----------|---------|
| 3 | `authenticate` | Verify JWT token, attach `req.user` |
| 4 | `authorize([roles])` | Check if `req.user.role` is in allowed list |
| 5 | `validate(rules)` | Run validation rules on `req.body`/`req.query`/`req.params` |
| 6 | Controller | Handle the request and send response |

### Error Middleware (runs when something fails)

Applied in `app.js` after all routes:

| Order | Middleware | Purpose |
|-------|-----------|---------|
| 7 | 404 handler | Catches any request that didn't match a route |
| 8 | `errorHandler` | Catches all errors and sends JSON error response |

---

## How `router.use(authenticate)` Works

When a route file has `router.use(authenticate)` at the top, it means **every route in that file** requires authentication. This avoids repeating `authenticate` on every single route.

```javascript
// In transactions.routes.js:
router.use(authenticate);  // Applies to ALL routes below

router.get('/', ...);      // authenticate runs before this
router.post('/', ...);     // authenticate runs before this too
router.delete('/:id', ...); // and this
```

This is equivalent to writing:
```javascript
router.get('/', authenticate, ...);
router.post('/', authenticate, ...);
router.delete('/:id', authenticate, ...);
```

---

## Route Parameters

### Path Parameters (`:id`)

Used to identify a specific resource:

```
GET /api/transactions/42
                      └─ req.params.id = "42"
```

Defined in the route as:
```javascript
router.get('/:id', controller.getById);
```

### Query Parameters (`?key=value`)

Used for filtering, pagination, and sorting:

```
GET /api/transactions?type=income&page=2&limit=10
                      │           │      └─ req.query.limit = "10"
                      │           └─ req.query.page = "2"
                      └─ req.query.type = "income"
```

These are available automatically in `req.query` - no special route syntax needed.

### Request Body

Used in POST and PUT requests to send data:

```
POST /api/transactions
Body: { "amount": 5000, "type": "income", "category": "salary", "date": "2026-03-01" }
       └─ Available as req.body.amount, req.body.type, etc.
```

---

## Complete Route Map

### Auth Routes (Public - No authentication required)
```
POST /api/auth/register  →  validate  →  authController.register
POST /api/auth/login     →  validate  →  authController.login
```

### User Routes (All require authentication)
```
GET  /api/users/me             →  usersController.getMe
GET  /api/users                →  authorize(Admin)  →  validate  →  usersController.list
GET  /api/users/:id            →  authorize(Admin)  →  validate  →  usersController.getById
POST /api/users                →  authorize(Admin)  →  validate  →  usersController.create
PUT  /api/users/:id            →  authorize(Admin)  →  validate  →  usersController.update
PATCH /api/users/:id/status    →  authorize(Admin)  →  validate  →  usersController.toggleStatus
DELETE /api/users/:id          →  authorize(Admin)  →  validate  →  usersController.remove
```

### Transaction Routes (All require authentication)
```
GET    /api/transactions       →  authorize(Analyst,Admin)  →  validate  →  txnController.list
GET    /api/transactions/:id   →  authorize(Analyst,Admin)  →  validate  →  txnController.getById
POST   /api/transactions       →  authorize(Admin)          →  validate  →  txnController.create
PUT    /api/transactions/:id   →  authorize(Admin)          →  validate  →  txnController.update
DELETE /api/transactions/:id   →  authorize(Admin)          →  validate  →  txnController.remove
```

### Dashboard Routes (All require authentication)
```
GET /api/dashboard/summary          →  authorize(All roles)       →  dashController.summary
GET /api/dashboard/recent-activity  →  authorize(All roles)       →  validate  →  dashController.recentActivity
GET /api/dashboard/category-totals  →  authorize(Analyst,Admin)   →  validate  →  dashController.categoryTotals
GET /api/dashboard/monthly-trends   →  authorize(Analyst,Admin)   →  validate  →  dashController.monthlyTrends
```

---

## How Errors Are Handled in Routes

When any middleware or controller calls `next(error)`, Express skips all remaining middleware and jumps directly to the error handler:

```
Request → authenticate → authorize → validate → controller
              │               │           │          │
              │  (401)        │  (403)    │  (400)   │  (any error)
              └───────────────┴───────────┴──────────┴──────┐
                                                            ▼
                                                      errorHandler
                                                            │
                                                            ▼
                                                    JSON Error Response
                                                    { success: false,
                                                      error: { message: "..." } }
```

The `errorHandler` middleware has **4 parameters** `(err, req, res, next)` - this is how Express knows it's an error handler and not a regular middleware.
