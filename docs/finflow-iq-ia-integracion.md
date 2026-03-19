# FinFlow IQ — Integración del Módulo de IA para Salud Financiera

Fecha: 2026-03-19

---

## 1. Objetivo

Diseñar una integración de IA realista y segura para FinFlow IQ, aprovechando el modelo de datos y los flujos ya implementados en la app.

Este documento está pensado para entregárselo a otra IA o a Cursor para que:

- entienda exactamente dónde encaja la IA en la arquitectura actual;
- reutilice el modelo existente en vez de reinventarlo;
- sepa qué datos deben enviarse al modelo;
- identifique qué tablas y campos ya sirven para persistencia;
- proponga e implemente funcionalidades viables por fases;
- evite que la IA sustituya la lógica financiera determinista.

---

## 2. Diagnóstico del estado actual

FinFlow IQ ya tiene una base muy adecuada para integrar IA porque el sistema financiero central ya existe y está razonablemente bien separado.

### Ya existe hoy

- fuente de verdad en Supabase;
- `wallets` como contenedores monetarios;
- `ledger_entries` como historial transaccional inmutable;
- `salary_periods`, `salary_payments`, `salary_allocations` para modelar salario esperado vs cobrado;
- `recurring_expenses` y `budget_provisions` para compromisos;
- `wishes` para wishlist y planificación;
- `financial_scores` para score semanal persistido;
- cálculo local y determinista de:
  - balance;
  - dinero asignable;
  - reserva;
  - proyección de deseos;
  - score financiero.

### Ya existen campos listos para IA

- `wishes.ai_advice`
- `wishes.last_ai_advice_at`
- `financial_scores.ai_tip`
- `settings.ai_analysis_frequency`

### Conclusión técnica

La IA no debe meterse en el núcleo contable.  
La integración correcta es:

**cálculo financiero exacto en el sistema actual + interpretación y recomendación por IA encima de ese estado calculado**

---

## 3. Principio rector de la integración

## La IA no es fuente de verdad

La IA no debe:

- calcular balances oficiales;
- modificar `ledger_entries`;
- determinar montos exactos finales sin respaldo determinista;
- decidir por sí sola estados financieros persistidos críticos;
- reemplazar reglas SQL, triggers o validaciones.

La IA sí debe:

- interpretar el estado financiero calculado;
- explicar riesgos;
- priorizar decisiones;
- generar recomendaciones accionables;
- resumir salud financiera;
- generar narrativa y consejos personalizados;
- convertir datos derivados en mensajes útiles.

---

## 4. Qué significa “salud financiera” en FinFlow IQ

Dentro de esta app, la salud financiera debe representar la capacidad del usuario para operar sin comprometer su estabilidad inmediata ni su planificación de corto plazo.

Debe responder preguntas como:

1. ¿Cuánto dinero tengo realmente disponible hoy?
2. ¿Qué parte de mi dinero ya está comprometida?
3. ¿Cuánto depende de salario pendiente o cobros inciertos?
4. ¿Puedo asumir una compra sin romper mi liquidez?
5. ¿Estoy acumulando deseos por encima de mi capacidad real?
6. ¿Mi situación mejora o empeora respecto a semanas anteriores?
7. ¿Tengo colchón suficiente?
8. ¿Qué acción concreta debo tomar ahora?

---

## 5. Mapa de integración con la arquitectura actual

## 5.1 Núcleo determinista existente

Se mantiene tal como está:

- `wallets`
- `ledger_entries`
- `salary_*`
- `currency_exchanges`
- `recurring_expenses`
- `budget_provisions`
- `wishes`
- `financial_scores`

### Este núcleo sigue calculando

- balances reales;
- saldo por billetera;
- dinero comprometido;
- salario pendiente;
- capacidad de ahorro;
- proyección de deseos;
- score semanal;
- fecha estimada de compra;
- nivel de confianza de compra.

