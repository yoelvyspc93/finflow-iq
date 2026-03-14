# Plan de implementación por fases para FinFlow IQ

## Contratos base

- Todas las columnas monetarias usan `numeric(18,2)` en Supabase.
- Todas las tasas usan `numeric(18,6)`.
- `ledger_entries` evoluciona solo con cambios aditivos: `ALTER TABLE ... ADD COLUMN ... NULL`, índice, regeneración de tipos y compatibilidad backward en app antes de endurecer restricciones.
- `expo-updates` se configura con EAS Update, canales `preview`, `staging`, `production`, y `runtimeVersion: { policy: "appVersion" }`.
- El primer wallet no se crea automáticamente; lo crea el usuario en onboarding.
- `goal_withdrawal` queda fuera de v1.

### Fase 1 - Contratos de esquema y Supabase base

- Objetivo: fijar el contrato de datos y dejar una base versionada y reproducible.
- Archivos a crear/modificar: `package.json`, `.env.example`, `supabase/config.toml`, `supabase/seed.sql`, `supabase/migrations/0001_core.sql`, `docs/db-contracts.md`, `docs/schema-evolution.md`, `src/types/supabase.ts`.
- Dependencias: ninguna.
- Pasos internos: configurar Supabase CLI; crear `settings`, `wallets`, `income_sources`, `categories`; habilitar RLS; documentar `numeric(18,2)`; documentar estrategia de cambios aditivos; seed de settings, categorías y fuentes; generar tipos.
- Criterio de éxito: `supabase db reset` recrea el esquema y la documentación deja cerrado el contrato monetario y la evolución del esquema.
- Riesgos o puntos críticos: drift entre entornos, RLS incompleta, nuevas columnas monetarias fuera del contrato.

### Fase 2 - Magic Link y sesión persistente

- Objetivo: resolver autenticación real y persistencia de sesión.
- Archivos a crear/modificar: `package.json`, `src/lib/supabase/client.ts`, `src/lib/auth/session.ts`, `src/stores/auth-store.ts`, `src/app/_layout.tsx`, `src/app/(auth)/login.tsx`, `src/app/(auth)/callback.tsx`.
- Dependencias: Fase 1.
- Pasos internos: integrar Supabase Auth; configurar deep links y callback web; hidratar sesión; proteger rutas; manejar logout y expiración.
- Criterio de éxito: el Magic Link funciona en móvil y web y la sesión persiste entre reinicios.
- Riesgos o puntos críticos: redirect URIs, diferencias native/web, sesiones inconsistentes.

### Fase 3 - PIN local y bloqueo de app

- Objetivo: añadir seguridad local sobre la sesión autenticada.
- Archivos a crear/modificar: `package.json`, `src/lib/security/pin-storage.ts`, `src/lib/security/app-lock.ts`, `src/stores/security-store.ts`, `src/app/(auth)/pin.tsx`, `src/components/security/*`.
- Dependencias: Fase 2.
- Pasos internos: guardar PIN en SecureStore; crear flujo de alta, verificación y cambio; bloquear al abrir y al volver de background; recuperación por reautenticación.
- Criterio de éxito: la app exige PIN cuando corresponde y permite recuperarlo sin tocar datos financieros.
- Riesgos o puntos críticos: soporte web, tiempos de bloqueo, UX de recuperación.

### Fase 4 - Wallets y settings de dominio base

- Objetivo: crear la capa de dominio mínima reusable.
- Archivos a crear/modificar: `src/modules/wallets/service.ts`, `src/modules/wallets/store.ts`, `src/modules/wallets/types.ts`, `src/modules/settings/service.ts`, `src/modules/settings/types.ts`, `src/stores/app-store.ts`.
- Dependencias: Fases 1-3.
- Pasos internos: CRUD de wallets; lectura y edición de settings mínimos; selección de wallet activo; flags de onboarding.
- Criterio de éxito: la app conoce si hay wallets, cuál está activo y qué configuración mínima tiene el usuario.
- Riesgos o puntos críticos: wallet activo inválido, sincronización local/remota, orden visual.

