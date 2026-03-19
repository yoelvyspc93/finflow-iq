# Reporte funcional y modelo de datos actual

Fecha de revision: 2026-03-19

## 1. Objetivo de este documento

Este documento describe el estado actual implementado de FinFlow IQ desde cuatro angulos:

- que hace hoy la app;
- que modulos existen y como se relacionan;
- que datos se guardan en cada operacion;
- como es el modelo de datos real en Supabase, incluyendo relaciones y reglas de integridad.

La intencion es que otra IA pueda leer solo este archivo y entender:

- el dominio funcional real de la app;
- que partes son fuente de verdad y que partes son derivadas;
- que escribe cada flujo del usuario;
- que tablas existen hoy y cuales ya no forman parte del sistema.

## 2. Resumen ejecutivo

FinFlow IQ es una app de finanzas personales hecha con Expo Router, React Native, Zustand y Supabase. El producto actual gira alrededor de estos dominios:

- autenticacion y seguridad;
- configuracion personal del usuario;
- billeteras;
- movimientos financieros;
- salario;
- transferencias entre billeteras;
- compromisos fijos y provisiones;
- wishlist financiera;
- score financiero semanal.

La app no usa una base de datos local de negocio. La persistencia real de negocio vive en Supabase. En el dispositivo solo se guarda de forma persistente la sesion de autenticacion de Supabase:

- web: `localStorage`;
- mobile: `expo-secure-store`.

El resto del estado de la app vive en stores de Zustand en memoria y se reconstruye sincronizando con Supabase.

## 3. Arquitectura funcional real

### 3.1 Stack y capas

- UI y rutas: `src/app`
- componentes visuales y de flujo: `src/components`
- logica de dominio, servicios y calculos: `src/modules`
- estado global cliente: `src/stores`
- autenticacion, cliente Supabase y utilidades transversales: `src/lib`
- esquema, RLS, triggers y RPCs: `supabase/migrations`

### 3.2 Flujo de arranque

El arranque real de la app es:

1. `AuthBootstrap` restaura la sesion de Supabase y sincroniza si el usuario tiene MFA pendiente.
2. `SecurityBootstrap` consulta el factor TOTP principal del usuario autenticado.
3. `AppDataBootstrap` carga `settings` y `wallets` cuando el usuario ya esta autenticado y no tiene MFA pendiente.
4. `SessionTimeoutGuard` expira la sesion local segun `settings.session_timeout_minutes`.
5. `useOnboardingGuard` decide si el usuario va a:
   - `/login`
   - `/mfa`
   - `/onboarding`
   - `/dashboard`

### 3.3 Fuente de verdad

- `settings`, `wallets`, `ledger_entries`, `salary_*`, `currency_exchanges`, `recurring_expenses`, `budget_provisions`, `wishes`, `financial_scores`, `profiles`, `categories`, `income_sources`: Supabase es la fuente de verdad.
- `wallets.balance` es un cache persistido, pero su fuente funcional son las inserciones en `ledger_entries` y los triggers SQL.
- `dashboard` y `notifications` muestran sobre todo datos derivados o compuestos; no son tablas propias.
- el score semanal se persiste en `financial_scores`, pero se recalcula localmente a partir de los demas dominios.

### 3.4 Seguridad y acceso a datos

Todas las tablas de negocio actuales son user-scoped por `user_id` y usan Row Level Security. El patron dominante de acceso es:

- `auth.uid() = user_id`

Ademas, gran parte de las escrituras sensibles no se hace por `insert` directo desde el cliente sino por RPCs `security definer`, para garantizar integridad cruzada:

- crear ingresos y gastos;
- registrar cobros salariales;
- transferir entre billeteras;
- crear y liquidar compromisos.

## 4. Modulos funcionales implementados

## 4.1 Autenticacion y seguridad

Archivos clave:

- `src/lib/auth/session.ts`
- `src/lib/auth/mfa.ts`
- `src/components/auth/auth-bootstrap.tsx`
- `src/components/security/security-bootstrap.tsx`
- `src/components/security/session-timeout-guard.tsx`
- `src/app/(auth)/login.tsx`
- `src/app/(auth)/signup.tsx`
- `src/app/(auth)/mfa.tsx`
- `src/app/settings/security.tsx`

Responsabilidad:

- login por email + password;
- signup con nombre y apellidos;
- MFA TOTP usando Supabase Auth MFA;
- expiracion automatica de sesion local por inactividad.

Persistencia real:

- Supabase Auth guarda usuario, credenciales y factores MFA.
- la app no tiene tabla SQL propia para MFA.
- `profiles` se llena automaticamente con nombre y apellido a partir de `raw_user_meta_data`.
- `settings.session_timeout_minutes` controla el timeout de sesion.

Datos que se guardan por operacion:

