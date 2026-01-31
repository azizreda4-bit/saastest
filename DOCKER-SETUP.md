# Docker Installation Guide for Windows

## Option 1: Docker Desktop (Recommended)

1. **Download Docker Desktop for Windows:**
   - Go to: https://www.docker.com/products/docker-desktop/
   - Click "Download for Windows"
   - Run the installer

2. **System Requirements:**
   - Windows 10 64-bit: Pro, Enterprise, or Education (Build 19041 or higher)
   - OR Windows 11 64-bit: Home or Pro version 21H2 or higher
   - WSL 2 feature enabled
   - Virtualization enabled in BIOS

3. **Installation Steps:**
   - Run the Docker Desktop Installer.exe
   - Follow the installation wizard
   - Restart your computer when prompted
   - Start Docker Desktop from the Start menu

4. **Verify Installation:**
   ```powershell
   docker --version
   docker-compose --version
   ```

## Option 2: Alternative Local Setup (No Docker)

If you prefer not to install Docker, you can run the services locally:

### Prerequisites:
- Node.js 18+ (https://nodejs.org/)
- PostgreSQL 15+ (https://www.postgresql.org/download/windows/)
- Redis (https://redis.io/docs/getting-started/installation/install-redis-on-windows/)

### Setup Steps:
1. Install PostgreSQL and create database
2. Install Redis
3. Install Node.js dependencies
4. Run services manually

See LOCAL-SETUP.md for detailed instructions.

## Quick Test After Docker Installation

Once Docker is installed, test the setup:

```powershell
# Start core services
docker-compose up -d postgres redis

# Check if services are running
docker-compose ps

# Run database migrations
docker-compose run --rm api npm run migrate

# Start all services
docker-compose up -d

# Check application
# Frontend: http://localhost:3001
# API: http://localhost:3000
# API Docs: http://localhost:3000/api-docs
```

## Troubleshooting

### Common Issues:

1. **WSL 2 not enabled:**
   ```powershell
   # Run as Administrator
   dism.exe /online /enable-feature /featurename:Microsoft-Windows-Subsystem-Linux /all /norestart
   dism.exe /online /enable-feature /featurename:VirtualMachinePlatform /all /norestart
   # Restart computer
   wsl --set-default-version 2
   ```

2. **Virtualization not enabled:**
   - Enable in BIOS/UEFI settings
   - Look for "Intel VT-x" or "AMD-V" options

3. **Docker Desktop won't start:**
   - Check Windows features: Hyper-V, WSL 2
   - Restart Docker Desktop service
   - Check Docker Desktop logs

### Alternative: Use Docker without Docker Desktop

If Docker Desktop doesn't work, you can use Docker Engine with WSL 2:

1. Install WSL 2 Ubuntu
2. Install Docker Engine in WSL 2
3. Use from Windows PowerShell with WSL integration

## Next Steps

After Docker is installed and working:

1. Run the quick-start script: `./scripts/quick-start.sh`
2. Create admin user: `node scripts/create-admin.js`
3. Access the application at http://localhost:3001