# 🏗️ Plan de Arquitectura — GFarma v2 (SaaS Multi-Tenant)

> Documento vivo. Objetivo: llevar GFarma de "herramienta para una farmacia" (prototipo
> Vanilla JS monolítico) a "**SaaS multi-cliente mantenible y seguro**", sin reescribir desde
> cero y conservando el conocimiento de dominio ya validado.
>
> **Decisiones tomadas** (sesión 2026-06-05):
> - Frontend → **React + Vite + TypeScript**.
> - Modelo → **multi-tenant**: cada farmacia es una *organización* con varios usuarios y roles.
> - Alcance de esta fase → **fundación técnica**. La monetización/billing se diseña después.

---

## 0. Principios rectores

1. **Refactor incremental, no big-bang.** La app actual sigue viva en producción hasta que
   cada módulo nuevo lo sustituye. Nunca un "apagón" de meses.
2. **El backend (Supabase) se conserva.** Es un stack válido para SaaS. Lo que cambia es
   *cómo* modelamos los datos (tenancy) y *cómo* construimos el frontend.
3. **La seguridad no es una fase, es transversal.** La RLS por organización y el manejo de
   secretos se diseñan desde el primer commit.
4. **TypeScript de extremo a extremo.** Tipos generados desde el esquema de la BD → si cambia
   una columna, el compilador te avisa. Esto es el 80% de "mantenible".
5. **El estado del servidor no se gestiona a mano.** Fuera los `let allFacturas = []` globales;
   entra una capa de *data fetching* con caché (TanStack Query).

---

## 1. Stack objetivo

| Capa | Tecnología | Por qué |
|---|---|---|
| Build / dev | **Vite** | Rápido, estándar actual, HMR. |
| Lenguaje | **TypeScript** | Mantenibilidad y refactors seguros. |
| UI | **React 18** | Lo pediste; ecosistema y empleabilidad. |
| Routing | **React Router** | Rutas por módulo (`/facturas`, `/analisis`...). |
| Estado servidor | **TanStack Query** | Caché, refetch, loading/error states. Sustituye los arrays globales mutables. |
| Estado UI | **Zustand** (o Context) | Solo para estado puramente de UI (organización activa, modales). |
| Estilos | **Tailwind CSS** (ya lo usáis) | Conservamos el diseño actual. |
| Primitivas UI | **shadcn/ui** (Radix + Tailwind) | Modales, dropdowns, tablas *accesibles* y ya estilables. Tenéis MUCHOS modales — esto los unifica. |
| Formularios | **React Hook Form + Zod** | Validación declarativa. Zod además valida el JSON del OCR de Gemini (reutilización). |
| Gráficas | **react-chartjs-2** (wrapper de Chart.js) | Mínima fricción: ya domináis Chart.js. |
| PDF | **html2pdf.js** (de momento) | Funciona; se puede migrar a `@react-pdf/renderer` más adelante. |
| Backend / BD / Auth | **Supabase** (se conserva) | PostgreSQL + RLS + Auth. |
| Funciones servidor | **Supabase Edge Functions** o Vercel Functions | Proxy de Gemini, tareas con secretos. |
| Tests | **Vitest** (unit/componente) + **Playwright** (E2E) | Incluye tests de **aislamiento entre tenants** (críticos). |
| CI/CD | **GitHub Actions** + **Vercel** | Lint + typecheck + test en cada PR; previews automáticos. |

---

## 2. Modelo de datos multi-tenant

### 2.1 El cambio conceptual

Hoy: `dato → user_id` (1 usuario = 1 farmacia).
Mañana: `dato → org_id` (la farmacia es la unidad; los usuarios *pertenecen* a ella).

### 2.2 Tablas nuevas

