# Rollout — Label Dispatch Control

## Run locally
    npm install
    npm run dev

## Deploy (easiest: Vercel or Netlify)
1. Push this folder to a GitHub repo.
2. Go to vercel.com or netlify.com, sign in, "Import Project" / "Add new site" from your repo.
3. Framework preset: Vite. Build command: `npm run build`. Output directory: `dist`.
4. Deploy — you'll get a live https:// URL.

## Data storage
Data is saved in the browser's localStorage on whichever device/browser is used.
That means:
- It's per-browser, not shared across devices or people.
- Clearing browser data/cache will erase it — export CSVs from the Reports tab periodically as a backup.
- For multi-device or multi-user access with one shared, reliable source of truth, this app would need a real backend/database instead of localStorage.
