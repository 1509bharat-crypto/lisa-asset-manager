# Deploy Shared Asset Library

## 🚀 Quick Deploy (Choose One)

### Option 1: Netlify (Easiest - 5 minutes)

1. **Set up Supabase** (see [SUPABASE_SETUP.md](SUPABASE_SETUP.md))

2. **Switch to Supabase mode**
   Edit `index.html` line 73:
   ```html
   <!-- Change from: -->
   <script src="script.js"></script>

   <!-- To: -->
   <script type="module" src="script-supabase.js"></script>
   ```

3. **Deploy to Netlify**
   - Go to https://app.netlify.com
   - Drag your "Asset library" folder
   - Wait 30 seconds
   - Get URL like: `https://asset-library-xyz.netlify.app`

4. **Add environment variables**
   - In Netlify dashboard: Site settings → Environment variables
   - Add:
     - `VITE_SUPABASE_URL` = your Supabase project URL
     - `VITE_SUPABASE_ANON_KEY` = your Supabase anon key
   - Trigger redeploy: Deploys → Trigger deploy → Deploy site

5. **Done!** Share your URL with anyone

---

### Option 2: Vercel (Fast - 3 minutes)

1. **Complete Supabase setup** ([SUPABASE_SETUP.md](SUPABASE_SETUP.md))

2. **Switch to Supabase mode** (see step 2 above)

3. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

4. **Deploy**
   ```bash
   cd "/Users/b/Desktop/B/Asset library"
   vercel
   ```

5. **Add environment variables**
   ```bash
   vercel env add VITE_SUPABASE_URL
   vercel env add VITE_SUPABASE_ANON_KEY
   ```

6. **Redeploy**
   ```bash
   vercel --prod
   ```

7. **Done!** Get URL like: `https://asset-library.vercel.app`

---

### Option 3: GitHub Pages (Free, Custom Domain)

1. **Complete Supabase setup**

2. **Switch to Supabase mode**

3. **Build the project**
   ```bash
   npm install
   npm run build
   ```

4. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Add Supabase shared storage"
   git push origin main
   ```

5. **Enable GitHub Pages**
   - Go to repo Settings → Pages
   - Source: Deploy from branch → `gh-pages`
   - Or use GitHub Actions for automatic deploys

6. **Your site**: `https://YOUR_USERNAME.github.io/asset-library`

---

## 🔧 Local Development with Supabase

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Create `.env.local`**
   ```env
   VITE_SUPABASE_URL=https://xxxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=your-key-here
   ```

3. **Switch to Supabase** (edit index.html)

4. **Run dev server**
   ```bash
   npm run dev
   ```

5. **Open**: http://localhost:8888

---

## 📊 Comparison

| Feature | localStorage (current) | Supabase (shared) |
|---------|----------------------|-------------------|
| **Storage** | Per-device only | Cloud database |
| **Sharing** | ❌ No | ✅ Yes |
| **Real-time** | ❌ No | ✅ Yes |
| **Limits** | ~5MB | 500MB free |
| **Setup** | None | 5 minutes |
| **Cost** | Free | Free tier |

---

## ✨ Features with Supabase

### For Users:
- **Shared Library**: Everyone sees the same assets
- **Upload Once**: Available to all users immediately
- **Real-time**: See new uploads instantly
- **No Login**: Public access for everyone
- **Fast**: CDN-powered global delivery

### For You:
- **Easy Management**: Delete/moderate from dashboard
- **Analytics**: See usage stats
- **Scalable**: Upgrade as you grow
- **Backup**: Automatic backups included

---

## 🎯 Which Version to Deploy?

### Use **localStorage** (script.js) if:
- ✅ Personal use only
- ✅ Each user has own collection
- ✅ No backend needed
- ✅ Privacy important

### Use **Supabase** (script-supabase.js) if:
- ✅ Team/public shared library
- ✅ Everyone sees same assets
- ✅ Real-time collaboration
- ✅ Centralized management

---

## 🔒 Security Notes

**Current setup (Supabase) allows anyone to:**
- ✅ Upload assets
- ✅ Download assets
- ✅ Delete assets

**To add protection:**
1. Enable Supabase Auth (require sign-in)
2. Add role-based permissions (admin vs. user)
3. Add rate limiting
4. Add server-side file validation

Let me know if you want any of these implemented!

---

## 💰 Cost Estimate

### Supabase Free Tier:
- **Storage**: 500 MB
- **Bandwidth**: 2 GB/month
- **API Requests**: Unlimited
- **Capacity**: ~250 images (2MB each)

### If you exceed:
- **Pro Plan**: $25/month
  - 8 GB storage
  - 50 GB bandwidth
  - More API requests

### Most teams stay on free tier! 🎉

---

## 📞 Need Help?

1. Check [SUPABASE_SETUP.md](SUPABASE_SETUP.md) for database setup
2. See [README.md](README.md) for app features
3. Open GitHub issue if stuck

Happy sharing! 🚀
