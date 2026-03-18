# FinFlow IQ

Aplicacion Expo + React Native para finanzas personales con soporte para Android, iOS y web/PWA. El proyecto usa Expo Router, Supabase y Zustand. La web se exporta como sitio estatico; mobile usa builds de Expo/EAS.

## Stack

- Expo SDK 55
- React 19
- React Native 0.83
- Expo Router
- Supabase
- Zustand
- TypeScript estricto
- Vitest para pruebas unitarias

## Requisitos

- Node.js 22 recomendado
- Yarn 1.x
- Cuenta y proyecto de Supabase
- EAS CLI si vas a generar builds o updates

## Variables de entorno

Crea `.env` a partir de `.env.example`.

```bash
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
EXPO_PUBLIC_WEB_URL=
EAS_PROJECT_ID=
SUPABASE_PROJECT_ID=
SUPABASE_PASSWORD=
```

Variables criticas para arrancar la app:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`

Variables de build/update:

- `EAS_PROJECT_ID`
- `EXPO_PUBLIC_WEB_URL`

Variables operativas de Supabase CLI:

- `SUPABASE_PROJECT_ID`
- `SUPABASE_PASSWORD`

## Instalacion

```bash
yarn install
```

## Scripts

```bash
yarn start
yarn android
yarn ios
yarn web
yarn lint
yarn typecheck
yarn test
yarn test:watch
yarn web:export
yarn smoke:android
```

Scripts EAS:

```bash
yarn eas:build:development
yarn eas:build:preview
yarn eas:build:production
yarn eas:update:development
yarn eas:update:preview
yarn eas:update:production
```

Scripts Supabase:

```bash
yarn supabase:login
yarn supabase:link
yarn supabase:db:push
yarn supabase:db:pull
yarn supabase:config:push
yarn supabase:types
```

## Flujo de arranque

1. `AuthBootstrap` restaura la sesion de Supabase.
2. `SecurityBootstrap` carga MFA y seguridad local.
3. `AppDataBootstrap` sincroniza settings y wallets.
4. `LedgerBootstrap` sincroniza movimientos del wallet activo.
5. Los layouts protegidos aplican guard de autenticacion y onboarding.

Persistencia de sesion:

- Web/PWA: `localStorage`
- Android/iOS: `expo-secure-store`

## Arquitectura resumida

- `src/app`: rutas Expo Router
- `src/components`: componentes de UI y flujos por dominio
- `src/modules`: servicios, calculos y tipos por feature
- `src/stores`: estado global con Zustand
- `src/lib`: bootstrap, auth, Supabase y utilidades transversales
- `supabase/migrations`: esquema SQL, RLS y funciones RPC

## Calidad y CI

El workflow de GitHub Actions ejecuta:

- `yarn typecheck`
- `yarn lint`
- `yarn test`
- `yarn smoke:android`
- `yarn web:export`

Si vas a abrir un PR, esos comandos deben pasar localmente.

## Targets soportados

- Android: objetivo principal de release
- iOS: compatible por Expo Router y runtime universal
- Web/PWA: export estatico y despliegue en GitHub Pages

## Notas operativas

- No existe ya el script template `reset-project`; este repositorio no es un starter.
- `expo-secure-store` no aplica en web; esa diferencia es intencional.
- El proyecto depende de configuracion valida de Supabase para login, signup y datos remotos.
