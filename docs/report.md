# Reporte de pantallas y estado funcional

Fecha de revision: 2026-03-16

## Objetivo

Este documento inventaria las screens que hoy existen en el proyecto, separa que partes estan realmente implementadas y que partes siguen siendo solo presentacion, y explica como se controla actualmente salario, compromisos y deseos.

La revision se hizo sobre las rutas de `src/app`, los stores Zustand, los modulos de dominio y varios componentes grandes que ya tienen logica pero todavia no estan conectados a una ruta visible.

## Resumen ejecutivo

- La app ya tiene un flujo real de acceso: splash/loading, login con magic link, callback, PIN y onboarding.
- Las tabs principales existen y funcionan, pero no todas tienen el mismo nivel de madurez.
- `Finanzas` es la screen mas operativa para registrar movimientos reales.
- `Planificacion` tiene buena base funcional para metas y deseos, pero la capa "IA" es mixta: parte calculada, parte narrativa visual.
- `Ajustes` tiene gestion real de wallets, preferencias y seguridad, pero las bibliotecas de categorias y fuentes de ingreso son solo lectura.
- `Notificaciones` es una screen estatica: no hay fuente real de datos ni acciones conectadas.
- Hay capacidades ya implementadas en componentes no enroutados:
  - crear periodos salariales;
  - crear compromisos fijos;
  - crear provisiones;
  - registrar pago de compromisos.

## Clasificacion general por screen


| Screen           | Ruta                                                              | Estado               | Comentario corto                                                                               |
| ---------------- | ----------------------------------------------------------------- | -------------------- | ---------------------------------------------------------------------------------------------- |
| Splash / loading | `src/app/index.tsx` + `src/components/app/app-loading-screen.tsx` | Operativa            | Controla restauracion de sesion, seguridad y onboarding.                                       |
| Login            | `src/app/(auth)/login.tsx`                                        | Operativa            | Magic link real con cooldown y bypass dev.                                                     |
| Callback         | `src/app/(auth)/callback.tsx`                                     | Operativa simple     | Valida el retorno del magic link.                                                              |
| PIN              | `src/app/(auth)/pin.tsx`                                          | Operativa            | Alta de PIN, desbloqueo y bloqueo local.                                                       |
| Onboarding       | `src/app/onboarding.tsx`                                          | Operativa            | Crea configuracion minima y primera wallet.                                                    |
| Dashboard        | `src/app/(tabs)/dashboard.tsx`                                    | Mixta                | Mezcla datos reales con tarjetas y tips visuales.                                              |
| Finanzas         | `src/app/(tabs)/finances.tsx`                                     | Mayormente operativa | Movimientos, transferencias y cobro salarial funcionan; compromisos visibles pero incompletos. |
| Planificacion    | `src/app/(tabs)/planning.tsx`                                     | Mixta fuerte         | Metas y deseos funcionan; insights IA son mitad calculo y mitad presentacion.                  |
| Ajustes          | `src/app/(tabs)/settings.tsx`                                     | Mayormente operativa | Wallets, preferencias y seguridad son reales; bibliotecas son solo lectura.                    |
| Notificaciones   | `src/app/(tabs)/notifications.tsx`                                | Diseno / estatica    | Datos fijos, filtros sin logica real.                                                          |


## Inventario detallado por screen

### 1. Splash / carga inicial

Archivos clave:

- `src/app/index.tsx`
- `src/hooks/use-onboarding-guard.ts`
- `src/components/app/app-loading-screen.tsx`
- `src/components/auth/auth-bootstrap.tsx`
- `src/components/security/security-bootstrap.tsx`
- `src/components/app/app-data-bootstrap.tsx`

Que si esta implementado:

- Restaura la sesion de Supabase.
- Escucha deep links del magic link.
- Carga seguridad local antes de dejar entrar al usuario.
- Carga settings y wallets despues de autenticar y desbloquear.
- Decide si el usuario debe ir a login, PIN, onboarding o tabs.

Que es solo presentacion:

- La UI de loading es completamente visual, pero cumple bien su funcion.

Diagnostico:

- Screen real y necesaria.
- No es una simple maqueta.

### 2. Login

Archivo clave: `src/app/(auth)/login.tsx`

Que si esta implementado:

- Valida formato de email.
- Envia magic link usando `sendMagicLink`.
- Muestra feedback de envio.
- Aplica cooldown de 60 segundos.
- Guarda el ultimo email al que se envio link.
- En desarrollo permite `dev bypass`.

Que es solo presentacion:

- Nada importante. La pantalla esta conectada.

Observaciones:

- Si faltan variables de entorno de Supabase, la propia pantalla lo indica.

### 3. Callback

Archivo clave: `src/app/(auth)/callback.tsx`

Que si esta implementado:

- Espera la restauracion de sesion tras el magic link.
- Redirige a la app si la sesion entra bien.
- Permite volver a login si termina en estado no autenticado.

Que es solo presentacion:

- La screen es minima y transitoria. No hay mas funcionalidad que esa.

### 4. PIN

Archivo clave: `src/app/(auth)/pin.tsx`

Que si esta implementado:

- Crear PIN de 4 o 6 digitos.
- Validar formato.
- Desbloquear con PIN.
- Feedback visual si el PIN es incorrecto.
- Forzar salida de sesion con "Olvide mi PIN?".

Que es solo presentacion:

- Nada relevante. El flujo es real.

### 5. Onboarding

Archivos clave:

- `src/app/onboarding.tsx`
- `src/components/onboarding/onboarding-form.tsx`

Que si esta implementado:

- Crea la primera wallet.
- Guarda `dateFormat`.
- Guarda `savingsGoalPercent`.
- En bypass dev crea settings y wallet en local.
- En modo normal persiste settings y wallet real.

Que no hace todavia:

- No configura salario, compromisos, categorias ni fuentes de ingreso.
- Solo define la base minima para entrar a la app.

### 6. Dashboard

Archivo clave: `src/app/(tabs)/dashboard.tsx`

Que si esta implementado:

- Carga wallets reales desde store.
- Permite cambiar wallet activa.
- Trae overview de compromisos y salario.
- Calcula:
  - balance disponible;
  - fondos comprometidos;
  - monto asignable;
  - score de salud financiera;
  - alerta de presupuesto.

Que es mixto o parcial:

- `Salary Outlook` usa datos reales de salario, pero:
  - el badge `PENDING` es fijo;
  - la barra visual no representa un porcentaje financiero consistente;
  - no deja crear periodos salariales.
- `Financial Health` calcula un score con formula local, no con el score semanal persistido de planning.
- `AI TIP` es texto fijo.
- `Quick Insights` mezcla numeros calculados con textos fijos:
  - `Investment Growth` no sale de inversiones reales;
  - `Budget Alert` usa un porcentaje real, pero el subtitulo es fijo.

Diagnostico:

- No es solo diseno.
- Es una screen mixta: la parte financiera base existe, la capa "smart/AI" es casi toda presentacional.

### 7. Finanzas

Archivo clave: `src/app/(tabs)/finances.tsx`

Subvistas disponibles:

- `Movimientos`
- `Salario`
- `Compromiso`

#### 7.1. Movimientos

Que si esta implementado:

- Lista movimientos del ledger por wallet.
- Filtra por todos / ingresos / gastos / transferencias.
- Permite registrar:
  - gasto;
  - ingreso manual;
  - transferencia entre wallets;
  - cobro de salario.
- Actualiza balances de wallet.
- Refresca ledger, exchanges, salario y compromisos.

Que es parcial:

- El switch `Es un deseo de tu wishlist?` solo cambia la descripcion/local draft; no conecta el gasto con la entidad `wish`.
- La hora mostrada usa `toLocaleTimeString`, pero el modelo no guarda una hora real separada del `createdAt`; visualmente se ve completa, pero no es un historial horario confiable.

Diagnostico:

- Es la screen mas operativa de la app visible hoy.

#### 7.2. Salario

Que si esta implementado:

- Filtra periodos salariales segun la moneda de la wallet activa.
- Calcula:
  - salario pendiente;
  - meses sin cubrir;
  - progreso por periodo.
- Permite registrar cobro salarial desde la misma screen.
- Al guardar un cobro:
  - crea `salary_payment`;
  - genera movimiento `salary_payment` en ledger;
  - actualiza balance de wallet;
  - asigna el cobro a periodos pendientes.

Limitaciones actuales:

