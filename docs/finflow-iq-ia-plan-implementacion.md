# Plan de Integración de IA por Fases para FinFlow IQ

## Resumen

La integración debe montarse sobre el flujo determinista que ya existe en planificación: el cálculo oficial sigue viviendo en `planning-refresh-service`, `orchestrator`, `financial_scores` y las proyecciones de deseos; la IA solo interpreta snapshots ya calculados y devuelve texto/JSON estable.

La estrategia recomendada es:
1. construir un `financial context snapshot` server-safe;
2. invocar IA solo desde Supabase Edge Functions;
3. persistir primero en campos ya existentes (`financial_scores.ai_tip`, `wishes.ai_advice`, `wishes.last_ai_advice_at`);
4. añadir trazabilidad y cache después;
5. crecer luego a salud financiera completa, alertas y simulaciones.

## Fase 1. Base técnica y contrato de IA

Objetivo: dejar lista la infraestructura sin cambiar todavía la UX principal.

- Crear `src/modules/ai/context-builder.ts` con 2 builders iniciales:
  - `buildWeeklyFinancialContext(userId, inputs)`
  - `buildWishAdviceContext(userId, wishId, inputs)`
- El snapshot debe salir del estado ya resuelto por planificación y no consultar “toda la base cruda”.
- Fuente de datos del snapshot:
  - `overview` de planificación
  - `currentScore.breakdown`
  - historial corto de `recentScores`
  - salario resumido
  - compromisos agregados
  - proyecciones de deseos
  - `settings`
- Crear tipos estables para entrada y salida:
  - `AiScope = 'weekly_summary' | 'wish_advice'`
  - `WeeklyFinancialContext`
  - `WishAdviceContext`
  - `WeeklyInsightOutput`
  - `WishAdviceOutput`
- Crear `supabase/functions/financial-ai` con este contrato:
  - entrada: `scope`, `userId`, `snapshot`
  - salida: `status`, `outputJson`, `outputText`, `model`, `createdAt`
- Validar en la Edge Function:
  - `scope` permitido
  - estructura mínima del snapshot
  - JSON de respuesta del modelo
- Default técnico:
  - proveedor configurable por variables de entorno del servidor
  - sin llamadas directas desde Expo
  - prompts versionados por scope
- Criterio de cierre:
  - existen builders tipados
  - existe función server-side invocable
  - hay fallback controlado si la IA responde inválido o falla

## Fase 2. MVP visible: tip semanal y consejo por deseo

Objetivo: entregar valor visible reutilizando el esquema actual.

- Integrar generación de `financial_scores.ai_tip` al final del refresh de planificación, después de persistir score y proyecciones.
- Integrar generación de `wishes.ai_advice` y `wishes.last_ai_advice_at` cuando:
  - se crea un deseo
  - cambia una proyección relevante
  - cambia materialmente `assignableAmount`, `reserveAmount` o el score
- Añadir un `src/modules/ai/service.ts` que haga:
  - llamada a la Edge Function
  - decisión de regenerar o reutilizar respuesta
  - serialización de fallbacks
  - persistencia en tablas actuales
- Extender servicios existentes con métodos explícitos:
  - `updateFinancialScoreAiTip(scoreId, aiTip)`
  - `updateWishAiAdvice(wishId, aiAdvice, lastAiAdviceAt)`
- UX mínima:
  - dashboard: sustituir la sugerencia hardcoded por `currentScore.aiTip`
  - planificación/wishlist: mostrar `wish.aiAdvice` en cada deseo o en el detalle
  - insights: usar `aiTip` como resumen automático primario
- Fallback UX:
  - no bloquear render ni refresh
  - si no hay IA, mostrar texto determinista corto derivado de score/overview
- Criterio de cierre:
  - el dashboard muestra un tip persistido
  - cada deseo puede mostrar un consejo persistido
  - el flujo sigue funcionando aunque la IA falle

## Fase 3. Cache, expiración y trazabilidad

Objetivo: controlar costo, auditoría y consistencia.

- Crear tabla `ai_insights` con `scope`, `scope_id`, `input_snapshot`, `output_json`, `output_text`, `model`, `status`, `expires_at`.
- Persistir allí cada análisis válido y reutilizarlo antes de recalcular.
- Política inicial de expiración:
  - `weekly_summary`: 7 días o cambio material del score
  - `wish_advice`: 3 días o cambio material del deseo/contexto
