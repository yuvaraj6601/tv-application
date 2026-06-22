# TV Application Workspace

## Projects

| Dir | Role | Stack |
|-----|------|-------|
| `webApplication/` | React Web dashboard (admin) | React 19, Vite, TypeScript, Redux Toolkit, React Router v7, SCSS, Socket.IO |
| `mobileApplication/` | React Native TV client | React Native 0.81, TypeScript, Redux Toolkit, React Navigation v7, Socket.IO |
| `backend/` | REST API + WebSocket gateway | Express 5, TypeScript, Prisma (MySQL), JWT, Socket.IO, Multer |

## System Overview

A digital signage platform. The admin web dashboard lets operators pair, monitor, and manage TV devices and their playlist content. Each physical TV runs the React Native app, which pairs via a 4-digit code, then receives and plays a media playlist via WebSocket sync.

**API base**: `http://localhost:8080/api/v1`  
**Auth**: JWT — login returns token, web client stores in Redux (`auth.token`), TV client stores in Redux (`device.deviceToken`), both sent as `Authorization: Bearer <token>`.

## Shared Conventions

- All REST endpoints versioned under `/api/v1/`
- Response shape: `{ status: boolean, data?, message? }`
- Pagination: `{ page, limit }` → `{ data, total, page, limit }`
- API calls go directly inside the component/screen via the service layer — never raw axios in components
- WebSocket rooms: `device:<deviceId>` for TV devices, `admin:devices` for admin dashboard
- DB: MySQL via Prisma. Entities: `User`, `Device`, `Content`, `PlaylistItem`, `DeviceHeartbeat`

## Dev Ports

- Backend: `8080`
- Web dashboard (Vite): `5173`
- Mobile: Metro bundler

---

## Mandatory Development Workflow

### 1 — Analyze
Read all files that will change. Identify affected routes, Redux slices, components/screens, and API contracts.

### 2 — Plan
State what will change. For new features: go to TDD Cycle. For bug fixes: write a failing test first.

### 3 — Implement
One logical unit at a time. Never rewrite whole files.

### 4 — Tests Pass
Every test must be green before moving on. Never delete failing tests.

### 5 — Validate
`npx tsc --noEmit` + `npm test` for the affected project. Zero failures required.

### 6 — Fix
Resolve every type error, lint error, test failure.

### 7 — Re-Validate
Run validation commands again after fixes.

### 8 — Review
Re-read the diff. Check for: stale closures, missing error/loading states, unbounded DB queries, API contract drift.

---

## Completion Criteria

- [ ] Loading and error state handled for every async operation
- [ ] No raw axios in components — always via service layer
- [ ] No hardcoded URLs, secrets, or strings
- [ ] All interfaces defined — no inline object types
- [ ] Response shape matches conventions above
- [ ] `npx tsc --noEmit` passes in all three projects

---

## Debugging Guide

1. Reproduce — confirm the exact failure before touching code
2. Isolate — find the smallest unit that exhibits the bug
3. Read the actual error — stack trace and response body in full
4. Check the boundary first — auth middleware, Redux selector, axios interceptor
5. Verify data shape — log actual vs expected
6. Fix the root cause — never suppress symptoms
