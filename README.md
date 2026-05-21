# Android TV Digital Signage System

Production-oriented scaffold with isolated applications:

- `mobileApplication` (React Native CLI + TypeScript)
- `webApplication` (Vite React + TypeScript)
- `backend` (Node.js Express + TypeScript + Prisma)

## Setup

1. Copy `.env.example` to `.env` in each app.
2. Install dependencies per app:
   - `cd mobileApplication && npm install`
   - `cd webApplication && npm install`
   - `cd backend && npm install`
3. Run database migration from backend:
   - `cd backend && npx prisma migrate dev`
4. Start services:
   - Backend: `npm run dev`
   - Web dashboard: `npm run dev`
   - TV app: `npm run android`

## Current Scaffold Coverage

- Device registration and pairing endpoints
- Prisma data model for users/devices/content/playlist/heartbeats
- Socket server baseline
- TV boot, offline, pairing, and player screens
- Local cache manager foundation
- Dashboard auth and protected routing baseline

## Next Implementation Phase

- Native MAC address module (Android TV unique ID)
- Media sync checksums + atomic manifest switching
- Full content CRUD + upload pipeline (S3/R2)
- Socket room orchestration and event acks
- Heartbeat scheduler and offline status reconciliation