- Definir hash o fingerprint del snapshot para evitar recomputar respuestas equivalentes.
- Registrar fallos con `status = failed` sin romper la app.
- Añadir métricas mínimas:
  - cantidad de invocaciones por scope
  - cache hit/miss
  - respuestas inválidas
- Criterio de cierre:
  - el sistema no llama IA en cada refresh
  - existe historial auditable de entradas y salidas
  - los reintentos y TTL quedan centralizados

## Fase 4. Módulo de Salud Financiera y alertas inteligentes

Objetivo: convertir los insights en una superficie de producto completa.

- Reutilizar `src/app/insights.tsx` como primera pantalla de salud financiera, en vez de abrir una sección nueva desde cero.
- El resumen de salud debe combinar:
  - score y tendencia
  - riesgo principal
  - oportunidad principal
  - acción inmediata
  - acción semanal
- Añadir nuevo scope de IA:
  - `dashboard_health`
- Añadir alertas inteligentes derivadas de reglas deterministas + copy generado por IA:
  - score en caída
  - reserva insuficiente
  - salario pendiente alto
  - conflicto entre deseo y liquidez
- Mantener la decisión del disparador en lógica determinista; la IA solo redacta y prioriza el mensaje.
- Criterio de cierre:
  - la pantalla de análisis deja de usar texto de ejemplo
  - dashboard e insights comparten una narrativa consistente
  - las alertas no contradicen score, reserva ni compromisos

## Fase 5. Simulaciones asistidas por IA

Objetivo: ayudar a decidir sin delegar cálculos financieros a la IA.

- Implementar primero un motor determinista de escenarios:
  - comprar deseo hoy
  - esperar X semanas
  - cobrar salario pendiente
  - apartar monto semanal
  - transferir entre billeteras
- El motor devuelve comparación antes/después sobre:
  - liquidez
  - reserva
  - asignable
  - fecha estimada de compra
  - score proyectado
- La IA recibe solo el resultado del escenario y devuelve interpretación.
- Nuevo scope:
  - `simulation`
- UX sugerida:
  - CTA desde wishlist y desde insights
  - comparación simple “si haces esto / si esperas”
- Criterio de cierre:
  - la simulación numérica es 100% determinista
  - la IA solo explica tradeoffs y condiciones

## Interfaces y cambios importantes

- Nuevos tipos de dominio para IA en cliente:
  - scopes, snapshots, outputs y estado de fallback
- Nuevo módulo de servicio en cliente:
  - invocación y persistencia de insights
- Nueva Edge Function:
  - contrato JSON estable, validado y versionado
- Nueva tabla opcional a medio plazo:
  - `ai_insights`
- No se modifica la responsabilidad de:
  - `ledger_entries`
  - cálculo de score
  - cálculo de proyecciones
  - lógica de compromisos o salario

## Pruebas y aceptación

- Unit tests:
  - builders de snapshot
  - invalidación de cache
  - mapping de respuestas IA
  - fallbacks deterministas
- Contract tests:
  - shape de payload por scope
  - shape de respuesta esperada
  - manejo de JSON inválido
- Integration tests:
  - score sano + bajo compromiso + deseo viable
  - score medio + alta dependencia de salario pendiente
  - score bajo + reserva insuficiente
  - deseo prioritario que compite con compromisos
- Acceptance criteria:
  - no hay claves privadas en el cliente
  - la IA no recalcula balances ni score
  - dashboard y wishlist muestran insights consistentes
  - la UI no se rompe si la IA falla
  - los mensajes no contradicen el breakdown actual

## Supuestos y defaults elegidos

- Se mantiene arquitectura Expo + Supabase sin backend adicional.
- La integración inicial será asíncrona y persistida; no se buscará streaming ni chat libre.
- `ai_analysis_frequency` se reutiliza luego para scheduling, pero en el MVP el trigger principal será el refresh de planificación y cambios materiales.
- La primera versión se centra en `weekly_summary` y `wish_advice`; alertas, health y simulación quedan para fases posteriores.
- El proveedor de IA queda desacoplado del cliente y configurable en la Edge Function.