- Desde esta screen no se pueden crear nuevos `salary_periods`.
- O sea: puedes cobrar salario, pero no puedes construir desde aqui el calendario/base de deuda salarial.
- Algunos textos son fijos:
  - `12% vs last month`
  - `Next due in 4 days`

Diagnostico:

- La vista es funcional para cobrar y consultar.
- Sigue incompleta para administracion salarial completa.

#### 7.3. Compromiso

Que si esta implementado:

- Lista gastos recurrentes (`recurringExpenses`) de la wallet activa.
- Lista provisiones/eventos especiales (`budgetProvisions`) de la wallet activa.
- Muestra importes reales.

Que es solo parcial o presentacional:

- No deja crear compromisos desde la screen visible.
- No deja pagar/settlear compromisos desde la screen visible.
- Los estados no salen del calculo real:
  - en fijos siempre muestra `PENDIENTE`;
  - en eventos especiales siempre muestra `CUMPLIDO`.

Diagnostico:

- Hoy sirve mas como vista de consulta que como modulo operativo.

### 8. Planificacion

Archivo clave: `src/app/(tabs)/planning.tsx`

Subvistas disponibles:

- `Deseos`
- `Insights`

#### 8.1. Deseos

Que si esta implementado:

- Carga deseos reales.
- Filtra por todos / pendientes / comprados.
- Calcula proyecciones por deseo:
  - fecha estimada de compra;
  - meses hasta compra;
  - ratio de progreso;
  - nivel de confianza.
- Permite crear:
  - meta;
  - aporte a meta;
  - deseo.

Que si esta implementado de verdad, aunque no se note a primera vista:

- Crear aporte a meta genera tambien un movimiento `goal_deposit` en el ledger y reduce el balance de la wallet.
- El tip principal sale de datos calculados (`assignableAmount`, faltante de metas y siguiente deseo).

Que falta:

- No se puede editar un deseo.
- No se puede borrar un deseo.
- No se puede marcar manualmente un deseo como comprado desde la UI.
- No se puede reordenar prioridad desde la UI.

Diagnostico:

- El bloque de deseos/metas esta bien encaminado y ya tiene dominio real.

#### 8.2. Insights

Que si esta implementado:

- Calcula score financiero semanal.
- Guarda o actualiza `financial_scores` en Supabase.
- Calcula breakdown real:
  - liquidez;
  - compromisos;
  - estabilidad salarial;
  - ahorro;
  - presion de wishlist.
- Calcula `coverageDays`, ratio de ahorro y overview financiero.

Que es parcial o visual:

- `Actualizado hace 2h` es fijo.
- El bloque `Ingresos vs Gastos` no muestra realmente ingresos vs gastos; reutiliza barras basadas en score/valores derivados.
- `Reporte Narrativo IA` no llama a un modelo real; es texto template con variables.
- El tip final de IA tambien es texto template.

Diagnostico:

- La matematica base existe.
- La capa "IA conversacional" aun es simulada.

### 9. Ajustes

Archivo clave: `src/app/(tabs)/settings.tsx`

Que si esta implementado:

- Mostrar perfil basico desde la sesion.
- Crear wallet.
- Editar wallet.
- Desactivar wallet si queda mas de una activa.
- Cambiar:
  - meta de ahorro;
  - inicio de mes financiero;
  - moneda principal;
  - formato de fecha;
  - frecuencia de analisis;
  - promedio de meses sin cobrar.
- Activar/desactivar PIN.
- Resetear PIN.
- Configurar lock timeout.
- Cerrar sesion.

Que es parcial:

- `Gestion de categorias` y `Fuentes de ingresos` son solo lectura.
- No existe CRUD visible para categorias ni income sources.
- Varias propiedades del modelo `settings` existen en tipos, pero no tienen UI hoy:
  - `salaryReferenceAmount`
  - `usdCupRate`
  - `theme`
  - `weeklySummaryDay`
  - `alertLevel`
  - `subscriptionAlertDays`

Diagnostico:

- Screen bastante util y real.
- La parte de bibliotecas sigue en modo consulta.

### 10. Notificaciones

Archivo clave: `src/app/(tabs)/notifications.tsx`

Que si esta implementado:

- Navegacion desde headers.
- Render de cards y agrupacion visual.

Que es solo diseno:

- Los items estan hardcodeados.
- El filtro segmentado no hace nada.
- `Marcar como leidas` no tiene accion.
- No hay store ni servicio de notificaciones.

