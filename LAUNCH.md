# Zoom ERP — Launch Guide

Production stack: **Next.js + Supabase (Postgres) + Vercel + Google Drive**

---

## Step 1 — Create Supabase project

1. Go to [supabase.com](https://supabase.com) → **Start your project**
2. Sign in with GitHub
3. **New project**
   - Name: `zoom-erp`
   - Database password: **save this password** (you need it once)
   - Region: closest to you
4. Wait ~2 minutes for the project to finish provisioning

Reply **done** when the project is ready.

---

## Step 2 — Get database URL

1. Supabase dashboard → **Project Settings** (gear) → **Database**
2. Under **Connection string**, choose **URI**
3. Select **Transaction pooler** (important for Vercel)
4. Copy the string — it looks like:

```
postgresql://postgres.[ref]:[YOUR-PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres
```

5. Replace `[YOUR-PASSWORD]` with your database password
6. Paste into `.env.local`:

```env
DATABASE_URL=postgresql://postgres.xxxx:YOUR_PASSWORD@...
```

---

## Step 3 — Create tables

```bash
npm run db:push
npm run db:seed
```

---

## Step 4 — Push to GitHub

```bash
git init
git add .
git commit -m "Zoom ERP production setup"
```

Create a repo on GitHub, then:

```bash
git remote add origin https://github.com/YOUR-USER/zoom-erp.git
git push -u origin main
```

---

## Step 5 — Deploy on Vercel

1. [vercel.com](https://vercel.com) → Sign in with GitHub
2. **Add New Project** → import `zoom-erp`
3. Add **Environment Variables**:

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | Your Supabase pooler URI |
| `SESSION_SECRET` | Long random string |
| `APP_URL` | `https://your-app.vercel.app` (update after first deploy) |
| `GOOGLE_CLIENT_ID` | From Google Cloud |
| `GOOGLE_CLIENT_SECRET` | From Google Cloud |

4. Click **Deploy**

---

## Step 6 — Final Google OAuth update

After Vercel gives you a URL (e.g. `https://zoom-erp.vercel.app`):

1. Google Cloud → **Clients** → your OAuth client
2. Add redirect URI:

```
https://zoom-erp.vercel.app/api/integrations/google/callback
```

3. Update Vercel env `APP_URL` to the same URL
4. Redeploy on Vercel

---

## You're live

- App: `https://your-app.vercel.app`
- Register → first user = admin
- **Settings** → Connect Google Drive
- **Clients** → upload documents