### Fase 5 - Ledger, balances y feed de dashboard

- Objetivo: construir el núcleo contable y los saldos base del dashboard.
- Archivos a crear/modificar: `supabase/migrations/0002_ledger.sql`, `src/modules/ledger/service.ts`, `src/modules/ledger/store.ts`, `src/modules/ledger/types.ts`, `src/modules/ledger/selectors.ts`, `src/modules/ledger/__tests__/*`.
- Dependencias: Fases 1-4.
- Pasos internos: crear `ledger_entries` con `numeric(18,2)` e índices; trigger de `wallets.balance`; RPCs `create_manual_income`, `create_expense`, `create_adjustment`, `reconcile_wallet_balance`; selectores de saldo por wallet, saldo total y últimos movimientos.
- Criterio de éxito: ingresos y gastos actualizan ledger y balances del dashboard sin intervención manual.
- Riesgos o puntos críticos: redondeo monetario, doble submit, trigger fuera de sincronía.

### Fase 6 - Shell de app y onboarding inicial

- Objetivo: cerrar el flujo de primera vez con navegación base.
- Archivos a crear/modificar: `src/app/(tabs)/_layout.tsx`, `src/app/onboarding/*`, `src/app/(tabs)/settings.tsx`, `src/components/onboarding/*`, `src/hooks/use-onboarding-guard.ts`.
- Dependencias: Fases 2-5.
- Pasos internos: crear shell de tabs; estado vacío sin wallets; creación del primer wallet; onboarding mínimo de `% ahorro` y formato de fecha; guards de ruta.
- Criterio de éxito: el flujo `login -> PIN -> crear wallet -> onboarding -> app` funciona completo.
- Riesgos o puntos críticos: loops de navegación, formularios incompletos, estado inicial a medias.

### Fase 7 - Operación y OTA base

- Objetivo: preparar la app para despliegue real y hotfixes.
- Archivos a crear/modificar: `package.json`, `app.json`, `eas.json`, `.github/workflows/deploy.yml`, `docs/release-process.md`.
- Dependencias: Fase 6.
- Pasos internos: configurar `expo-updates`; definir `runtimeVersion` y canales; documentar flujo de release; mantener deploy web separado.
- Criterio de éxito: existe un proceso claro para publicar builds y OTA updates compatibles.
- Riesgos o puntos críticos: runtime mismatch, canales mal configurados, confusión entre OTA móvil y deploy web.

### Fase 8 - Dashboard y movimientos UI

- Objetivo: exponer en UI lo ya resuelto por el ledger.
- Archivos a crear/modificar: `src/app/(tabs)/index.tsx`, `src/app/(tabs)/finances/index.tsx`, `src/app/modals/add-income.tsx`, `src/app/modals/add-expense.tsx`, `src/components/dashboard/*`, `src/components/ledger/*`.
- Dependencias: Fases 5-6.
- Pasos internos: carrusel de wallets; tarjetas de saldo disponible; quick actions; historial con filtros básicos; estados vacíos y de error.
- Criterio de éxito: el usuario registra ingresos y gastos y ve el efecto inmediato en dashboard e historial.
- Riesgos o puntos críticos: refresco de datos, rendimiento de listas, modales en web.

### Fase 9 - Salario de dominio

- Objetivo: implementar la lógica salarial atómica y trazable.
- Archivos a crear/modificar: `supabase/migrations/0003_salary.sql`, `src/modules/salary/service.ts`, `src/modules/salary/store.ts`, `src/modules/salary/calculations.ts`, `src/modules/salary/types.ts`, `src/modules/salary/__tests__/*`.
- Dependencias: Fase 5.
- Pasos internos: crear `salary_periods`, `salary_payments`, `salary_allocations`; trigger de `covered_amount` y `status`; RPC `register_salary_payment`; validaciones por pago y período; cálculo de pendiente total y meses sin cobrar.
- Criterio de éxito: backend soporta cobros parciales y múltiples cobros por mes con trazabilidad.
- Riesgos o puntos críticos: concurrencia en allocations, moneda del payment, errores de trigger.