## 5.2 Nueva capa IA

Se monta por encima del núcleo.

### Esta capa recibe snapshots ya calculados y devuelve

- diagnóstico financiero;
- consejo semanal;
- consejo por deseo;
- alertas inteligentes;
- narrativa de salud financiera;
- sugerencias de acción;
- explicaciones comprensibles del score.

---

## 6. Dónde integrar la IA en el sistema actual

## 6.1 Integración inmediata sin tocar mucho el esquema

### A. Resumen semanal
Aprovechar `financial_scores.ai_tip`.

Trigger funcional:
- después del refresh de planning;
- cuando se recalcula `financial_scores`.

Resultado:
- un consejo corto semanal;
- una lectura resumida de la salud financiera.

### B. Consejo por deseo
Aprovechar:
- `wishes.ai_advice`
- `wishes.last_ai_advice_at`

Trigger funcional:
- al crear un deseo;
- al recalcular proyección;
- al cambiar el score;
- al cambiar dinero asignable;
- al cambiar compromisos relevantes.

Resultado:
- una recomendación contextual por deseo.

### C. Dashboard
Consumir:
- `financial_scores.ai_tip`
- breakdown actual
- derivados existentes

Resultado:
- estado financiero resumido;
- principal alerta;
- recomendación prioritaria.

### D. Notificaciones inteligentes
Encima de la vista temporal actual.

Resultado:
- alertas basadas no solo en fechas sino en riesgo financiero real.

---

## 7. Arquitectura técnica recomendada

## 7.1 Opción recomendada

Usar **Supabase Edge Functions** o backend server-side.

### Flujo recomendado

1. La app o una función de dominio arma un `financial context snapshot`.
2. Ese snapshot se envía a una Edge Function.
3. La Edge Function llama al proveedor de IA.
4. La respuesta se valida y se persiste.
5. La app solo consume el resultado ya guardado o cacheado.

## 7.2 Opción no recomendada

No llamar directamente al proveedor de IA desde Expo con API key privada.

Razones:

- seguridad;
- exposición de credenciales;
- dificultad para cachear;
- imposibilidad de centralizar prompts;
- poco control de costos;
- menor capacidad de auditoría.

---

## 8. Componente nuevo clave: Financial Context Snapshot

La IA no debe recibir toda la base cruda.  
Debe recibir un resumen estructurado, consistente y estable.

## 8.1 Qué es

Un objeto JSON construido desde los módulos actuales que representa el estado financiero del usuario en un momento concreto.

## 8.2 Beneficios

- reduce costo de tokens;
- simplifica prompts;
- permite cache;
- desacopla IA del modelo SQL completo;
- evita ambigüedades;
- mejora trazabilidad;
- facilita testing.

---

## 9. Datos que debe incluir el snapshot

## 9.1 Identidad y contexto general

- `userId`
- `generatedAt`
- `primaryCurrency`
- `analysisScope`
- `analysisReason`

## 9.2 Resumen financiero global

- total balance en billeteras activas;
- balance por billetera;
- dinero comprometido próximos 7 días;
- dinero comprometido próximos 30 días;
- dinero pagado este mes;
- dinero restante comprometido;
- reserva calculada;
- dinero asignable;
- score financiero actual;
- score semana anterior;
- variación del score.

## 9.3 Ingresos y salario

- ingreso mensual estimado;
- `salary_reference_amount` si aplica como fallback;
- salario pendiente total;
- meses sin cobrar;
- total cobrado este mes;
- total esperado este mes;
- ratio cobrado vs esperado;
- estabilidad salarial resumida.

## 9.4 Compromisos

- recurrentes activos;
- recurrentes vencen pronto;
- provisiones del mes;
- total comprometido mensual;
- total pagado mensual;
- total pendiente mensual.

## 9.5 Wishlist

Para cada deseo relevante:

