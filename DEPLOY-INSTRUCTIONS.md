# Deploy Instructions for Order Editing Feature

The "Edit Order" button code is already in the repository, but your frontend needs to be rebuilt and redeployed.

## Option 1: Local Development (If running locally)

```bash
# Stop your dev server (Ctrl+C)
# Then restart it
npm run dev
```

## Option 2: Vercel/Production Deployment

If you're using Vercel or another hosting service:

### Automatic Deploy (Recommended):
Since you pushed to `main` branch, Vercel should auto-deploy. Check:
- Go to https://vercel.com/dashboard
- Find your project (nexxacrafts)
- Check recent deployments
- Latest commit should be `e166bb7` - "Add full order editing UI"

### Manual Deploy:
If auto-deploy didn't trigger:

```bash
# From your project directory
git pull origin main  # Make sure you have latest code
npm install           # Install any new dependencies
npm run build         # Build for production

# Then deploy to Vercel:
vercel --prod
```

## Option 3: Force Rebuild on Vercel

1. Go to Vercel Dashboard
2. Find nexxacrafts project
3. Click "Deployments"
4. Click on the latest deployment
5. Click "Redeploy" button
6. Select "Use existing Build Cache: NO"
7. Click "Redeploy"

## Verify the Button Appears

After deployment:
1. Go to Admin → Orders
2. Click on any order (like NCO-261126-8744C0431511)
3. You should see **"Edit order"** button next to "Close" button in the header
4. Button will NOT show for cancelled orders (by design)

## If Button Still Doesn't Appear

Check browser console (F12) for any errors. The button should be visible for all non-cancelled orders.

---

**Note:** The database functions are already deployed and working. Only the frontend UI needs to rebuild.