### Fase 10 - UI de salario

- Objetivo: hacer usable el módulo salarial sin mover lógica a los componentes.
- Archivos a crear/modificar: `src/app/(tabs)/finances/salary.tsx`, `src/app/modals/add-salary-entry.tsx`, `src/app/modals/salary-payment.tsx`, `src/components/salary/*`.
- Dependencias: Fase 9.
- Pasos internos: alta de períodos de nómina; historial por mes; modal de cobro y distribución; widgets de pendiente y último cobro.
- Criterio de éxito: el usuario puede registrar nómina mensual y distribuir cobros reales end-to-end.
- Riesgos o puntos críticos: UX de distribución, validaciones visuales, estados parciales.

### Fase 11 - Transferencias entre wallets

- Objetivo: resolver cambios de moneda y transferencias atómicas.
- Archivos a crear/modificar: `supabase/migrations/0004_exchanges.sql`, `src/modules/exchanges/service.ts`, `src/modules/exchanges/types.ts`, `src/modules/exchanges/__tests__/*`.
- Dependencias: Fase 5.
- Pasos internos: crear `currency_exchanges`; RPC `transfer_between_wallets`; validar origen, destino, monto y tasa; generar `exchange_out` y `exchange_in` en una sola transacción.
- Criterio de éxito: una transferencia actualiza ambos wallets o ninguno.
- Riesgos o puntos críticos: redondeo, transferencia al mismo wallet, tasas inconsistentes.

### Fase 12 - Compromisos y provisiones de dominio

- Objetivo: resolver el dinero comprometido y su trazabilidad contable.
- Archivos a crear/modificar: `supabase/migrations/0005_commitments.sql`, `src/modules/commitments/service.ts`, `src/modules/commitments/calculations.ts`, `src/modules/commitments/types.ts`, `src/modules/provisions/service.ts`, `src/modules/provisions/types.ts`, `src/modules/commitments/__tests__/*`.
- Dependencias: Fase 5.
- Pasos internos: crear `recurring_expenses` y `budget_provisions`; si hace falta, añadir refs al ledger con migración aditiva documentada; calcular comprometido mensual por wallet; registrar pago real enlazado al ledger.
- Criterio de éxito: el sistema calcula comprometido mensual y audita pagos reales de compromisos y provisiones.
- Riesgos o puntos críticos: recurrencia anual, mes financiero configurable, cambios de esquema mal coordinados.

### Fase 13 - Finanzas UI extendida

- Objetivo: completar la tab Finanzas con salario, transferencias y compromisos.
- Archivos a crear/modificar: `src/app/(tabs)/finances/commitments.tsx`, `src/app/modals/currency-exchange.tsx`, `src/app/modals/add-provision.tsx`, `src/components/commitments/*`, `src/components/exchanges/*`, `src/components/dashboard/financial-cards.tsx`.
- Dependencias: Fases 10-12.
- Pasos internos: mostrar botón `⇄ Transferir` solo con 2+ wallets; listar compromisos y provisiones; registrar pagos; añadir comprometido, libre y asignable al dashboard.
- Criterio de éxito: Finanzas queda operativa para movimientos, salario, transferencias y dinero comprometido.
- Riesgos o puntos críticos: sincronización entre tabs, cálculos cruzados por wallet, estados vacíos.

### Fase 14 - Planificación determinística de dominio

- Objetivo: construir metas, wishlist y score sin IA ni alertas.
- Archivos a crear/modificar: `supabase/migrations/0006_planning.sql`, `src/modules/goals/service.ts`, `src/modules/goals/calculations.ts`, `src/modules/goals/types.ts`, `src/modules/wishes/service.ts`, `src/modules/wishes/calculations.ts`, `src/modules/wishes/types.ts`, `src/modules/insights/score.ts`.
- Dependencias: Fases 5 y 12.
- Pasos internos: crear `goals`, `goal_contributions`, `wishes`, `financial_scores`; RPC `add_goal_contribution`; cálculo de progreso de metas; fecha estimada y confianza de wishlist; score semanal determinístico.
- Criterio de éxito: el sistema proyecta metas, deseos y score sin IA.
- Riesgos o puntos críticos: recálculo en cadena, datos históricos insuficientes, deadlines inconsistentes.

