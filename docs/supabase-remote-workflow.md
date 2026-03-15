# Supabase remoto sin Docker

## Variables necesarias
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_WEB_URL`
- `SUPABASE_PROJECT_ID`
- `SUPABASE_PASSWORD`

## Flujo inicial
1. Inicia sesión en la CLI: `yarn supabase:login`
2. Enlaza el repo al proyecto cloud: `yarn supabase:link`
3. Empuja migraciones al proyecto remoto: `yarn supabase:db:push`
4. Empuja la configuración de Auth redirects: `yarn supabase:config:push`
5. Regenera tipos desde el proyecto remoto: `yarn supabase:types`

## Notas
- Este flujo no requiere Docker.
- `supabase db push` usa las migraciones de `supabase/migrations/`.
- `supabase config push` aplica `supabase/config.toml` al proyecto remoto.
- `EXPO_PUBLIC_WEB_URL` debe apuntar a la URL publica real de la app web.
- Si ejecutas `yarn supabase:config:push`, el `site_url` remoto y la lista de redirects se actualizan con `supabase/config.toml`.
- Si cambias el esquema desde el dashboard web, usa luego `yarn supabase:db:pull` para sincronizarlo al repo.
- Evita mezclar SQL manual en producción con migraciones no versionadas.