- signup:
  - en `auth.users`: email, password hash, metadata `first_name`, `last_name`;
  - trigger `handle_new_user()` crea defaults en `settings`, `categories`, `income_sources` y `profiles`.
- login:
  - no escribe tablas de negocio;
  - restaura o crea sesion de Auth.
- activar MFA:
  - no toca tablas SQL propias;
  - crea y verifica factor TOTP en Supabase Auth MFA.
- desactivar MFA:
  - elimina el factor TOTP en Supabase Auth MFA.
- cambiar timeout:
  - actualiza `settings.session_timeout_minutes`.

Persistencia local:

- sesion Supabase:
  - web: `localStorage`;
  - mobile: `expo-secure-store`.
- `SecurityStore` guarda en memoria:
  - `lastActivityAt`
  - `mfaEnabled`
  - `mfaFactorId`
- estos datos no se guardan en una tabla propia.

## 4.2 Onboarding y configuracion inicial

Archivos clave:

- `src/app/onboarding.tsx`
- `src/components/onboarding/onboarding-form.tsx`
- `src/modules/settings/service.ts`
- `src/modules/wallets/service.ts`

Responsabilidad:

- completar los datos minimos para que el usuario pueda usar la app;
- definir preferencias iniciales y primera billetera.

Operacion real:

- el usuario guarda:
  - formato de fecha;
  - porcentaje meta de ahorro;
  - nombre de primera billetera;
  - moneda de la billetera;
  - color de la billetera.

Datos que se guardan:

- `settings`:
  - `date_format`
  - `savings_goal_percent`
  - `user_id`
- `wallets`:
  - `name`
  - `currency`
  - `color`
  - `position = 0`
  - `user_id`

El onboarding no crea:

- salario esperado;
- wishlist;
- compromisos;
- score financiero;
- categorias o fuentes de ingreso personalizadas.

Esos defaults ya vienen del trigger de alta de usuario.

## 4.3 Perfil, settings y catalogos personales

Subdominios:

- perfil (`profiles`)
- settings (`settings`)
- categorias (`categories`)
- fuentes de ingreso (`income_sources`)

Archivos clave:

- `src/modules/profiles/service.ts`
- `src/modules/settings/service.ts`
- `src/modules/categories/service.ts`
- `src/modules/income-sources/service.ts`
- `src/app/settings/categories.tsx`
- `src/app/settings/income-sources.tsx`

Responsabilidad:

- guardar preferencias de comportamiento global;
- mantener catalogos que luego referencian movimientos y otros modulos.

Operaciones implementadas:

- categorias:
  - listar
  - crear
  - editar
  - eliminar
- fuentes de ingreso:
  - listar
  - crear
  - editar
  - eliminar
- settings:
  - leer
  - upsert de campos parciales

Datos guardados por operacion:

- crear categoria:
  - `user_id`
  - `name`
  - `icon` actualmente fijo desde UI en `"shapes"`
  - `color`
  - `is_default = false`
- editar categoria:
  - puede cambiar `name`, `icon`, `color`
- eliminar categoria:
  - borra la fila si no existen referencias bloqueantes;
  - en `ledger_entries`, `recurring_expenses` y `budget_provisions` la FK es `on delete set null`, por lo que el historial puede sobrevivir sin categoria;
  - aun asi pueden aparecer restricciones de negocio o errores de SQL si el backend cambia.
- crear fuente de ingreso:
  - `user_id`
  - `name`
  - `is_default = false`
- editar fuente de ingreso:
  - cambia `name`
- eliminar fuente:
  - el historial de `ledger_entries.income_source_id` usa `on delete set null`.

Campos importantes de `settings` hoy:

- `savings_goal_percent`
- `salary_reference_amount`
- `financial_month_start_day`
- `usd_cup_rate`
- `avg_months_without_payment`
- `ai_analysis_frequency`
- `alert_level`
- `subscription_alert_days`
- `weekly_summary_day`
- `primary_currency`
- `theme`
- `date_format`
- `session_timeout_minutes`

Uso funcional actual de `settings`:

- `savings_goal_percent`: dashboard, planning, reserva de liquidez;
- `salary_reference_amount`: fallback para el calculo de ingreso mensual medio;
- `avg_months_without_payment`: alimenta la reserva en planning;
- `primary_currency`: apoyo visual en dashboard;
- `date_format`: onboarding y preferencia general;
- `session_timeout_minutes`: timeout de sesion local;
- el resto existe en modelo y puede ser usado luego, pero hoy no todo tiene superficie visible equivalente.

## 4.4 Billeteras

Archivos clave:

- `src/modules/wallets/service.ts`
- `src/modules/wallets/types.ts`
- `src/app/settings/wallets.tsx`
- `src/stores/app-store.ts`

Responsabilidad:

- representar contenedores monetarios del usuario;
- separar efectivo, banco, ahorro o cuentas por moneda;
- servir como eje de casi todos los demas dominios.

