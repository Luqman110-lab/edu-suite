# AWS Migration Guide: Broadway Report Card System

This guide details the steps to deploy your application to AWS using **Amazon RDS** (Database) and **AWS App Runner** (Application Hosting).

---

## Phase 1: Database Setup (Amazon RDS)

1.  **Log in to AWS Console** and search for **RDS**.
2.  Click **Create database**.
3.  **Choose a database creation method**: Standard create.
4.  **Engine options**: PostgreSQL.
5.  **Templates**: Free tier (if eligible) or Production.
6.  **Settings**:
    *   **DB Instance Identifier**: e.g., `broadway-db`
    *   **Master username**: `postgres`
    *   **Master password**: *[Choose a strong password and save it]*
7.  **Instance configuration**: `db.t3.micro` or `db.t4g.micro` (Low cost).
8.  **Connectivity**:
    *   **Public access**: **No** (Recommended for security) or **Yes** (Easier for initial migration from your local machine).
    *   *Note*: If you choose "No", you will need a VPN or EC2 jump host to migrate data. For simplicity in this guide, you might choose **Yes** initially to import data, then switch to **No**, but ensure your **VPC Security Group** only allows your IP address.
9.  **Create database**.
10. **Wait** for status to become "Available".
11. **Copy the Endpoint URL** (e.g., `broadway-db.abc1234.us-east-1.rds.amazonaws.com`).

### Migrate Data to RDS
From your local machine terminal:
```bash
# Export local schema and data
pg_dump -U postgres -h localhost -d broadway_db > backup.sql

# Import to RDS (Replace placeholders)
psql -h <RDS_ENDPOINT> -U postgres -d postgres -f backup.sql
```

---

## Phase 2: Application Containerization

I have already added the `Dockerfile` to your project. This file tells AWS how to build and run your app.

1.  **Verify locally** (Optional but recommended):
    ```bash
    docker build -t broadway-app .
    docker run -p 5000:5000 broadway-app
    ```
    Access `http://localhost:5000` to confirm it works.

---

## Phase 3: Deployment (AWS App Runner)

App Runner is the easiest way to run the container.

### Option A: Deploy via GitHub (Recommended)
1.  Push your code (including the new `Dockerfile`) to GitHub.
2.  Go to **AWS App Runner** console -> **Create service**.
3.  **Source**: "Source code repository".
4.  **Connect to GitHub** and select your repository & branch (`main`).
5.  **Deployment settings**: Automatic.
6.  **Build settings**:
    *   **Configuration file**: `Configure all settings here`.
    *   **Runtime**: **Node.js 18** (or similar, but since we have a Dockerfile, choose 'Container').
    *   *Correction*: Select **"Source directory"** if using a specific runtime, BUT for Dockerfile support, usually, you push the *Image* to ECR.
    *   **Easiest Path**: Link **GitHub** -> **App Runner** will ask to build using the configuration.
    *   *Actually, App Runner builds from code using managed runtimes OR runs a pre-built image.*
    *   **Pivot**: Since we have a custom `Dockerfile` (multi-stage), the best path is **GitHub Actions -> ECR -> App Runner** OR **App Runner supports building from source** but primarily for standard runtimes.
    *   **Simpler Path for YOU**: Use **AWS Copilot** (CLI) or **Push Image to ECR**.

    **Let's stick to the "Image" approach for reliability:**
    1.  Create a repo in **Amazon ECR** (Elastic Container Registry) named `broadway-app`.
    2.  Follow the "View push commands" in ECR to build and push your Docker image from your local machine.
        ```bash
        aws ecr get-login-password --region <region> | docker login --username AWS --password-stdin <account-id>.dkr.ecr.<region>.amazonaws.com
        docker build -t broadway-app .
        docker tag broadway-app:latest <account-id>.dkr.ecr.<region>.amazonaws.com/broadway-app:latest
        docker push <account-id>.dkr.ecr.<region>.amazonaws.com/broadway-app:latest
        ```

3.  **Back to App Runner**:
    *   Source: **Amazon ECR**.
    *   Image URI: Select the image you just pushed.
    *   **Deployment settings**: Automatic (deploy new image pushes).

4.  **Service Configuration**:
    *   **Port**: `5000`.
    *   **Environment Variables**: Add these!
        *   `DATABASE_URL`: `postgres://postgres:<password>@<RDS_ENDPOINT>:5432/postgres`
        *   `NODE_ENV`: `production`
        *   `SESSION_SECRET`: *[Random long string]*

5.  **Create & Deploy**.

---

## Phase 4: Final Steps

1.  **Domain Name**: In App Runner > **Custom domains**, add your domain (e.g., `edusuite.com`) to get automatic SSL.
2.  **DNS**: Update your DNS records (CNAME) as instructed by App Runner.
3.  **Testing**: Visit your new URL. Login and verify data matches your RDS data.
