@~/.claude/skills/node.md

# TV Application — Backend API

## Architecture

```
route → controller → service → database (Prisma)
```

```
src/
  index.ts              # entry point — HTTP server + Socket.IO + schedulers
  app.ts                # Express app — middleware + routes
  db.ts                 # Prisma singleton (prisma client) — main spatiabox_db
  db-pi-analytics.ts    # Prisma singleton (piAnalyticsPrisma) — read-only pythonServer DB, generated client at src/generated/pi-analytics-client (gitignored)
  routes/v1/
    router.ts           # mounts auth, device, content routes
    auth.route.ts
    device.route.ts
    content.route.ts
  controllers/
    auth.controller.ts
    device.controller.ts
    content.controller.ts
  services/
    device.service.ts       # includes updatePiId(userId, deviceId, piId) -> string | null
    content.service.ts
    pairing.service.ts
    storage.service.ts
    admin-bootstrap.service.ts
    pi-analytics.service.ts # getAnalytics(deviceId) -> PiAnalyticsResponse | null; reads the pythonServer DB via db-pi-analytics.ts, scoped by the device's piId
  middleware/
    auth.middleware.ts        # authMiddleware, requireRole, requireAdminDeviceAccess
    validation.middleware.ts
    upload.middleware.ts      # multer
    error.middleware.ts
    rate-limit.middleware.ts
  validations/
    auth.validation.ts
    device.validation.ts
    content.validation.ts
  helpers/
    jwt.helper.ts             # jwtHelper.sign / jwtHelper.verify
    password.helper.ts
  socket/
    socket.gateway.ts         # Socket.IO event handlers
  schedulers/
    device-status.scheduler.ts
  interfaces/
```

## Database

MySQL via Prisma v6. DB instance is the `prisma` singleton from `src/db.ts` — never call `new PrismaClient()` inline.

Key models: `User`, `Device` (now has optional unique `piId` — Raspberry Pi MAC address, links to the pythonServer analytics DB), `Content`, `PlaylistItem`, `DeviceHeartbeat`.

A second, read-only Prisma schema (`prisma/pi-analytics.schema.prisma`, client at `src/db-pi-analytics.ts`) points at the pythonServer's MySQL DB (`PI_ANALYTICS_DATABASE_URL`) and mirrors `pythonServer/src/db/models.py` exactly (`Visitor`, `Session`, `SyncLog` → tables `visitors`/`sessions`/`sync_log`). Migrations for that DB are owned by `pythonServer/alembic` — never run `prisma migrate` against it from here; `prisma:push:pi-analytics` is dev/test-only convenience for local schema sync.

Device status enum: `ONLINE | OFFLINE`.  
Content type enum: `IMAGE | VIDEO | WEBPAGE`.

ALWAYS use `select` to project only needed fields. ALWAYS add `take`/`skip` for list queries. NEVER fetch unbounded result sets.

## Auth

JWT only. Two roles: `ADMIN` (web dashboard) and `DEVICE` (TV client).

```typescript
// Token payload
{ sub: string, role: 'ADMIN' | 'DEVICE' }
```

`jwtHelper.sign(payload)` / `jwtHelper.verify(token)` — reads `JWT_ACCESS_SECRET` from env. Tokens are signed without an expiry (no `expiresIn`) — they remain valid until the secret is rotated.

Middleware:
- `authMiddleware` — attaches `req.auth` to every request
- `requireRole(['ADMIN'])` — role guard
- `requireAdminDeviceAccess('deviceId')` — verifies the admin owns the device

## Response Shape

```typescript
{ status: boolean, data?: T, message?: string }
```

Note: this project uses `status: boolean` (true/false), not the `'success' | 'failed'` string pattern from the skill. Use the project's existing shape on all new endpoints.

HTTP codes: 200 success, 201 created, 400 bad request, 401 unauthorized, 403 forbidden, 404 not found, 409 conflict, 500 server error.

## Validation

Joi schemas in `src/validations/`. Use `validationMiddleware` from `src/middleware/validation.middleware.ts` to apply schemas in routes.

`devicePiIdUpdateValidation` accepts either a MAC address or the literal `LOCAL_DEV_PI_ID` ('local-dev-test', exported from `device.validation.ts`) — matches the Python server's local-dev `PI_ID` default so a device can be linked to a locally-running dev instance without a real Pi.

## Key Helpers

- `jwtHelper` — sign / verify JWT tokens
- `passwordHelper` — hash and compare passwords (bcrypt)

## Socket / WebSocket

Socket.IO gateway in `src/socket/socket.gateway.ts`. Rooms:
- `device:<deviceId>` — per-device room for TV clients
- `admin:devices` — admin dashboard room

Auth is enforced at the `io.use()` middleware level in `src/index.ts` using `jwtHelper.verify`.

## Environment Variables

```
PORT=8080
JWT_ACCESS_SECRET=
SOCKET_CORS_ORIGIN=
DATABASE_URL=mysql://...
PI_ANALYTICS_DATABASE_URL=mysql://...   # read-only, pythonServer's DB — see prisma/pi-analytics.schema.prisma
```

NEVER hardcode any of these. Validate all required vars at startup.

## Validation Commands

```bash
npx tsc --noEmit       # type check
npm test               # Jest + Supertest — __test__/**/*.test.ts, run against a real local test DB
npm run dev            # ts-node-dev dev server on :8080
npm run build          # tsc compile
npm run prisma:migrate # run Prisma migrations (main spatiabox_db schema)
npm run prisma:generate
npm run prisma:generate:pi-analytics # regenerate the pi-analytics client after schema changes
npm run prisma:push:pi-analytics     # dev/test-only: sync local pi-analytics DB to the schema (never in production — Python/Alembic owns that DB)
```

## ⚠️ Known Issues

- **Prisma v6.14.0** is installed, but the project skill (`node.md`) mandates Prisma v5.x. Downgrade is required before relying on the skill's Prisma guidance. Current codebase works with v6 — do not upgrade further without testing.
- **Express v5.1.0** — breaking changes from v4. Route handlers now require explicit `Promise` rejection handling. The existing `errorMiddleware` covers this for most cases.
- The `auth.controller.ts` currently queries Prisma directly instead of delegating to a service — this violates the `route → controller → service → DB` rule. Extract DB calls to an `auth.service.ts` when refactoring.