- `id`
- `name`
- `walletId`
- `estimatedAmount`
- `priority`
- `estimatedPurchaseDate`
- `confidenceLevel`
- `confidenceReason`
- `notes`
- si compite con compromisos;
- impacto sobre dinero asignable;
- si es viable en corto plazo.

## 9.6 Tendencias

- score últimas 4 semanas;
- balance últimas 4 semanas;
- presión de wishlist;
- dependencia de salario pendiente;
- tendencia de liquidez.

---

## 10. Payload recomendado para análisis global

```json
{
  "version": 1,
  "scope": "weekly_summary",
  "generatedAt": "2026-03-19T10:00:00Z",
  "user": {
    "id": "uuid",
    "primaryCurrency": "USD"
  },
  "settings": {
    "savingsGoalPercent": 20,
    "avgMonthsWithoutPayment": 2,
    "alertLevel": "medium",
    "aiAnalysisFrequency": "weekly"
  },
  "wallets": [
    {
      "id": "wallet_1",
      "name": "Efectivo USD",
      "currency": "USD",
      "balance": 240.00,
      "isActive": true
    },
    {
      "id": "wallet_2",
      "name": "Banco CUP",
      "currency": "CUP",
      "balance": 12500.00,
      "isActive": true
    }
  ],
  "summary": {
    "totalBalance": 240.00,
    "committedNext7Days": 30.00,
    "committedNext30Days": 110.00,
    "paidThisMonth": 70.00,
    "remainingCommittedThisMonth": 80.00,
    "reserveAmount": 40.00,
    "assignableAmount": 90.00,
    "financialScore": 67,
    "previousFinancialScore": 74,
    "scoreDelta": -7
  },
  "salary": {
    "monthlyIncomeEstimate": 180.00,
    "salaryPending": 150.00,
    "monthsWithoutPayment": 1,
    "collectedThisMonth": 50.00,
    "expectedThisMonth": 120.00,
    "collectedVsExpectedRatio": 0.4167
  },
  "commitments": {
    "activeRecurringCount": 4,
    "recurringDueSoonCount": 2,
    "activeProvisionCount": 2,
    "provisionsDueSoonCount": 1
  },
  "wishlist": {
    "totalActiveWishes": 3,
    "pressureLevel": "medium",
    "items": [
      {
        "id": "wish_1",
        "name": "Teléfono",
        "walletId": "wallet_1",
        "estimatedAmount": 200.00,
        "priority": 1,
        "estimatedPurchaseDate": "2026-05-01",
        "confidenceLevel": "medium",
        "confidenceReason": "depends_on_pending_salary"
      }
    ]
  },
  "trend": {
    "last4WeeksScores": [74, 72, 69, 67],
    "liquidityTrend": "down",
    "wishPressureTrend": "up"
  }
}
```

---

## 11. Payload recomendado para análisis por deseo

```json
{
  "version": 1,
  "scope": "wish_advice",
  "generatedAt": "2026-03-19T10:00:00Z",
  "user": {
    "id": "uuid",
    "primaryCurrency": "USD"
  },
  "summary": {
    "assignableAmount": 90.00,
    "reserveAmount": 40.00,
    "financialScore": 67,
    "salaryPending": 150.00,
    "committedNext30Days": 110.00
  },
  "wish": {
    "id": "wish_1",
    "name": "Teléfono",
    "estimatedAmount": 200.00,
    "priority": 1,
    "estimatedPurchaseDate": "2026-05-01",
    "confidenceLevel": "medium",
    "confidenceReason": "depends_on_pending_salary",
    "notes": "uso diario y trabajo"
  },
  "otherWishes": [
    {
      "id": "wish_2",
      "name": "Audífonos",
      "estimatedAmount": 45.00,
      "priority": 2
    }
  ]
}
```

---

## 12. Respuestas esperadas del modelo

## 12.1 Respuesta global recomendada

