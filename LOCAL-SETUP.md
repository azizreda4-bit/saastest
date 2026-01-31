# Local Development Setup (Without Docker)

This guide helps you run DeliveryHub locally without Docker by installing services directly on Windows.

## Prerequisites Installation

### 1. Node.js Installation
1. Download Node.js 18+ from: https://nodejs.org/
2. Run the installer and follow the setup wizard
3. Verify installation:
   ```powershell
   node --version
   npm --version
   ```

### 2. PostgreSQL Installation
1. Download PostgreSQL 15+ from: https://www.postgresql.org/download/windows/
2. Run the installer:
   - Set password for postgres user: `postgres123`
   - Port: `5432` (default)
   - Remember the installation path
3. Add PostgreSQL to PATH (usually done automatically)
4. Verify installation:
   ```powershell
   psql --version
   ```

### 3. Redis Installation (Windows)
Redis doesn't have official Windows support, but you can use:

**Option A: Redis on WSL 2 (Recommended)**
1. Install WSL 2 Ubuntu
2. In Ubuntu terminal:
   ```bash
   sudo apt update
   sudo apt install redis-server
   sudo service redis-server start
   ```

**Option B: Memurai (Redis-compatible)**
1. Download from: https://www.memurai.com/
2. Install and start the service

**Option C: Skip Redis (Limited functionality)**
- The app will work without Redis but background jobs won't function

## Database Setup

### 1. Create Database
```powershell
# Connect to PostgreSQL
psql -U postgres -h localhost

# In psql prompt:
CREATE DATABASE deliveryhub;
CREATE USER deliveryhub_user WITH PASSWORD 'postgres123';
GRANT ALL PRIVILEGES ON DATABASE deliveryhub TO deliveryhub_user;
\q
```

### 2. Update Environment Variables
Edit `.env` file:
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=deliveryhub
DB_USER=postgres
DB_PASSWORD=postgres123

REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
```

## Application Setup

### 1. Install Backend Dependencies
```powershell
cd backend
npm install
```

### 2. Install Frontend Dependencies
```powershell
cd frontend
npm install
```

### 3. Run Database Migrations
```powershell
cd backend
node scripts/migrate.js
```

### 4. Create Admin User
```powershell
cd scripts
node create-admin.js --email=admin@test.com --password=Admin123! --company="Test Company"
```

## Running the Application

### Start Backend (Terminal 1)
```powershell
cd backend
npm run dev
```
Backend will run on: http://localhost:3000

### Start Frontend (Terminal 2)
```powershell
cd frontend
npm run dev
```
Frontend will run on: http://localhost:3001

### Optional: Start Redis (Terminal 3)
If using WSL Redis:
```bash
wsl
sudo service redis-server start
redis-cli ping  # Should return PONG
```

## Verification

1. **Backend API**: http://localhost:3000/health
2. **API Documentation**: http://localhost:3000/api-docs
3. **Frontend App**: http://localhost:3001
4. **Login**: Use the admin credentials you created

## Development Workflow

### Backend Development
- API runs on port 3000
- Auto-reloads on file changes (nodemon)
- Logs appear in terminal
- Database changes require migration scripts

### Frontend Development
- App runs on port 3001
- Hot reload enabled
- Proxy API calls to backend
- React DevTools available

### Database Management
```powershell
# Connect to database
psql -U postgres -d deliveryhub

# View tables
\dt

# Query data
SELECT * FROM tenants;
SELECT * FROM users;
```

## Troubleshooting

### Common Issues

1. **Port already in use:**
   ```powershell
   # Find process using port
   netstat -ano | findstr :3000
   # Kill process
   taskkill /PID <PID> /F
   ```

2. **Database connection failed:**
   - Check PostgreSQL service is running
   - Verify credentials in .env
   - Check firewall settings

3. **Redis connection failed:**
   - Start Redis service
   - Check Redis is listening on port 6379
   - Update REDIS_HOST in .env if needed

4. **Module not found errors:**
   ```powershell
   # Reinstall dependencies
   rm -rf node_modules package-lock.json
   npm install
   ```

### Performance Tips

1. **Use SSD for database**
2. **Increase Node.js memory limit:**
   ```powershell
   set NODE_OPTIONS=--max-old-space-size=4096
   ```
3. **Close unnecessary applications**

## Production Considerations

This local setup is for development only. For production:
- Use Docker or proper server deployment
- Configure proper security settings
- Set up SSL/TLS certificates
- Use production database credentials
- Enable monitoring and logging

## Next Steps

1. Access the application at http://localhost:3001
2. Login with your admin credentials
3. Explore the dashboard and features
4. Check the API documentation at http://localhost:3000/api-docs
5. Start developing or importing your data