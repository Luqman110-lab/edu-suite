# Azure Migration Guide: Broadway Report Card System

This guide details the steps to deploy your application to Microsoft Azure using **Azure Database for PostgreSQL** and **Azure App Service**.

---

## Phase 1: Database Setup (Azure Database for PostgreSQL)

1.  **Log in to Azure Portal** and search for **Azure Database for PostgreSQL**.
2.  Click **Create**.
3.  **Select option**: **Flexible Server** (Recommended for cost/performance balance).
4.  **Basics**:
    *   **Resource Group**: Create new (e.g., `broadway-rg`).
    *   **Server name**: e.g., `broadway-db`.
    *   **Region**: Choose one close to you.
    *   **Authentication**: PostgreSQL authentication only.
    *   **Admin username/password**: *[Save these credentials]*
5.  **Compute + Storage**:
    *   **Burstable (B series)**: Standard_B1ms (Good for low traffic/startups).
6.  **Networking**:
    *   **Public access**: Allowed.
    *   **Firewall rules**: Add your current IP address (to allow migration). Also check **"Allow public access from any Azure service within Azure to this server"** (Critical for App Service to connect).
7.  **Create**.
8.  **Wait** for deployment.
9.  **Copy Server name** (e.g., `broadway-db.postgres.database.azure.com`).

### Migrate Data to Azure
From your local machine terminal:
```bash
# Export local schema and data
pg_dump -U postgres -h localhost -d broadway_db > backup.sql

# Import to Azure (Replace placeholders)
psql -h <SERVER_NAME> -U <ADMIN_USER> -d postgres -f backup.sql
```

---

## Phase 2: Application Containerization

We will use the same `Dockerfile` created earlier.

### Option A: Push to Azure Container Registry (ACR)
1.  **Create a Container Registry** in Azure Portal (Standard SKU).
2.  **Login and Push**:
    ```bash
    az acr login --name <registry-name>
    docker tag broadway-app:latest <registry-name>.azurecr.io/broadway-app:latest
    docker push <registry-name>.azurecr.io/broadway-app:latest
    ```

---

## Phase 3: Deployment (Azure App Service)

1.  **Search for App Services** -> **Create**.
2.  **Basics**:
    *   **Resource Group**: `broadway-rg`.
    *   **Name**: `broadway-app`.
    *   **Publish**: **Docker Container**.
    *   **OS**: Linux.
    *   **Region**: Same as database.
    *   **Plan**: **Basic B1** (Production) or **F1** (Free, if available/compatible).
3.  **Docker**:
    *   **Image Source**: Azure Container Registry (or Docker Hub if you pushed there).
    *   Select your image and tag.
4.  **Review + Create**.

---

## Phase 4: Configuration

1.  Go to your new **App Service Resource**.
2.  **Settings** -> **Environment variables**.
3.  Add the following:
    *   `DATABASE_URL`: `postgres://<ADMIN_USER>:<PASSWORD>@<SERVER_NAME>:5432/postgres`
    *   `NODE_ENV`: `production`
    *   `SESSION_SECRET`: *[Random long string]*
    *   `WEBSITES_PORT`: `5000` (Tells Azure which port your container listens on).
4.  **Save**. The app will restart.

---

## Phase 5: Final Verification

1.  Click the **Default Domain** link (e.g., `https://broadway-app.azurewebsites.net`).
2.  Verify the application loads and can access the database.