```json
{
  "status": "ok",
  "summary": "Tu salud financiera actual es funcional pero frágil por la presión de compromisos y la dependencia de salario pendiente.",
  "mainRisk": "Estás dependiendo de dinero aún no cobrado para sostener compras futuras.",
  "mainOpportunity": "Tus compromisos aún son manejables si priorizas liquidez esta semana.",
  "actions": [
    "Evita compras no esenciales durante los próximos 7 días.",
    "Prioriza cubrir compromisos cercanos antes de asignar dinero a deseos.",
    "Mantén intacta tu reserva mínima hasta confirmar el próximo cobro."
  ],
  "tone": "cautious",
  "shortTip": "Esta semana prioriza liquidez y evita contar el salario pendiente como dinero disponible."
}
```

## 12.2 Respuesta por deseo recomendada

```json
{
  "status": "ok",
  "decision": "wait",
  "headline": "Conviene esperar antes de comprar este deseo.",
  "reason": "Aunque el deseo es importante, hoy compite con compromisos cercanos y parte de su viabilidad depende de salario pendiente.",
  "conditionToBuy": "Se vuelve razonable cuando el dinero asignable supere el costo del deseo sin tocar la reserva.",
  "urgency": "medium",
  "confidence": "high"
}
```

---

## 13. Dónde persistir la salida de IA

## 13.1 Reutilización inmediata de tablas actuales

### `financial_scores.ai_tip`
Guardar:
- tip corto de la semana;
- consejo principal;
- versión resumida del análisis global.

### `wishes.ai_advice`
Guardar:
- consejo contextual del deseo;
- explicación breve de compra/espera/posposición.

### `wishes.last_ai_advice_at`
Guardar:
- fecha de actualización del consejo.

## 13.2 Persistencia opcional recomendada a medio plazo

Crear tabla nueva: `ai_insights`

### Propósito

- historial de análisis;
- cache de respuestas;
- trazabilidad;
- auditoría;
- debugging;
- evaluación de calidad;
- analytics interno.

### Esquema sugerido

```sql
create table ai_insights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  scope text not null,
  scope_id uuid null,
  input_snapshot jsonb not null,
  output_text text null,
  output_json jsonb null,
  model text null,
  status text not null default 'completed',
  created_at timestamptz not null default now(),
  expires_at timestamptz null,
  acknowledged_at timestamptz null
);
```

### Valores sugeridos para `scope`

- `weekly_summary`
- `dashboard_health`
- `wish_advice`
- `alert`
- `simulation`

---

## 14. Funcionalidades de IA viables con lo ya implementado

## Fase 1 — Mínimo viable realista

### 14.1 Tip semanal automático
Usar:
- `financial_scores`
- `breakdown`
- summary actual de planning

Persistencia:
- `financial_scores.ai_tip`

UI:
- dashboard;
- pantalla de planning;
- card de resumen semanal.

### 14.2 Consejo por deseo
Usar:
- `wishes`
- proyección actual
- score actual
- dinero asignable
- compromisos

Persistencia:
- `wishes.ai_advice`
- `wishes.last_ai_advice_at`

UI:
- detalle de deseo;
- lista de wishlist.

## Fase 2 — Módulo completo de salud financiera

Nueva vista:
- `Health` o sección dentro de Dashboard/Planning.

La IA debe devolver:

- estado general;
- fortalezas;
- debilidades;
- principal riesgo;
- acción inmediata;
- acción semanal;
- compras no recomendadas;
- compras viables.

## Fase 3 — Alertas inteligentes

Basadas en:
- compromisos cercanos;
- score en caída;
- salario pendiente alto;
- deseos con baja viabilidad;
- dependencia de una sola billetera;
- reserva insuficiente.

## Fase 4 — Simulaciones

Experiencias sugeridas:

- si compro este deseo hoy;
- si espero dos semanas;
- si cobro salario pendiente;
- si aparto una cantidad semanal;
- si transfiero fondos entre billeteras.

