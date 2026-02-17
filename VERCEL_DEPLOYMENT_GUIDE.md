# Vercel Deployment Guide for WedHabesha

## Prerequisites
- GitHub account with your repository
- Vercel account (sign up at https://vercel.com)
- Your backend API deployed separately (see Backend Deployment section)

## Frontend Deployment to Vercel

### Option 1: Deploy via Vercel Dashboard (Recommended)

1. **Go to Vercel Dashboard**
   - Visit https://vercel.com/dashboard
   - Click "Add New..." → "Project"

2. **Import Your GitHub Repository**
   - Click "Import Git Repository"
   - Select your `wedhabesha` repository
   - Click "Import"

3. **Configure Project Settings**
   ```
   Framework Preset: Vite
   Root Directory: ./
   Build Command: cd frontend && npm install && npm run build
   Output Directory: frontend/dist
   Install Command: cd frontend && npm install
   ```

4. **Add Environment Variables**
   Click "Environment Variables" and add:
   ```
   VITE_API_BASE_URL=https://your-backend-api.com
   VITE_FIREBASE_API_KEY=your_firebase_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
   VITE_FIREBASE_PROJECT_ID=your_firebase_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_firebase_messaging_sender_id
   VITE_FIREBASE_APP_ID=your_firebase_app_id
   ```

5. **Deploy**
   - Click "Deploy"
   - Wait for the build to complete (usually 2-3 minutes)
   - Your site will be live at `https://your-project.vercel.app`

### Option 2: Deploy via Vercel CLI

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel**
   ```bash
   vercel login
   ```

3. **Deploy from Project Root**
   ```bash
   vercel
   ```

4. **Follow the prompts:**
   - Set up and deploy? Yes
   - Which scope? Select your account
   - Link to existing project? No (first time) or Yes (subsequent deploys)
   - What's your project's name? wedhabesha
   - In which directory is your code located? ./
   - Want to override the settings? Yes
   - Build Command: `cd frontend && npm install && npm run build`
   - Output Directory: `frontend/dist`
   - Development Command: `cd frontend && npm run dev`

5. **Deploy to Production**
   ```bash
   vercel --prod
   ```

## Backend Deployment Options

Your Node.js backend (`backend-node`) needs to be deployed separately. Here are your options:

### Option 1: Railway (Recommended for Node.js)

1. **Sign up at https://railway.app**
2. **Create New Project** → "Deploy from GitHub repo"
3. **Select your repository**
4. **Configure:**
   - Root Directory: `backend-node`
   - Start Command: `node server.js`
   - Add all environment variables from `backend-node/.env`

### Option 2: Render

1. **Sign up at https://render.com**
2. **New Web Service** → Connect GitHub
3. **Configure:**
   - Root Directory: `backend-node`
   - Build Command: `npm install`
   - Start Command: `node server.js`
   - Add environment variables

### Option 3: Heroku

1. **Install Heroku CLI**
   ```bash
   npm install -g heroku
   ```

2. **Login and Create App**
   ```bash
   heroku login
   heroku create wedhabesha-api
   ```

3. **Add Procfile in backend-node/**
   ```
   web: node server.js
   ```

4. **Deploy**
   ```bash
   git subtree push --prefix backend-node heroku main
   ```

### Option 4: DigitalOcean App Platform

1. **Sign up at https://www.digitalocean.com**
2. **Create App** → GitHub
3. **Configure:**
   - Source Directory: `backend-node`
   - Run Command: `node server.js`

## Environment Variables Setup

### Frontend (.env in frontend/)
```env
VITE_API_BASE_URL=https://your-backend-api.com
VITE_FIREBASE_API_KEY=your_key
VITE_FIREBASE_AUTH_DOMAIN=your_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

### Backend (.env in backend-node/)
```env
PORT=8000
NODE_ENV=production
DATABASE_URL=your_database_url
JWT_SECRET=your_jwt_secret
JWT_ALGORITHM=HS256
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_PRIVATE_KEY=your_private_key
FIREBASE_CLIENT_EMAIL=your_client_email
AFROSMS_API_KEY=your_sms_api_key
AFROSMS_SENDER_ID=your_sender_id
REDIS_URL=your_redis_url
ALLOWED_ORIGINS=https://your-frontend.vercel.app
```

## Post-Deployment Steps

1. **Update CORS Settings**
   - Add your Vercel domain to `ALLOWED_ORIGINS` in backend
   - Redeploy backend

2. **Test the Deployment**
   - Visit your Vercel URL
   - Test login/registration
   - Test API connectivity
   - Check browser console for errors

3. **Set Up Custom Domain (Optional)**
   - Go to Vercel Dashboard → Your Project → Settings → Domains
   - Add your custom domain
   - Update DNS records as instructed

4. **Enable Analytics (Optional)**
   - Vercel Dashboard → Your Project → Analytics
   - Enable Web Analytics

## Continuous Deployment

Once set up, Vercel automatically deploys:
- **Production**: Every push to `main` branch
- **Preview**: Every pull request

## Troubleshooting

### Build Fails
- Check build logs in Vercel dashboard
- Verify all dependencies are in `package.json`
- Ensure environment variables are set

### API Connection Issues
- Verify `VITE_API_BASE_URL` is correct
- Check CORS settings in backend
- Ensure backend is running

### 404 Errors on Refresh
- Already configured in `vercel.json` with rewrites
- All routes redirect to `index.html` for client-side routing

### Environment Variables Not Working
- Must start with `VITE_` for Vite
- Redeploy after adding new variables
- Check they're set in Vercel dashboard

## Useful Commands

```bash
# Deploy to preview
vercel

# Deploy to production
vercel --prod

# View deployment logs
vercel logs

# List deployments
vercel ls

# Remove deployment
vercel rm [deployment-url]

# Pull environment variables
vercel env pull
```

## Monitoring

- **Vercel Dashboard**: Monitor deployments, analytics, and logs
- **Vercel Analytics**: Track page views and performance
- **Error Tracking**: Consider adding Sentry for error monitoring

## Cost

- **Vercel Free Tier**: 
  - 100 GB bandwidth/month
  - Unlimited deployments
  - Perfect for this project

- **Backend Hosting**:
  - Railway: $5/month (500 hours)
  - Render: Free tier available
  - Heroku: $7/month (Eco Dynos)

## Support

- Vercel Docs: https://vercel.com/docs
- Vercel Community: https://github.com/vercel/vercel/discussions
- Railway Docs: https://docs.railway.app

---

**Ready to Deploy!** 🚀

Your project is configured and ready for Vercel deployment. Follow Option 1 for the easiest deployment experience.
