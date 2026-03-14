# FinFlow IQ — Plan Maestro

> Stack: Expo (React Native) + Supabase + Groq IA | Uso: Personal

---

## 1. Visión del Producto

App móvil para control financiero personal con dos bolsillos independientes (`USD` y `CUP`), diseñada para un flujo de ingresos irregular donde la nómina se registra mes a mes pero el dinero real puede recibirse después, de forma parcial, acumulada o distribuida entre varios períodos.

La app debe permitir:

- Registrar y auditar todos los movimientos de dinero
- Saber cuánto dinero hay realmente disponible en cada momento
- Distinguir dinero disponible de dinero comprometido
- Controlar salario pendiente de cobro con trazabilidad completa
- Planificar metas de ahorro y compras futuras
- Usar IA exclusivamente para narrativa, recomendaciones e interpretación, nunca para cálculos financieros exactos

---

## 2. Principios del Sistema

**Fuente de verdad única**
La fuente de verdad financiera es el ledger (`ledger_entries`). Todo movimiento de dinero pasa por ahí.

**Inmutabilidad del ledger**
Los movimientos no se editan ni eliminan. Los errores se corrigen con entradas compensatorias de tipo `adjustment`.

**Determinístico antes que IA**
Todo cálculo exacto es determinístico: balances, pendientes, fechas estimadas, score base, saldo libre, comprometido. La IA solo interviene en narrativa, tips y recomendaciones textuales.

**Campos cacheados vs fuente real**
Algunos campos se persisten por rendimiento pero no son la fuente de verdad:

- `wallets.balance` → fuente real: `SUM(ledger_entries.amount)`
- `salary_periods.covered_amount` → fuente real: `SUM(salary_allocations.allocated_amount)`

---

## 3. Definiciones Financieras Clave

**Saldo disponible**
Dinero real existente en un bolsillo ahora mismo.
`SUM(ledger_entries.amount) WHERE wallet_id = ?`

**Saldo comprometido**
Suma de obligaciones del período actual: suscripciones activas + gastos fijos + eventos presupuestados que caen en el mes en curso. No ha salido del bolsillo, pero ya está destinado.

**Saldo libre**
`saldo_disponible - saldo_comprometido`
El dinero realmente utilizable sin comprometer obligaciones cercanas.

**Pendiente de cobro**
Dinero que la empresa debe por salario y aún no ha llegado al bolsillo.
`SUM(expected_amount - covered_amount) FROM salary_periods WHERE status != 'covered'`

**Reserva sugerida**
Monto prudente a conservar calculado como:
`promedio_meses_sin_cobrar × compromisos_fijos_promedio × (1 + savings_goal_percent / 100)`

**Dinero asignable**
`saldo_libre - reserva_sugerida`
Lo que puede usarse en compras discrecionales sin comprometer estabilidad financiera estimada.

---

## 4. Modelo de Base de Datos

### 4.1 Wallets

```sql
wallets (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id),
  name        TEXT NOT NULL,              -- 'Efectivo USD', 'Banco CUP', etc.
  currency    TEXT NOT NULL,              -- 'USD' | 'CUP' | 'EUR' | cualquier moneda
  color       TEXT,                       -- color de la tarjeta en el dashboard
  icon        TEXT,                       -- ícono opcional
  balance     NUMERIC(15,2) NOT NULL DEFAULT 0,  -- cacheado, fuente real es el ledger
  is_active   BOOLEAN DEFAULT true,
  position    INTEGER NOT NULL DEFAULT 0, -- orden en el carrusel del dashboard
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
  -- sin UNIQUE (user_id, currency): el usuario puede tener varios wallets en la misma moneda
)
```

**Comportamiento:**

- Al registrar cuenta la app arranca **sin wallets**. El usuario crea los suyos en el onboarding o desde settings
- Sin wallets: la app muestra pantalla de bienvenida con botón "Crear primer wallet"
- Sin límite de wallets por usuario
- **Si hay 1 wallet:** la opción de transferencia entre wallets no aparece en ningún lado
- **Si hay 2 o más:** aparece el botón `⇄ Transferir` con selector de wallet origen, wallet destino, monto y tasa de cambio si las monedas difieren
- En el dashboard los wallets se muestran como **tarjetas de banco en carrusel horizontal deslizable**. Al cambiar de tarjeta, las estadísticas del dashboard cambian para reflejar ese wallet

---

