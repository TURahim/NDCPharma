# Vercel Deployment Instructions

## Required Vercel Dashboard Settings

Since this is a **monorepo** with the frontend in a subdirectory, you need to configure Vercel to look in the correct location.

### Step-by-Step Configuration

1. **Go to your Vercel project**
   - Visit: https://vercel.com/dashboard
   - Select your NDC project

2. **Navigate to Settings**
   - Click **Settings** tab
   - Go to **General** section

3. **Set Root Directory**
   - Find the **Root Directory** setting
   - Click **Edit**
   - Enter: `frontend`
   - Click **Save**

4. **Set Build Settings (should auto-detect)**
   - **Framework Preset:** Next.js (auto-detected)
   - **Build Command:** `pnpm build` (auto-detected from package.json)
   - **Output Directory:** `.next` (auto-detected)
   - **Install Command:** `pnpm install` (auto-detected)

5. **Environment Variables** (if needed)
   - Go to **Settings** → **Environment Variables**
   - Add: `NEXT_PUBLIC_API_URL` = `https://us-central1-ndcpharma-8f3c6.cloudfunctions.net/api`

6. **Redeploy**
   - Go to **Deployments** tab
   - Click on the latest deployment
   - Click **Redeploy**

## Project Structure

```
NDC/
├── package.json              # Root (Node 22.x)
├── frontend/                 # ← SET THIS AS ROOT DIRECTORY
│   ├── package.json          # Has Next.js (Node 22.x)
│   ├── app/
│   ├── components/
│   └── ...
├── apps/
│   └── functions/            # Backend (separate, deployed to Firebase)
└── packages/                 # Shared packages
```

## Why This Setup?

- **Monorepo:** Multiple projects in one repository
- **Frontend:** Lives in `frontend/` subdirectory
- **Backend:** Deployed separately to Firebase (not to Vercel)
- **Vercel needs to know:** Build the `frontend` folder, not the root

## Troubleshooting

### Issue: "No Next.js version detected"
**Solution:** Root Directory must be set to `frontend`

### Issue: "cd frontend: No such file or directory"
**Solution:** Don't use `vercel.json` with cd commands. Use Root Directory setting instead.

### Issue: "Node.js 18.x is discontinued"
**Solution:** Already fixed! All package.json files now have Node 20 or 22.

## Alternative: Move Frontend to Root (Not Recommended)

If you want to avoid this configuration, you could restructure:
```
NDC/
├── app/              # Move frontend contents here
├── components/
├── backend/          # Move functions here
└── packages/
```

But this is **not recommended** because:
- Breaks existing monorepo structure
- Makes it harder to maintain separate frontend/backend
- More work to reorganize

## Current Status

✅ Root package.json: Node 22.x  
✅ Frontend package.json: Node 22.x  
✅ Functions package.json: Node 20  
✅ vercel.json: Removed (use dashboard settings instead)  

**Next Step:** Configure Root Directory in Vercel dashboard to `frontend`

