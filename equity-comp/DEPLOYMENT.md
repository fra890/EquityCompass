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
- `VITE_SUPABASE_SUPABASE_ANON_KEY` - Your Supabase anonymous key

## Deployment Options

### Option 1: Vercel (Recommended)

1. Push your code to a Git repository (GitHub, GitLab, or Bitbucket)
2. Go to [Vercel](https://vercel.com) and import your repository
3. Configure environment variables in Vercel dashboard:
   - Add `VITE_SUPABASE_URL`
   - Add `VITE_SUPABASE_SUPABASE_ANON_KEY`
4. Deploy!

Vercel will automatically detect Vite and configure the build settings.

### Option 2: Netlify

1. Push your code to a Git repository
2. Go to [Netlify](https://netlify.com) and import your repository
3. Configure build settings:
   - Build command: `npm run build`
   - Publish directory: `dist`
4. Add environment variables in Netlify dashboard
5. Deploy!

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
- **ISO Planning**: Model different exercise scenarios to optimize tax outcomes
- **Vesting Calendar**: View all upcoming vesting events across all clients
- **Tax Calculations**: Automatic calculation of federal, state, NIIT, and AMT implications

## Security

- All data is stored in Supabase with Row Level Security enabled
- Each advisor can only access their own client data
- Passwords are securely hashed using Supabase Auth
- API keys are kept secure and never exposed to the client

## Support

For issues or questions, please contact your development team.
