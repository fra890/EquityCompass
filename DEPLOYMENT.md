# EquityCompass - Deployment Guide

This application has been successfully migrated from Firebase to Supabase and is ready for deployment.

## What Was Done

1. **Database Migration**: Migrated from localStorage to Supabase PostgreSQL database with proper schema and Row Level Security (RLS)
2. **Authentication**: Replaced Firebase Auth with Supabase Auth (email/password)
3. **Dependencies**: Removed Firebase dependencies and added Supabase JS client
4. **Build**: Successfully compiled and ready for production

## Database Schema

The following tables have been created in Supabase:
- `clients` - Stores client information for financial advisors
- `grants` - Stores equity grants (RSUs and ISOs) for each client
- `planned_exercises` - Stores planned ISO exercise scenarios

All tables have Row Level Security enabled to ensure data isolation between advisors.

## Environment Variables

The application uses the following environment variables (already configured in `.env`):
- `VITE_SUPABASE_URL` - Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Your Supabase anonymous key
- `VITE_OPENAI_API_KEY` - Your OpenAI API key (for document parsing)

## Deployment Options

### Option 1: Netlify (Configured & Ready)

The project includes a pre-configured `netlify.toml` file. To deploy:

1. **Push to Git** (if not already done):
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin YOUR_GIT_REPO_URL
   git push -u origin main
   ```

2. **Deploy to Netlify**:
   - Go to [Netlify](https://app.netlify.com)
   - Click "Add new site" → "Import an existing project"
   - Connect your Git repository
   - Netlify will auto-detect the settings from `netlify.toml`

3. **Configure Environment Variables** in Netlify dashboard (Site settings → Environment variables):
   - `VITE_SUPABASE_URL` = `https://poxrqssaujfvtpgqoxxm.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBveHJxc3NhdWpmdnRwZ3FveHhtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUzNzQ1NTAsImV4cCI6MjA4MDk1MDU1MH0.HlzpgFp-xwlF3Ux5mQpSktrbN0gN89uQs1bDdO3kpPw`
   - `VITE_OPENAI_API_KEY` = `YOUR_OPENAI_KEY`

4. **Deploy!** Netlify will automatically build and deploy your site.

**Build Configuration** (already set in `netlify.toml`):
- Base directory: `equity-comp`
- Build command: `npm install && npm run build`
- Publish directory: `dist`
- SPA redirect configured for React Router

### Option 2: Vercel

1. Push your code to a Git repository (GitHub, GitLab, or Bitbucket)
2. Go to [Vercel](https://vercel.com) and import your repository
3. Configure build settings:
   - Root directory: `equity-comp`
   - Build command: `npm run build`
   - Output directory: `dist`
4. Add environment variables in Vercel dashboard:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_OPENAI_API_KEY`
5. Deploy!

Vercel will automatically detect Vite and configure the build settings.

### Option 3: Manual Build

1. Build the application:
   ```bash
   npm run build
   ```

2. The production files will be in the `dist` folder

3. Deploy the `dist` folder to any static hosting service (AWS S3, Cloudflare Pages, etc.)

## First Time Setup

After deploying, you'll need to:

1. Create an advisor account by clicking "Register" on the login page
2. Sign in with your credentials
3. Start adding clients and their equity grants

## Features

- **Client Management**: Add and manage multiple clients with their tax profiles
- **Grant Tracking**: Track RSUs and ISOs with automatic vesting calculations
- **Document Upload**: Upload and parse equity grant documents (PDF/Excel) using AI
- **ISO Planning**: Model different exercise scenarios to optimize tax outcomes
- **Vesting Calendar**: View all upcoming vesting events across all clients
- **Tax Calculations**: Automatic calculation of federal, state, NIIT, and AMT implications
- **Stock Price Tracking**: Automatic fetching of current stock prices for public companies

## Security

- All data is stored in Supabase with Row Level Security enabled
- Each advisor can only access their own client data
- Passwords are securely hashed using Supabase Auth
- API keys are kept secure and never exposed to the client

## Support

For issues or questions, please contact your development team.
