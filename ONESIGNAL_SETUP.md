# OneSignal Local Testing Setup Guide

## Step 1: Create OneSignal Account

1. Go to [https://dashboard.onesignal.com/signup](https://dashboard.onesignal.com/signup)
2. Sign up with your email
3. Verify your email if required

## Step 2: Create Your First App

1. Click "Add a new app" or "Create App"
2. Enter app name: "Tennis Captain App"
3. Select platform: **Web Push**
4. Click "Next"

## Step 3: Configure Web Push Settings

1. **Site Name**: Tennis Captain App
2. **Site URL**: `http://localhost:3000` (for local testing)
3. **Default Icon URL**: Leave blank for now
4. **Choose Integration**:
   - Select "Typical Site"
   - Choose "OneSignal SDK" (not WordPress or other CMS)
5. Click "Save"

## Step 4: Get Your Keys

After creating the app, you'll be taken to the dashboard:

1. Go to **Settings** → **Keys & IDs**
2. Copy these values:
   - **App ID** (looks like: `12345678-1234-1234-1234-123456789012`)
   - **REST API Key** (looks like: `YWJjZGVmZ2hpams1bG1ub3BxcnN0dXZ3eHl6MTIzNDU2`)

## Step 5: Update Environment Variables

Add these to your `.env.local` file:

\`\`\`bash
# OneSignal Configuration
NEXT_PUBLIC_NOTIFS_ENABLED=true
NEXT_PUBLIC_ONESIGNAL_APP_ID=your_app_id_here
ONESIGNAL_REST_API_KEY=your_rest_api_key_here
NEXT_PUBLIC_APP_BASE_URL=http://localhost:3000
\`\`\`

## Step 6: Test Setup

1. Restart your dev server: `npm run dev`
2. Visit: http://localhost:3000/api/notifications/debug
3. Should show config as "complete"
4. Open your app in browser
5. Allow notification permissions when prompted

## Step 7: Test Notifications

1. Go to your training page
2. Mark yourself unavailable for a training
3. Wait 15 seconds - you should receive a notification
4. Or test via API:
   ```bash
   curl -X POST http://localhost:3000/api/notifications/schedule \
     -H "Content-Type: application/json" \
     -d '{
       "sessionId": "test123",
       "startsAtISO": "2024-12-25T18:00:00Z",
       "sessionUrl": "http://localhost:3000",
       "rosterUserIds": ["test-user"],
       "testMode": true,
       "immediateNotification": true
     }'
   ```

## Troubleshooting

- **No notification permission prompt**: Check browser settings, try incognito mode
- **Notifications not received**: Check OneSignal dashboard → Delivery → All Messages
- **HTTPS required error**: Use `ngrok` or similar for HTTPS testing if needed
- **Config incomplete**: Double-check environment variables and restart server

## Notes for Production

- Change `NEXT_PUBLIC_APP_BASE_URL` to your production domain
- Update OneSignal app settings with production URL
- Consider setting up different OneSignal apps for dev/staging/production