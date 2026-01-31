# Quick Local Test Setup (SQLite + No Redis)

This is the fastest way to test DeliveryHub locally without installing PostgreSQL or Redis.

## What We'll Use
- ✅ Node.js (already installed)
- ✅ SQLite (no installation needed)
- ❌ Redis (disabled for testing)
- ❌ PostgreSQL (replaced with SQLite)

## Quick Setup Steps

### 1. Install Dependencies
```powershell
# Backend dependencies
cd backend
npm install sqlite3 --save
npm install

# Frontend dependencies  
cd ../frontend
npm install
```

### 2. Update Configuration for SQLite
We'll modify the database configuration to use SQLite instead of PostgreSQL.

### 3. Run Database Setup
```powershell
cd backend
node scripts/migrate-sqlite.js
```

### 4. Create Admin User
```powershell
node scripts/create-admin.js --email=admin@test.com --password=Admin123! --company="Test Company"
```

### 5. Start Services
```powershell
# Terminal 1: Backend
cd backend
npm run dev

# Terminal 2: Frontend  
cd frontend
npm run dev
```

### 6. Access Application
- Frontend: http://localhost:3001
- Backend API: http://localhost:3000
- API Docs: http://localhost:3000/api-docs

## What's Different in Test Mode
- Uses SQLite database file instead of PostgreSQL
- Redis features disabled (no background jobs)
- File-based session storage
- Simplified configuration

## Limitations
- No real-time features (Redis required)
- No background job processing
- Single-user database (SQLite)
- No advanced caching

This setup is perfect for:
- Testing the UI and basic functionality
- API development and testing
- Demo purposes
- Development without complex setup

For production features, you'll need the full PostgreSQL + Redis setup.