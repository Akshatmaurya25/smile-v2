# Smile App Deployment Guide

This guide covers deploying the Smile backend to cloud platforms and building the mobile app for production.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Backend Deployment](#backend-deployment)
   - [Railway](#option-1-railway-recommended)
   - [Render](#option-2-render)
   - [Fly.io](#option-3-flyio)
3. [Configure Mobile App for Production](#configure-mobile-app-for-production)
4. [Build Android APK/AAB](#build-android-apkaab)
5. [Build iOS App](#build-ios-app)
6. [Post-Deployment Checklist](#post-deployment-checklist)

---

## Prerequisites

Before deploying, ensure you have:

- [ ] A PostgreSQL database (Neon, Supabase, Railway, or any PostgreSQL provider)
- [ ] Google Cloud Console project with OAuth 2.0 credentials
- [ ] Node.js 18+ installed locally
- [ ] Git repository with your code

### Database Setup (if not already done)

**Option A: Neon (Free tier available)**
1. Go to [neon.tech](https://neon.tech)
2. Create a new project
3. Copy the connection string (looks like `postgresql://user:pass@host/dbname?sslmode=require`)

**Option B: Railway PostgreSQL**
1. Create PostgreSQL addon in Railway
2. Copy the `DATABASE_URL` from variables

**Option C: Supabase**
1. Create project at [supabase.com](https://supabase.com)
2. Go to Settings > Database > Connection string

---

## Backend Deployment

### Option 1: Railway (Recommended)

Railway offers easy deployment with automatic builds.

#### Step 1: Install Railway CLI (Optional)
```bash
npm install -g @railway/cli
railway login
```

#### Step 2: Deploy via GitHub
1. Go to [railway.app](https://railway.app)
2. Click "New Project" > "Deploy from GitHub repo"
3. Select your repository
4. Set the root directory to `/server`

#### Step 3: Configure Environment Variables
In Railway dashboard, go to your service > Variables and add:

```env
DATABASE_URL=postgresql://user:password@host:5432/dbname?sslmode=require
JWT_SECRET=your-secure-random-string-min-32-chars
JWT_REFRESH_SECRET=another-secure-random-string-min-32-chars
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=90d
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
PORT=3000
NODE_ENV=production
```

**Generate secure secrets:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

#### Step 4: Configure Build Settings
Railway should auto-detect, but verify:
- **Build Command:** `npm install && npx prisma generate && npx prisma migrate deploy && npm run build`
- **Start Command:** `npm start`
- **Root Directory:** `/server`

#### Step 5: Get Your URL
After deployment, Railway provides a URL like:
`https://your-app-name.up.railway.app`

Your API endpoint will be: `https://your-app-name.up.railway.app/api`

---

### Option 2: Render

#### Step 1: Create Web Service
1. Go to [render.com](https://render.com)
2. New > Web Service
3. Connect your GitHub repository

#### Step 2: Configure Service
- **Name:** smile-backend
- **Root Directory:** server
- **Runtime:** Node
- **Build Command:** `npm install && npx prisma generate && npx prisma migrate deploy && npm run build`
- **Start Command:** `npm start`

#### Step 3: Add Environment Variables
Same variables as Railway (see above)

#### Step 4: Deploy
Click "Create Web Service"

Your API URL: `https://smile-backend.onrender.com/api`

> Note: Render free tier sleeps after 15 mins of inactivity. First request may take 30-60 seconds.

---

### Option 3: Fly.io

#### Step 1: Install Fly CLI
```bash
# Windows (PowerShell)
pwsh -Command "iwr https://fly.io/install.ps1 -useb | iex"

# macOS/Linux
curl -L https://fly.io/install.sh | sh
```

#### Step 2: Login and Initialize
```bash
cd server
fly auth login
fly launch
```

When prompted:
- App name: `smile-backend`
- Region: Choose closest to your users
- PostgreSQL: No (use external database)
- Redis: No

#### Step 3: Configure fly.toml
```toml
app = "smile-backend"
primary_region = "sin"  # Singapore, change as needed

[build]
  builder = "heroku/buildpacks:20"

[env]
  PORT = "8080"
  NODE_ENV = "production"

[http_service]
  internal_port = 8080
  force_https = true
  auto_stop_machines = true
  auto_start_machines = true
  min_machines_running = 0

[[services]]
  protocol = "tcp"
  internal_port = 8080

  [[services.ports]]
    port = 80
    handlers = ["http"]

  [[services.ports]]
    port = 443
    handlers = ["tls", "http"]
```

#### Step 4: Set Secrets
```bash
fly secrets set DATABASE_URL="postgresql://..." JWT_SECRET="..." JWT_REFRESH_SECRET="..." GOOGLE_CLIENT_ID="..." GOOGLE_CLIENT_SECRET="..."
```

#### Step 5: Deploy
```bash
fly deploy
```

Your API URL: `https://smile-backend.fly.dev/api`

---

## Configure Mobile App for Production

### Step 1: Update API Base URL

**File:** `src/api/client.ts`

Find line 18 and update the production URL:

```typescript
// Before
return 'https://your-production-server.com/api';

// After (replace with your actual deployed URL)
return 'https://smile-backend.up.railway.app/api';
```

**Full context:**
```typescript
const getBaseUrl = () => {
  if (__DEV__) {
    // Development mode
    if (Platform.OS === 'android') {
      return 'http://10.0.2.2:3000/api';
    }
    return 'http://localhost:3000/api';
  }
  // Production - YOUR DEPLOYED BACKEND URL
  return 'https://smile-backend.up.railway.app/api';  // <-- CHANGE THIS
};
```

### Step 2: Update Google OAuth (if needed)

If you're using a different Google Client ID for production:

**File:** `src/screens/LoginScreen.tsx`

```typescript
const WEB_CLIENT_ID = 'your-production-google-client-id.apps.googleusercontent.com';
```

---

## Build Android APK/AAB

### Step 1: Generate Signing Key (First time only)

```bash
cd android/app

keytool -genkeypair -v -storetype PKCS12 -keystore smile-release.keystore -alias smile-key -keyalg RSA -keysize 2048 -validity 10000
```

**Save the keystore password securely!**

### Step 2: Configure Signing

**File:** `android/gradle.properties`

Add at the end:
```properties
MYAPP_RELEASE_STORE_FILE=smile-release.keystore
MYAPP_RELEASE_KEY_ALIAS=smile-key
MYAPP_RELEASE_STORE_PASSWORD=your-keystore-password
MYAPP_RELEASE_KEY_PASSWORD=your-key-password
```

**File:** `android/app/build.gradle`

In the `android` block, add signing config:
```gradle
android {
    ...
    signingConfigs {
        release {
            if (project.hasProperty('MYAPP_RELEASE_STORE_FILE')) {
                storeFile file(MYAPP_RELEASE_STORE_FILE)
                storePassword MYAPP_RELEASE_STORE_PASSWORD
                keyAlias MYAPP_RELEASE_KEY_ALIAS
                keyPassword MYAPP_RELEASE_KEY_PASSWORD
            }
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled true
            shrinkResources true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
}
```

### Step 3: Build APK (for testing/direct install)

```bash
cd android
./gradlew assembleRelease
```

APK location: `android/app/build/outputs/apk/release/app-release.apk`

### Step 4: Build AAB (for Play Store)

```bash
cd android
./gradlew bundleRelease
```

AAB location: `android/app/build/outputs/bundle/release/app-release.aab`

### Step 5: Update SHA-1 in Google Console

After creating release keystore, get the SHA-1:
```bash
keytool -list -v -keystore android/app/smile-release.keystore -alias smile-key
```

Add this SHA-1 to:
1. Google Cloud Console > APIs & Services > Credentials > Your Android OAuth Client
2. Firebase Console (if using Firebase)

---

## Build iOS App

### Step 1: Prerequisites
- macOS with Xcode installed
- Apple Developer account ($99/year)
- Certificates and provisioning profiles set up

### Step 2: Install Dependencies
```bash
cd ios
bundle install
bundle exec pod install
```

### Step 3: Open in Xcode
```bash
open ios/Smile.xcworkspace
```

### Step 4: Configure Signing
1. Select the project in navigator
2. Go to "Signing & Capabilities"
3. Select your Team
4. Ensure bundle identifier is correct

### Step 5: Archive for Distribution
1. Select "Any iOS Device" as build target
2. Product > Archive
3. Once complete, Window > Organizer
4. Distribute App > App Store Connect (or Ad Hoc for testing)

---

## Post-Deployment Checklist

### Backend
- [ ] Database migrations ran successfully
- [ ] Health check endpoint works: `GET https://your-url.com/api/health`
- [ ] Environment variables are set correctly
- [ ] SSL/HTTPS is working
- [ ] Logs show no errors

### Mobile App
- [ ] API URL updated in `src/api/client.ts`
- [ ] Google Sign-In works with production client ID
- [ ] Release build tested on real device
- [ ] All features work with production backend

### Google OAuth
- [ ] Production SHA-1 added to Google Console
- [ ] OAuth consent screen configured
- [ ] App verified (if required for >100 users)

---

## Quick Reference: File Locations

| What | File |
|------|------|
| API Base URL | `src/api/client.ts` line 18 |
| Google Client ID (App) | `src/screens/LoginScreen.tsx` line 22 |
| Backend Environment | `server/.env` |
| Android Signing | `android/gradle.properties` |
| Android Build Config | `android/app/build.gradle` |

---

## Troubleshooting

### "Network Error" on mobile app
- Check if backend URL is correct and accessible
- Ensure HTTPS is working
- Check if phone has internet access

### Google Sign-In fails
- Verify SHA-1 fingerprint matches (debug vs release)
- Check Web Client ID is correct
- Ensure Google Cloud project has OAuth configured

### Database connection fails
- Verify DATABASE_URL is correct
- Check if SSL mode is required (`?sslmode=require`)
- Ensure database allows connections from deployment platform IP

### Build fails on Railway/Render
- Check build logs for specific errors
- Ensure `prisma generate` runs before build
- Verify all environment variables are set