Importante:
la simulación numérica debe ser determinista; la IA solo interpreta el resultado.

---

## 15. Qué funcionalidades de IA NO deben hacerse aún

No implementar todavía:

- chatbot libre que lea todo el dominio sin restricciones;
- IA escribiendo operaciones de ledger;
- IA calculando score oficial;
- IA moviendo dinero entre billeteras;
- IA reclasificando transacciones automáticamente sin revisión;
- IA tomando decisiones persistentes críticas;
- IA basada solo en texto libre sin snapshot estructurado.

---

## 16. Reglas de negocio para la IA

La capa IA debe obedecer estas reglas:

1. Nunca tratar `salaryPending` como dinero disponible inmediato.
2. Nunca recomendar una compra si rompe `reserveAmount`.
3. Nunca contradecir el score ni el breakdown calculado por el sistema.
4. Si la situación es ambigua, priorizar liquidez.
5. Si los compromisos cercanos absorben gran parte del margen, sugerir espera.
6. Si un deseo depende de ingreso pendiente, explicitar esa dependencia.
7. No generar recomendaciones financieras complejas sin soporte del snapshot.
8. No afirmar certezas inexistentes; usar lenguaje probabilístico cuando aplique.
9. Mantener las respuestas accionables, concretas y breves.
10. No usar texto genérico de coaching; hablar con datos del snapshot.

---

## 17. Builder del snapshot: dónde implementarlo

Se recomienda crear un módulo específico.

### Ruta sugerida

- `src/modules/ai/context-builder.ts`

### Responsabilidad

- leer datos agregados de:
  - `settings`
  - `wallets`
  - `salary`
  - `commitments`
  - `planning`
  - `financial_scores`
- construir payloads estables para IA;
- normalizar monedas y formatos;
- evitar enviar datos redundantes;
- limitar tamaño del contexto.

### Funciones sugeridas

- `buildWeeklyFinancialContext(userId)`
- `buildWishAdviceContext(userId, wishId)`
- `buildDashboardHealthContext(userId)`
- `buildSimulationContext(userId, scenario)`

---

## 18. Servicio de IA sugerido

### Ruta sugerida

- `src/modules/ai/service.ts`

### Responsabilidad

- invocar Edge Function;
- enviar payload;
- manejar retries;
- invalidar cache cuando cambie contexto relevante;
- persistir resultados en tablas actuales o en `ai_insights`.

### Funciones sugeridas

- `generateWeeklyFinancialTip()`
- `generateWishAdvice(wishId)`
- `generateDashboardHealthSummary()`
- `generateFinancialAlerts()`

---

## 19. Edge Function sugerida

### Ruta conceptual

- `supabase/functions/financial-ai/index.ts`

### Responsabilidad

- validar payload entrante;
- elegir prompt por `scope`;
- llamar al proveedor de IA;
- validar respuesta;
- devolver JSON estable;
- opcionalmente persistir respuesta.

### Entrada mínima

- `scope`
- `snapshot`
- `userId`

### Salida mínima

- `status`
- `outputJson`
- `outputText`
- `model`
- `createdAt`

---

## 20. Prompt base para resumen financiero semanal

```text
Actúa como un analista financiero personal dentro de una app móvil de finanzas.
Tu trabajo no es recalcular balances sino interpretar el snapshot recibido.

Reglas:
- No inventes cifras.
- No contradigas los valores del snapshot.
- No trates salario pendiente como dinero líquido.
- Prioriza liquidez, compromisos y reserva mínima.
- Sé concreto, breve y accionable.
- Devuelve un JSON válido con esta estructura:
  {
    "status": "ok",
    "summary": string,
    "mainRisk": string,
    "mainOpportunity": string,
    "actions": string[3],
    "tone": "stable" | "cautious" | "warning",
    "shortTip": string
  }

Snapshot:
{{SNAPSHOT_JSON}}
```

---