### 4.2 Fuentes de Ingreso

```sql
income_sources (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id),
  name        TEXT NOT NULL,           -- 'Salario', 'Freelance', 'Regalo', 'Otro'
  is_default  BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, name)
)
```

Se cargan valores por defecto al crear cuenta. El usuario puede agregar los suyos.

---

### 4.3 Categorías

```sql
categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id),
  name        TEXT NOT NULL,
  icon        TEXT NOT NULL,
  color       TEXT NOT NULL,
  is_default  BOOLEAN DEFAULT false,   -- las predefinidas no se pueden eliminar
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, name)
)
```

---

### 4.4 Ledger Unificado

Toda entrada o salida de dinero pasa por esta tabla. Es inmutable.

```sql
ledger_entries (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES auth.users(id),
  wallet_id             UUID NOT NULL REFERENCES wallets(id),
  amount                NUMERIC(15,2) NOT NULL,  -- positivo: entrada | negativo: salida
  type                  TEXT NOT NULL CHECK (type IN (
                          'income',           -- ingreso manual
                          'salary_payment',   -- cobro real de salario
                          'expense',          -- gasto
                          'exchange_out',     -- salida por cambio de moneda
                          'exchange_in',      -- entrada por cambio de moneda
                          'goal_deposit',     -- abono a meta
                          'goal_withdrawal',  -- retiro de meta
                          'adjustment'        -- corrección contable
                        )),
  description           TEXT,
  category_id           UUID REFERENCES categories(id),
  income_source_id      UUID REFERENCES income_sources(id),
  wish_id               UUID REFERENCES wishes(id),
  exchange_id           UUID REFERENCES currency_exchanges(id),
  salary_payment_id     UUID REFERENCES salary_payments(id),
  goal_contribution_id  UUID REFERENCES goal_contributions(id),
  date                  DATE NOT NULL,
  created_at            TIMESTAMPTZ DEFAULT now()
  -- sin updated_at: los movimientos son inmutables
)
```

**Índices necesarios:**

```sql
CREATE INDEX ON ledger_entries (user_id, date DESC);
CREATE INDEX ON ledger_entries (wallet_id, date DESC);
CREATE INDEX ON ledger_entries (user_id, type);
CREATE INDEX ON ledger_entries (exchange_id);
CREATE INDEX ON ledger_entries (salary_payment_id);
```

---

### 4.5 Módulo de Salario (3 tablas)

Este es el módulo más complejo. Usa tres tablas para soportar cobros parciales, múltiples cobros por mes y trazabilidad completa.

#### a) Períodos de Nómina

Lo que la empresa debe pagar por cada mes trabajado. No implica que el dinero haya llegado.

```sql
salary_periods (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES auth.users(id),
  period_month     DATE NOT NULL,              -- siempre día 1: 2025-01-01
  expected_amount  NUMERIC(15,2) NOT NULL,     -- lo que dice la nómina
  covered_amount   NUMERIC(15,2) NOT NULL DEFAULT 0,  -- cacheado, fuente: SUM(allocations)
  status           TEXT NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending', 'partial', 'covered')),
  notes            TEXT,
  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, period_month)
)
```

#### b) Cobros Reales

Dinero que físicamente llegó al bolsillo, en cualquier moneda.

```sql
salary_payments (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES auth.users(id),
  wallet_id        UUID NOT NULL REFERENCES wallets(id),  -- bolsillo que recibió el dinero
  received_amount  NUMERIC(15,2) NOT NULL,
  currency         TEXT NOT NULL CHECK (currency IN ('USD', 'CUP')),
  received_date    DATE NOT NULL,
  notes            TEXT,
  created_at       TIMESTAMPTZ DEFAULT now()
)
-- El ledger referencia este pago mediante salary_payment_id
```

#### c) Asignaciones

Cómo se distribuyó cada cobro entre los meses pendientes. Tabla intermedia de trazabilidad.

```sql
salary_allocations (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES auth.users(id),
  payment_id        UUID NOT NULL REFERENCES salary_payments(id),
  period_id         UUID NOT NULL REFERENCES salary_periods(id),
  allocated_amount  NUMERIC(15,2) NOT NULL,
  created_at        TIMESTAMPTZ DEFAULT now(),
  UNIQUE (payment_id, period_id)  -- un cobro no puede asignarse dos veces al mismo mes
)
```

**Índices:**

