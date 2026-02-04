# Railway Migration Guide

This guide walks you through migrating the Asset Library from Netlify + Supabase to Railway.

## Overview

**Before:** Netlify (frontend) + Supabase (PostgreSQL + Realtime)
**After:** Railway (Node.js server + PostgreSQL)

## Step 1: Set Up Railway Project

1. Go to [railway.app](https://railway.app) and log in
2. Create a new project
3. Add a **PostgreSQL** database service:
   - Click "New" → "Database" → "PostgreSQL"
   - Wait for it to deploy

## Step 2: Initialize the Database

1. In Railway, click on your PostgreSQL service
2. Go to the "Data" tab or connect via CLI
3. Run the SQL in `scripts/init-database.sql` to create the tables

**Option A: Via Railway's Query Tab**
- Copy the contents of `scripts/init-database.sql`
- Paste and run in Railway's SQL query interface

**Option B: Via CLI**
```bash
# Get your DATABASE_URL from Railway
# (Click PostgreSQL → Variables → DATABASE_URL)

# Then run:
psql $DATABASE_URL < scripts/init-database.sql
```

## Step 3: Export Data from Supabase

1. Open `scripts/export-from-supabase.html` in your browser
2. Enter your Supabase credentials:
   - URL: `https://rnpidqgwztmwybuqzgpf.supabase.co`
   - Key: Your anon key
3. Click "Test Connection"
4. Click "Export All Data"
5. Click "Download Export (JSON)"
6. Save the file (e.g., `asset-library-export.json`)

## Step 4: Import Data to Railway

```bash
# Set your Railway DATABASE_URL
export DATABASE_URL="postgresql://postgres:xxx@xxx.railway.app:5432/railway"

# Install dependencies if not already done
npm install

# Run the import script
node scripts/import-to-railway.js asset-library-export.json
```

## Step 5: Deploy to Railway

### Option A: Deploy from GitHub (Recommended)

1. Push this branch to GitHub:
   ```bash
   git push origin railway-migration
   ```

2. In Railway dashboard:
   - Click "New" → "GitHub Repo"
   - Select your repository
   - Choose the `railway-migration` branch

3. Railway will auto-detect the Node.js app and deploy it

### Option B: Deploy via Railway CLI

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Link to your project
railway link

# Deploy
railway up
```

## Step 6: Configure Environment Variables

In Railway, click on your web service → Variables → Add these:

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` (reference to your PostgreSQL) |
| `NODE_ENV` | `production` |
| `OPENAI_API_KEY` | (optional) Your OpenAI key for image analysis |

## Step 7: Generate a Domain

1. In Railway, click on your web service
2. Go to "Settings" → "Networking"
3. Click "Generate Domain" or add a custom domain
4. Your app will be available at `https://your-app.up.railway.app`

## Step 8: Update Figma Plugin

1. Open `figma-plugin/ui.html`
2. Update `API_BASE_URL` with your Railway URL:
   ```javascript
   const API_BASE_URL = 'https://your-app.up.railway.app';
   ```
3. Re-package the plugin (zip the figma-plugin folder)
4. Update in Figma

## Verification Checklist

- [ ] Database tables created (projects, folders, assets)
- [ ] Data imported successfully
- [ ] Railway web service deployed
- [ ] Can access the app at Railway URL
- [ ] Can create projects
- [ ] Can upload assets
- [ ] Can view assets
- [ ] Figma plugin connects to Railway

## Troubleshooting

### "Database not connected" error
- Check that `DATABASE_URL` is set correctly
- Make sure the PostgreSQL service is running
- Verify the reference syntax: `${{Postgres.DATABASE_URL}}`

### Assets not loading
- Check the browser console for API errors
- Verify the API is running: visit `https://your-app.railway.app/api/health`

### Figma plugin can't connect
- Update `API_BASE_URL` in `figma-plugin/ui.html`
- Make sure the domain matches `allowedDomains` in `manifest.json`
- Re-package and reload the plugin in Figma

## File Changes Summary

| File | Change |
|------|--------|
| `package.json` | Added `pg`, `dotenv`, `openai` dependencies; removed Supabase |
| `server.js` | Complete rewrite with PostgreSQL + API routes |
| `script-railway.js` | New frontend that uses REST API instead of Supabase |
| `index.html` | Uses `script-railway.js` instead of `script-supabase.js` |
| `railway.json` | New Railway deployment config |
| `figma-plugin/ui.html` | Updated to use REST API |
| `figma-plugin/manifest.json` | Updated allowed domains for Railway |
| `scripts/init-database.sql` | Database schema for Railway PostgreSQL |
| `scripts/export-from-supabase.html` | Tool to export data from Supabase |
| `scripts/import-to-railway.js` | Tool to import data to Railway |

## Rolling Back

If you need to go back to Netlify + Supabase:

```bash
git checkout master
```

The original code is preserved on the `master` branch.
