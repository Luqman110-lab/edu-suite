# Deploying to Koyeb

Koyeb is a developer-friendly serverless platform that makes deploying applications easy. This guide will walk you through deploying your Broadway Report Card System.

## Prerequisites

1.  **Koyeb Account**: Sign up at [koyeb.com](https://www.koyeb.com/).
2.  **GitHub Repository**: Ensure your code is pushed to a GitHub repository.
3.  **Database**: You need a PostgreSQL database. You can use Koyeb's managed PostgreSQL or an external provider (Allocated, Neon, Supabase, etc.).

## Step 1: Prepare Your Application

Your application is already configured for deployment:
- **Dockerfile**: Included in the root directory.
- **Port**: The app listens on port `5000` (or the `PORT` env var).
- **Database**: The app uses `DATABASE_URL` for connection.

## Step 2: Create a Database (if you don't have one)

1.  Log in to the Koyeb control panel.
2.  Go to the **Database** tab.
3.  Click **Create Database**.
4.  Choose a name (e.g., `broadway-db`) and region.
5.  Click **Create Database**.
6.  **Copy the Connection String**. You will need this later as your `DATABASE_URL`.
    - It looks like: `postgres://koyeb-adm:password@ep-random. region.koyeb.app/koyebdb?sslmode=require`

## Step 3: Deploy the Application

1.  Go to the **Overview** or **Apps** tab on Koyeb.
2.  Click **Create App** (or "Deploy").
3.  Select **GitHub** as the deployment method.
4.  Select your repository: `broadway-report-card-system`.
5.  **Builder**: Koyeb should automatically detect the `Dockerfile`. If asked, select **Dockerfile**.
    - If it asks for the Dockerfile path, it is simply `Dockerfile`.
6.  **Environment Variables**:
    - Click **Add Variable**.
    - Key: `DATABASE_URL`
    - Value: Paste your database connection string from Step 2.
    - Key: `NODE_ENV`
    - Value: `production`
    - Key: `SESSION_SECRET` (if used)
    - Value: A long random string.
7.  **Instance Size**: Select **Eco** or **Micro** (Free tier is available).
8.  **Regions**: Choose the region closest to your users (e.g., Washington, D.C. or Frankfurt).
9.  **App Name**: Give your app a name (e.g., `broadway-grading`).
10. Click **Deploy**.

## Step 4: Verification

1.  Wait for the build and deployment to complete. You can view the logs in the **Deployment** tab.
2.  Once "Healthy", click the **Public URL** (e.g., `https://broadway-grading.koyeb.app`).
3.  Verify that the login page loads.
4.  Log in and check that data is loading from the database.

## Troubleshooting

- **Build Failures**: Check the "Build Logs" tab. If `npm run build` fails, fix the errors locally first.
- **Runtime Errors**: Check the "Runtime Logs" tab. Look for "Connection refused" (database issue) or "Crash" (code issue).
- **500 Errors**: Ensure `DATABASE_URL` is correct and the database is accessible.