```sql
CREATE INDEX ON salary_allocations (period_id);
CREATE INDEX ON salary_allocations (payment_id);
```

**Cómo fluye un cobro de salario:**

```
Usuario registra: llegaron $2,500 USD
        ↓
Se crea salary_payment (recibido: $2,500 USD)
        ↓
Usuario distribuye en la pantalla:
  Enero   $1,500 → se crea allocation (payment→enero, $1,500)
  Febrero $1,000 → se crea allocation (payment→febrero, $1,000)
        ↓
Se actualiza covered_amount y status de cada período (trigger)
        ↓
Se crea ledger_entry (type: salary_payment, +$2,500, wallet USD)
        ↓
wallet.balance se actualiza
```

**Reglas de consistencia:**

- `SUM(allocations.allocated_amount) WHERE payment_id = X` ≤ `payment.received_amount`
- `SUM(allocations.allocated_amount) WHERE period_id = Y` ≤ `period.expected_amount`

---

### 4.6 Cambio de Moneda

```sql
currency_exchanges (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id),
  from_wallet_id  UUID NOT NULL REFERENCES wallets(id),
  to_wallet_id    UUID NOT NULL REFERENCES wallets(id),
  from_amount     NUMERIC(15,2) NOT NULL,
  to_amount       NUMERIC(15,2) NOT NULL,
  rate            NUMERIC(15,4) NOT NULL,
  date            DATE NOT NULL,
  note            TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
)
```

Cada exchange produce exactamente dos entradas en el ledger: `exchange_out` en el wallet origen y `exchange_in` en el wallet destino. Ambas se crean en una sola transacción RPC. Si cualquiera falla, rollback completo.

**Esta funcionalidad solo está disponible si el usuario tiene 2 o más wallets.** Si solo tiene 1, el botón de transferencia no aparece en la UI.

---

### 4.7 Compromisos Fijos

```sql
recurring_expenses (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id),
  wallet_id    UUID NOT NULL REFERENCES wallets(id),
  name         TEXT NOT NULL,
  amount       NUMERIC(15,2) NOT NULL,
  type         TEXT NOT NULL CHECK (type IN ('subscription', 'fixed_expense')),
  frequency    TEXT NOT NULL CHECK (frequency IN ('monthly', 'yearly')),
  billing_day  INTEGER NOT NULL CHECK (billing_day BETWEEN 1 AND 31),
  category_id  UUID REFERENCES categories(id),
  is_active    BOOLEAN DEFAULT true,
  notes        TEXT,
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now()
  -- next_billing_date se calcula en cliente, no se persiste
)
```

El compromiso afecta el saldo comprometido. El gasto real solo sale del bolsillo cuando el usuario lo registra manualmente como pagado, creando una entrada en el ledger.

---

### 4.8 Eventos Especiales Presupuestados

```sql
budget_provisions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id),
  wallet_id   UUID NOT NULL REFERENCES wallets(id),
  name        TEXT NOT NULL,           -- 'Día de las madres', 'Cumpleaños esposa'
  amount      NUMERIC(15,2) NOT NULL,
  month       DATE NOT NULL,           -- siempre día 1 del mes
  recurrence  TEXT NOT NULL CHECK (recurrence IN ('once', 'yearly')),
  status      TEXT NOT NULL DEFAULT 'planned'
              CHECK (status IN ('planned', 'partial', 'completed', 'skipped')),
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
)
```

Afectan saldo comprometido cuando el mes coincide con el mes actual. No afectan saldo disponible hasta registrar el gasto real.

---

### 4.9 Metas de Ahorro

```sql
goals (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES auth.users(id),
  wallet_id      UUID NOT NULL REFERENCES wallets(id),
  name           TEXT NOT NULL,
  target_amount  NUMERIC(15,2) NOT NULL,
  deadline       DATE,
  icon           TEXT,
  status         TEXT NOT NULL DEFAULT 'active'
                 CHECK (status IN ('active', 'completed', 'cancelled')),
  created_at     TIMESTAMPTZ DEFAULT now(),
  updated_at     TIMESTAMPTZ DEFAULT now()
  -- current_amount NO se persiste, se calcula como SUM(goal_contributions.amount)
)
```

```sql
goal_contributions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id),
  goal_id     UUID NOT NULL REFERENCES goals(id),
  wallet_id   UUID NOT NULL REFERENCES wallets(id),
  amount      NUMERIC(15,2) NOT NULL,
  date        DATE NOT NULL,
  note        TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
)
-- Cada contribución genera una entrada en ledger_entries (goal_deposit)
-- El ledger apunta a goal_contribution_id
```

