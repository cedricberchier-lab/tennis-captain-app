# OneSignal Setup for Vercel Production

## Step 1: Create OneSignal Account & App

### 1.1 Sign Up for OneSignal
1. Go to [https://dashboard.onesignal.com/signup](https://dashboard.onesignal.com/signup)
2. Sign up with your email
3. Verify your email if required

### 1.2 Create Your Tennis App
1. Click "Add a new app" or "Create App"
2. **App Name**: `Tennis Captain App`
3. **Select Platform**: `Web Push`
4. Click "Next"

### 1.3 Configure Web Push Settings
1. **Site Name**: `Tennis Captain App`
2. **Site URL**: `https://your-vercel-app.vercel.app` (your actual Vercel URL)
3. **Default Icon URL**: Leave blank for now
4. **Choose Integration**: Select "Typical Site" → "OneSignal SDK"
5. Click "Save"

### 1.4 Get Your Credentials
1. Go to **Settings** → **Keys & IDs**
2. Copy these values:
   - **App ID**: `12345678-1234-1234-1234-123456789012` (example format)
   - **REST API Key**: `YWJjZGVmZ2hpams1bG1ub3BxcnN0dXZ3eHl6MTIzNDU2` (example format)

## Step 2: Configure Vercel Environment Variables

### 2.1 Access Vercel Dashboard
1. Go to [https://vercel.com/dashboard](https://vercel.com/dashboard)
2. Select your tennis-captain-app project
3. Go to **Settings** → **Environment Variables**

### 2.2 Add OneSignal Variables
Add these 4 environment variables:

| Name | Value | Environment |
|------|--------|-------------|
| `NEXT_PUBLIC_NOTIFS_ENABLED` | `true` | Production, Preview, Development |
| `NEXT_PUBLIC_ONESIGNAL_APP_ID` | `your_app_id_here` | Production, Preview, Development |
| `ONESIGNAL_REST_API_KEY` | `your_rest_api_key_here` | Production, Preview, Development |
| `NEXT_PUBLIC_APP_BASE_URL` | `https://your-vercel-app.vercel.app` | Production, Preview, Development |

**Important:**
- Replace `your_app_id_here` with your actual OneSignal App ID
- Replace `your_rest_api_key_here` with your actual OneSignal REST API Key
- Replace `https://your-vercel-app.vercel.app` with your actual Vercel domain

### 2.3 Update OneSignal App Settings
1. Go back to OneSignal dashboard → **Settings** → **Web Configuration**
2. Update **Site URL** to match your Vercel domain: `https://your-vercel-app.vercel.app`
3. Save changes

## Step 3: Deploy & Test

### 3.1 Deploy to Vercel
1. Push your code to trigger a new deployment
2. Wait for deployment to complete
3. Vercel will automatically pick up the new environment variables

### 3.2 Test Configuration
1. Visit: `https://your-vercel-app.vercel.app/api/notifications/debug`
2. Should return:
   ```json
   {
     "status": {
       "notifications": "enabled",
       "config": "complete"
     }
   }
   ```

### 3.3 Test Notifications
1. Open your app: `https://your-vercel-app.vercel.app`
2. Allow notification permissions when prompted
3. Navigate to Training page
4. Mark yourself unavailable for a training session
5. Wait 15 seconds → you should receive a notification!

## Step 4: Troubleshooting

### 4.1 Check Debug Endpoint
```bash
curl https://your-vercel-app.vercel.app/api/notifications/debug
```

### 4.2 Common Issues

**🔴 "notifications": "disabled"**
- Check that `NEXT_PUBLIC_NOTIFS_ENABLED=true` in Vercel
- Redeploy after adding environment variables

**🔴 "config": "incomplete"**
- Verify `NEXT_PUBLIC_ONESIGNAL_APP_ID` is set in Vercel
- Verify `ONESIGNAL_REST_API_KEY` is set in Vercel
- App ID should be UUID format: `12345678-1234-1234-1234-123456789012`

**🔴 No permission prompt appears**
- Check browser console for errors
- Try different browser or incognito mode
- Verify HTTPS is working (required for web push)

**🔴 Notifications not received**
- Check OneSignal dashboard → **Audience** → **All Users** (should show subscribers)
- Check OneSignal dashboard → **Delivery** → **All Messages** (should show sent notifications)
- Verify you're subscribed and have valid external user ID

**🔴 API returns "Access denied"**
- Double-check REST API Key in Vercel environment variables
- Ensure it's the REST API Key, not the User Auth Key

### 4.3 Manual API Test
```bash
curl -X POST 'https://your-vercel-app.vercel.app/api/notifications/schedule' \
  -H 'Content-Type: application/json' \
  -d '{
    "sessionId": "test123",
    "startsAtISO": "2024-12-25T18:00:00Z",
    "sessionUrl": "https://your-vercel-app.vercel.app",
    "rosterUserIds": ["test-user"],
    "testMode": true,
    "immediateNotification": true
  }'
```

Should return: `{"ok": true, "ids": {...}}`

## Step 5: Production Checklist

- ✅ OneSignal app created with correct domain
- ✅ All 4 environment variables set in Vercel
- ✅ Code deployed and environment variables active
- ✅ Debug endpoint returns "enabled" and "complete"
- ✅ Notification permissions granted in browser
- ✅ Test notification received successfully

## Notes

- **HTTPS Required**: Web push notifications only work over HTTPS (Vercel provides this automatically)
- **User Consent**: Users must explicitly allow notifications in their browser
- **Cross-Device**: Notifications only work on the device/browser where permission was granted
- **OneSignal Dashboard**: Use it to monitor delivery rates, subscriber counts, and debug issues