Diagnostico:

- Es una screen de presentacion.

## Funcionalidades implementadas pero no conectadas a una screen visible

### 1. Workspace salarial no conectado

Archivo: `src/components/salary/salary-workspace.tsx`

Capacidad real que ya existe:

- crear periodos salariales;
- registrar cobros;
- ver overview salarial;
- listar periodos;
- listar pagos.

Impacto:

- El dominio salarial esta mas avanzado que la ruta visible de `Finanzas > Salario`.
- Hoy el usuario final no puede aprovechar toda esa capacidad porque no hay ruta que la monte.

### 2. Workspace de compromisos no conectado

Archivo: `src/components/commitments/commitment-workspace.tsx`

Capacidad real que ya existe:

- crear gasto recurrente;
- crear provision presupuestaria;
- registrar pago real de un compromiso;
- recalcular overview;
- impactar ledger y balance.

Impacto:

- La app ya tiene implementada la base operativa de compromisos.
- Lo que falta es exponerla en una screen o integrar esas acciones en `Finanzas > Compromiso`.

### 3. Workspace alternativo de ledger no conectado

Archivo: `src/components/ledger/ledger-workspace.tsx`

Capacidad real:

- otra composicion del modulo de finanzas con movimientos, transferencias e indicadores.

Impacto:

- Hay codigo utilizable, pero hoy la ruta visible usa otra implementacion.

## Como se controla hoy el salario

## Modelo actual

Las piezas son:

- `salary_periods`: lo que se esperaba cobrar por periodo.
- `salary_payments`: lo que realmente se cobro.
- `salary_allocations`: como cada cobro se reparte entre periodos.

Archivos clave:

- `src/stores/salary-store.ts`
- `src/modules/salary/calculations.ts`
- `src/modules/salary/service.ts`
- `src/app/(tabs)/finances.tsx`

## Flujo real

1. La app carga periodos, pagos y asignaciones en `useSalaryStore`.
2. Calcula el overview salarial:
  - `pendingTotal`
  - `monthsWithoutPayment`
  - `totalAllocated`
  - `totalReceived`
3. En `Finanzas > Salario`, al registrar un cobro:
  - toma la wallet activa;
  - obliga a que la moneda sea `USD` o `CUP`;
  - busca periodos visibles para esa moneda;
  - reparte el monto entre los periodos pendientes;
  - crea el pago salarial;
  - crea tambien un movimiento de ledger;
  - sube el balance de la wallet.

## Puntos importantes

- El registro de cobro si esta funcionando.
- La creacion de periodos salariales existe en codigo, pero no esta expuesta en la ruta visible actual.
- `monthsWithoutPayment` hoy significa "cantidad de periodos con `coveredAmount === 0`", no literalmente "cuantos meses llevo sin cobrar desde el ultimo pago".
- La asignacion visible del cobro recorre `visiblePeriods` en el orden actual del store. Como los periodos se ordenan descendente por fecha, el pago tiende a asignarse primero a periodos mas recientes, no a los mas viejos.

## Donde impacta el salario en la app

- En `Dashboard` alimenta `Salary Outlook` y parte del score local.
- En `Planificacion` influye en la estabilidad salarial y por tanto en las proyecciones de deseos.

## Inconsistencia importante

La reserva financiera no se calcula igual en todos lados:

- `Dashboard` usa:
  - `recurringCommitted * monthsWithoutPayment * (1 + savingsGoalPercent/100)`
- `Planning` usa:
  - `avgMonthsWithoutPayment * monthlyCommitmentAverage * (1 + savingsGoalPercent/100)`

Eso significa que la app hoy maneja dos conceptos distintos de "colchon por salario inestable":

- uno basado en periodos salariales reales;
- otro basado en una preferencia manual de settings.

## Como se controlan hoy los compromisos

## Modelo actual

Las piezas son:

- `recurring_expenses`: gastos fijos o recurrentes.
- `budget_provisions`: gastos planificados/eventos especiales.
- `ledger_entries` con referencia a compromiso:
  - `recurring_expense_id`
  - `budget_provision_id`

Archivos clave:

- `src/stores/commitment-store.ts`
- `src/modules/commitments/calculations.ts`
- `src/modules/commitments/service.ts`
- `src/modules/provisions/service.ts`

