# Seed de usuario de prueba

## Comandos
- Remoto enlazado: `yarn supabase:db:seed:test --linked`
- Local: `yarn supabase:db:seed:test --local`
- Historial custom: `yarn supabase:db:seed:test --linked --months 18`

## Variables requeridas
- `USER_TEST_EMAIL`
- `USER_TEST_PASSWORD`
- `USER_TEST_FULL_NAME`

## Que hace
- borra el usuario de prueba existente si ya existe
- crea de nuevo el usuario en `auth.users`
- confirma el email automaticamente
- inicia sesion con ese usuario
- puebla todas las tablas vigentes del dominio con datos de prueba consistentes
- genera por defecto 12 meses de historial y 52 semanas de `financial_scores`

## Notas
- `--linked` usa `EXPO_PUBLIC_SUPABASE_URL` y `EXPO_PUBLIC_SUPABASE_ANON_KEY` del `.env`
- `--local` necesita la stack local de Supabase corriendo
- el dataset es determinista a partir del email del usuario de prueba
- el resumen final imprime conteos por tabla, estados de salarios y balances por wallet