Operaciones implementadas:

- listar billeteras;
- crear billetera;
- editar billetera;
- activar/desactivar billetera;
- eliminar billetera cuando no tenga referencias;
- seleccionar billetera activa en cliente.

Datos guardados por operacion:

- crear billetera:
  - `user_id`
  - `name`
  - `currency`
  - `color`
  - `icon` opcional
  - `position`
- editar billetera:
  - `name`
  - `currency`
  - `color`
  - `icon`
- activar/desactivar:
  - `is_active`
- balance:
  - no se edita manualmente desde la UI de billeteras;
  - cambia por triggers de `ledger_entries`.

Reglas funcionales:

- una billetera puede existir sin movimientos;
- si tiene referencias, la pantalla no permite borrarla y la trata como archivada/activable;
- la app usa `selectedWalletId` en cliente para focalizar vistas como ledger y salario visible.

Referencias usadas para impedir borrado:

- `ledger_entries.wallet_id`
- `salary_payments.wallet_id`
- `recurring_expenses.wallet_id`
- `budget_provisions.wallet_id`
- `wishes.wallet_id`
- `currency_exchanges.from_wallet_id`
- `currency_exchanges.to_wallet_id`

## 4.5 Ledger y movimientos

Archivos clave:

- `src/modules/ledger/service.ts`
- `src/modules/ledger/types.ts`
- `src/stores/ledger-store.ts`
- `src/hooks/finances/use-finances-movements.ts`
- `supabase/migrations/0002_ledger.sql`

Responsabilidad:

- ser el historial transaccional base del sistema;
- impactar el balance de billeteras;
- servir de respaldo para salario, transferencias y pagos de compromisos.

Tipos actuales de `ledger_entries.type`:

- `income`
- `salary_payment`
- `expense`
- `exchange_out`
- `exchange_in`
- `adjustment`
- `recurring_expense_payment`
- `budget_provision_payment`

Observacion historica importante:

- `goal_deposit` y `goal_withdrawal` existieron en una migracion anterior;
- el esquema actual ya no usa metas (`goals`) ni `goal_contributions`;
- la migracion `0009_remove_planning_goals.sql` elimina esas piezas.

Operaciones implementadas:

- crear ingreso manual;
- crear gasto;
- crear ajuste;
- listar movimientos por usuario y opcionalmente por billetera;
- reconciliar balance cache de una billetera con la suma real del ledger.

Datos guardados por operacion:

- ingreso manual:
  - tabla: `ledger_entries`
  - columnas:
    - `user_id`
    - `wallet_id`
    - `amount` positivo
    - `type = 'income'`
    - `description`
    - `income_source_id`
    - `date`
  - efecto secundario:
    - trigger suma `amount` a `wallets.balance`
- gasto:
  - tabla: `ledger_entries`
  - columnas:
    - `user_id`
    - `wallet_id`
    - `amount` negativo
    - `type = 'expense'`
    - `description`
    - `category_id`
    - `date`
  - efecto secundario:
    - trigger resta el monto a `wallets.balance`
- ajuste:
  - tabla: `ledger_entries`
  - columnas:
    - `user_id`
    - `wallet_id`
    - `amount` firmado
    - `type = 'adjustment'`
    - `description`
    - `date`
  - efecto:
    - corrige `wallets.balance` por trigger
- reconciliacion:
  - no crea filas nuevas;
  - recalcula `wallets.balance = sum(ledger_entries.amount)`.

Reglas de integridad importantes:

- `ledger_entries` es inmutable:
  - no se puede `update` ni `delete`;
  - si hace falta corregir, el diseño obliga a usar un `adjustment`.
- el trigger valida que:
  - la billetera pertenezca al usuario;
  - la categoria o fuente de ingreso pertenezca al usuario;
  - el signo del monto coincida con el tipo.

## 4.6 Transferencias entre billeteras y cambios de moneda

Archivos clave:

- `src/modules/exchanges/service.ts`
- `src/modules/exchanges/types.ts`
- `supabase/migrations/0004_exchanges.sql`
- `src/hooks/finances/use-finances-movements.ts`

Responsabilidad:

- mover dinero entre dos billeteras del mismo usuario;
- registrar conversiones entre monedas distintas.

Operacion implementada:

- `transfer_between_wallets`

Datos guardados por operacion:

- en `ledger_entries` se crean dos filas:
  - salida:
    - `wallet_id = source_wallet_id`
    - `amount` negativo
    - `type = 'exchange_out'`
  - entrada:
    - `wallet_id = destination_wallet_id`
    - `amount` positivo
    - `type = 'exchange_in'`
- en `currency_exchanges` se crea una fila con:
  - `user_id`
  - `from_wallet_id`
  - `to_wallet_id`
  - `exchange_out_entry_id`
  - `exchange_in_entry_id`
  - `from_amount`
  - `to_amount`
  - `exchange_rate`
  - `transfer_date`
  - `description`