El progreso de una meta siempre es `SUM(goal_contributions.amount WHERE goal_id = ?)`. Nunca se persiste en la tabla `goals`.

---

### 4.10 Wishlist

```sql
wishes (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                  UUID NOT NULL REFERENCES auth.users(id),
  wallet_id                UUID NOT NULL REFERENCES wallets(id),
  name                     TEXT NOT NULL,
  estimated_amount         NUMERIC(15,2) NOT NULL,
  priority                 INTEGER NOT NULL,
  notes                    TEXT,
  -- calculado determinísticamente (no por IA):
  estimated_purchase_date  DATE,
  confidence_level         TEXT CHECK (confidence_level IN ('high', 'medium', 'low', 'risky')),
  confidence_reason        TEXT,
  last_calculated_at       TIMESTAMPTZ,
  -- solo narrativa de IA:
  ai_advice                TEXT,
  last_ai_advice_at        TIMESTAMPTZ,
  -- estado:
  is_purchased             BOOLEAN DEFAULT false,
  purchased_at             TIMESTAMPTZ,
  created_at               TIMESTAMPTZ DEFAULT now(),
  updated_at               TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, priority)  -- prioridad única por usuario
)
```

**Cómo se calcula la fecha estimada (determinístico):**
Para cada ítem en orden de prioridad, se acumula el costo de los ítems anteriores. Con el dinero asignable actual y la tasa de ahorro mensual esperada se proyecta cuándo habrá suficiente. El confidence_level se basa en la varianza histórica de cobros.

---

### 4.11 Score Financiero

```sql
financial_scores (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id),
  score       INTEGER NOT NULL CHECK (score BETWEEN 0 AND 100),
  week_start  DATE NOT NULL,       -- lunes de la semana
  breakdown   JSONB NOT NULL,
  ai_tip      TEXT,                -- tip narrativo generado por IA
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, week_start)
)
```

**Contrato del campo `breakdown`:**

```json
{
 "liquidity_score": 0,
 "commitment_score": 0,
 "savings_score": 0,
 "salary_stability_score": 0,
 "wishlist_pressure_score": 0,
 "total_score": 0
}
```

El score base se calcula determinísticamente. El `ai_tip` es el único campo que requiere IA.

---

### 4.12 Alertas

```sql
alerts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id),
  type        TEXT NOT NULL,   -- 'salary_overdue' | 'commitment_due' | 'goal_at_risk' | etc.
  title       TEXT NOT NULL,
  message     TEXT NOT NULL,
  is_read     BOOLEAN DEFAULT false,
  expires_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT now()
)
```

---

### 4.13 Configuración

```sql
settings (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                     UUID NOT NULL REFERENCES auth.users(id) UNIQUE,
  savings_goal_percent        INTEGER DEFAULT 20
                              CHECK (savings_goal_percent BETWEEN 0 AND 100),
  salary_reference_amount     NUMERIC(15,2),    -- referencia para IA, no para cálculos
  financial_month_start_day   INTEGER DEFAULT 1
                              CHECK (financial_month_start_day BETWEEN 1 AND 28),
  usd_cup_rate                NUMERIC(10,4),
  avg_months_without_payment  NUMERIC(4,1),     -- calculado por el sistema, editable
  ai_analysis_frequency       TEXT DEFAULT 'each_transaction'
                              CHECK (ai_analysis_frequency IN (
                                'each_transaction', 'daily', 'manual'
                              )),
  alert_level                 TEXT DEFAULT 'normal'
                              CHECK (alert_level IN (
                                'conservative', 'normal', 'aggressive'
                              )),
  subscription_alert_days     INTEGER DEFAULT 3,
  weekly_summary_day          TEXT DEFAULT 'monday',
  primary_currency            TEXT DEFAULT 'USD'
                              CHECK (primary_currency IN ('USD', 'CUP')),
  theme                       TEXT DEFAULT 'dark'
                              CHECK (theme IN ('light', 'dark', 'auto')),
  date_format                 TEXT DEFAULT 'DD/MM/YYYY',
  created_at                  TIMESTAMPTZ DEFAULT now(),
  updated_at                  TIMESTAMPTZ DEFAULT now()
)
```

---

