# Comprehensive Deployment Guide

This guide provides detailed, step-by-step instructions for deploying the Let's Connect platform in both development (Docker Compose) and production (Kubernetes) environments.

## Table of Contents

1. [Overview](#overview)
2. [Installing Prerequisites](#installing-prerequisites)
3. [Docker Compose Deployment (Development)](#docker-compose-deployment-development)
4. [Kubernetes Deployment (Production)](#kubernetes-deployment-production)
5. [Troubleshooting](#troubleshooting)
6. [FAQ](#faq)

---

## Overview

Let's Connect is a microservices-based social platform with the following architecture:

**Services:**
- **API Gateway** (Port 8000): Main entry point, routes requests to microservices
- **User Service** (Port 8001): Authentication, profiles, OAuth, pages
- **Content Service** (Port 8002): Posts, feeds, videos, blogs
- **Messaging Service** (Port 8003): Chat, real-time messaging, WebRTC calls
- **Collaboration Service** (Port 8004): Documents, wikis, databases
- **Media Service** (Port 8005): File uploads, media gallery, image optimization
- **Shop Service** (Port 8006): E-commerce functionality
- **AI Service** (Port 8007): AI assistant integration
- **Frontend** (Port 3000): React-based web application

**Infrastructure:**
- **PostgreSQL**: Primary database (6 separate databases)
- **Redis**: Caching and real-time features
- **Elasticsearch**: Full-text search
- **MinIO**: S3-compatible object storage

---

## Installing Prerequisites

This section provides detailed instructions for installing all the tools you need to deploy Let's Connect. Choose the appropriate section based on your operating system.

### 1. Installing Git

Git is required for cloning the repository and version control.

#### Linux (Ubuntu/Debian)

```bash
# Update package index
sudo apt update

# Install Git
sudo apt install git -y

# Verify installation
git --version
# Expected: git version 2.x.x or higher
```

#### Linux (CentOS/RHEL/Fedora)

```bash
# Install Git
sudo dnf install git -y
# or for older versions: sudo yum install git -y

# Verify installation
git --version
```

#### macOS

```bash
# Option 1: Install via Homebrew (recommended)
# First install Homebrew if not already installed
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install Git
brew install git

# Option 2: Install Xcode Command Line Tools (includes Git)
xcode-select --install

# Verify installation
git --version
```

#### Windows

1. **Download Git for Windows**: Visit https://git-scm.com/download/win
2. **Run the installer** and follow the installation wizard
3. **Use default settings** (recommended for beginners)
4. **Verify installation**: Open Command Prompt or PowerShell and run:
   ```bash
   git --version
   ```

### 2. Installing Docker

Docker is required for both Docker Compose (development) and Kubernetes (production) deployments.

#### Linux (Ubuntu/Debian)

```bash
# Remove old versions
sudo apt remove docker docker-engine docker.io containerd runc

# Update package index
sudo apt update

# Install prerequisites
sudo apt install -y \
    apt-transport-https \
    ca-certificates \
    curl \
    gnupg \
    lsb-release

# Add Docker's official GPG key
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# Set up the repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker Engine
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Verify installation
docker --version
docker compose version

# Add your user to the docker group (to run docker without sudo)
sudo usermod -aG docker $USER

# Log out and log back in for group changes to take effect
# Or run: newgrp docker
```

#### Linux (CentOS/RHEL/Fedora)

```bash
# Remove old versions
sudo dnf remove docker \
    docker-client \
    docker-client-latest \
    docker-common \
    docker-latest \
    docker-latest-logrotate \
    docker-logrotate \
    docker-engine

# Install Docker using the official repository
sudo dnf install -y dnf-plugins-core
sudo dnf config-manager --add-repo https://download.docker.com/linux/fedora/docker-ce.repo

# Install Docker Engine
sudo dnf install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Start and enable Docker
sudo systemctl start docker
sudo systemctl enable docker

# Verify installation
docker --version
docker compose version

# Add your user to the docker group
sudo usermod -aG docker $USER
```

#### macOS

```bash
# Option 1: Install Docker Desktop (Recommended)
# 1. Visit https://www.docker.com/products/docker-desktop
# 2. Download Docker Desktop for Mac
# 3. Install by dragging Docker to Applications folder
# 4. Launch Docker Desktop from Applications
# 5. Wait for Docker to start (whale icon in menu bar)

# Option 2: Install via Homebrew
brew install --cask docker

# Verify installation
docker --version
docker compose version
```

**Note for macOS:** Docker Desktop for Mac includes Docker Engine, Docker CLI, Docker Compose, and Kubernetes.

#### Windows

**Option 1: Docker Desktop (Recommended)**

1. **System Requirements:**
   - Windows 10/11 Pro, Enterprise, or Education (64-bit)
   - Enable Hyper-V and Containers Windows features
   - OR use WSL 2 (Windows Subsystem for Linux)

2. **Install WSL 2 (Recommended):**
   ```powershell
   # Run in PowerShell as Administrator
   wsl --install
   
   # Restart your computer
   
   # Set WSL 2 as default
   wsl --set-default-version 2
   ```

3. **Install Docker Desktop:**
   - Download from: https://www.docker.com/products/docker-desktop
   - Run the installer
   - Choose "Use WSL 2 instead of Hyper-V" option
   - Restart when prompted

4. **Verify installation:**
   ```powershell
   docker --version
   docker compose version
   ```

### 3. Installing Docker Compose (Standalone)

**Note:** If you installed Docker Desktop or recent Docker Engine versions, Docker Compose is already included. Skip this section unless using an older Docker installation.

#### Linux (Standalone Docker Compose)

```bash
# Download the latest version
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose

# Make it executable
sudo chmod +x /usr/local/bin/docker-compose

# Create symbolic link (optional, for 'docker-compose' command)
sudo ln -s /usr/local/bin/docker-compose /usr/bin/docker-compose

# Verify installation
docker-compose --version
```

### 4. Installing Kubernetes Tools

Kubernetes tools are required for production deployments.

#### Installing kubectl (Kubernetes CLI)

**Linux:**

```bash
# Download the latest release
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"

# Validate the binary (optional)
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl.sha256"
echo "$(cat kubectl.sha256)  kubectl" | sha256sum --check

# Install kubectl
sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl

# Verify installation
kubectl version --client
```

**macOS:**

```bash
# Using Homebrew
brew install kubectl

# Or using curl
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/darwin/amd64/kubectl"
chmod +x ./kubectl
sudo mv ./kubectl /usr/local/bin/kubectl

# Verify installation
kubectl version --client
```

**Windows:**

```powershell
# Using Chocolatey
choco install kubernetes-cli

# Or download directly from:
# https://dl.k8s.io/release/v1.28.0/bin/windows/amd64/kubectl.exe
# Add the binary to your PATH

# Verify installation
kubectl version --client
```

#### Installing Minikube (Local Kubernetes Cluster)

Minikube is useful for testing Kubernetes deployments locally.

**Linux:**

```bash
# Download and install
curl -LO https://storage.googleapis.com/minikube/releases/latest/minikube-linux-amd64
sudo install minikube-linux-amd64 /usr/local/bin/minikube

# Start minikube
minikube start --driver=docker

# Verify installation
kubectl get nodes
minikube status
```

**macOS:**

```bash
# Using Homebrew
brew install minikube

# Start minikube
minikube start

# Verify installation
kubectl get nodes
minikube status
```

**Windows:**

```powershell
# Using Chocolatey
choco install minikube

# Or download the installer from:
# https://minikube.sigs.k8s.io/docs/start/

# Start minikube (use PowerShell as Administrator)
minikube start --driver=hyperv
# Or with Docker Desktop:
minikube start --driver=docker

# Verify installation
kubectl get nodes
minikube status
```

#### Installing Helm (Optional but Recommended)

Helm is a package manager for Kubernetes that simplifies deployments.

**Linux:**

```bash
# Using script
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash

# Verify installation
helm version
```

**macOS:**

```bash
# Using Homebrew
brew install helm

# Verify installation
helm version
```

**Windows:**

```powershell
# Using Chocolatey
choco install kubernetes-helm

# Verify installation
helm version
```

### 5. Additional Useful Tools

#### Installing Make (Optional)

Make is useful for running build scripts.

**Linux:**
```bash
# Ubuntu/Debian
sudo apt install build-essential -y

# CentOS/RHEL/Fedora
sudo dnf groupinstall "Development Tools" -y
```

**macOS:**
```bash
# Included in Xcode Command Line Tools
xcode-select --install
```

**Windows:**
```powershell
# Using Chocolatey
choco install make
```

#### Installing curl and wget

**Linux:**
```bash
# Ubuntu/Debian
sudo apt install curl wget -y

# CentOS/RHEL/Fedora
sudo dnf install curl wget -y
```

**macOS:**
```bash
# Usually pre-installed, if not:
brew install curl wget
```

**Windows:**
```powershell
# curl is included in Windows 10+
# For wget:
choco install wget
```

### 6. Post-Installation Verification

After installing all prerequisites, verify everything is working:

```bash
# Check Git
git --version
# Expected: git version 2.x.x or higher

# Check Docker
docker --version
# Expected: Docker version 20.10.x or higher

# Check Docker Compose
docker compose version
# Expected: Docker Compose version v2.x.x or higher

# Check Docker is running
docker ps
# Expected: Empty list or existing containers

# Check kubectl (if installed)
kubectl version --client
# Expected: Client Version information

# Check Helm (if installed)
helm version
# Expected: version.BuildInfo information
```

**Test Docker Installation:**

```bash
# Run a test container
docker run hello-world

# Expected output:
# "Hello from Docker!"
# "This message shows that your installation appears to be working correctly."
```

### System Requirements Summary

For successful deployment, ensure your system meets these requirements:

**For Docker Compose (Development):**
- **RAM**: 8GB minimum (16GB recommended)
- **CPU**: 4 cores minimum
- **Disk Space**: 30GB free space
- **OS**: Linux, macOS, or Windows with WSL2
- **Docker**: Version 20.10 or higher
- **Docker Compose**: Version 2.0 or higher

**For Kubernetes (Production):**
- **RAM**: 16GB minimum (32GB+ recommended)
- **CPU**: 8 cores minimum
- **Disk Space**: 100GB free space
- **Kubernetes**: Version 1.20 or higher
- **kubectl**: Latest stable version
- **Container Registry Access**: Docker Hub, AWS ECR, GCR, or private registry

### Troubleshooting Installation Issues

#### Docker Permission Denied

```bash
# If you get "permission denied" errors:
sudo usermod -aG docker $USER
newgrp docker
# Or log out and log back in
```

#### Docker Daemon Not Running

```bash
# Linux
sudo systemctl start docker
sudo systemctl enable docker

# Check status
sudo systemctl status docker
```

#### WSL 2 Issues (Windows)

```powershell
# Update WSL
wsl --update

# Check WSL version
wsl --list --verbose

# Convert distro to WSL 2 if needed
wsl --set-version Ubuntu 2
```

#### kubectl Connection Issues

```bash
# Check cluster connection
kubectl cluster-info

# Check configuration
kubectl config view

# For minikube
minikube status
minikube start
```

---

## Docker Compose Deployment (Development)

Docker Compose is ideal for local development, testing, and small-scale deployments.

### Prerequisites

Before starting, ensure you have:

- **Docker**: Version 20.10 or higher
- **Docker Compose**: Version 2.0 or higher
- **System Requirements**:
  - 8GB RAM minimum (16GB recommended)
  - 4 CPU cores minimum
  - 30GB free disk space
  - Linux, macOS, or Windows with WSL2

**Verify Installation:**

```bash
docker --version
# Expected output: Docker version 20.10.0 or higher

docker compose version
# Expected output: Docker Compose version v2.0.0 or higher
```

### Step 1: Clone the Repository

```bash
# Clone the repository
git clone https://github.com/mufthakherul/Let-s-connect.git
cd Let-s-connect

# Verify directory structure
ls -la
# You should see: docker-compose.yml, services/, frontend/, k8s/, etc.
```

### Step 2: Configure Environment Variables

```bash
# Copy the example environment file
cp .env.example .env

# Edit the .env file with your preferred editor
nano .env
# or
vim .env
# or
code .env
```

**Critical Configuration (Required):**

```bash
# ==================== JWT & SECURITY ====================
# IMPORTANT: Change these in production!
JWT_SECRET=generate-a-strong-random-secret-key-here
ENCRYPTION_KEY=another-strong-random-encryption-key

# Generate secure random keys using:
# openssl rand -base64 32
```

**Optional Services Configuration:**

```bash
# ==================== AI SERVICE (Optional) ====================
# Get your API key from: https://platform.openai.com/api-keys
OPENAI_API_KEY=sk-your-openai-api-key-here

# ==================== MAILGUN EMAIL (Optional) ====================
# Get credentials from: https://app.mailgun.com/app/account/security/api_keys
MAILGUN_API_KEY=key-your-mailgun-api-key
MAILGUN_DOMAIN=sandbox.mailgun.org
EMAIL_FROM=noreply@sandbox.mailgun.org

# ==================== GOOGLE OAUTH (Optional) ====================
# Get from: https://console.cloud.google.com/apis/credentials
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:8001/oauth/google/callback

# ==================== GITHUB OAUTH (Optional) ====================
# Get from: https://github.com/settings/developers
GITHUB_CLIENT_ID=your-github-oauth-app-id
GITHUB_CLIENT_SECRET=your-github-oauth-secret
GITHUB_REDIRECT_URI=http://localhost:8001/oauth/github/callback
```

**Database & Storage (Defaults work for development):**

```bash
# ==================== DATABASE ====================
DATABASE_USER=postgres
DATABASE_PASSWORD=postgres
POSTGRES_MULTIPLE_DATABASES=users,content,messages,collaboration,media,shop

# ==================== REDIS ====================
REDIS_URL=redis://redis:6379

# ==================== OBJECT STORAGE ====================
S3_BUCKET=lets-connect-media
S3_ENDPOINT=http://minio:9000
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=minioadmin

# ==================== ELASTICSEARCH ====================
ELASTICSEARCH_URL=http://elasticsearch:9200

# ==================== FRONTEND ====================
# IMPORTANT: This is used at build time for the React app
# Use localhost for local development so the browser can access the API
REACT_APP_API_URL=http://localhost:8000
```

**⚠️ Important Note about REACT_APP_API_URL:**
- The frontend React app is built at Docker image build time
- `REACT_APP_API_URL` must be accessible from your browser, not just from inside Docker
- For local development, use `http://localhost:8000`
- For production, use your public API URL (e.g., `https://api.yourdomain.com`)
- If you change this value, you must rebuild the frontend: `docker compose build frontend`

### Step 3: Initialize Database Script

The database initialization script is already included. Verify it exists:

```bash
# Check the init script
cat scripts/init-databases.sh
```

This script automatically creates all required databases when PostgreSQL starts.

### Step 4: Build and Start Services

```bash
# Build all Docker images (first time or after code changes)
docker compose build

# Start all services in detached mode
docker compose up -d

# Watch the startup logs
docker compose logs -f
```

**Expected Output:**
```
✔ Network lets-connect_lets-connect-network    Created
✔ Container lets-connect-postgres-1            Started
✔ Container lets-connect-redis-1               Started
✔ Container lets-connect-elasticsearch-1       Started
✔ Container lets-connect-minio-1               Started
✔ Container lets-connect-user-service-1        Started
✔ Container lets-connect-content-service-1     Started
✔ Container lets-connect-messaging-service-1   Started
✔ Container lets-connect-collaboration-service-1 Started
✔ Container lets-connect-media-service-1       Started
✔ Container lets-connect-shop-service-1        Started
✔ Container lets-connect-ai-service-1          Started
✔ Container lets-connect-api-gateway-1         Started
✔ Container lets-connect-frontend-1            Started
```

### Step 5: Verify Services are Running

```bash
# Check status of all containers
docker compose ps

# All services should show "Up" status
# Example output:
# NAME                                    STATUS
# lets-connect-api-gateway-1              Up
# lets-connect-user-service-1             Up
# lets-connect-postgres-1                 Up
# ...
```

**Health Check for Individual Services:**

```bash
# Check API Gateway
curl http://localhost:8000/health
# Expected: {"status":"ok"}

# Check User Service
curl http://localhost:8001/health
# Expected: {"status":"ok"}

# Check Frontend
curl http://localhost:3000
# Expected: HTML content
```

### Step 6: Initialize MinIO Storage

MinIO requires manual bucket creation on first run:

```bash
# Option 1: Using MinIO Web Console
# 1. Open http://localhost:9001 in your browser
# 2. Login with: minioadmin / minioadmin
# 3. Click "Buckets" → "Create Bucket"
# 4. Name: lets-connect-media
# 5. Click "Create Bucket"
# 6. Click on the bucket → "Manage" → "Access Policy" → Set to "Public"

# Option 2: Using MinIO Client (mc)
docker run --rm -it --network lets-connect_lets-connect-network \
  --entrypoint=/bin/sh minio/mc -c "
  mc alias set myminio http://minio:9000 minioadmin minioadmin && \
  mc mb myminio/lets-connect-media && \
  mc anonymous set public myminio/lets-connect-media
"
```

### Step 7: Access the Application

**Main Access Points:**

- **Frontend Application**: http://localhost:3000
- **API Gateway**: http://localhost:8000
- **MinIO Console**: http://localhost:9001 (minioadmin / minioadmin)
- **Elasticsearch**: http://localhost:9200

**Service Endpoints:**

- User Service: http://localhost:8001
- Content Service: http://localhost:8002
- Messaging Service: http://localhost:8003
- Collaboration Service: http://localhost:8004
- Media Service: http://localhost:8005
- Shop Service: http://localhost:8006
- AI Service: http://localhost:8007

### Step 8: Create Your First User

```bash
# Register via API
curl -X POST http://localhost:8001/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "username": "admin",
    "password": "SecurePassword123!",
    "fullName": "Admin User"
  }'

# Or use the frontend: http://localhost:3000/register
```

### Development Workflow

#### Viewing Logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f user-service

# Last 100 lines
docker compose logs --tail=100

# Since a specific time
docker compose logs --since=1h
```

#### Restarting Services

```bash
# Restart all services
docker compose restart

# Restart specific service
docker compose restart user-service

# Restart after code changes
docker compose up -d --build user-service
```

#### Accessing Service Shells

```bash
# Access PostgreSQL
docker compose exec postgres psql -U postgres

# List databases
docker compose exec postgres psql -U postgres -c "\l"

# Connect to specific database
docker compose exec postgres psql -U postgres -d users

# Access Redis CLI
docker compose exec redis redis-cli

# Check Redis keys
docker compose exec redis redis-cli KEYS "*"

# Access a service shell
docker compose exec user-service sh

# View service files
docker compose exec user-service ls -la
```

#### Database Management

```bash
# Backup all databases
docker compose exec postgres pg_dumpall -U postgres > backup-$(date +%Y%m%d).sql

# Backup specific database
docker compose exec postgres pg_dump -U postgres users > users-backup.sql

# Restore database
docker compose exec -T postgres psql -U postgres < backup.sql

# Reset all databases (WARNING: Deletes all data!)
docker compose down -v
docker compose up -d
```

#### Scaling Services

```bash
# Scale content service to 3 instances
docker compose up -d --scale content-service=3

# Scale messaging service to 2 instances
docker compose up -d --scale messaging-service=2

# Note: Only stateless services should be scaled
# PostgreSQL, Redis, and MinIO should not be scaled in Docker Compose
```

#### Stopping and Cleaning Up

```bash
# Stop all services (keeps data)
docker compose stop

# Start stopped services
docker compose start

# Stop and remove containers (keeps data)
docker compose down

# Stop, remove containers AND delete all data
docker compose down -v

# Remove unused Docker resources
docker system prune -a
```

### Development Tips

1. **Hot Reload**: For development, mount your code as volumes:
   ```yaml
   # Add to docker-compose.override.yml
   services:
     user-service:
       volumes:
         - ./services/user-service:/app
   ```

2. **Debug Mode**: Set environment variables for debugging:
   ```bash
   NODE_ENV=development
   LOG_LEVEL=debug
   ```

3. **Network Inspection**:
   ```bash
   # List Docker networks
   docker network ls
   
   # Inspect network
   docker network inspect lets-connect_lets-connect-network
   ```

4. **Resource Monitoring**:
   ```bash
   # Monitor resource usage
   docker stats
   
   # Monitor specific service
   docker stats lets-connect-user-service-1
   ```

### Common Development Issues

#### Port Already in Use

```bash
# Find process using port 3000
lsof -i :3000
# or
netstat -tuln | grep 3000

# Kill the process
kill -9 <PID>

# Or change port in docker-compose.yml
ports:
  - "3001:3000"  # Use 3001 instead
```

#### Service Won't Start

```bash
# Check logs for errors
docker compose logs user-service

# Rebuild the service
docker compose build --no-cache user-service
docker compose up -d user-service

# Check service dependencies
docker compose ps
```

#### Database Connection Errors

```bash
# Verify PostgreSQL is running
docker compose ps postgres

# Test connection
docker compose exec user-service nc -zv postgres 5432

# Check database exists
docker compose exec postgres psql -U postgres -c "\l"

# Recreate databases
docker compose down -v
docker compose up -d
```

#### Out of Disk Space

```bash
# Check Docker disk usage
docker system df

# Clean up unused resources
docker system prune -a --volumes

# Remove old images
docker image prune -a
```

---

## Kubernetes Deployment (Production)

Kubernetes deployment is recommended for production environments, offering scalability, high availability, and advanced orchestration.

### Prerequisites

**Required Tools:**

- **Kubernetes Cluster**: Version 1.20 or higher
  - Managed options: AWS EKS, Google GKE, Azure AKS
  - Self-hosted: kubeadm, k3s, or minikube for testing
- **kubectl**: Kubernetes command-line tool
- **Helm** (optional): Package manager for Kubernetes
- **Docker**: For building images
- **Container Registry**: Docker Hub, AWS ECR, Google GCR, or private registry

**Verify Installation:**

```bash
# Check kubectl
kubectl version --client
# Expected: Client Version: v1.20.0 or higher

# Check cluster connection
kubectl cluster-info
# Expected: Kubernetes control plane is running at https://...

# Check nodes
kubectl get nodes
# Expected: List of nodes with "Ready" status
```

### Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                     Internet                             │
└─────────────────┬───────────────────────────────────────┘
                  │
        ┌─────────▼──────────┐
        │  Ingress Controller │ (Load Balancer + SSL)
        │   (nginx/traefik)   │
        └─────────┬───────────┘
                  │
        ┌─────────▼──────────┐
        │   API Gateway       │ (Port 8000)
        │   (2-10 replicas)   │
        └─────────┬───────────┘
                  │
          ┌───────┴───────────────────────────┐
          │                                   │
    ┌─────▼─────┐                    ┌───────▼────────┐
    │  Backend   │                    │   Frontend     │
    │  Services  │                    │   (React)      │
    │ (2-10 each)│                    │  (2-5 replicas)│
    └─────┬──────┘                    └────────────────┘
          │
    ┌─────┴─────────────────────┐
    │                           │
┌───▼────┐  ┌──────┐  ┌────────▼────┐
│Postgres│  │Redis │  │Elasticsearch│
│ (RDS)  │  │(Cache)  │  (Search)   │
└────────┘  └──────┘  └─────────────┘
```

### Phase 1: Prepare Container Images

#### Step 1: Build Docker Images

```bash
# Navigate to repository
cd Let-s-connect

# Build all service images
docker build -t lets-connect/api-gateway:latest ./services/api-gateway
docker build -t lets-connect/user-service:latest ./services/user-service
docker build -t lets-connect/content-service:latest ./services/content-service
docker build -t lets-connect/messaging-service:latest ./services/messaging-service
docker build -t lets-connect/collaboration-service:latest ./services/collaboration-service
docker build -t lets-connect/media-service:latest ./services/media-service
docker build -t lets-connect/shop-service:latest ./services/shop-service
docker build -t lets-connect/ai-service:latest ./services/ai-service

# Build frontend
docker build -t lets-connect/frontend:latest ./frontend
```

**Build Script for Automation:**

```bash
#!/bin/bash
# build-images.sh

VERSION=${1:-latest}
SERVICES=("api-gateway" "user-service" "content-service" "messaging-service" 
          "collaboration-service" "media-service" "shop-service" "ai-service")

echo "Building images with version: $VERSION"

# Build backend services
for service in "${SERVICES[@]}"; do
  echo "Building $service..."
  docker build -t lets-connect/$service:$VERSION ./services/$service
  if [ $? -ne 0 ]; then
    echo "Failed to build $service"
    exit 1
  fi
done

# Build frontend
echo "Building frontend..."
docker build -t lets-connect/frontend:$VERSION ./frontend

echo "All images built successfully!"
```

```bash
# Make executable and run
chmod +x build-images.sh
./build-images.sh v1.0.0
```

#### Step 2: Push to Container Registry

**Option A: Docker Hub**

```bash
# Login to Docker Hub
docker login

# Tag images with your Docker Hub username
docker tag lets-connect/api-gateway:latest <username>/lets-connect-api-gateway:v1.0.0
docker tag lets-connect/user-service:latest <username>/lets-connect-user-service:v1.0.0
# ... repeat for all services

# Push images
docker push <username>/lets-connect-api-gateway:v1.0.0
docker push <username>/lets-connect-user-service:v1.0.0
# ... repeat for all services
```

**Option B: AWS ECR**

```bash
# Login to ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin \
  <account-id>.dkr.ecr.us-east-1.amazonaws.com

# Create repositories
aws ecr create-repository --repository-name lets-connect/api-gateway
aws ecr create-repository --repository-name lets-connect/user-service
# ... repeat for all services

# Tag and push
docker tag lets-connect/api-gateway:latest \
  <account-id>.dkr.ecr.us-east-1.amazonaws.com/lets-connect/api-gateway:v1.0.0
docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/lets-connect/api-gateway:v1.0.0
# ... repeat for all services
```

**Option C: Google GCR**

```bash
# Configure Docker to use gcloud
gcloud auth configure-docker

# Tag and push
docker tag lets-connect/api-gateway:latest \
  gcr.io/<project-id>/lets-connect-api-gateway:v1.0.0
docker push gcr.io/<project-id>/lets-connect-api-gateway:v1.0.0
# ... repeat for all services
```

### Phase 2: Set Up Kubernetes Cluster

#### Option A: AWS EKS

```bash
# Install eksctl
curl --silent --location "https://github.com/weaveworks/eksctl/releases/latest/download/eksctl_$(uname -s)_amd64.tar.gz" | tar xz -C /tmp
sudo mv /tmp/eksctl /usr/local/bin

# Create cluster
eksctl create cluster \
  --name lets-connect-prod \
  --region us-east-1 \
  --nodegroup-name standard-workers \
  --node-type t3.large \
  --nodes 3 \
  --nodes-min 2 \
  --nodes-max 10 \
  --managed

# Configure kubectl
aws eks update-kubeconfig --region us-east-1 --name lets-connect-prod
```

#### Option B: Google GKE

```bash
# Create cluster
gcloud container clusters create lets-connect-prod \
  --zone us-central1-a \
  --num-nodes 3 \
  --machine-type n1-standard-4 \
  --enable-autoscaling \
  --min-nodes 2 \
  --max-nodes 10

# Get credentials
gcloud container clusters get-credentials lets-connect-prod --zone us-central1-a
```

#### Option C: Azure AKS

```bash
# Create resource group
az group create --name lets-connect-rg --location eastus

# Create cluster
az aks create \
  --resource-group lets-connect-rg \
  --name lets-connect-prod \
  --node-count 3 \
  --node-vm-size Standard_D4s_v3 \
  --enable-addons monitoring \
  --generate-ssh-keys

# Get credentials
az aks get-credentials --resource-group lets-connect-rg --name lets-connect-prod
```

#### Option D: Local Testing (minikube)

```bash
# Start minikube with adequate resources
minikube start --cpus=4 --memory=8192 --driver=docker

# Enable addons
minikube addons enable ingress
minikube addons enable metrics-server
```

### Phase 3: Install Required Components

#### Install Ingress Controller (NGINX)

```bash
# Add Helm repo
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo update

# Install NGINX Ingress Controller
kubectl create namespace ingress-nginx
helm install ingress-nginx ingress-nginx/ingress-nginx \
  --namespace ingress-nginx \
  --set controller.replicaCount=2 \
  --set controller.service.type=LoadBalancer

# Verify installation
kubectl get pods -n ingress-nginx
kubectl get svc -n ingress-nginx
```

#### Install cert-manager (SSL Certificates)

```bash
# Install cert-manager
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml

# Verify installation
kubectl get pods -n cert-manager

# Create ClusterIssuer for Let's Encrypt
cat <<EOF | kubectl apply -f -
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: your-email@example.com
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
    - http01:
        ingress:
          class: nginx
EOF
```

#### Install Metrics Server (for HPA)

```bash
# Install metrics server
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml

# Verify installation
kubectl get deployment metrics-server -n kube-system
```

### Phase 4: Create Kubernetes Namespace

```bash
# Create namespace
kubectl apply -f k8s/namespace.yaml

# Verify
kubectl get namespace lets-connect
```

Content of `k8s/namespace.yaml` (already exists):

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: lets-connect
  labels:
    name: lets-connect
    environment: production
```

### Phase 5: Configure Secrets

Create a file called `k8s/secrets.yaml` (do NOT commit to Git):

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: lets-connect-secrets
  namespace: lets-connect
type: Opaque
stringData:
  # JWT & Security
  JWT_SECRET: "your-super-secret-jwt-key-min-32-chars"
  ENCRYPTION_KEY: "your-encryption-key-min-32-chars"
  
  # Database URLs (use managed database services in production)
  USER_DATABASE_URL: "postgresql://username:password@postgres-host:5432/users"
  CONTENT_DATABASE_URL: "postgresql://username:password@postgres-host:5432/content"
  MESSAGES_DATABASE_URL: "postgresql://username:password@postgres-host:5432/messages"
  COLLABORATION_DATABASE_URL: "postgresql://username:password@postgres-host:5432/collaboration"
  MEDIA_DATABASE_URL: "postgresql://username:password@postgres-host:5432/media"
  SHOP_DATABASE_URL: "postgresql://username:password@postgres-host:5432/shop"
  
  # S3/Storage (use AWS S3 or similar in production)
  S3_ACCESS_KEY: "your-s3-access-key"
  S3_SECRET_KEY: "your-s3-secret-key"
  S3_BUCKET: "lets-connect-media-prod"
  S3_ENDPOINT: "https://s3.amazonaws.com"
  
  # Email Service (Mailgun)
  MAILGUN_API_KEY: "key-your-mailgun-api-key"
  MAILGUN_DOMAIN: "mail.yourdomain.com"
  EMAIL_FROM: "noreply@yourdomain.com"
  
  # OAuth Providers
  GOOGLE_CLIENT_ID: "your-google-client-id.apps.googleusercontent.com"
  GOOGLE_CLIENT_SECRET: "your-google-client-secret"
  GITHUB_CLIENT_ID: "your-github-oauth-app-id"
  GITHUB_CLIENT_SECRET: "your-github-oauth-secret"
  
  # AI Service
  OPENAI_API_KEY: "sk-your-openai-api-key"
```

**Apply the secrets:**

```bash
# Generate strong random secrets
JWT_SECRET=$(openssl rand -base64 32)
ENCRYPTION_KEY=$(openssl rand -base64 32)

# Edit secrets.yaml with your values
nano k8s/secrets.yaml

# Apply secrets
kubectl apply -f k8s/secrets.yaml

# Verify
kubectl get secrets -n lets-connect
```

**Alternative: Use External Secrets Manager**

For production, consider using:
- **AWS Secrets Manager** with External Secrets Operator
- **Google Secret Manager**
- **Azure Key Vault**
- **HashiCorp Vault**

### Phase 6: Deploy Infrastructure Services

#### PostgreSQL Database

For production, use managed database services:
- **AWS RDS for PostgreSQL**
- **Google Cloud SQL for PostgreSQL**
- **Azure Database for PostgreSQL**

**Example: AWS RDS Setup**

```bash
# Create PostgreSQL RDS instance
aws rds create-db-instance \
  --db-instance-identifier lets-connect-db \
  --db-instance-class db.t3.medium \
  --engine postgres \
  --engine-version 15.4 \
  --master-username postgres \
  --master-user-password <your-secure-password> \
  --allocated-storage 100 \
  --storage-type gp3 \
  --backup-retention-period 7 \
  --multi-az \
  --vpc-security-group-ids sg-xxxxx

# Create databases
psql -h lets-connect-db.xxxxx.us-east-1.rds.amazonaws.com \
  -U postgres -c "CREATE DATABASE users;"
psql -h lets-connect-db.xxxxx.us-east-1.rds.amazonaws.com \
  -U postgres -c "CREATE DATABASE content;"
# ... create all 6 databases
```

**For Testing: In-Cluster PostgreSQL**

Create `k8s/postgres.yaml`:

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: postgres-pvc
  namespace: lets-connect
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 50Gi
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
  namespace: lets-connect
spec:
  serviceName: postgres
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
      - name: postgres
        image: postgres:15-alpine
        ports:
        - containerPort: 5432
        env:
        - name: POSTGRES_USER
          value: "postgres"
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: lets-connect-secrets
              key: DATABASE_PASSWORD
        - name: POSTGRES_MULTIPLE_DATABASES
          value: "users,content,messages,collaboration,media,shop"
        - name: PGDATA
          value: /var/lib/postgresql/data/pgdata
        volumeMounts:
        - name: postgres-storage
          mountPath: /var/lib/postgresql/data
        - name: init-script
          mountPath: /docker-entrypoint-initdb.d
      volumes:
      - name: postgres-storage
        persistentVolumeClaim:
          claimName: postgres-pvc
      - name: init-script
        configMap:
          name: postgres-init-script
---
apiVersion: v1
kind: Service
metadata:
  name: postgres
  namespace: lets-connect
spec:
  selector:
    app: postgres
  ports:
  - port: 5432
    targetPort: 5432
  type: ClusterIP
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: postgres-init-script
  namespace: lets-connect
data:
  init-databases.sh: |
    #!/bin/bash
    set -e
    psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
        CREATE DATABASE users;
        CREATE DATABASE content;
        CREATE DATABASE messages;
        CREATE DATABASE collaboration;
        CREATE DATABASE media;
        CREATE DATABASE shop;
    EOSQL
```

Deploy:

```bash
kubectl apply -f k8s/postgres.yaml
kubectl get pods -n lets-connect -l app=postgres
```

#### Redis Cache

For production, use:
- **AWS ElastiCache for Redis**
- **Google Cloud Memorystore**
- **Azure Cache for Redis**

**For Testing: In-Cluster Redis**

Create `k8s/redis.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: redis
  namespace: lets-connect
spec:
  replicas: 1
  selector:
    matchLabels:
      app: redis
  template:
    metadata:
      labels:
        app: redis
    spec:
      containers:
      - name: redis
        image: redis:7-alpine
        ports:
        - containerPort: 6379
        resources:
          requests:
            memory: "256Mi"
            cpu: "100m"
          limits:
            memory: "512Mi"
            cpu: "500m"
---
apiVersion: v1
kind: Service
metadata:
  name: redis
  namespace: lets-connect
spec:
  selector:
    app: redis
  ports:
  - port: 6379
    targetPort: 6379
  type: ClusterIP
```

Deploy:

```bash
kubectl apply -f k8s/redis.yaml
kubectl get pods -n lets-connect -l app=redis
```

#### Elasticsearch

For production, use:
- **AWS OpenSearch Service**
- **Elastic Cloud**
- **Google Cloud Elasticsearch**

**For Testing: In-Cluster Elasticsearch**

> **⚠️ Security Note:** The Elasticsearch configuration below has security disabled for development/testing only. For production, use managed Elasticsearch services (AWS OpenSearch, Elastic Cloud) with proper authentication and authorization enabled.

Create `k8s/elasticsearch.yaml`:

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: elasticsearch-pvc
  namespace: lets-connect
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 30Gi
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: elasticsearch
  namespace: lets-connect
spec:
  serviceName: elasticsearch
  replicas: 1
  selector:
    matchLabels:
      app: elasticsearch
  template:
    metadata:
      labels:
        app: elasticsearch
    spec:
      containers:
      - name: elasticsearch
        image: docker.elastic.co/elasticsearch/elasticsearch:8.10.0
        ports:
        - containerPort: 9200
        - containerPort: 9300
        env:
        - name: discovery.type
          value: "single-node"
        - name: xpack.security.enabled
          value: "false"
        - name: ES_JAVA_OPTS
          value: "-Xms1g -Xmx1g"
        resources:
          requests:
            memory: "2Gi"
            cpu: "500m"
          limits:
            memory: "4Gi"
            cpu: "2000m"
        volumeMounts:
        - name: elasticsearch-storage
          mountPath: /usr/share/elasticsearch/data
      volumes:
      - name: elasticsearch-storage
        persistentVolumeClaim:
          claimName: elasticsearch-pvc
---
apiVersion: v1
kind: Service
metadata:
  name: elasticsearch
  namespace: lets-connect
spec:
  selector:
    app: elasticsearch
  ports:
  - port: 9200
    targetPort: 9200
    name: http
  - port: 9300
    targetPort: 9300
    name: transport
  type: ClusterIP
```

Deploy:

```bash
kubectl apply -f k8s/elasticsearch.yaml
kubectl get pods -n lets-connect -l app=elasticsearch
```

#### MinIO (S3-Compatible Storage)

For production, use:
- **AWS S3**
- **Google Cloud Storage**
- **Azure Blob Storage**

**For Testing: In-Cluster MinIO**

Create `k8s/minio.yaml`:

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: minio-pvc
  namespace: lets-connect
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 100Gi
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: minio
  namespace: lets-connect
spec:
  replicas: 1
  selector:
    matchLabels:
      app: minio
  template:
    metadata:
      labels:
        app: minio
    spec:
      containers:
      - name: minio
        image: minio/minio:latest
        command:
        - /bin/bash
        - -c
        args:
        - minio server /data --console-address :9001
        ports:
        - containerPort: 9000
        - containerPort: 9001
        env:
        - name: MINIO_ROOT_USER
          valueFrom:
            secretKeyRef:
              name: lets-connect-secrets
              key: S3_ACCESS_KEY
        - name: MINIO_ROOT_PASSWORD
          valueFrom:
            secretKeyRef:
              name: lets-connect-secrets
              key: S3_SECRET_KEY
        volumeMounts:
        - name: minio-storage
          mountPath: /data
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "2Gi"
            cpu: "1000m"
      volumes:
      - name: minio-storage
        persistentVolumeClaim:
          claimName: minio-pvc
---
apiVersion: v1
kind: Service
metadata:
  name: minio
  namespace: lets-connect
spec:
  selector:
    app: minio
  ports:
  - port: 9000
    targetPort: 9000
    name: api
  - port: 9001
    targetPort: 9001
    name: console
  type: ClusterIP
```

Deploy:

```bash
kubectl apply -f k8s/minio.yaml
kubectl get pods -n lets-connect -l app=minio
```

### Phase 7: Deploy Application Services

#### Apply ConfigMap

```bash
kubectl apply -f k8s/configmap.yaml
kubectl get configmap -n lets-connect
```

#### Create Missing Service Manifests

The repository includes `user-service.yaml` as a template. Let's create manifests for all other services following the same pattern.

**Create these files in the `k8s/` directory. I'll provide the complete manifests in the next section.**

Files to create:
1. `k8s/api-gateway.yaml`
2. `k8s/content-service.yaml`
3. `k8s/messaging-service.yaml`
4. `k8s/collaboration-service.yaml`
5. `k8s/media-service.yaml`
6. `k8s/shop-service.yaml`
7. `k8s/ai-service.yaml`
8. `k8s/frontend.yaml`

#### Deploy Services in Order

```bash
# 1. Deploy backend microservices first
kubectl apply -f k8s/user-service.yaml
kubectl apply -f k8s/content-service.yaml
kubectl apply -f k8s/messaging-service.yaml
kubectl apply -f k8s/collaboration-service.yaml
kubectl apply -f k8s/media-service.yaml
kubectl apply -f k8s/shop-service.yaml
kubectl apply -f k8s/ai-service.yaml

# 2. Wait for services to be ready
kubectl wait --for=condition=ready pod -l tier=backend -n lets-connect --timeout=300s

# 3. Deploy API Gateway
kubectl apply -f k8s/api-gateway.yaml
kubectl wait --for=condition=ready pod -l app=api-gateway -n lets-connect --timeout=120s

# 4. Deploy Frontend
kubectl apply -f k8s/frontend.yaml
kubectl wait --for=condition=ready pod -l app=frontend -n lets-connect --timeout=120s

# 5. Verify all pods are running
kubectl get pods -n lets-connect
```

Expected output:
```
NAME                                     READY   STATUS    RESTARTS   AGE
user-service-xxxxx-xxxxx                 1/1     Running   0          2m
content-service-xxxxx-xxxxx              1/1     Running   0          2m
messaging-service-xxxxx-xxxxx            1/1     Running   0          2m
...
```

### Phase 8: Configure Ingress and Load Balancing

Update `k8s/ingress.yaml` with your domain:

```bash
# Edit ingress.yaml
nano k8s/ingress.yaml

# Replace api.letsconnect.example.com with your domain
# Example: api.yourdomain.com

# Apply ingress
kubectl apply -f k8s/ingress.yaml

# Get ingress details
kubectl get ingress -n lets-connect
kubectl describe ingress lets-connect-ingress -n lets-connect

# Get external IP
kubectl get svc -n ingress-nginx
```

**Configure DNS:**

Point your domain to the LoadBalancer IP:

```
A    api.yourdomain.com    ->  <LoadBalancer-IP>
A    yourdomain.com        ->  <LoadBalancer-IP>
```

**Verify SSL Certificate:**

```bash
# Check certificate status
kubectl get certificate -n lets-connect

# Watch certificate creation
kubectl describe certificate letsconnect-tls-cert -n lets-connect

# Once ready, test HTTPS
curl https://api.yourdomain.com/health
```

### Phase 9: Deploy Monitoring Stack

```bash
# Deploy Prometheus
kubectl apply -f k8s/prometheus.yaml

# Deploy Grafana
kubectl apply -f k8s/grafana.yaml

# Verify monitoring pods
kubectl get pods -n lets-connect -l app=prometheus
kubectl get pods -n lets-connect -l app=grafana
```

**Access Monitoring:**

```bash
# Port-forward Prometheus
kubectl port-forward svc/prometheus 9090:9090 -n lets-connect &

# Port-forward Grafana
kubectl port-forward svc/grafana 3000:3000 -n lets-connect &

# Access in browser:
# Prometheus: http://localhost:9090
# Grafana: http://localhost:3000 (admin / admin)
```

### Phase 10: Verify Deployment

```bash
# Check all pods
kubectl get pods -n lets-connect -o wide

# Check all services
kubectl get svc -n lets-connect

# Check ingress
kubectl get ingress -n lets-connect

# Check HPA (Horizontal Pod Autoscaler)
kubectl get hpa -n lets-connect

# Test health endpoints
kubectl exec -it deployment/user-service -n lets-connect -- curl localhost:8001/health
kubectl exec -it deployment/api-gateway -n lets-connect -- curl localhost:8000/health

# View logs
kubectl logs -f deployment/user-service -n lets-connect --tail=50
kubectl logs -f deployment/api-gateway -n lets-connect --tail=50
```

### Phase 11: Production Hardening

#### 1. Resource Limits

Ensure all deployments have proper resource limits (already in templates):

```yaml
resources:
  requests:
    memory: "256Mi"
    cpu: "100m"
  limits:
    memory: "512Mi"
    cpu: "500m"
```

#### 2. Pod Disruption Budgets

Create `k8s/pdb.yaml`:

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: user-service-pdb
  namespace: lets-connect
spec:
  minAvailable: 1
  selector:
    matchLabels:
      app: user-service
---
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: api-gateway-pdb
  namespace: lets-connect
spec:
  minAvailable: 1
  selector:
    matchLabels:
      app: api-gateway
# ... repeat for other critical services
```

Apply:

```bash
kubectl apply -f k8s/pdb.yaml
```

#### 3. Network Policies

Create `k8s/network-policy.yaml`:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: backend-network-policy
  namespace: lets-connect
spec:
  podSelector:
    matchLabels:
      tier: backend
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app: api-gateway
    - podSelector:
        matchLabels:
          tier: backend
  egress:
  - to:
    - podSelector:
        matchLabels:
          app: postgres
    - podSelector:
        matchLabels:
          app: redis
    - podSelector:
        matchLabels:
          app: elasticsearch
  - to:
    - namespaceSelector: {}
    ports:
    - protocol: TCP
      port: 53  # DNS
    - protocol: UDP
      port: 53  # DNS
```

Apply:

```bash
kubectl apply -f k8s/network-policy.yaml
```

#### 4. Backup Configuration

Create backup CronJob `k8s/backup-cronjob.yaml`:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: postgres-backup
  namespace: lets-connect
spec:
  schedule: "0 2 * * *"  # Daily at 2 AM
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: postgres-backup
            image: postgres:15-alpine
            command:
            - /bin/sh
            - -c
            - |
              pg_dumpall -h postgres -U postgres > /backup/backup-$(date +%Y%m%d-%H%M%S).sql
              # Upload to S3 or other storage
              # aws s3 cp /backup/backup-*.sql s3://your-backup-bucket/
            env:
            - name: PGPASSWORD
              valueFrom:
                secretKeyRef:
                  name: lets-connect-secrets
                  key: DATABASE_PASSWORD
            volumeMounts:
            - name: backup-storage
              mountPath: /backup
          restartPolicy: OnFailure
          volumes:
          - name: backup-storage
            emptyDir: {}
```

Apply:

```bash
kubectl apply -f k8s/backup-cronjob.yaml
```

### Phase 12: Scaling and Performance

#### Manual Scaling

```bash
# Scale user service to 5 replicas
kubectl scale deployment user-service --replicas=5 -n lets-connect

# Scale multiple services
kubectl scale deployment content-service --replicas=3 -n lets-connect
kubectl scale deployment messaging-service --replicas=3 -n lets-connect
```

#### Auto-Scaling (HPA)

HPA is already configured in each service manifest. Verify:

```bash
# Check HPA status
kubectl get hpa -n lets-connect

# Watch auto-scaling in action
kubectl get hpa -n lets-connect --watch

# Describe HPA for details
kubectl describe hpa user-service-hpa -n lets-connect
```

#### Cluster Auto-Scaling

**AWS EKS:**

```bash
# Enable cluster autoscaler
eksctl create iamserviceaccount \
  --cluster=lets-connect-prod \
  --namespace=kube-system \
  --name=cluster-autoscaler \
  --attach-policy-arn=arn:aws:iam::aws:policy/AutoScalingFullAccess \
  --approve

# Deploy cluster autoscaler
kubectl apply -f https://raw.githubusercontent.com/kubernetes/autoscaler/master/cluster-autoscaler/cloudprovider/aws/examples/cluster-autoscaler-autodiscover.yaml
```

### Phase 13: Monitoring and Observability

#### View Metrics in Prometheus

```bash
# Port-forward
kubectl port-forward svc/prometheus 9090:9090 -n lets-connect

# Open in browser: http://localhost:9090

# Example queries:
# - rate(http_requests_total[5m])
# - node_cpu_usage
# - container_memory_usage_bytes
```

#### Configure Grafana Dashboards

```bash
# Port-forward
kubectl port-forward svc/grafana 3000:3000 -n lets-connect

# Open in browser: http://localhost:3000
# Login: admin / admin

# Import dashboards:
# 1. Click "+" → Import
# 2. Enter dashboard ID:
#    - 315: Kubernetes cluster monitoring
#    - 6417: Kubernetes Deployment
#    - 747: Kubernetes Deployment
```

#### Centralized Logging (Optional)

For production, consider deploying ELK stack or Loki:

```bash
# Install Loki stack with Helm
helm repo add grafana https://grafana.github.io/helm-charts
helm install loki grafana/loki-stack \
  --namespace lets-connect \
  --set grafana.enabled=false \
  --set prometheus.enabled=false
```

### Phase 14: Disaster Recovery

#### Backup Procedures

**Database Backup:**

```bash
# Manual backup
kubectl exec deployment/postgres -n lets-connect -- \
  pg_dumpall -U postgres > backup-$(date +%Y%m%d).sql

# Upload to S3
aws s3 cp backup-$(date +%Y%m%d).sql s3://your-backup-bucket/backups/
```

**Restore Procedures:**

```bash
# Download backup
aws s3 cp s3://your-backup-bucket/backups/backup-20261210.sql .

# Restore
kubectl exec -i deployment/postgres -n lets-connect -- \
  psql -U postgres < backup-20261210.sql
```

#### Disaster Recovery Plan

1. **Regular Backups**: Automated daily backups to external storage
2. **Multi-Region**: Deploy to multiple regions for redundancy
3. **Database Replication**: Use read replicas for high availability
4. **GitOps**: Store all configurations in Git for easy recovery
5. **Monitoring**: Set up alerts for critical issues

### Common Kubernetes Operations

#### Update Deployment

```bash
# Update image version
kubectl set image deployment/user-service \
  user-service=lets-connect/user-service:v1.0.1 \
  -n lets-connect

# Or edit deployment
kubectl edit deployment user-service -n lets-connect

# Rollout status
kubectl rollout status deployment/user-service -n lets-connect

# Rollout history
kubectl rollout history deployment/user-service -n lets-connect

# Rollback to previous version
kubectl rollout undo deployment/user-service -n lets-connect

# Rollback to specific revision
kubectl rollout undo deployment/user-service --to-revision=2 -n lets-connect
```

#### Debug Pods

```bash
# Get pod details
kubectl describe pod <pod-name> -n lets-connect

# View logs
kubectl logs <pod-name> -n lets-connect

# Follow logs
kubectl logs -f <pod-name> -n lets-connect

# Previous container logs (after crash)
kubectl logs <pod-name> --previous -n lets-connect

# Execute commands in pod
kubectl exec -it <pod-name> -n lets-connect -- /bin/sh

# Test connectivity
kubectl exec -it <pod-name> -n lets-connect -- curl http://user-service:8001/health
```

#### Resource Monitoring

```bash
# Pod resource usage
kubectl top pods -n lets-connect

# Node resource usage
kubectl top nodes

# Describe node
kubectl describe node <node-name>
```

---

## Troubleshooting

### Docker Compose Issues

#### Issue: Container keeps restarting

```bash
# Check logs
docker compose logs <service-name>

# Common causes:
# 1. Missing environment variables
# 2. Database not ready
# 3. Port already in use
# 4. Out of memory

# Solution: Check dependencies
docker compose up postgres redis -d
sleep 10
docker compose up -d
```

#### Issue: Cannot connect to database

```bash
# Verify PostgreSQL is running
docker compose ps postgres

# Check connection from service
docker compose exec user-service nc -zv postgres 5432

# Check database exists
docker compose exec postgres psql -U postgres -c "\l"

# Check logs
docker compose logs postgres

# Solution: Ensure init script ran
docker compose down -v
docker compose up -d
```

#### Issue: Port already in use

```bash
# Find process using port
sudo lsof -i :8000
# or
sudo netstat -tulpn | grep 8000

# Kill process
sudo kill -9 <PID>

# Or change port in docker-compose.yml
ports:
  - "8001:8000"  # Map to different host port
```

#### Issue: MinIO bucket not found

```bash
# Access MinIO console
open http://localhost:9001

# Or create bucket via CLI
docker compose exec minio \
  mc alias set myminio http://localhost:9000 minioadmin minioadmin
docker compose exec minio \
  mc mb myminio/lets-connect-media
docker compose exec minio \
  mc anonymous set public myminio/lets-connect-media
```

### Kubernetes Issues

#### Issue: Pod stuck in Pending

```bash
# Check pod events
kubectl describe pod <pod-name> -n lets-connect

# Common causes:
# 1. Insufficient resources
# 2. PVC not bound
# 3. Image pull error
# 4. Node selector mismatch

# Check node resources
kubectl top nodes
kubectl describe nodes

# Check PVC
kubectl get pvc -n lets-connect
```

#### Issue: ImagePullBackOff

```bash
# Check pod events
kubectl describe pod <pod-name> -n lets-connect

# Common causes:
# 1. Image doesn't exist
# 2. Private registry authentication failed
# 3. Image tag wrong

# Solutions:
# 1. Verify image exists
docker images | grep lets-connect

# 2. Create image pull secret for private registry
kubectl create secret docker-registry regcred \
  --docker-server=<registry> \
  --docker-username=<username> \
  --docker-password=<password> \
  -n lets-connect

# 3. Add to deployment
spec:
  template:
    spec:
      imagePullSecrets:
      - name: regcred
```

#### Issue: CrashLoopBackOff

```bash
# Check logs
kubectl logs <pod-name> -n lets-connect
kubectl logs <pod-name> --previous -n lets-connect

# Common causes:
# 1. Application error
# 2. Missing environment variables
# 3. Cannot connect to dependencies

# Check environment
kubectl exec <pod-name> -n lets-connect -- env

# Check secrets
kubectl get secrets -n lets-connect
kubectl describe secret lets-connect-secrets -n lets-connect
```

#### Issue: Service not accessible

```bash
# Check service
kubectl get svc -n lets-connect
kubectl describe svc user-service -n lets-connect

# Check endpoints
kubectl get endpoints user-service -n lets-connect

# Check if pods are ready
kubectl get pods -n lets-connect -l app=user-service

# Test from another pod
kubectl run -it --rm debug --image=alpine --restart=Never -n lets-connect -- sh
# Inside pod:
apk add curl
curl http://user-service:8001/health
```

#### Issue: Ingress not working

```bash
# Check ingress
kubectl get ingress -n lets-connect
kubectl describe ingress lets-connect-ingress -n lets-connect

# Check ingress controller
kubectl get pods -n ingress-nginx

# Check ingress controller logs
kubectl logs -n ingress-nginx deployment/ingress-nginx-controller

# Verify DNS
nslookup api.yourdomain.com

# Test directly from ingress
kubectl exec -it -n ingress-nginx deployment/ingress-nginx-controller -- curl http://api-gateway.lets-connect:8000/health
```

#### Issue: HPA not scaling

```bash
# Check HPA
kubectl get hpa -n lets-connect
kubectl describe hpa user-service-hpa -n lets-connect

# Check metrics server
kubectl get deployment metrics-server -n kube-system
kubectl logs -n kube-system deployment/metrics-server

# Verify metrics available
kubectl top pods -n lets-connect

# Generate load to test
kubectl run -it --rm load-generator --image=busybox --restart=Never -n lets-connect -- sh
# Inside pod:
while true; do wget -q -O- http://user-service:8001/health; done
```

#### Issue: Certificate not issuing

```bash
# Check certificate
kubectl get certificate -n lets-connect
kubectl describe certificate letsconnect-tls-cert -n lets-connect

# Check cert-manager logs
kubectl logs -n cert-manager deployment/cert-manager

# Check certificate request
kubectl get certificaterequest -n lets-connect
kubectl describe certificaterequest <request-name> -n lets-connect

# Check challenge (for Let's Encrypt)
kubectl get challenge -n lets-connect
kubectl describe challenge <challenge-name> -n lets-connect

# Verify DNS is correct
nslookup api.yourdomain.com
```

### Performance Issues

#### High Memory Usage

```bash
# Check pod memory
kubectl top pods -n lets-connect --sort-by=memory

# Check node memory
kubectl top nodes

# Increase memory limits
kubectl edit deployment <service-name> -n lets-connect
# Update:
resources:
  limits:
    memory: "1Gi"  # Increase from 512Mi
```

#### High CPU Usage

```bash
# Check pod CPU
kubectl top pods -n lets-connect --sort-by=cpu

# Scale horizontally
kubectl scale deployment <service-name> --replicas=5 -n lets-connect

# Or adjust HPA thresholds
kubectl edit hpa <service-name>-hpa -n lets-connect
```

#### Database Connection Pool Exhausted

```bash
# Check database connections
kubectl exec deployment/postgres -n lets-connect -- \
  psql -U postgres -c "SELECT count(*) FROM pg_stat_activity;"

# Scale application pods
kubectl scale deployment user-service --replicas=3 -n lets-connect

# Or increase connection pool in application
# Edit configmap or deployment environment
```

---

## FAQ

### General Questions

**Q: Can I run this in production without Kubernetes?**

A: Yes, Docker Compose can be used for small to medium production deployments. Use `docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d` with production overrides.

**Q: What's the minimum server size for Docker Compose?**

A: Minimum 4GB RAM, 2 CPU cores. Recommended: 8GB RAM, 4 CPU cores for better performance.

**Q: What's the minimum Kubernetes cluster size?**

A: 3 nodes with 4GB RAM, 2 CPU cores each. Recommended: 3 nodes with 8GB RAM, 4 CPU cores for production.

**Q: How do I use a custom domain?**

A: Update `k8s/ingress.yaml` with your domain, configure DNS to point to LoadBalancer IP, and let cert-manager handle SSL.

### Security Questions

**Q: How do I secure the deployment?**

A:
1. Change all default passwords and secrets
2. Enable HTTPS with valid certificates
3. Use managed database services (RDS, Cloud SQL)
4. Implement network policies
5. Regular security updates
6. Use secrets manager (not ConfigMaps for sensitive data)

**Q: How do I store secrets securely?**

A: Use external secrets managers:
- AWS Secrets Manager with External Secrets Operator
- HashiCorp Vault
- Google Secret Manager
- Azure Key Vault

### Database Questions

**Q: Should I run PostgreSQL in Kubernetes?**

A: For production, use managed database services (AWS RDS, Google Cloud SQL, Azure Database). Running databases in K8s is complex and risky.

**Q: How do I backup databases?**

A: 
- Docker Compose: `docker compose exec postgres pg_dumpall -U postgres > backup.sql`
- Kubernetes: Use CronJob with pg_dump and upload to S3
- Best: Enable automated backups on managed database service

**Q: How do I migrate data between environments?**

A:
```bash
# Export from source
pg_dump -h source-host -U postgres database_name > export.sql

# Import to target
psql -h target-host -U postgres database_name < export.sql
```

### Scaling Questions

**Q: How do I scale services?**

A: 
- Docker Compose: `docker compose up -d --scale content-service=3`
- Kubernetes: `kubectl scale deployment content-service --replicas=3 -n lets-connect`
- Or let HPA handle it automatically

**Q: Which services should I scale?**

A: Scale stateless services:
- API Gateway
- All backend microservices
- Frontend

Don't scale:
- PostgreSQL (use read replicas instead)
- Redis (use Redis Cluster for scaling)

### Monitoring Questions

**Q: How do I access Grafana?**

A:
```bash
kubectl port-forward svc/grafana 3000:3000 -n lets-connect
# Open http://localhost:3000
# Default: admin / admin
```

**Q: What metrics should I monitor?**

A: Key metrics:
- CPU and memory usage
- Request rate and latency
- Error rates
- Database connection pool
- Pod count and autoscaling events

### Troubleshooting Questions

**Q: Pod is stuck in Pending state**

A: Check:
1. `kubectl describe pod <pod-name>` for events
2. Node resources: `kubectl top nodes`
3. PVC binding: `kubectl get pvc`
4. Resource quotas: `kubectl describe resourcequota`

**Q: Service returns 503 errors**

A: Check:
1. Pods are running: `kubectl get pods`
2. Pods are ready: `kubectl get pods -o wide`
3. Service endpoints: `kubectl get endpoints <service>`
4. Liveness/readiness probes passing
5. Network policies allowing traffic

**Q: How do I roll back a deployment?**

A:
```bash
# View rollout history
kubectl rollout history deployment/<service> -n lets-connect

# Rollback to previous
kubectl rollout undo deployment/<service> -n lets-connect

# Rollback to specific revision
kubectl rollout undo deployment/<service> --to-revision=2 -n lets-connect
```

---

## Next Steps

After successful deployment:

1. **Configure Monitoring Alerts**: Set up Prometheus AlertManager
2. **Set Up CI/CD**: Automate deployments with GitHub Actions, GitLab CI, or Jenkins
3. **Implement GitOps**: Use ArgoCD or Flux for declarative deployments
4. **Performance Testing**: Use k6 or JMeter to load test
5. **Documentation**: Document your specific configuration and procedures
6. **Disaster Recovery**: Test backup and restore procedures
7. **Security Audit**: Run security scans with tools like Trivy or Snyk
8. **Cost Optimization**: Review and optimize resource allocation

## Support

For issues and questions:
- GitHub Issues: https://github.com/mufthakherul/Let-s-connect/issues
- Documentation: See `docs/` directory
- Community: Join our Discord/Slack (if available)

## License

See LICENSE file in the repository.

---

**Last Updated**: February 2026
**Version**: 2.5 (Phase 4 - Scale & Performance)
