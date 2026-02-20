# Vercel Deployment Guide

## Quick Deploy

1. **Connect Repository**
   - Go to [Vercel Dashboard](https://vercel.com/new)
   - Import your Git repository
   - Select the repository

2. **Configure Project**
   - **Root Directory**: `apps/web`
   - **Framework Preset**: Next.js (auto-detected)
   - **Build Command**: Auto-configured via `vercel.json`
   - **Output Directory**: `.next` (auto-configured)

3. **Environment Variables**
   Add these in Vercel Dashboard → Settings → Environment Variables:
   
   ```
   NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
   ```

4. **Deploy**
   - Click "Deploy"
   - Vercel will automatically build and deploy

## Configuration

The `apps/web/vercel.json` file includes:
- ✅ Monorepo build command
- ✅ Environment variable references
- ✅ Security headers (X-Frame-Options, CSP, etc.)
- ✅ Framework detection

## Continuous Deployment

Once connected, Vercel automatically:
- Deploys on every push to `main` branch
- Creates preview deployments for pull requests
- Runs build checks before deployment

## Custom Domain

1. Go to Vercel Dashboard → Settings → Domains
2. Add your custom domain
3. Configure DNS records as instructed
4. SSL certificate is automatically provisioned

## Troubleshooting

**Build fails with "Module not found"**:
- Ensure all dependencies are in `apps/web/package.json`
- Check that workspace dependencies are properly linked

**Environment variables not working**:
- Verify variables are prefixed with `NEXT_PUBLIC_`
- Check they're added in Vercel dashboard
- Redeploy after adding new variables

**Monorepo build issues**:
- Ensure root `package.json` has correct workspace configuration
- Verify `vercel.json` build command is correct