## 21. Prompt base para consejo por deseo

```text
Actúa como un analista financiero personal especializado en decisiones de compra.
Debes evaluar un deseo de compra usando el snapshot recibido.

Reglas:
- No inventes cifras.
- No contradigas el score ni el dinero asignable.
- No recomiendes comprar si compromete la reserva.
- Si depende de salario pendiente, dilo explícitamente.
- Sé breve, claro y útil.
- Devuelve un JSON válido con esta estructura:
  {
    "status": "ok",
    "decision": "buy_now" | "wait" | "not_recommended",
    "headline": string,
    "reason": string,
    "conditionToBuy": string,
    "urgency": "low" | "medium" | "high",
    "confidence": "low" | "medium" | "high"
  }

Snapshot:
{{SNAPSHOT_JSON}}
```

---

## 22. Eventos que deberían disparar IA

## 22.1 Resumen semanal
Disparar cuando:

- se haga `planning refresh`;
- cambie el score semanal;
- cambie significativamente el breakdown;
- llegue el día configurado en `weekly_summary_day`.

## 22.2 Consejo por deseo
Disparar cuando:

- se crea un deseo;
- cambia `estimated_amount`;
- cambia `priority`;
- cambia `estimated_purchase_date`;
- cambia `confidence_level`;
- cambia el dinero asignable;
- cambia el estado de compromisos relevantes;
- el consejo actual está vencido.

## 22.3 Alertas
Disparar cuando:

- score cae por debajo de umbral;
- reserva queda baja;
- compromiso importante se acerca;
- salario pendiente crece;
- hay conflicto claro entre deseo y liquidez.

---

## 23. Política de expiración y cache

Se recomienda no llamar IA en cada render.

### Estrategia sugerida

#### `financial_scores.ai_tip`
- refrescar 1 vez por semana;
- o si el score cambia materialmente.

#### `wishes.ai_advice`
- refrescar solo si cambian inputs relevantes;
- o si supera TTL de 3 a 7 días.

#### `ai_insights`
- usar `expires_at` según scope.

### Beneficios

- menos costo;
- más consistencia;
- mejor experiencia;
- menor ruido en la UI.

---

## 24. UX sugerida

## 24.1 Dashboard

Bloque nuevo:
- “Estado financiero”
- texto corto de salud
- tip semanal
- alerta principal

## 24.2 Wishlist

Cada deseo muestra:
- viabilidad
- recomendación IA
- motivo corto
- condición para compra

## 24.3 Pantalla de salud financiera

Secciones:
- resumen general
- riesgo principal
- oportunidad principal
- acciones recomendadas
- evolución de score
- compras viables
- compras a posponer

## 24.4 Notificaciones

Transformar eventos duros en mensajes útiles:

- “Tienes suficiente saldo total, pero no suficiente liquidez inmediata.”
- “Este deseo depende de salario pendiente; espera antes de comprar.”
- “Tus compromisos próximos están absorbiendo casi todo el margen.”

---

## 25. Testing recomendado

## 25.1 Unit tests

Para:
- `context-builder`
- normalización de snapshot
- cálculo de inputs que se envían a IA
- invalidación de cache

## 25.2 Contract tests

Validar:
- estructura del payload;
- estructura del JSON de salida;
- fallback si la IA devuelve formato inválido.

## 25.3 Integration tests

Escenarios:
- score sano + bajo compromiso + deseo barato;
- score medio + alto salario pendiente;
- score bajo + reserva insuficiente;
- compromiso cercano + deseo de alta prioridad.

## 25.4 Fallback tests

Si falla la IA:
- no romper UI;
- usar texto por defecto;
- mantener último insight válido.

---

## 26. Fallbacks obligatorios

Si la IA falla, la app debe seguir funcionando.

### Reglas

- `financial_scores.ai_tip` puede quedar nulo;
- `wishes.ai_advice` puede quedar nulo;
- la UI debe mostrar fallback determinista;
- nunca bloquear planning o dashboard por fallo de IA.