## 5. Reglas de Negocio

**Ledger inmutable**
No se edita ni elimina. Toda corrección usa una entrada de tipo `adjustment` con monto inverso.

**Balance cacheado**
`wallets.balance` se actualiza por trigger o RPC en cada mutación. Si hay inconsistencia, se recalcula con `SUM(ledger_entries.amount WHERE wallet_id = ?)`.

**Cambio de moneda atómico**
Siempre dos entradas en el ledger. Si una falla, rollback de ambas. Se usa un RPC de Supabase con transacción.

**Salary allocations con límite doble**

- `SUM(allocations) WHERE payment_id = X` ≤ `payment.received_amount`
- `SUM(allocations) WHERE period_id = Y` ≤ `period.expected_amount`

**Status del salary_period calculado automáticamente**
Trigger en Supabase que actualiza `covered_amount` y `status` cada vez que se inserta o modifica una allocation:

- `covered = 0` → `pending`
- `0 < covered < expected` → `partial`
- `covered >= expected` → `covered`

**Un cobro de salario es una transacción atómica**
Crea en una sola operación: `salary_payment` + `salary_allocations` + `ledger_entry` + actualización de `wallet.balance`.

**Compromisos no mueven el bolsillo solos**
`recurring_expenses` y `budget_provisions` solo afectan el saldo comprometido. El dinero real sale del bolsillo únicamente cuando el usuario registra el pago manualmente.

**Meta sin `current_amount` persistido**
El progreso siempre es `SUM(goal_contributions.amount)`. Abonar a una meta crea una `goal_contribution` y una entrada en el ledger.

**Prioridad de wishlist única**
`UNIQUE (user_id, priority)`. Al insertar un ítem en medio de la lista, se hace un shift de prioridades antes de insertar.

**Settings y wallets se crean al registrar cuenta**
No hay app sin estos datos. Se crean automáticamente en el onboarding.

---

## 6. Determinístico vs IA

### Determinístico — lógica del sistema

- Balance de wallets
- Saldo comprometido del mes
- Saldo libre
- Reserva sugerida
- Dinero asignable
- Pendiente de cobro de salario
- Progreso de metas
- Fecha estimada de compra en wishlist
- Nivel de confianza de wishlist
- Score base (fórmula ponderada de indicadores)
- Proyección de cuándo se alcanza una meta
- Alertas por reglas (commitment próximo, salary sin cobrar, meta en riesgo)
- Status de salary_period (trigger)
- Next billing date de compromisos (calculado en cliente)

### IA — solo narrativa y recomendaciones

- Tip del score semanal
- Informe narrativo mensual
- Recomendación textual al cobrar salario
- Consejo por ítem de wishlist (el texto, no el cálculo)
- Explicación del estado financiero en lenguaje natural
- Observaciones de patrones de gasto inusuales

**Regla de oro:** si puede expresarse con una fórmula, es determinístico. Si necesita contexto, interpretación o lenguaje natural, puede usar IA.

---

## 7. Plan de Desarrollo por Fases

---

### Fase 1 — Setup y Onboarding Base

**Autenticación:**

- Registro e inicio de sesión via **Magic Link** (Supabase Auth)
- El usuario solo necesita su email, sin contraseña
- El token de sesión se persiste en el dispositivo, no hay que volver a autenticar cada vez

**PIN local:**

- Tras el primer login el usuario configura un PIN de 4 o 6 dígitos
- Cada vez que abre la app (o vuelve desde background tras el tiempo configurado) se pide el PIN
- PIN olvidado → "Olvidé mi PIN" → Magic Link al email → Resetear PIN
- El PIN se guarda localmente con Expo SecureStore, nunca en Supabase

**Flujo de primera vez:**

```
Email → Magic Link → Configura PIN → Crea primer wallet → Onboarding → App
```

**Flujo normal:**

```
Abrir app → Pantalla PIN → App
```

**Resto del setup:**

- Proyecto Expo con Expo Router + navegación base
- Zustand configurado
- Al registrar cuenta se crea automáticamente `settings`, categorías y fuentes de ingreso por defecto
- **Sin wallets al inicio:** la app muestra pantalla de bienvenida con botón "Crear primer wallet"
- Crear wallet pide: nombre, moneda (USD, CUP u otra), color e ícono opcional
- Onboarding mínimo tras crear el primer wallet: % de ahorro y formato de fecha

---

### Fase 2 — Ledger y Balances

