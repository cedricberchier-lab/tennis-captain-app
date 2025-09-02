# Database Setup - Vercel Postgres

This guide explains how to set up Vercel Postgres for your Tennis Captain app.

## 🚀 Quick Start (2 minutes)

Your app currently works with localStorage. To upgrade to database storage:

### **Step 1: Export Your Current Data** ⚠️
1. Go to your Team page in the app
2. Click **"📤 Export Data"**
3. Choose **"📄 Export as JSON"** (saves as backup)
4. Keep this file safe!

### **Step 2: Deploy to Vercel**
1. Push your code to GitHub: `git add . && git commit -m "Add database support" && git push`
2. Go to [vercel.com](https://vercel.com) and sign up/login
3. Click **"Add New Project"**
4. Import your `tennis-captain-app` repository
5. Click **"Deploy"** (uses default settings)

### **Step 3: Create Database**
1. In your Vercel project dashboard, click **"Storage"** tab
2. Click **"Create Database"**
3. Select **"Postgres"**
4. Name it `tennis-captain-db`
5. Choose your region (closest to you)
6. Click **"Create"** (takes ~30 seconds)

### **Step 4: Get Database Config**
1. After database creation, click the **".env.local"** tab
2. **Copy all the variables** (they look like this):
   ```bash
   POSTGRES_URL="postgresql://default:abc123@ep-xxx.postgres.vercel-storage.com:5432/verceldb"
   POSTGRES_PRISMA_URL="postgresql://default:abc123@ep-xxx.postgres.vercel-storage.com:5432/verceldb?pgbouncer=true"
   # ... (5-6 more variables)
   ```

### **Step 5: Configure Your App**
1. In your local project, create `.env.local` file
2. Paste the variables from Step 4
3. Run `npm run dev` 
4. Go to Team page - you'll see "Data Migration Available" banner
5. Click **"Migrate Data"** to move your localStorage data to database

## ✅ **You're Done!**
- Your data is now stored in the cloud
- Accessible from any device
- Automatically backed up
- Ready for team sharing

## 4. Test Database Connection

1. Run your development server: `npm run dev`
2. Go to `http://localhost:3000`
3. Navigate to the Team page
4. The database tables will be created automatically on first access
5. Try adding a player to test the connection

## 5. Migration from localStorage

If you have existing player data in localStorage:

1. Go to the Team page
2. You'll see a blue banner offering to migrate data
3. Click "Migrate Data" to move your local data to the database
4. Your data will be preserved and synced to the cloud

## 6. Database Schema

The following tables are created automatically:

- **`players`**: Store player information, stats, and absences
- **`matches`**: Store match details and metadata
- **`match_lineup`**: Store player lineups for each match
- **`match_results`**: Store set-by-set match results

## 7. API Endpoints

The following API routes are available:

- `GET /api/players` - Get all players
- `POST /api/players` - Create new player
- `GET /api/players/[id]` - Get specific player
- `PUT /api/players/[id]` - Update player
- `DELETE /api/players/[id]` - Delete player
- `POST /api/init-db` - Initialize database tables

## 8. Local Development

For local development, you can:

1. Use the Vercel Postgres database (recommended)
2. Or set up a local PostgreSQL database with the same schema

## 9. Troubleshooting

**Database connection errors:**
- Ensure your `.env.local` file has the correct environment variables
- Check that your Vercel project is deployed
- Verify the database is in the same region as your Vercel deployment

**Migration issues:**
- Check browser console for errors
- Ensure localStorage contains valid player data
- Try refreshing the page and attempting migration again

**Performance:**
- Database queries are optimized for the Swiss Tennis workflow
- Player sorting by ranking is handled at the database level
- All operations use proper indexing for fast response times

## Next Steps

1. Deploy your updated app to Vercel
2. Test all player operations (create, edit, delete, absences)
3. Add team members and start using the database-backed system
4. Monitor usage in the Vercel dashboard Storage tab