```sql
-- La farmacia / tenant
create table organizations (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  created_at  timestamptz not null default now()
);

-- Relación usuario ⇄ organización, con rol
create type org_role as enum ('owner', 'admin', 'member');

create table memberships (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references organizations(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  role        org_role not null default 'member',
  created_at  timestamptz not null default now(),
  unique (org_id, user_id)
);
create index on memberships (user_id);
create index on memberships (org_id);

-- Configuración por organización (sustituye localStorage)
create table organization_settings (
  org_id      uuid primary key references organizations(id) on delete cascade,
  wholesalers text[] not null default array['FedeFarma'],   -- mayoristas
  budgets     jsonb  not null default '{}'::jsonb,           -- presupuestos por laboratorio
  updated_at  timestamptz not null default now()
);

-- Invitaciones (para que el titular añada a sus empleados)
create table invitations (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references organizations(id) on delete cascade,
  email       text not null,
  role        org_role not null default 'member',
  token       uuid not null default gen_random_uuid(),
  accepted_at timestamptz,
  created_at  timestamptz not null default now()
);
```

> **Nota sobre configuración:** todo lo que hoy vive en `localStorage` (`pb_wholesalers`,
> `pb_budgets`, `pb_gemini`, `pb_model`) se mueve a `organization_settings`. Razón: en un SaaS,
> el titular y sus empleados deben ver la misma config, y no se puede perder al cambiar de
> navegador. *(La key de Gemini personal deja de tener sentido: se usa siempre el proxy.)*

### 2.3 Tablas de dominio existentes

A **cada** tabla (`facturas`, `trabajadores`, `nominas`, `seguros_sociales`, `fiscalidad`)
se le añade `org_id` y se elimina la dependencia de `user_id` para el aislamiento
(se puede conservar `user_id` como "quién creó el registro", para auditoría):

```sql
alter table facturas add column org_id uuid references organizations(id) on delete cascade;
-- ...idem para el resto de tablas
create index on facturas (org_id);
```

---

## 3. Seguridad: RLS por organización

El aislamiento entre farmacias es **la pieza más crítica del producto**. Un fallo aquí = brecha
total = fin del negocio. Por eso se hace con funciones reutilizables y se **testea**.

### 3.1 Funciones auxiliares (`SECURITY DEFINER` para evitar recursión en RLS)

```sql
create or replace function public.is_org_member(target_org uuid)
returns boolean
language sql security definer stable
set search_path = public as $$
  select exists (
    select 1 from memberships
    where org_id = target_org and user_id = auth.uid()
  );
$$;

create or replace function public.has_org_role(target_org uuid, roles org_role[])
returns boolean
language sql security definer stable
set search_path = public as $$
  select exists (
    select 1 from memberships
    where org_id = target_org and user_id = auth.uid() and role = any(roles)
  );
$$;
```

### 3.2 Políticas por tabla (ejemplo con `facturas`)

```sql
alter table facturas enable row level security;

create policy "facturas_select" on facturas for select
  using (is_org_member(org_id));

create policy "facturas_insert" on facturas for insert
  with check (is_org_member(org_id));

create policy "facturas_update" on facturas for update
  using (is_org_member(org_id));

-- Borrar solo titular/admin (los empleados no eliminan):
create policy "facturas_delete" on facturas for delete
  using (has_org_role(org_id, array['owner','admin']::org_role[]));
```

> Se replica el mismo patrón en todas las tablas de dominio y en `organization_settings`.
> Las `memberships` tienen su propia política (un usuario ve las membresías de las orgs a las
> que pertenece); como `is_org_member` es `SECURITY DEFINER`, no hay recursión infinita.

### 3.3 Roles (v1, simple y ampliable)

| Rol | Permisos |
|---|---|
| `owner` | Todo + gestionar usuarios/invitaciones + borrar la organización. |
| `admin` | Todo el dato (incl. borrar), no gestiona la organización. |
| `member` (empleado) | Leer y crear; no borra ni edita config sensible. |

### 3.4 Higiene de secretos (heredado del análisis previo — bloqueante)

- **Rotar la `service_role` key** que estaba en `import.js` (asumir comprometida).
- Secretos **solo** en variables de entorno de Vercel/Supabase, nunca en el repo.
- Gemini siempre detrás de la función serverless (sin fallback de key en el cliente).
- Revisar el **historial de Git** y purgar secretos si quedaron commiteados.