## Como se calcula el control

El overview de compromisos calcula por mes y por wallet:

- cuanto se comprometio;
- cuanto ya se pago;
- cuanto queda pendiente.

Para recurrentes:

- si son mensuales, aplican todos los meses;
- si son anuales, aplican en el `billingMonth`.

Para provisiones:

- si son `once`, aplican solo al mes objetivo;
- si son `yearly`, aplican cada ano en el mes configurado.

Los pagos reales se detectan mirando movimientos del ledger enlazados al compromiso.

## Estado de uso actual

- El calculo de overview si esta implementado y se usa en dashboard, planning y finanzas.
- La screen visible solo deja consultar listas.
- La creacion y el settlement real de compromisos existen, pero estan en `commitment-workspace.tsx`, no en una ruta visible hoy.

## Consecuencia practica

Hoy la app sabe calcular compromisos mejor de lo que deja operarlos desde la UI visible.

En otras palabras:

- el backend/store ya los entiende;
- la tab visible todavia no expone todo ese poder.

## Como se controlan hoy los deseos

## Modelo actual

La pieza base es `wishes`.

Cada deseo guarda:

- nombre;
- monto estimado;
- prioridad;
- wallet;
- estado de compra;
- fecha estimada de compra calculada;
- confidence level / confidence reason.

Archivos clave:

- `src/stores/planning-store.ts`
- `src/modules/wishes/calculations.ts`
- `src/modules/wishes/service.ts`
- `src/app/(tabs)/planning.tsx`

## Logica de proyeccion

Los deseos no se proyectan aislados. Se ordenan por prioridad y compiten entre ellos.

La app calcula:

- `assignableAmount`: dinero libre despues de compromisos y reserva.
- `monthlySavingCapacity`: capacidad mensual de ahorro.
- `salaryStabilityScore`: que tan fragil o estable es el ingreso.

Con eso hace, en orden de prioridad:

1. resta el costo acumulado de deseos anteriores;
2. calcula cuanto del deseo actual ya esta cubierto;
3. estima cuantos meses faltan para comprarlo;
4. genera una fecha estimada de compra;
5. asigna nivel de confianza:
  - `high`
  - `medium`
  - `low`
  - `risky`

## Que si puede hacer hoy el usuario

- Ver deseos pendientes y comprados.
- Crear un deseo nuevo.
- Ver progreso y confianza calculada.

## Que no puede hacer todavia

- Marcar un deseo como comprado desde la UI.
- Conectar un gasto real con un deseo concreto.
- Editar nombre, monto o prioridad.
- Reordenar prioridades arrastrando o similar.

## Lectura practica

Hoy los deseos funcionan como un backlog priorizado con proyeccion financiera, no como un modulo de compra completo de punta a punta.

## Diferencia entre "funcional" y "solo diseno" en este proyecto

Para evitar confusion, esta fue la regla usada en este reporte:

- `Operativa`: persiste, calcula o modifica estado real.
- `Mixta`: parte real y parte hardcodeada/simulada.
- `Diseno / estatica`: casi todo es visual, mock o texto fijo.
- `Implementada pero no conectada`: la logica existe, pero el usuario no la puede abrir desde una ruta principal.

## Riesgos y huecos actuales

- `Notificaciones` es completamente estatica.
- `Dashboard` vende capa IA que todavia es mayormente visual.
- `Finanzas > Compromiso` muestra estados no calculados de verdad.
- `Finanzas > Salario` permite cobrar, pero no crear periodos.
- `Planning > Insights` tiene calculo real, pero narrativa y parte de charts siguen siendo template.
- El flujo de deseos no cierra el ciclo de compra.
- Hay inconsistencia entre formulas de reserva en dashboard y planning.
- La asignacion de cobros salariales parece favorecer periodos mas recientes primero.

## Orden sugerido de maduracion

1. Exponer el `commitment-workspace` en una ruta o integrar sus acciones en `Finanzas > Compromiso`.
2. Exponer la creacion de `salary_periods` en la UI visible.
3. Cerrar ciclo de deseos:
  - marcar comprado;
  - enlazar gasto con deseo;
  - editar prioridad.
4. Reemplazar textos de IA simulada por:
  - calculos honestos;
  - o integracion real con modelo.
5. Unificar la formula de reserva entre dashboard y planning.