- Registrar ingresos con fuente, monto, moneda y fecha
- Registrar gastos con monto, descripción, categoría, fecha y bolsillo
- Todo movimiento pasa por `ledger_entries`
- Balance de cada wallet calculado, persistido y reconciliable
- Historial unificado con filtros por tipo, fecha y wallet
- Dashboard básico: saldo USD, saldo CUP, últimos movimientos

---

### Fase 3 — Módulo de Salario

- Registrar `salary_periods` mes a mes con monto variable
- Registrar `salary_payments` con monto recibido (USD o CUP)
- Pantalla de distribución: asignar el cobro a meses pendientes vía `salary_allocations`
- Un mes puede quedar parcial si el cobro no lo cubre
- Trigger automático actualiza `covered_amount` y `status`
- Validación: suma de allocations no puede superar el payment ni el expected del período
- Widget en dashboard: pendiente total, meses sin cobrar, último cobro

---

### Fase 4 — Transferencia entre Wallets

- Solo disponible si el usuario tiene 2 o más wallets activos
- El botón `⇄ Transferir` aparece en el dashboard y en Finanzas → Movimientos solo cuando aplica
- El modal pide: wallet origen, wallet destino, monto a quitar del origen, tasa de cambio si las monedas difieren, monto calculado que llega al destino
- RPC atómico crea dos entradas en ledger (`exchange_out` + `exchange_in`) en una sola transacción
- Ambos balances se actualizan en el mismo request
- Historial de transferencias visible en Movimientos con tipo diferenciado

---

### Fase 5 — Compromisos Fijos

- Registrar suscripciones y gastos fijos con frecuencia mensual o anual
- Pausar/reactivar sin eliminar
- Al pagar un compromiso, se registra en ledger como `expense` vinculado al `recurring_expense`
- Cálculo determinístico del "comprometido este mes"
- Widget en dashboard: comprometido USD, comprometido CUP

---

### Fase 6 — Eventos Especiales Presupuestados

- Registrar eventos con nombre, monto, mes y recurrencia anual opcional
- Estados: `planned`, `partial`, `completed`, `skipped`
- El monto se suma al comprometido cuando el mes coincide con el mes actual
- Al marcar como gastado, se crea la entrada en ledger
- Listado en pantalla de compromisos junto a los fijos

---

### Fase 7 — Metas de Ahorro

- Crear metas con nombre, monto objetivo, moneda, fecha límite e ícono
- Abonar a una meta crea `goal_contribution` + `ledger_entry` en una sola operación
- Progreso calculado siempre como `SUM(goal_contributions.amount)`
- Estados: activa, completada, cancelada
- Proyección determinística de cuándo se alcanza la meta al ritmo actual

---

### Fase 8 — Wishlist

- Agregar ítems con nombre, monto, moneda, prioridad y notas
- Al insertar en medio de la lista, se hace shift de prioridades con aviso de fechas afectadas
- Fecha estimada y confianza calculadas determinísticamente al guardar o reordenar
- Cálculo en cadena: ítem N no puede comprarse antes de cubrir ítems 1 a N-1
- Al registrar un gasto desde la wishlist, el ítem se marca como comprado automáticamente
- Historial de ítems comprados

---

### Fase 9 — Configuración Completa

- Categorías editables (crear, editar, eliminar; las predefinidas no se borran)
- Fuentes de ingreso personalizables
- Promedio de meses sin cobrar (calculado por sistema, editable manualmente)
- Tema visual: claro, oscuro, automático
- Formato de fecha
- Moneda principal del dashboard
- Exportar datos en CSV
- Borrar todos los datos con confirmación
- **Seguridad PIN:** activar/desactivar, cambiar PIN, tiempo de bloqueo (inmediato / 1 min / 5 min)
- Gestión de wallets: crear, editar, desactivar

---

### Fase 10 — Inteligencia Artificial

- Tip narrativo del score semanal generado por Groq
- Informe narrativo al registrar un cobro de salario: qué recomienda comprar y por qué
- Consejo escrito por ítem de la wishlist (complementa el cálculo determinístico)
- Informe mensual automático al inicio de cada mes
- Detección narrativa de patrones de gasto inusuales
- Todo via Supabase Edge Functions con API key de Groq protegida en servidor
- La IA es completamente opcional: la app funciona al 100% sin ella

---

### Fase 11 — Alertas Proactivas

