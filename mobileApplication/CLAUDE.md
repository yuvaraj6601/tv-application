@~/.claude/skills/react-native.md

# TV Application — React Native TV Client

## Architecture

```
src/
  app/
    app.navigator.tsx       # NativeStackNavigator — Boot → Offline → Pairing → Player
    app.provider.tsx        # Redux Provider wrapper
  screens/
    boot/                   # boot.screen.tsx
    offline/                # offline.screen.tsx
    pairing/                # pairing.screen.tsx
    player/                 # player.screen.tsx
  services/                 # API + socket layer (maps to models/ in skill)
    socket.service.ts       # tvSocketService singleton
    sync.service.ts         # content sync
    heartbeat.service.ts    # periodic heartbeat
    pairing.service.ts      # pairing API calls
    local-playlist.service.ts
    device-identifier.service.ts
  store/
    store.ts                # signageStore (NOT index.ts)
    slices/
      app.slice.ts
      device.slice.ts       # pairingCode, deviceToken, deviceId, isPaired
      playlist.slice.ts     # playlist items
  utils/
    axios.utils.ts          # mobileAxios instance
    file.cache.utils.ts
  types/
    app.types.ts
    native-modules.types.ts
    env.types.ts
  constants/
    strings.constant.ts
  imports/
    assets.imports.ts
  interfaces/
  adapters/
```

> Note: This project uses `services/` for the API + business logic layer. Treat as equivalent to `models/` + service utilities from the skill.

## Key Utilities

- **`mobileAxios`** (`src/utils/axios.utils.ts`) — shared axios instance; reads `device.deviceToken` from Redux (`signageStore.getState().device.deviceToken`) and injects as `Authorization: Bearer <token>`.
- **`signageStore`** (`src/store/store.ts`) — Redux store; slices: `app`, `device`, `playlist`.
- **`tvSocketService`** (`src/services/socket.service.ts`) — singleton socket; call `connect(token)` then `emit('joinDeviceRoom', deviceId)`.

## Redux Store

```typescript
// src/store/store.ts
export const signageStore = configureStore({
  reducer: { app: appReducer, device: deviceReducer, playlist: playlistReducer }
});
export type RootState = ReturnType<typeof signageStore.getState>;
export type AppDispatch = typeof signageStore.dispatch;
```

Slices:
- `app` — app-level flags
- `device` — `{ pairingCode, deviceToken, deviceId, isPaired }`
- `playlist` — playlist items array

## Navigation

React Navigation v7 native stack. Route names and params typed via `AppStackParamList`:

```typescript
export type AppStackParamList = {
  Boot: undefined;
  Offline: undefined;
  Pairing: undefined;
  Player: undefined;
};
```

NEVER pass large objects through navigation params. Only pass IDs. Type screen props with `NativeStackScreenProps<AppStackParamList, 'ScreenName'>`.

## Screen Scaffold

```typescript
// src/screens/example/example.screen.tsx
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSelector } from 'react-redux';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppStackParamList } from '../../app/app.navigator';
import { RootState } from '../../store/store';

type Props = NativeStackScreenProps<AppStackParamList, 'Boot'>;

export const ExampleScreen = ({ navigation }: Props): React.JSX.Element => {
  const [state, setState] = useState({ loading: false });

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Example</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  title: { color: '#fff', fontSize: 24 },
});
```

## State Pattern

ALWAYS consolidate all local state into a single `useState` object:

```typescript
const [state, setState] = useState({ loading: false, error: '' });
setState(prev => ({ ...prev, loading: true }));
```

## API / Service Pattern

All API calls in `src/services/`. Use `mobileAxios` from `src/utils/axios.utils.ts`. Call inside the component wrapped in try/catch.

```typescript
// src/services/pairing.service.ts
import { mobileAxios } from '../utils/axios.utils';

export const pairingService = {
  register: async (deviceUniqueId: string): Promise<RegisterResponse> => {
    const res = await mobileAxios.post('/api/v1/devices/register', { deviceUniqueId });
    return res.data.data;
  }
};
```

## Socket Pattern

`tvSocketService` is a singleton. Connect once after `deviceToken` is available, join device room, then listen for `devicePaired`, `contentUpdated`, etc. Clean up listeners on unmount.

## Styling Rules

- `StyleSheet.create()` at the bottom of every file — never inline objects
- No hardcoded colors in StyleSheet — use design tokens / constants from `src/themes/`
- No raw pixel numbers — use project dimension utilities when available

## Validation Commands

```bash
npm run typecheck     # npx tsc --noEmit
npm run lint          # eslint
npm run android       # run on Android
```
