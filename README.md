# Zoom ERP — Local Prototype

A **100% local** business system prototype. No Supabase, no cloud database, no external services required to start.

Everything runs on your machine:

- **Next.js** — fast browser UI
- **SQLite** — single file database at `data/zoom-erp.db`
- **Drizzle ORM** — schema you can later migrate to PostgreSQL/Supabase
- **Local auth** — email/password with session cookies

## Quick start

```bash
# 1. Install dependencies (already done if scaffolded)
npm install

# 2. Create database tables + sample data
npm run db:setup

# 3. Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Demo login (after seed)

| Email | Password |
|-------|----------|
| `admin@zoom.local` | `password123` |
| `sarah@zoom.local` | `password123` |

Or register a new account — the **first user becomes admin**.

## What's included (Phase 1)

- Login / register / logout
- Dashboard with counts and recent tasks
- Clients list + add client
- Tasks Kanban board with optimistic status moves

## Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start local dev server |
| `npm run db:push` | Sync schema to SQLite |
| `npm run db:seed` | Add demo users, clients, tasks |
| `npm run db:setup` | Push schema + seed |
| `npm run build` | Production build check |

## Project structure

```
src/
  app/
    (app)/          # Protected pages (dashboard, clients, tasks)
    api/            # Local API routes
    login/          # Auth pages
  db/
    schema.ts       # Database tables
    seed.ts         # Demo data
  lib/
    auth.ts         # Password hashing
    session.ts      # Cookie sessions
```

## Local-first philosophy

This prototype is intentionally **not** connected to Supabase or any cloud service. That lets you:

1. Test the concept and workflows cheaply
2. Iterate on UI speed and employee/client flows
3. Migrate to PostgreSQL/Supabase later using the same Drizzle schema

When you're ready for production, the main change is swapping SQLite for PostgreSQL — the app structure stays the same.

## Next modules to add

- Quotations & invoices
- Accounting (chart of accounts)
- Banking reconciliation
- Call logs & marketing tasks
- Employee KPI dashboard
