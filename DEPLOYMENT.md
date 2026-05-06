# NatureGo Deployment Guide

## Overview

This guide covers deploying the NatureGo e-commerce platform to production using free tier services.

**Stack:**

- Frontend: Vercel (Next.js)
- Backend: Railway (Node.js/NestJS)
- Database: Railway (PostgreSQL)

---

## Architecture

```
┌─────────────────┐         ┌─────────────────────┐         ┌─────────────────┐
│                 │         │                     │         │                 │
│   Vercel        │────────▶│   Railway           │────────▶│   PostgreSQL    │
│   (Frontend)    │         │   (Backend API)     │         │   (Database)    │
│                 │         │                     │         │                 │
│   .vercel.app   │         │   .up.railway.app   │         │   Railway       │
│                 │         │                     │         │                 │
└─────────────────┘         └─────────────────────┘         └─────────────────┘
       │                              │
       │                              │
       └──────────────────────────────┘
              HTTPS (Automatic)
```

---

## Prerequisites

- GitHub account
- Railway account (railway.dev)
- Vercel account (vercel.com)

---

## Step 1: Push Code to GitHub

```bash
# Initialize git if not already
git init
git add .
git commit -m "Initial commit"

# Create repository on GitHub, then
git remote add origin https://github.com/YOUR_USERNAME/naturego.git
git push -u origin main
```

---

## Step 2: Deploy Backend on Railway

### 2.1 Create Railway Project

1. Go to [railway.dev](https://railway.dev) and sign in with GitHub
2. Click **"New Project"** → **"Deploy from GitHub repo"**
3. Select your `naturego` repository
4. Railway will detect it's a Node.js project

### 2.2 Add PostgreSQL Database

1. In your Railway project, click **"Add a Service"** → **"Database"** → **"PostgreSQL"**
2. Railway will provision a free PostgreSQL database
3. Wait for the database to be ready (green status)

### 2.3 Configure Environment Variables

In Railway, go to your backend service → **Variables** tab. Add:

```env
# Database (auto-populated when you link PostgreSQL)
DATABASE_URL=postgresql://user:password@host:5432/dbname

# Application
NODE_ENV=production
PORT=3001

# JWT (generate a secure random string)
JWT_SECRET=your-very-secure-secret-key-here-min-32-chars

# CORS (your Vercel frontend URL)
FRONTEND_URL=https://your-app.vercel.app

# ShipRocket (optional - for live order sync)
SHIPROCKET_EMAIL=your-email
SHIPROCKET_PASSWORD=your-password
SHIPROCKET_CHANNEL_ID=your-channel-id
```

### 2.4 Set Start Command

Go to **Settings** → **Start Command**, set:

```bash
npm run start:prod
```

### 2.5 Deploy

1. Click **"Deploy"** or push to main branch
2. Wait for deployment to complete
3. Note your backend URL: `https://naturego-backend.up.railway.app`

### 2.6 Run Database Migrations

In Railway terminal (or use a one-off deployment):

```bash
npx prisma migrate deploy
```

Or let Railway auto-run on deploy by adding to the start command:

```bash
npx prisma migrate deploy && npm run start:prod
```

---

## Step 3: Deploy Frontend on Vercel

### 3.1 Create Vercel Project

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click **"Add New"** → **"Project"**
3. Import your `naturego` repository
4. Select the `frontend` folder as the root directory

### 3.2 Configure Environment Variables

Under **Environment Variables**, add:

```env
NEXT_PUBLIC_API_URL=https://your-backend-url.up.railway.app/api
```

Replace `your-backend-url` with your actual Railway backend URL.

### 3.3 Configure Build Settings

Vercel auto-detects Next.js. Verify:

- **Build Command:** `npm run build` (or leave empty)
- **Output Directory:** `.next` (or leave empty)
- **Install Command:** `npm install`

### 3.4 Deploy

Click **"Deploy"**. Vercel will build and deploy your frontend.

Your site will be live at: `https://naturego.vercel.app`

---

## Step 4: Post-Deployment Configuration

### 4.1 Update CORS on Backend

After getting your Vercel URL, update the Railway backend variable:

```
FRONTEND_URL=https://your-app.vercel.app
```

Redeploy the backend for this to take effect.

### 4.2 Custom Domain (Optional)

**Vercel:**

1. Project Settings → Domains
2. Add your custom domain (e.g., `naturego.com`)
3. Update DNS records as instructed

**Railway:**

1. Service Settings → Networking
2. Generate public domain if needed

---

## Environment Variables Reference

### Backend (Railway)

| Variable                | Required | Description                                  |
| ----------------------- | -------- | -------------------------------------------- |
| `DATABASE_URL`          | Yes      | PostgreSQL connection string from Railway    |
| `JWT_SECRET`            | Yes      | Secret for signing JWT tokens (min 32 chars) |
| `PORT`                  | Yes      | Server port (3001)                           |
| `NODE_ENV`              | Yes      | Set to `production`                          |
| `FRONTEND_URL`          | Yes      | Your Vercel frontend URL for CORS            |
| `SHIPROCKET_EMAIL`      | No       | ShipRocket API email                         |
| `SHIPROCKET_PASSWORD`   | No       | ShipRocket API password                      |
| `SHIPROCKET_CHANNEL_ID` | No       | ShipRocket channel ID                        |

### Frontend (Vercel)

| Variable              | Required | Description                  |
| --------------------- | -------- | ---------------------------- |
| `NEXT_PUBLIC_API_URL` | Yes      | Your Railway backend API URL |

---

## Free Tier Limits

### Railway

- **PostgreSQL:** 500MB storage, 1 million row limit
- **Compute:** 500 hours/month (enough for small projects)
- Resources reset monthly

### Vercel

- **Bandwidth:** 100GB/month
- **Serverless Functions:** 10,000 requests/month
- **Build Minutes:** 6,000 minutes/month

---

## Troubleshooting

### CORS Errors

- Ensure `FRONTEND_URL` on Railway matches your Vercel URL exactly
- Include protocol (`https://`) and no trailing slash

### Database Connection Failed

- Check `DATABASE_URL` is correctly set in Railway
- Ensure PostgreSQL service is running (green status)

### Auth Not Working

- Verify `JWT_SECRET` is set and consistent
- Clear browser cookies and try again

### Build Failed on Vercel

- Check build logs for errors
- Ensure all environment variables are set
- Verify `package.json` scripts are correct

---

## Maintenance

### Updating Code

1. Push changes to GitHub
2. Both Vercel and Railway auto-deploy on push to main branch

### Database Migrations

After schema changes:

```bash
# Locally test the migration first
npx prisma migrate dev --name describe_change

# Then deploy to Railway
npx prisma migrate deploy
```

Or add to Railway start command:

```bash
npx prisma migrate deploy && npm run start:prod
```

### Monitoring

- **Railway:** Dashboard shows logs, metrics, and resource usage
- **Vercel:** Dashboard shows build logs, function logs, and analytics

---

## Quick Commands

```bash
# Generate JWT secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Check Prisma status
npx prisma status

# Generate Prisma client
npx prisma generate

# Push schema to database (without migration)
npx prisma db push
```

---

## URLs (Update After Deployment)

```
Frontend (Vercel):    https://naturego.vercel.app
Backend API (Railway): https://xxxxx.up.railway.app/api
PostgreSQL (Railway):  (internal connection only)
```

---

Last Updated: April 2026
