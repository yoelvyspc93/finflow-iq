# Release process

## Objetivo
Dejar separados tres flujos:

- calidad continua: `typecheck`, `lint`, `web:export`
- build nativo por canal: `preview`, `staging`, `production`
- OTA updates con `expo-updates` usando EAS Update

## Requisito previo
Configura `EAS_PROJECT_ID` en `.env`.

Si aun no tienes proyecto enlazado en Expo/EAS:

1. `npx eas login`
2. `npx eas init`
3. `npx eas update:configure`

Con eso obtienes el `projectId` real del proyecto y puedes copiarlo a `.env`.

## Contrato actual
- `runtimeVersion` usa `policy: "appVersion"`
- los builds se publican por canal desde `eas.json`
- `preview` y `staging` son internos
- `production` es el canal para builds distribuidos al usuario final

## Comandos locales
- build preview: `yarn eas:build:preview`
- build staging: `yarn eas:build:staging`
- build production: `yarn eas:build:production`
- OTA preview: `yarn eas:update:preview --message "tu mensaje"`
- OTA staging: `yarn eas:update:staging --message "tu mensaje"`
- OTA production: `yarn eas:update:production --message "tu mensaje"`

## Regla importante
Con `runtimeVersion: { policy: "appVersion" }`, una OTA solo llega a builds cuya `version` sea compatible. Si introduces cambios nativos o cambias la version publica de la app, primero necesitas un nuevo build.

## Flujo recomendado
1. Cambios JS/TS, estilos, assets o rutas sin tocar nativo:
   publica OTA al canal correcto con `eas update`.
2. Cambios nativos, dependencias nativas, permisos o plugins:
   crea un build nuevo con `eas build`.
3. Hotfix personal rapido:
   publica a `staging`, valida en el build interno y despues replica a `production`.

## GitHub Actions
El workflow en `.github/workflows/deploy.yml` hace:

- `quality` en `pull_request` y `push`
- deploy web en `main`
- OTA manual por `workflow_dispatch`

Para publicar OTA desde GitHub necesitas el secret `EXPO_TOKEN`.