Validaciones SQL relevantes:

- origen y destino deben ser billeteras distintas;
- ambas deben pertenecer al usuario y estar activas;
- `destination_amount` debe coincidir con `source_amount * exchange_rate` redondeado a 2 decimales.

## 4.7 Salario

Archivos clave:

- `src/modules/salary/service.ts`
- `src/modules/salary/types.ts`
- `src/modules/salary/calculations.ts`
- `src/stores/salary-store.ts`
- `src/hooks/finances/use-finances-salary.ts`
- `src/hooks/finances/use-finances-movements.ts`
- `supabase/migrations/0003_salary.sql`

Responsabilidad:

- registrar lo que se esperaba cobrar por mes (`salary_periods`);
- registrar lo efectivamente cobrado (`salary_payments`);
- enlazar pagos a periodos pendientes (`salary_allocations`).

Entidades:

- `salary_periods`: deuda o expectativa salarial mensual por moneda.
- `salary_payments`: pago real recibido.
- `salary_allocations`: reparto de un pago sobre uno o varios periodos.

Operaciones implementadas:

- listar periodos;
- listar pagos;
- listar asignaciones;
- crear periodo salarial;
- registrar pago salarial.

Datos guardados por operacion:

- crear periodo salarial:
  - tabla: `salary_periods`
  - columnas:
    - `user_id`
    - `period_month` normalizado al primer dia del mes
    - `currency` (`USD` o `CUP`)
    - `expected_amount`
    - `notes`
  - columnas derivadas al crear:
    - `covered_amount = 0`
    - `status = 'pending'`
- registrar pago salarial:
  - crea 1 fila en `ledger_entries`:
    - `type = 'salary_payment'`
    - `amount` positivo
    - `wallet_id`
    - `description`
    - `date`
  - crea 1 fila en `salary_payments`:
    - `user_id`
    - `wallet_id`
    - `ledger_entry_id`
    - `currency`
    - `gross_amount`
    - `payment_date`
    - `description`
  - crea N filas en `salary_allocations`:
    - `user_id`
    - `salary_payment_id`
    - `salary_period_id`
    - `amount`
  - triggers recalculan:
    - `salary_payments.allocated_amount`
    - `salary_payments.status`
    - `salary_periods.covered_amount`
    - `salary_periods.status`
  - trigger del ledger incrementa `wallets.balance`.

Logica actual del cliente al cobrar salario:

- el cliente toma los `visiblePeriods` de la moneda de la billetera activa;
- asigna el monto automaticamente, en orden, a los periodos con saldo pendiente;
- si sobra dinero, el pago puede quedar parcialmente o totalmente sin asignar.

Impacto funcional:

- dashboard usa `salaryOverview`;
- planning usa salario pendiente y meses sin cubrir para score y proyecciones.

## 4.8 Compromisos y provisiones

Archivos clave:

- `src/modules/commitments/service.ts`
- `src/modules/commitments/calculations.ts`
- `src/modules/provisions/service.ts`
- `src/modules/commitments/types.ts`
- `src/modules/provisions/types.ts`
- `src/stores/commitment-store.ts`
- `src/hooks/planning/use-planning-commitments.ts`
- `supabase/migrations/0005_commitments.sql`

Responsabilidad:

- modelar gastos recurrentes y gastos planificados;
- calcular cuanto del mes ya esta comprometido, pagado o pendiente.

Entidades:

- `recurring_expenses`:
  - gastos recurrentes mensuales o anuales;
  - ejemplos: renta, suscripcion, servicio fijo.
- `budget_provisions`:
  - apartados o eventos especiales con mes objetivo;
  - pueden ser `once` o `yearly`.

Operaciones implementadas:

- listar gastos recurrentes;
- crear gasto recurrente;
- pagar gasto recurrente;
- listar provisiones;
- crear provision;
- pagar provision;
- calcular overview mensual consolidado.

Datos guardados por operacion:

- crear gasto recurrente:
  - tabla: `recurring_expenses`
  - columnas:
    - `user_id`
    - `wallet_id`
    - `name`
    - `amount`
    - `type` (`subscription` o `fixed_expense`)
    - `frequency` (`monthly` o `yearly`)
    - `billing_day`
    - `billing_month` si es anual
    - `category_id`
    - `notes`
    - `is_active = true`
- pagar gasto recurrente:
  - tabla: `ledger_entries`
  - columnas:
    - `user_id`
    - `wallet_id` de ese compromiso
    - `amount` negativo
    - `type = 'recurring_expense_payment'`
    - `description`
    - `category_id`
    - `recurring_expense_id`
    - `date`
  - efecto:
    - trigger descuenta `wallets.balance`