- Alerta X días antes de un compromiso fijo (configurable: 1, 3 o 7 días)
- Alerta si llevas N meses sin recibir dinero real de salario
- Alerta si el gasto del mes supera el promedio histórico en un umbral
- Alerta si una meta está en riesgo de no alcanzarse antes del deadline
- Resumen semanal push en día y hora configurados
- Expo Notifications + lógica de scheduling en Edge Functions o cliente

---

## 8. Arquitectura del Proyecto

### Navegación — 4 Tabs

```
Tab 1: Inicio        → Dashboard principal
Tab 2: Finanzas      → Movimientos, salario, compromisos
Tab 3: Planificación → Metas, wishlist, insights
Tab 4: Ajustes       → Settings completo
```

Las pantallas secundarias viven dentro de los tabs como secciones con tabs internos o navegación por segmentos. El dashboard tiene accesos rápidos a las acciones más frecuentes para que el usuario nunca necesite navegar dos niveles para registrar algo.

```
┌─────────────────────────────────┐
│  Acciones rápidas (dashboard)   │
│  [+ Gasto]  [+ Ingreso]         │
│  [⇄ Cambiar] [💼 Cobro salario] │
└─────────────────────────────────┘
```

### Estructura de carpetas

```
app/
  (auth)/
  (tabs)/
    index/                  → Dashboard (Tab 1)
    finances/
      index/                → Movimientos — historial ledger (default)
      salary/               → Nóminas y cobros reales
      commitments/          → Suscripciones, gastos fijos, eventos
    planning/
      index/                → Metas de ahorro (default)
      wishes/               → Wishlist con fechas estimadas
      insights/             → Score financiero e IA
    settings/               → Configuración completa (Tab 4)
  modals/
    add-expense/            → Registrar gasto (custom o desde wishlist)
    add-income/             → Registrar ingreso
    add-salary-entry/       → Registrar nómina mensual
    salary-payment/         → Registrar cobro real y distribuir
    currency-exchange/      → Conversión entre bolsillos
    add-wish/               → Agregar ítem a la wishlist
    add-provision/          → Registrar evento especial
    add-goal/               → Crear meta de ahorro
    goal-contribution/      → Abonar a una meta
```

```
modules/            → lógica de negocio desacoplada de la UI
  wallets/
    service.ts
    store.ts
    types.ts
  ledger/
    service.ts
    types.ts
  salary/
    service.ts
    calculations.ts → pendiente, estado, proyecciones
    store.ts
    types.ts
  exchanges/
    service.ts
    types.ts
  commitments/
    service.ts
    calculations.ts → comprometido del mes
    types.ts
  provisions/
    service.ts
    types.ts
  goals/
    service.ts
    calculations.ts → progreso, proyección de fecha
    types.ts
  wishes/
    service.ts
    calculations.ts → fecha estimada, confianza, cadena
    types.ts
  insights/
    service.ts      → llama a Edge Functions de IA
    score.ts        → score base determinístico
  alerts/
    service.ts
    rules.ts        → cuándo disparar cada alerta
  settings/
    service.ts
    types.ts

lib/
  supabase/         → cliente configurado y tipos generados
  date/             → helpers de fecha
  currency/         → formatters de moneda

components/         → UI reutilizable
hooks/              → hooks por dominio
utils/
types/              → tipos globales compartidos
```

---

## 9. Decisiones que No se Deben Romper

- Nunca usar IA para cálculos exactos
- Nunca editar ni eliminar entradas del ledger directamente
- Nunca mezclar nómina esperada con cobro real en una sola tabla
- Nunca persistir `current_amount` en goals sin historial de abonos
- Nunca hacer cambios de moneda fuera de una transacción atómica
- Nunca tratar campos cacheados como fuente de verdad
- Nunca dejar que la IA bloquee la UI: todas las llamadas son asíncronas y opcionales

---

## 10. Próximos Pasos Concretos

---

### Paso 1 — Esquema SQL completo en Supabase

Crear todas las tablas en el SQL Editor de Supabase en este orden (respeta las dependencias entre foreign keys):

```
1. settings
2. wallets
3. income_sources
4. categories
5. currency_exchanges
6. salary_payments
7. salary_periods
8. salary_allocations
9. ledger_entries
10. recurring_expenses
11. budget_provisions
12. goals
13. goal_contributions
14. wishes
15. financial_scores
16. alerts
```

---

### Paso 2 — Políticas RLS

