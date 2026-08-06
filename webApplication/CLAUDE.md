@~/.claude/skills/react.md

# TV Application — Web Dashboard (Admin)

## Architecture

```
src/
  app/
    app.router.tsx          # React Router v7 routes + protected route guard
  screens/
    auth/login/             # login.screen.tsx + login.screen.scss
    devices/list/           # devices.screen.tsx + devices.screen.scss
    devices/detail/         # device-detail.screen.tsx + device-detail.screen.scss
  services/                 # API + socket layer (named *.service.ts — maps to models/ in skill)
    auth.service.ts
    device.service.ts
    content.service.ts
    socket.service.ts
  store/
    store.ts                # dashboardStore (NOT index.ts)
    slices/
      auth.slice.ts         # token, email
      devices.slice.ts      # list of devices
  utils/
    axios.utils.ts          # dashboardAxios instance with request interceptor
    functions.utils.ts      # pure helpers: isValidMacAddress, formatWatchTime
  constants/
    strings.constant.ts
  imports/
    assets.imports.ts
  interfaces/
    pi-analytics.interface.ts  # DeviceAnalyticsModel, PiAnalyticsVisitorModel
  adapters/
  themes/
  __tests__/
    setup.ts
    functions.utils.test.ts
```

> Note: This project uses `services/` instead of `models/` for the API layer. The pattern is identical — one file per resource, all calls via `dashboardAxios`. Treat `services/*.service.ts` as equivalent to `models/*.model.ts` from the skill.

## Key Utilities

- **`dashboardAxios`** (`src/utils/axios.utils.ts`) — shared axios instance; reads token from Redux store (`dashboardStore.getState().auth.token`) and injects as `Authorization: Bearer <token>`.
- **`dashboardStore`** (`src/store/store.ts`) — Redux store; slices: `auth`, `devices`.
- **`useDispatch` / `useSelector`** — use the standard hooks from `react-redux`; typed against `RootState` and `AppDispatch` from `src/store/store.ts`.

## Redux Store

```typescript
// src/store/store.ts
export const dashboardStore = configureStore({
  reducer: { auth: authReducer, devices: devicesReducer }
});
export type RootState = ReturnType<typeof dashboardStore.getState>;
export type AppDispatch = typeof dashboardStore.dispatch;
```

Slices:
- `auth` — `{ token: string | null, email: string | null }`
- `devices` — `{ list: Device[] }`

## API / Service Pattern

All API calls live in `src/services/`. Use `dashboardAxios` from `src/utils/axios.utils.ts`. Call service methods inline inside the component wrapped in try/catch.

```typescript
// src/services/auth.service.ts
import { dashboardAxios } from '../utils/axios.utils';
import { LoginPayload, LoginResponse } from '../interfaces/auth.interface';

export const authService = {
  login: async (payload: LoginPayload): Promise<LoginResponse> => {
    const response = await dashboardAxios.post<{ status: boolean; data: LoginResponse }>('/api/v1/auth/login', payload);
    return response.data.data;
  }
};
```

## Navigation / Routing

React Router v7 with `<BrowserRouter>` in `main.tsx`.

- `/login` → `LoginScreen` (public)
- `/devices` → `DevicesScreen` (protected)
- `/devices/:deviceId` → `DeviceDetailScreen` (protected) — now also shows a `pi_id` (Raspberry Pi MAC address) input and a visitor-analytics section (unique visitors, total watch time, per-visitor table), fetched via `deviceService.getAnalytics(deviceId)`; empty-state prompt shown when no `piId` is set yet

Guard: `ProtectedRoutes` reads `state.auth.token`; redirects to `/login` if null.

## Screen Scaffold

```typescript
// src/screens/example/example.screen.tsx
import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../store/store';
import './example.screen.scss';

export const ExampleScreen = (): React.JSX.Element => {
  const dispatch = useDispatch();
  const [state, setState] = useState({ loading: false, error: '' });

  return (
    <section className="example-screen">
      {/* content */}
    </section>
  );
};
```

## State Pattern

ALWAYS consolidate all local state into a single `useState` object:

```typescript
const [state, setState] = useState({ loading: false, error: '', data: [] });
setState(prev => ({ ...prev, loading: true }));
```

NEVER declare separate `useState` calls per field.

## Styling

- SCSS with BEM naming per screen/component — no inline styles, no Tailwind
- Colors via CSS custom properties (design tokens) defined in `src/index.css`
- Class format: `.devices-screen`, `.devices-screen__header`, `.device-card--online`

## API Response Shape

```typescript
{ status: boolean, data?: T, message?: string }
```

Note: backend uses `status: boolean` (not `'success' | 'failed'`). Always read `response.data.data` for the payload.

## Socket Pattern

`socket.service.ts` exports `dashboardSocketService` — singleton with `connect(token)` and `disconnect()`. Connect in `useEffect` after token is available; clean up listeners on unmount.

## Validation Commands

```bash
npx tsc --noEmit        # type check (alias: npm run typecheck)
npm test                # Vitest — src/__tests__/**/*.test.ts (pure logic only)
npm run dev             # dev server on :5173
npm run build           # production build
```
