# Shared Asset Library - Supabase Setup

This guide will help you set up a shared asset library where everyone can access the same assets organized by projects.

## Step 1: Create Supabase Account

1. Go to https://supabase.com
2. Click "Start your project"
3. Sign up with GitHub (free)
4. Create a new project:
   - Name: `asset-library`
   - Database Password: (save this)
   - Region: Choose closest to you
   - Wait 2-3 minutes for setup

## Step 2: Create Database Tables

1. In your Supabase dashboard, go to **SQL Editor**
2. Click **New query**
3. Paste this SQL:

```sql
-- Create projects table
create table public.projects (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  description text,
  color text default '#667eea',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create folders table (belongs to projects)
create table public.folders (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  project_id uuid references public.projects(id) on delete cascade not null,
  parent_id uuid references public.folders(id) on delete cascade,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create assets table (belongs to projects and optionally folders)
create table public.assets (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  type text not null,
  size bigint not null,
  data text not null,
  project_id uuid references public.projects(id) on delete cascade not null,
  folder_id uuid references public.folders(id) on delete set null,
  upload_date timestamp with time zone default timezone('utc'::text, now()) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security
alter table public.projects enable row level security;
alter table public.folders enable row level security;
alter table public.assets enable row level security;

-- Projects policies
create policy "Allow public read projects"
  on public.projects for select
  to anon
  using (true);

create policy "Allow public insert projects"
  on public.projects for insert
  to anon
  with check (true);

create policy "Allow public update projects"
  on public.projects for update
  to anon
  using (true);

create policy "Allow public delete projects"
  on public.projects for delete
  to anon
  using (true);

-- Folders policies
create policy "Allow public read folders"
  on public.folders for select
  to anon
  using (true);

create policy "Allow public insert folders"
  on public.folders for insert
  to anon
  with check (true);

create policy "Allow public delete folders"
  on public.folders for delete
  to anon
  using (true);

-- Assets policies
create policy "Allow public read access"
  on public.assets for select
  to anon
  using (true);

create policy "Allow public insert access"
  on public.assets for insert
  to anon
  with check (true);

create policy "Allow public delete access"
  on public.assets for delete
  to anon
  using (true);

create policy "Allow public update access"
  on public.assets for update
  to anon
  using (true);

-- Create indexes for better performance
create index projects_created_at_idx on public.projects (created_at desc);
create index folders_project_id_idx on public.folders (project_id);
create index folders_parent_id_idx on public.folders (parent_id);
create index assets_project_id_idx on public.assets (project_id);
create index assets_folder_id_idx on public.assets (folder_id);
create index assets_upload_date_idx on public.assets (upload_date desc);
```

4. Click **Run** (bottom right)

## Step 3: Migration from Old Schema (If Upgrading)

If you have existing data with the old category-based system, run this migration:

```sql
-- Add project_id column to existing tables
alter table public.assets add column project_id_new uuid references public.projects(id) on delete cascade;
alter table public.folders add column project_id_new uuid references public.projects(id) on delete cascade;

-- Create default projects from existing categories
insert into public.projects (name, description, color)
values
  ('Icons', 'Icon assets', '#667eea'),
  ('Logos', 'Logo assets', '#f093fb'),
  ('Other', 'Other assets', '#4facfe');

-- Migrate folders to projects
update public.folders f
set project_id_new = p.id
from public.projects p
where f.category = lower(p.name);

-- Migrate assets to projects
update public.assets a
set project_id_new = p.id
from public.projects p
where a.category = lower(p.name);

-- Make project_id not null after migration
alter table public.folders alter column project_id_new set not null;
alter table public.assets alter column project_id_new set not null;

-- Remove old category columns
alter table public.folders drop column category;
alter table public.assets drop column category;

-- Rename new columns
alter table public.folders rename column project_id_new to project_id;
alter table public.assets rename column project_id_new to project_id;

-- Recreate indexes
drop index if exists folders_category_idx;
create index folders_project_id_idx on public.folders (project_id);
create index assets_project_id_idx on public.assets (project_id);
```

## Step 4: Get API Keys

1. Go to **Project Settings** (gear icon) → **API**
2. Copy these values:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public key**: `eyJhbGc...` (long string)

## Step 5: Configure Your App

Create a file `.env.local` in your project:

```env
VITE_SUPABASE_URL=your-project-url-here
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

## Step 6: Install Dependencies

```bash
npm install @supabase/supabase-js
```

## Step 7: Deploy

### Option A: Netlify (Recommended)
1. Go to https://app.netlify.com
2. Drag your folder to deploy
3. Add environment variables in **Site settings** → **Environment variables**
4. Share the URL!

### Option B: Vercel
```bash
npm install -g vercel
vercel
# Add environment variables when prompted
```

## Features

✅ **Project-based organization** - Organize assets by projects
✅ **Nested folders** - Create folders within folders
✅ **Shared storage** - Everyone sees the same assets
✅ **Real-time updates** - Assets appear for everyone instantly
✅ **Quick upload** - Upload from anywhere with project selection
✅ **No authentication** - Public access for everyone
✅ **Free tier** - 500MB storage, 2GB bandwidth/month
✅ **Fast CDN** - Assets served globally

## Storage Limits

**Supabase Free Tier:**
- 500 MB database storage
- 2 GB bandwidth per month
- Unlimited API requests
- ~250 images (2MB each)

**To increase limits:**
- Upgrade to Pro: $25/month (8GB storage, 50GB bandwidth)

## Security Notes

⚠️ **This setup allows anyone to:**
- Create/edit/delete projects
- Upload assets
- Download assets
- Delete assets

**To add protection:**
1. Enable authentication (users must sign in)
2. Add rate limiting
3. Add file validation on server side
4. Add admin-only delete permissions

Let me know if you want me to implement any of these!