Habilitar RLS en todas las tablas y crear una política por tabla que restrinja cada operación al `user_id` del token de sesión:

```sql
-- Patrón a repetir en cada tabla:
ALTER TABLE nombre_tabla ENABLE ROW LEVEL SECURITY;

CREATE POLICY "usuario solo ve sus datos"
ON nombre_tabla
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
```

Tablas que lo necesitan: `wallets`, `ledger_entries`, `income_sources`, `categories`, `salary_periods`, `salary_payments`, `salary_allocations`, `currency_exchanges`, `recurring_expenses`, `budget_provisions`, `goals`, `goal_contributions`, `wishes`, `financial_scores`, `alerts`, `settings`.

---

### Paso 3 — Triggers obligatorios

**Trigger 1 — Actualizar `wallets.balance`**
Se dispara después de cada INSERT en `ledger_entries`. Suma el `amount` al `balance` del wallet correspondiente.

```sql
-- Lógica:
UPDATE wallets
SET balance = balance + NEW.amount,
    updated_at = now()
WHERE id = NEW.wallet_id;
```

**Trigger 2 — Actualizar `salary_periods.covered_amount` y `status`**
Se dispara después de cada INSERT, UPDATE o DELETE en `salary_allocations`. Recalcula `covered_amount` y actualiza `status` automáticamente.

```sql
-- Lógica:
UPDATE salary_periods
SET covered_amount = (
  SELECT COALESCE(SUM(allocated_amount), 0)
  FROM salary_allocations
  WHERE period_id = NEW.period_id
),
status = CASE
  WHEN covered_amount = 0 THEN 'pending'
  WHEN covered_amount < expected_amount THEN 'partial'
  ELSE 'covered'
END,
updated_at = now()
WHERE id = NEW.period_id;
```

---

### Paso 4 — RPCs obligatorios

Funciones de Supabase que ejecutan operaciones atómicas en una sola transacción. Si cualquier paso falla, hace rollback completo.

**RPC 1 — `transfer_between_wallets`**
Crea el `currency_exchange` + dos entradas en `ledger_entries` (`exchange_out` y `exchange_in`) en una sola transacción.

Parámetros: `from_wallet_id`, `to_wallet_id`, `from_amount`, `to_amount`, `rate`, `date`, `note`

**RPC 2 — `register_salary_payment`**
Crea el `salary_payment` + las `salary_allocations` seleccionadas + una entrada en `ledger_entries` de tipo `salary_payment`, todo en una sola transacción.

Parámetros: `wallet_id`, `received_amount`, `currency`, `received_date`, `allocations: [{period_id, allocated_amount}]`, `notes`

**RPC 3 — `add_goal_contribution`**
Crea la `goal_contribution` + una entrada en `ledger_entries` de tipo `goal_deposit` en una sola transacción.

Parámetros: `goal_id`, `wallet_id`, `amount`, `date`, `note`

**RPC 4 — `reconcile_wallet_balance`**
Recalcula el balance real de un wallet desde el ledger y lo compara con el valor cacheado. Si hay diferencia, lo corrige.

Parámetros: `wallet_id`

---

### Paso 5 — Datos iniciales (seed)

Al crear cuenta se insertan automáticamente via trigger o función en Supabase:

**Categorías por defecto:**
Comida, Transporte, Salud, Entretenimiento, Ropa, Hogar, Educación, Servicios, Otro

**Fuentes de ingreso por defecto:**
Salario, Freelance, Regalo, Venta, Otro

**Settings:** un registro con todos los valores por defecto

---

### Paso 6 — Tipos TypeScript

Generar los tipos desde el esquema de Supabase con el CLI:

```bash
npx supabase gen types typescript --project-id <project-id> > types/supabase.ts
```

Luego crear tipos de dominio en `types/` para los modelos que la app usa directamente (wallets con balance calculado, salary_period con su estado visual, wish con fecha estimada, etc.).

---

### Paso 7 — Estructura inicial del proyecto Expo

Crear la estructura de carpetas base antes de escribir la primera pantalla:

```bash
# Instalar dependencias clave de la Fase 1
npx expo install expo-router expo-secure-store @supabase/supabase-js zustand
```

Carpetas a crear desde el inicio: `app/`, `modules/`, `lib/supabase/`, `components/`, `hooks/`, `utils/`, `types/`.

---

_Plan Maestro — FinFlow IQ_
