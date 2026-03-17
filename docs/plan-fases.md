# Plan por fases (orden libre)

## Resumen

Este plan esta dividido en fases modulares. Puedes elegir cualquier fase para empezar, y la implementamos completa (UI + Supabase + pruebas de esa fase).

## Fase A: Wallets y acciones destructivas [HECHA]

- Regla: wallet sin referencias se elimina; con referencias solo se desactiva.
- Confirmacion obligatoria antes de eliminar o desactivar.
- Mensajes claros cuando una wallet no se puede eliminar por referencias.
- Servicios Supabase: `delete` seguro + `deactivate` controlado.

## Fase B: Ajustes estilo iOS/Android [HECHA]

- Ajustes como lista de secciones navegables a subpantallas.
- Cada opcion con flujo propio.
- Sin agrupar acciones en un solo bottom sheet.
- Subpantallas minimas: Seguridad, Wallets, Categorias, Fuentes de ingreso.

## Fase C: Seguridad [HECHA]

- Timeout por inactividad: `inmediato`, `5`, `10`, `20`, `30` minutos.
- Cierre de sesion automatico al exceder inactividad.
- MFA TOTP como toggle unico (activar/desactivar segun estado).
- Validacion de configuracion Supabase para evitar `MFA enroll is disabled for TOTP`.

## Fase D: Finanzas

- Dejar solo `Movimientos` y `Salario`.
- Mantener registro de salario en historial de nomina.
- Mantener registro de gasto como movimiento.

## Fase E: Planificacion

- Dejar solo `Compromisos` y `Deseos`.
- Crear compromiso (obligacion futura).
- Crear deseo con prioridad sin generar movimiento contable.

## Fase F: Insights

- Sacar Insights de Planificacion.
- Crear pantalla independiente.
- Acceso desde boton en Dashboard.

## Fase G: CRUD de Categorias y Fuentes de ingreso

- Alta, edicion y eliminacion por usuario (no global).
- Confirmaciones en eliminacion.
- Validaciones de referencias antes de borrar.

## Cambios de interfaces/API (globales)

- `wallets`: operacion de borrado seguro y desactivacion.
- `settings/security`: `inactivity_timeout` y estado MFA unificado.
- `categories` e `income_sources`: `create`, `update`, `delete` user-scoped.
- Navegacion: rutas de subpantallas de ajustes + ruta de insights independiente.
- Utilidad comun de confirmacion destructiva.

## Pruebas por fase

- Pruebas funcionales de UI del flujo principal de cada fase.
- Pruebas de reglas de negocio de esa fase.
- Pruebas de integracion Supabase de esa fase.
- Prueba de no regresion rapida en tabs principales: Dashboard, Finanzas, Planificacion, Ajustes.

## Supuestos

- Implementacion con Supabase real desde el inicio.
- Puedes empezar por cualquier fase; solo aplicamos prerequisitos minimos si una fase depende de otra.
- Criterio de cierre por fase: funcionalidad visible + persistencia correcta + validaciones + confirmaciones.