- crear provision:
  - tabla: `budget_provisions`
  - columnas:
    - `user_id`
    - `wallet_id`
    - `name`
    - `amount`
    - `month` normalizado al primer dia del mes
    - `recurrence`
    - `category_id`
    - `notes`
    - `is_active = true`
- pagar provision:
  - tabla: `ledger_entries`
  - columnas:
    - `user_id`
    - `wallet_id`
    - `amount` negativo
    - `type = 'budget_provision_payment'`
    - `description`
    - `category_id`
    - `budget_provision_id`
    - `date`

Calculo funcional del overview mensual:

- para recurrentes:
  - aplica al mes si `is_active` y:
    - es mensual;
    - o es anual y `billing_month` coincide con el mes consultado.
- para provisiones:
  - `once`: aplica solo al mes configurado;
  - `yearly`: aplica cada ano en ese mes.
- el modulo busca pagos en `ledger_entries` y calcula:
  - comprometido;
  - pagado;
  - restante.

## 4.9 Wishlist y planificacion

Archivos clave:

- `src/modules/wishes/service.ts`
- `src/modules/wishes/types.ts`
- `src/modules/wishes/calculations.ts`
- `src/modules/planning/orchestrator.ts`
- `src/modules/planning/planning-refresh-service.ts`
- `src/modules/planning/planning-persistence.ts`
- `src/stores/planning-store.ts`
- `src/hooks/planning/use-planning-wishes.ts`
- `supabase/migrations/0006_planning.sql`
- `supabase/migrations/0009_remove_planning_goals.sql`

Responsabilidad:

- registrar deseos de compra;
- proyectar cuando podria comprarse cada deseo;
- calcular score financiero semanal;
- persistir proyecciones calculadas sobre cada deseo.

Entidad actual principal:

- `wishes`

Entidades historicas ya removidas:

- `goals`
- `goal_contributions`

La migracion `0009_remove_planning_goals.sql` las elimina y el codigo actual ya no depende de ellas.

Operaciones implementadas:

- listar deseos;
- crear deseo;
- recalcular y persistir proyecciones;
- calcular y upsert del score semanal en `financial_scores`.

Datos guardados por operacion:

- crear deseo:
  - tabla: `wishes`
  - columnas:
    - `user_id`
    - `wallet_id`
    - `name`
    - `estimated_amount`
    - `priority`
    - `notes`
  - el resto queda nulo o por defecto al inicio.
- refresh de planning:
  - no crea una tabla intermedia;
  - calcula overview y proyecciones en cliente;
  - hace dos escrituras:
    - `upsert` en `financial_scores`
    - `update` por deseo en `wishes`

Campos de `wishes` que planning actualiza:

- `confidence_level`
- `confidence_reason`
- `estimated_purchase_date`
- `last_calculated_at`

Campos de `wishes` que existen en modelo pero hoy no tienen flujo completo en UI:

- `ai_advice`
- `last_ai_advice_at`
- `is_purchased`
- `purchased_at`

Logica actual de proyeccion:

- ordena deseos por `priority` ascendente;
- calcula dinero asignable:
  - `availableBalance - committedAmount - reserveAmount`
- calcula capacidad mensual de ahorro:
  - maximo entre:
    - porcentaje de ahorro sobre ingreso mensual;
    - dinero asignable positivo
- recorre deseos en orden de prioridad;
- simula backlog acumulado;
- estima:
  - progreso;
  - meses hasta compra;
  - fecha estimada;
  - nivel de confianza.

## 4.10 Score financiero semanal

Entidad:

- `financial_scores`

Responsabilidad:

- guardar una foto semanal del score financiero y su breakdown.

Operacion implementada:

- `upsertFinancialScore` por `(user_id, week_start)`.

Datos guardados:

- `user_id`
- `score` entero `0..100`
- `week_start`
- `breakdown` JSONB

El `breakdown` se deriva de:

- balance disponible;
- compromisos pendientes;
- ingreso mensual;
- salario pendiente;
- meses sin cobrar;
- meta de ahorro;
- presion de wishlist.

No hay una IA remota real en este flujo. El score es deterministico y local; solo la persistencia es remota.

## 4.11 Dashboard

Archivo clave:

- `src/app/(tabs)/dashboard.tsx`

Responsabilidad:

- presentar una vista agregada rapida.

Lo que consume:

- `wallets` de `AppStore`
- `commitmentOverview`
- `salaryOverview`
- `settings`

Lo que persiste:

- nada.

Es una vista derivada. Calcula en cliente:

- balance disponible;
- fondos comprometidos;
- monto asignable;
- reserva;
- health score simplificado;
- alerta de presupuesto.

## 4.12 Notificaciones

Archivo clave:

- `src/app/(tabs)/notifications.tsx`

Responsabilidad:

- mostrar eventos derivados de compromisos del mes y del ultimo login.

Fuente de datos:

- `recurring_expenses`
- `budget_provisions`
- `auth.user.last_sign_in_at`

