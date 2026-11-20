# Deployment Guide

## 1. Prerequisites
- Node.js >= 18 (Node.js 20+ recommended)
- PostgreSQL >= 14 or MySQL >= 8.0
- Redis >= 6.0 (for session caching and rate limits)

## 2. Environment Configuration
Ensure `.env` contains:
```env
PORT=3000
DATABASE_TYPE=postgres
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=postgres
DATABASE_PASSWORD=your_password
DATABASE_NAME=templatecraft
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
JWT_SECRET=your_jwt_secret
```

## 3. Database Migration & Setup
Run the setup script:
```bash
cd backend
npm run db:setup
```
This runs `dataSource.runMigrations()` through TypeORM and applies all registered migrations.

## 4. Production Process Management
Using PM2:
```bash
# Start backend
pm2 start src/server.js --name "templatecraft-api" -i max

# Build and serve frontend
cd ../frontend
npm run build
# Serve dist via Nginx or Cloudflare Pages
```