### Ejemplos de fallback

- “No hay recomendación disponible por ahora.”
- “Tu score actual es 67. Revisa compromisos y deseos antes de comprar.”
- “Este deseo aún depende de tu capacidad mensual disponible.”

---

## 27. Roadmap de implementación recomendado

## Fase 1 — Integración mínima productiva
Objetivo:
- valor visible rápido usando tablas existentes.

Tareas:
1. crear `context-builder`;
2. crear Edge Function;
3. generar `financial_scores.ai_tip`;
4. generar `wishes.ai_advice`;
5. añadir UI en dashboard y wishlist;
6. añadir fallback UI.

## Fase 2 — Persistencia avanzada
Objetivo:
- trazabilidad y cache.

Tareas:
1. crear `ai_insights`;
2. guardar input/output;
3. añadir TTL y reuso;
4. preparar métricas de calidad.

## Fase 3 — Módulo de salud financiera
Objetivo:
- visión centralizada de salud.

Tareas:
1. nueva pantalla;
2. secciones de riesgos, fortalezas y acciones;
3. conexión con evolución semanal;
4. alertas inteligentes.

## Fase 4 — Simulación
Objetivo:
- ayuda para decisiones.

Tareas:
1. motor determinista de escenarios;
2. IA para interpretar escenarios;
3. UI comparativa.

---

## 28. Criterios de aceptación

La integración estará bien hecha si:

- la IA no reemplaza cálculos financieros exactos;
- los payloads salen de un snapshot estructurado;
- el dashboard muestra un tip útil y consistente;
- cada deseo puede mostrar consejo actualizado;
- la UI tiene fallback cuando falle la IA;
- las respuestas quedan cacheadas o persistidas;
- no se exponen claves privadas en el cliente;
- el sistema sigue funcionando offline/parcial sin IA;
- los consejos no contradicen el score ni el breakdown;
- la arquitectura permite crecer a salud financiera completa.

---

## 29. Tareas concretas para Cursor / IA de implementación

1. Analizar el código actual y ubicar:
   - cómo se calcula `financial_scores.breakdown`;
   - cómo se calcula wishlist projection;
   - dónde vive el refresh de planning;
   - cómo se persisten `wishes` y `financial_scores`.

2. Crear un módulo `src/modules/ai/context-builder.ts` que construya:
   - `buildWeeklyFinancialContext`
   - `buildWishAdviceContext`

3. Crear una Edge Function `financial-ai` que:
   - reciba `scope` + `snapshot`;
   - use prompts distintos por scope;
   - devuelva JSON validado.

4. Conectar la respuesta a:
   - `financial_scores.ai_tip`
   - `wishes.ai_advice`
   - `wishes.last_ai_advice_at`

5. Añadir UI mínima en:
   - dashboard;
   - lista o detalle de wishes.

6. Implementar fallback si la IA no responde.

7. Opcional:
   - crear `ai_insights`;
   - guardar snapshots y respuestas.

---

## 30. Conclusión final

FinFlow IQ ya tiene la base correcta para una integración seria de IA.  
No necesita rehacer su modelo financiero. Necesita encapsular mejor el estado actual y exponérselo a una capa de IA controlada.

La dirección correcta no es “hacer que la IA entienda toda la base”, sino:

- consolidar un snapshot financiero;
- llamar IA con contexto estable;
- persistir insights;
- mostrar recomendaciones donde ya existe valor:
  - score semanal;
  - wishlist;
  - dashboard;
  - alertas.

La mejor estrategia es empezar pequeño, reutilizando:

- `financial_scores.ai_tip`
- `wishes.ai_advice`
- `settings.ai_analysis_frequency`

y luego crecer hacia:

- `ai_insights`
- salud financiera completa
- simulaciones
- alertas inteligentes
- recomendaciones más personalizadas