Persistencia:

- ninguna.

No existe tabla `notifications`. La pantalla arma items temporales en memoria y los agrupa por recencia.

## 5. Mapa de operaciones y escrituras

| Operacion | Servicio / RPC | Tablas afectadas |
| --- | --- | --- |
| Signup | `supabase.auth.signUp` + trigger `handle_new_user()` | `auth.users`, `settings`, `categories`, `income_sources`, `profiles` |
| Login | `supabase.auth.signInWithPassword` | Auth session solamente |
| Cambiar timeout | `updateSettings` | `settings` |
| Completar onboarding | `updateSettings` + `createWallet` | `settings`, `wallets` |
| Crear billetera | `createWallet` | `wallets` |
| Editar billetera | `updateWallet` | `wallets` |
| Activar/desactivar billetera | `activateWallet` / `deactivateWallet` | `wallets` |
| Crear categoria | `createCategory` | `categories` |
| Editar categoria | `updateCategory` | `categories` |
| Eliminar categoria | `deleteCategory` | `categories` |
| Crear fuente de ingreso | `createIncomeSource` | `income_sources` |
| Editar fuente de ingreso | `updateIncomeSource` | `income_sources` |
| Eliminar fuente de ingreso | `deleteIncomeSource` | `income_sources` |
| Registrar ingreso manual | RPC `create_manual_income` | `ledger_entries`, `wallets.balance` |
| Registrar gasto | RPC `create_expense` | `ledger_entries`, `wallets.balance` |
| Registrar ajuste | RPC `create_adjustment` | `ledger_entries`, `wallets.balance` |
| Transferir entre billeteras | RPC `transfer_between_wallets` | `ledger_entries` x2, `currency_exchanges`, `wallets.balance` |
| Crear periodo salarial | RPC `create_salary_period` | `salary_periods` |
| Registrar cobro salarial | RPC `register_salary_payment` | `ledger_entries`, `salary_payments`, `salary_allocations`, `salary_periods`, `wallets.balance` |
| Crear gasto recurrente | RPC `create_recurring_expense` | `recurring_expenses` |
| Pagar gasto recurrente | RPC `settle_recurring_expense` | `ledger_entries`, `wallets.balance` |
| Crear provision | RPC `create_budget_provision` | `budget_provisions` |
| Pagar provision | RPC `settle_budget_provision` | `ledger_entries`, `wallets.balance` |
| Crear deseo | `createWish` | `wishes` |
| Refresh de planning | `upsertFinancialScore` + `syncWishProjections` | `financial_scores`, `wishes` |

## 6. Modelo de datos SQL actual

## 6.1 Reglas globales

- dinero: `numeric(18,2)`
- tasas de cambio: `numeric(18,6)`
- casi todo tiene `user_id`
- `created_at` se setea al insertar
- `updated_at` se mantiene por trigger en tablas mutables
- RLS activado en todas las tablas funcionales del usuario

## 6.2 Tabla por tabla

### 6.2.1 `profiles`

Proposito:

- perfil basico del usuario.

Columnas:

- `user_id` PK y FK a `auth.users(id)`
- `first_name`
- `last_name`
- `created_at`
- `updated_at`

Relaciones:

- 1:1 con `auth.users`

Escritura:

- trigger de alta de usuario;
- `upsertProfile` si luego se usa desde cliente.

### 6.2.2 `settings`

Proposito:

- preferencias globales del usuario.

Columnas:

- `id`
- `user_id` unique FK a `auth.users(id)`
- `savings_goal_percent`
- `salary_reference_amount`
- `financial_month_start_day`
- `usd_cup_rate`
- `avg_months_without_payment`
- `ai_analysis_frequency`
- `alert_level`
- `subscription_alert_days`
- `weekly_summary_day`
- `primary_currency`
- `theme`
- `date_format`
- `session_timeout_minutes`
- `created_at`
- `updated_at`

Relaciones:

- 1:1 con `auth.users`

Escritura:

- bootstrap de usuario;
- onboarding;
- ajustes de seguridad y preferencias.

### 6.2.3 `wallets`

Proposito:

- contenedores monetarios del usuario.

Columnas:

- `id`
- `user_id` FK a `auth.users(id)`
- `name`
- `currency`
- `color`
- `icon`
- `balance`
- `is_active`
- `position`
- `created_at`
- `updated_at`

Relaciones salientes:

- N:1 con `auth.users`

Relaciones entrantes:

- `ledger_entries.wallet_id`
- `salary_payments.wallet_id`
- `currency_exchanges.from_wallet_id`
- `currency_exchanges.to_wallet_id`
- `recurring_expenses.wallet_id`
- `budget_provisions.wallet_id`
- `wishes.wallet_id`

Notas:

- `balance` se trata como cache persistido mantenido por triggers del ledger.

### 6.2.4 `income_sources`

Proposito:

- catalogo personal de origen de ingresos.

Columnas:

- `id`
- `user_id`
- `name`
- `is_default`
- `created_at`

Relaciones:

- N:1 con `auth.users`
- 1:N hacia `ledger_entries.income_source_id`

### 6.2.5 `categories`

Proposito:

- catalogo personal de clasificacion de gastos y compromisos.

Columnas:

- `id`
- `user_id`
- `name`
- `icon`
- `color`
- `is_default`
- `created_at`

Relaciones:

- N:1 con `auth.users`
- 1:N hacia:
  - `ledger_entries.category_id`
  - `recurring_expenses.category_id`
  - `budget_provisions.category_id`

### 6.2.6 `ledger_entries`

Proposito:

- historial inmutable de operaciones monetarias.

Columnas:

- `id`
- `user_id`
- `wallet_id`
- `amount`
- `type`
- `description`
- `category_id`
- `income_source_id`
- `date`
- `created_at`
- `recurring_expense_id`
- `budget_provision_id`

Relaciones:

- N:1 con `auth.users`
- N:1 con `wallets`
- N:1 con `categories`
- N:1 con `income_sources`
- N:1 con `recurring_expenses`
- N:1 con `budget_provisions`
- 1:1 inversa con `salary_payments.ledger_entry_id`
- 1:1 inversa con `currency_exchanges.exchange_out_entry_id`
- 1:1 inversa con `currency_exchanges.exchange_in_entry_id`

Reglas:

- no se puede actualizar ni borrar;
- el trigger ajusta `wallets.balance`.

### 6.2.7 `salary_periods`

Proposito:

- periodos mensuales de salario esperado por moneda.

Columnas:

- `id`
- `user_id`
- `period_month`
- `currency`
- `expected_amount`
- `covered_amount`
- `status`
- `notes`
- `created_at`
- `updated_at`

Relaciones:

- N:1 con `auth.users`
- 1:N hacia `salary_allocations.salary_period_id`

### 6.2.8 `salary_payments`

Proposito:

- registro de cobros reales de salario.

Columnas:

- `id`
- `user_id`
- `wallet_id`
- `ledger_entry_id`
- `currency`
- `gross_amount`
- `allocated_amount`
- `status`
- `payment_date`
- `description`
- `created_at`
- `updated_at`

Relaciones:

- N:1 con `auth.users`
- N:1 con `wallets`
- 1:1 con `ledger_entries`
- 1:N hacia `salary_allocations.salary_payment_id`

### 6.2.9 `salary_allocations`

Proposito:

- puente entre pagos salariales y periodos salariales.

Columnas:

- `id`
- `user_id`
- `salary_payment_id`
- `salary_period_id`
- `amount`
- `created_at`

Relaciones:

- N:1 con `auth.users`
- N:1 con `salary_payments`
- N:1 con `salary_periods`

### 6.2.10 `currency_exchanges`

Proposito:

- agrupar la transferencia/cambio entre dos billeteras.

Columnas:

- `id`
- `user_id`
- `from_wallet_id`
- `to_wallet_id`
- `exchange_out_entry_id`
- `exchange_in_entry_id`
- `from_amount`
- `to_amount`
- `exchange_rate`
- `transfer_date`
- `description`
- `created_at`

Relaciones:

- N:1 con `auth.users`
- N:1 con `wallets` por origen y destino
- 1:1 con dos filas de `ledger_entries`

### 6.2.11 `recurring_expenses`

Proposito:

- compromisos recurrentes.

Columnas:

- `id`
- `user_id`
- `wallet_id`
- `name`
- `amount`
- `type`
- `frequency`
- `billing_day`
- `billing_month`
- `category_id`
- `is_active`
- `notes`
- `created_at`
- `updated_at`

Relaciones:

- N:1 con `auth.users`
- N:1 con `wallets`
- N:1 con `categories`
- 1:N hacia `ledger_entries.recurring_expense_id`

### 6.2.12 `budget_provisions`

Proposito:

- gastos/eventos planificados.

Columnas:

- `id`
- `user_id`
- `wallet_id`
- `name`
- `amount`
- `month`
- `recurrence`
- `category_id`
- `is_active`
- `notes`
- `created_at`
- `updated_at`

Relaciones:

- N:1 con `auth.users`
- N:1 con `wallets`
- N:1 con `categories`
- 1:N hacia `ledger_entries.budget_provision_id`

### 6.2.13 `wishes`

Proposito:

- wishlist priorizada de compras futuras.

Columnas:

- `id`
- `user_id`
- `wallet_id`
- `name`
- `estimated_amount`
- `priority`
- `notes`
- `estimated_purchase_date`
- `confidence_level`
- `confidence_reason`
- `last_calculated_at`
- `ai_advice`
- `last_ai_advice_at`
- `is_purchased`
- `purchased_at`
- `created_at`
- `updated_at`