---

## 4. Estructura de código del frontend

```
src/
  lib/
    supabase.ts            # cliente único, tipado
    queryClient.ts         # config TanStack Query
  types/
    database.ts            # GENERADO con `supabase gen types typescript`
    domain.ts              # tipos de dominio (Factura, Abono, Nomina...)
  providers/
    AuthProvider.tsx       # sesión + usuario
    OrgProvider.tsx        # organización activa + rol del usuario
  features/
    auth/                  # login, registro, aceptar invitación
    organizations/         # crear org, invitar usuarios, ajustes
    facturas/
      api.ts               # hooks de TanStack Query (useFacturas, useCreateFactura...)
      components/          # TablaFacturas, ModalFactura, FiltrosFacturas
      FacturasPage.tsx
    abonos/
    analisis/              # gráficas + PDF + modal ranking
    fiscalidad/
    trabajadores/          # trabajadores + nóminas + seguros
    prevision/
    calendario/            # vencimientos
    settings/              # mayoristas, presupuestos, IA
  components/
    ui/                    # shadcn: Button, Dialog, Table, Select...
    KpiCard.tsx            # componentes compartidos del dominio
    MonthGroup.tsx         # tabla agrupada por mes colapsable (reutilizada en 4 sitios)
    StatusBadge.tsx        # badge vencida/próxima/pendiente/pagada
  hooks/
  utils/
    money.ts               # formato es-ES (hoy repetido ~40 veces)
    dates.ts               # getVencStatus, isFuturePeriod...
  App.tsx                  # router + layout (sidebar + header)
  main.tsx
```

### 4.1 Mapeo módulo actual → nuevo

| Hoy (en `index.html`) | Pasa a ser |
|---|---|
| `allFacturas`, `sbGet/sbPost/...` | `features/facturas/api.ts` (hooks de Query) |
| `renderTable`, `filterFacturas` | `features/facturas/components/TablaFacturas.tsx` |
| `sbToAt` / `atToSb` (adaptador Airtable) | **Se elimina.** Tipos planos directos de la BD. |
| `mkChart`, `renderAnalisisCharts` | `features/analisis/` con `react-chartjs-2` |
| Modales (8+) repartidos por el HTML | `components/ui/Dialog` + un componente por modal |
| `esc()` manual | Innecesario: React escapa por defecto (elimina clase de bugs XSS) |
| Config en `localStorage` | `features/settings/` + `organization_settings` |
| Formato `toLocaleString('es-ES',...)` repetido | `utils/money.ts` |

> **Nota:** migrar a React elimina de raíz dos familias enteras de problemas del código actual:
> el escapado manual de HTML (XSS) y el re-render manual con `innerHTML` + arrays globales
> mutables (que es de donde salen bugs como el de `activeTab`).

---

## 5. Tooling y entornos

### 5.1 Entornos

| Entorno | Supabase | Frontend |
|---|---|---|
| **Local** | Supabase CLI (`supabase start`, Docker) | `vite dev` |
| **Staging** | Proyecto Supabase aparte | Preview de Vercel (cada PR) |
| **Producción** | Proyecto Supabase prod | Vercel prod |

### 5.2 Migraciones de BD

- Versionadas en el repo con **Supabase CLI** (`supabase/migrations/*.sql`).
- Se acabó el "ejecuta este SQL a mano en el editor de Supabase" (como pasa hoy con `fiscalidad`).
- Tipos TS regenerados tras cada migración: `supabase gen types typescript > src/types/database.ts`.

### 5.3 CI (GitHub Actions, en cada PR)

1. `lint` (ESLint) + `format:check` (Prettier)
2. `typecheck` (`tsc --noEmit`)
3. `test` (Vitest)
4. `test:rls` (script que arranca Supabase local y prueba aislamiento entre 2 orgs)
5. `build` (Vite)

### 5.4 Tests imprescindibles (no negociables antes del 2º cliente)

