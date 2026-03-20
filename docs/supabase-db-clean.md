# Limpiar la base de datos

## Comandos
- Remoto enlazado: `yarn supabase:db:clean --linked --confirm`
- Local: `yarn supabase:db:clean --local --confirm`

## Que hace
- vacia todas las tablas del esquema `public`
- elimina todos los usuarios de `auth.users`
- conserva la estructura de la base de datos
- no toca migraciones, funciones, politicas ni triggers

## Archivos involucrados
- `scripts/supabase-reset-db.mjs`
- `supabase/reset.sql`

## Notas
- El flag `--confirm` es obligatorio para evitar ejecuciones accidentales.
- Usa `--linked` para el proyecto remoto ya enlazado con `yarn supabase:link`.
- Usa `--local` solo si tienes la base local levantada con Supabase CLI.