Relaciones:

- N:1 con `auth.users`
- N:1 con `wallets`

Notas:

- `priority` es unica por usuario;
- hoy el modulo usa esta tabla para proyeccion, no para una compra integrada end-to-end.

### 6.2.14 `financial_scores`

Proposito:

- snapshot semanal del score financiero.

Columnas:

- `id`
- `user_id`
- `score`
- `week_start`
- `breakdown` JSONB
- `ai_tip`
- `created_at`

Relaciones:

- N:1 con `auth.users`

Notas:

- `unique (user_id, week_start)`
- el `breakdown` es la estructura mas importante; `score` es su resumen entero.

## 7. Relaciones principales del modelo

Vista resumida:

- `auth.users`
  - 1:1 `profiles`
  - 1:1 `settings`
  - 1:N `wallets`
  - 1:N `income_sources`
  - 1:N `categories`
  - 1:N `ledger_entries`
  - 1:N `salary_periods`
  - 1:N `salary_payments`
  - 1:N `salary_allocations`
  - 1:N `currency_exchanges`
  - 1:N `recurring_expenses`
  - 1:N `budget_provisions`
  - 1:N `wishes`
  - 1:N `financial_scores`

- `wallets`
  - 1:N `ledger_entries`
  - 1:N `salary_payments`
  - 1:N `recurring_expenses`
  - 1:N `budget_provisions`
  - 1:N `wishes`
  - 1:N `currency_exchanges` como origen
  - 1:N `currency_exchanges` como destino

- `ledger_entries`
  - 1:1 `salary_payments` por `ledger_entry_id`
  - 1:1 `currency_exchanges` como salida
  - 1:1 `currency_exchanges` como entrada
  - N:1 opcional `categories`
  - N:1 opcional `income_sources`
  - N:1 opcional `recurring_expenses`
  - N:1 opcional `budget_provisions`

- `salary_payments`
  - 1:N `salary_allocations`

- `salary_periods`
  - 1:N `salary_allocations`

## 8. Datos derivados vs datos persistidos

### Persistidos

- usuario y credenciales
- perfil
- settings
- billeteras
- categorias
- fuentes de ingreso
- historial del ledger
- pagos salariales, periodos y asignaciones
- transferencias entre billeteras
- gastos recurrentes
- provisiones
- wishlist
- score semanal

### Derivados en cliente

- `commitmentOverview`
- `salaryOverview`
- `assignableAmount`
- `reserveAmount`
- `monthlyIncome` estimado
- `salaryStabilityScore`
- proyecciones visibles de wishlist
- cards del dashboard
- notificaciones

### Persistidos como derivacion calculada

Estos se recalculan en cliente pero luego se guardan:

- `financial_scores.score`
- `financial_scores.breakdown`
- `wishes.estimated_purchase_date`
- `wishes.confidence_level`
- `wishes.confidence_reason`
- `wishes.last_calculated_at`

## 9. Restricciones y reglas de negocio importantes

- una fila siempre pertenece a un solo usuario via `user_id`.
- `wallets.balance` se actualiza automaticamente al insertar en `ledger_entries`.
- el ledger no se puede mutar; la correccion es por `adjustment`.
- un pago salarial solo puede usar periodos de la misma moneda.
- un pago salarial no puede sobrecubrir un periodo.
- una transferencia valida exige dos billeteras activas distintas y tasa consistente.
- un `ledger_entry` no puede apuntar a `recurring_expense_id` y `budget_provision_id` a la vez.
- `recurring_expense_payment` exige `recurring_expense_id`.
- `budget_provision_payment` exige `budget_provision_id`.
- `wishes.priority` es unica por usuario.

## 10. Lo que ya no existe en el modelo actual

Elementos historicos removidos:

- `goals`
- `goal_contributions`
- uso vigente de `goal_deposit`
- uso vigente de `goal_withdrawal`

Esto es importante porque varios documentos viejos del repo aun los mencionan. El modelo actual de planning ya no incluye metas; hoy solo hay wishlist y score financiero.

## 11. Lectura funcional de la app hoy

Si se resume el sistema en una sola frase:

FinFlow IQ ya funciona como una app de control financiero personal por billeteras donde el ledger es la base transaccional, el salario se modela como deuda y cobro real, los compromisos se calculan contra pagos reales, y la planificacion se centra en deseos priorizados y un score financiero semanal derivado de todo lo anterior.

Si otra IA necesita seguir evolucionando esta app, la mejor forma de pensarla es:

1. `wallets` define donde vive el dinero.
2. `ledger_entries` define todo movimiento real de dinero.
3. `salary_*`, `currency_exchanges`, `recurring_expenses` y `budget_provisions` son especializaciones que explican ciertos tipos de movimientos del ledger.
4. `wishes` y `financial_scores` son la capa de planificacion derivada del estado financiero real.