- **Aislamiento multi-tenant:** crear org A y org B con datos; verificar que un usuario de A
  **jamás** lee/edita/borra datos de B. (Playwright + Supabase, o test SQL directo.)
- **Roles:** un `member` no puede borrar; un `owner` sí.
- **Flujo de auth + invitación:** registro → crear org → invitar → aceptar → ver datos.
- Camino crítico de Facturas (crear, editar, marcar pagada, filtrar).

---

## 6. Hoja de ruta (incremental)

> Sin estimaciones de tiempo (dependen de vuestra disponibilidad). El orden sí importa:
> cada fase deja la app **funcionando**.

### Fase 0 — Andamiaje (la app actual sigue en producción)
- [ ] Scaffold Vite + React + TS + Tailwind + ESLint/Prettier.
- [ ] shadcn/ui inicializado. TanStack Query configurado.
- [ ] Cliente Supabase tipado. Variables de entorno por entorno.
- [ ] Pipeline CI + deploy preview en Vercel.

### Fase 1 — Fundación de datos (backend, transparente para el usuario actual)
- [ ] Migraciones: `organizations`, `memberships`, `organization_settings`, `invitations`.
- [ ] Añadir `org_id` a todas las tablas de dominio.
- [ ] **Backfill:** crear una organización por cada usuario existente y migrar sus datos a ella.
- [ ] Reescribir toda la RLS de `user_id` → `org_id` con `is_org_member`/`has_org_role`.
- [ ] Tests de aislamiento en verde.
- [ ] Rotar secretos + limpiar repo/historial.

### Fase 2 — Esqueleto de la app React
- [ ] Auth (login/registro/recuperación) + `AuthProvider`.
- [ ] `OrgProvider` (organización activa + rol).
- [ ] Layout: sidebar + header + router. Réplica fiel del diseño actual.
- [ ] Flujo de invitar/aceptar usuarios.

### Fase 3 — Migración de módulos (uno a uno, en este orden)
- [ ] **Facturas** (núcleo) → con su calendario de vencimientos.
- [ ] Abonos.
- [ ] Trabajadores (trabajadores + nóminas + seguros).
- [ ] Fiscalidad.
- [ ] Análisis (gráficas + PDF + ranking).
- [ ] Previsión de gasto.
- Cada módulo: tipos → hooks de Query → componentes → tests → reemplaza al equivalente Vanilla.

### Fase 4 — Configuración y ajustes
- [ ] Settings de organización (mayoristas, presupuestos) desde la BD.
- [ ] Gestión de usuarios y roles (UI).
- [ ] OCR de Gemini consolidado en Edge Function.

### Fase 5 — Retirada del monolito
- [ ] Eliminar `index.html` / `dist` antiguos.
- [ ] Documentar (README + este doc actualizado).

### Fuera de alcance ahora (fases futuras)
- Billing/suscripciones (Stripe), planes y límites.
- Roadmap de producto: alertas por email, export Excel, OCR por lotes.
- Cumplimiento RGPD formal (DPA por cliente, retención, borrado) — **consultar asesor legal
  antes de onboardear farmacias de terceros con datos de empleados**.

---

## 7. Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Fallo de RLS expone datos entre farmacias | Funciones reutilizables + tests de aislamiento en CI. |
| El refactor se eterniza y bloquea ventas | Migración por módulos; la app vieja sigue viva mientras tanto. |
| Backfill de datos existentes sale mal | Hacerlo en staging primero, con backup y script idempotente. |
| Dos personas, una migración grande | Empezar por la fundación (fases 0-2) antes de tocar features. |
| Sobre-ingeniería | Billing y features de producto quedan explícitamente fuera de esta fase. |

---

## 8. Resumen de una frase

> Conservamos Supabase y el conocimiento de dominio; reconstruimos el frontend en
> **React + TypeScript modular**, introducimos **multi-tenancy con organizaciones y roles**
> protegida por **RLS testeada**, y lo hacemos **módulo a módulo** sin apagar nunca la app actual.