### Fase 15 - Planificación y ajustes UI

- Objetivo: cerrar la app funcional sin IA.
- Archivos a crear/modificar: `src/app/(tabs)/planning/index.tsx`, `src/app/(tabs)/planning/wishes.tsx`, `src/app/(tabs)/planning/insights.tsx`, `src/app/modals/add-goal.tsx`, `src/app/modals/goal-contribution.tsx`, `src/app/modals/add-wish.tsx`, `src/app/(tabs)/settings.tsx`, `src/components/planning/*`, `src/components/settings/*`.
- Dependencias: Fases 4 y 14.
- Pasos internos: UI de metas, wishlist e insights; gestión de categorías, fuentes y wallets; exportación CSV; reset de datos; configuración de PIN, fecha, moneda principal y tema.
- Criterio de éxito: la app es usable de extremo a extremo sin IA ni alertas automáticas.
- Riesgos o puntos críticos: acciones destructivas, exportaciones incompletas, settings que impactan cálculos.

### Fase 16 - IA narrativa y alertas

- Objetivo: añadir narrativa y avisos sobre la base determinística ya estable.
- Archivos a crear/modificar: `supabase/migrations/0007_alerts.sql`, `supabase/functions/ai-insights/index.ts`, `supabase/functions/alert-cron/index.ts`, `src/modules/insights/service.ts`, `src/modules/alerts/service.ts`, `src/modules/alerts/rules.ts`, `src/modules/alerts/types.ts`.
- Dependencias: Fases 10, 12, 14 y 15.
- Pasos internos: crear `alerts`; reglas proactivas; integración Groq vía Edge Functions; tips y reportes narrativos; notificaciones Expo con fallback in-app.
- Criterio de éxito: si IA o alertas fallan, la app sigue funcionando; cuando están activas, solo agregan narrativa y avisos.
- Riesgos o puntos críticos: latencia y coste de Groq, scheduling, diferencias mobile/web.

## Resumen de fases


| Fase | Nombre                                  | Resultado principal                 | Depende de  |
| ---- | --------------------------------------- | ----------------------------------- | ----------- |
| 1    | Contratos de esquema y Supabase base    | Base versionada + reglas de datos   | Ninguna     |
| 2    | Magic Link y sesión persistente         | Auth móvil/web                      | 1           |
| 3    | PIN local y bloqueo de app              | Seguridad local                     | 2           |
| 4    | Wallets y settings de dominio base      | Servicios y stores base             | 1-3         |
| 5    | Ledger, balances y feed de dashboard    | Núcleo contable + saldos reales     | 1-4         |
| 6    | Shell de app y onboarding inicial       | Flujo de primera vez                | 2-5         |
| 7    | Operación y OTA base                    | OTA y proceso de release            | 6           |
| 8    | Dashboard y movimientos UI              | Ledger visible y operable           | 5-6         |
| 9    | Salario de dominio                      | Backend salarial                    | 5           |
| 10   | UI de salario                           | Flujo salarial usable               | 9           |
| 11   | Transferencias entre wallets            | Cambio/transferencia atómica        | 5           |
| 12   | Compromisos y provisiones de dominio    | Comprometido mensual determinístico | 5           |
| 13   | Finanzas UI extendida                   | Finanzas completa sin IA            | 10-12       |
| 14   | Planificación determinística de dominio | Metas, wishlist y score base        | 5,12        |
| 15   | Planificación y ajustes UI              | App completa sin IA                 | 4,14        |
| 16   | IA narrativa y alertas                  | Capa opcional final                 | 10,12,14,15 |


