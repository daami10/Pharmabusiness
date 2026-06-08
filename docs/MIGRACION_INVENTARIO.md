# 📦 Inventario y Plan de Migración — Vanilla → `web/` (React)

> Objetivo de esta etapa: **paridad funcional**. Replicar en `web/` (React+TS) todo lo que
> hace hoy el `index.html` legacy, **sin añadir features nuevas** (feature freeze pactado) y
> **sin introducir multi-tenancy todavía** (sigue 1 usuario = 1 farmacia). El multi-tenant
> es una fase posterior — ver [`ARQUITECTURA_V2.md`](./ARQUITECTURA_V2.md).
>
> Estado de partida: legacy = `index.html` (5.324 líneas, 120 funciones, 6 pestañas) en
> producción e intacto. Nueva app andamiada en `web/` (Fase 0 hecha).

---

## 0. Reglas de la migración

1. **Portamos comportamiento, no código.** Nada de copiar `sbToAt`, `esc()`, arrays globales
   ni `innerHTML`. Se reescribe con el stack nuevo.
2. **El legacy sigue vivo** hasta alcanzar paridad total y verificarla. El corte de Vercel a la
   app nueva es el ÚLTIMO paso.
3. **Cada módulo se da por cerrado** cuando: funciona, tiene tests del camino crítico, y se ha
   comparado 1:1 con el legacy (mismos números, mismos filtros).
4. **Deuda que se tira siempre** (no se porta):
   - Wrapper Airtable `sbToAt`/`atToSb` → filas tipadas directas de Supabase.
   - `esc()` manual → React escapa solo.
   - Arrays globales mutables (`allFacturas`, …) + `innerHTML` → TanStack Query + componentes.
   - Bug de pluralización `"facturadots"` en Inicio → se corrige al portar.
   - Botones de año hardcodeados 2025/2026 → generar dinámicamente.
   - Lógica hardcodeada del usuario `demo@gfarma.com` → fuera del frontend.

---

## 1. Piezas compartidas (construir ANTES de los módulos)

Esto es la base que todos los módulos reutilizan. Sin esto, se duplica código.

| Pieza | Destino | Notas |
|---|---|---|
| **Tipos de BD** | `src/types/database.ts` | Generar con `supabase gen types typescript`. Fuente de verdad de los tipos. |
| **Capa de datos** | `src/lib/queries/*.ts` | Un hook TanStack Query por tabla (`useFacturas`, `useNominas`…). Sustituye `sbGet/sbPost/sbPatch/sbDel`. |
| **utils/money.ts** | — | Formato `es-ES` (hoy repetido ~40 veces). |
| **utils/dates.ts** | — | `getVencStatus`, `isFuturePeriod`, `getRemainingMonths` (recurrencia). **Con tests unitarios** — es lógica pura y crítica. |
| **UI: Dialog** | `src/components/ui/` | Base de los ~12 modales. shadcn/ui (Radix) → accesible. |
| **UI: DataTable** | `src/components/ui/` | Tabla reutilizable. |
| **MonthGroupAccordion** | `src/components/` | Tabla agrupada por mes colapsable — se usa en Facturas, Fiscalidad, Nóminas, Seguros (hoy 4 copias del mismo patrón). |
| **StatusBadge** | `src/components/` | Badge vencida/próxima/pendiente/pagada (colores de `VCFG`/`VSTATUS`). |
| **KpiCard** | `src/components/` | Tarjetas KPI (Inicio, Análisis, Fiscalidad). |

---

## 2. Orden de migración (con dependencias)

Se migra en este orden para entregar y verificar de forma incremental. Inicio y Análisis van
tarde porque **agregan datos de todos los demás módulos**.

### Hito 1 — Cimientos
- [ ] **Piezas compartidas** (sección 1).
- [ ] **Auth + sesión**: login/registro/recuperar, `AuthProvider`, guard de rutas.
  *(Vanilla: `submitAuth`, `switchAuthTab`, `signOut`, `onAuthStateChange`, `login-modal`.)*
- [ ] **Layout shell**: sidebar + header + selector de año + router con las 6 rutas.
  *(Vanilla: `switchTab`, `toggleSidebar`, `setYearFilter`, navegación.)*
  - Deuda: año dinámico (no 2025/2026 fijo); `activeYear` pasa a estado (Zustand/Context).

### Hito 2 — Módulos núcleo
- [ ] **Facturas** — el corazón.
  - Tabla agrupada por mes (`renderTable`, `toggleMesGroup`), filtros (texto, mes, importe,
    categoría, estado venc.) (`filterFacturas`, `setTipoFilter`, `updateTipoCounts`,
    `filterByVencStatus`), CRUD + modal (`openModal`, `openEditModal`, `factura-form`,
    `deleteFactura`), export CSV (`exportCSV`), alertas de presupuesto (`checkBudgetAlerts`).
  - **Sub-tarea: OCR** (`scanInvoice`, drag&drop, `photo-input`) → llama a `/api/scan`
    (la función serverless del legacy se conserva tal cual). Validar el JSON con **Zod**.
- [ ] **Calendario de vencimientos**.
  - Rejilla mensual + lista lateral (`renderCalendar`, `renderCalList`, `setCalListFilter`,
    `calPrev/NextMonth`, `calScrollToDay`), marcar pagada/impagada (`markAsPaid/Unpaid`),
    stats (`updateCalStats`).
- [ ] **Modal de vencimientos interactivo** (`showVencListModal`, `modalMarkAsPaid/Unpaid`,
  filtro/búsqueda). Edición de facturas desde aquí (añadido en PR #2).
- [ ] **Abonos** (`renderAbonos`, `openAbonoModal`, `openEditAbonoModal`, `deleteAbono`).
  - Recordatorio: el abono es una factura con `tipo='Abono'` (mismo backend).

### Hito 3 — Módulos de personal y fiscal
- [ ] **Trabajadores + Nóminas + Seguros Sociales**.
  - CRUD de los tres (`loadTrabajadores`, `renderNominas/Seguros`, `save*`, `delete*`,
    `openEdit*`, agrupado por mes, badges previsto/registrado).
  - **Recurrencia** (PR #2): checkbox "repetir mensualmente hasta fin de año" →
    `getRemainingMonths` inserta N filas. Portar este comportamiento.
- [ ] **Fiscalidad** (`loadFiscalidad`, `renderFiscalidad`, `saveFiscal`, `deleteFiscal`,
  KPIs por concepto, recurrencia). Ya **sin IVA/IRPF** (recargo de equivalencia, PR #2).
  - Conserva el fallback "crear tabla en Supabase" si no existe.

### Hito 4 — Vistas agregadas (las que dependen de todo lo anterior)
- [ ] **Inicio** (dashboard): KPIs del mes (`renderInicio`), acciones rápidas
  (`triggerFastAction`, `toggleFastActionDropdown`), drag&drop global de factura.
  - Deuda: arreglar el bug `"facturadots"`.
- [ ] **Análisis** — el más complejo, déjalo casi para el final.
  - Gráficas Chart.js (`renderAnalisisCharts`, `mkChart`) vía `react-chartjs-2`: barras por
    laboratorio, donut, evolución mensual (stacked para mayoristas), abonos, balance.
  - Filtros por fecha y categoría (`applyAnalisisFilter`, `setAnalisisTipo`).
  - **Modal ranking** (`showRankingModal`, podio + barras).
  - **Export PDF** (`exportAnalysisPDF`, html2pdf, plantilla de 2 páginas) → la pieza más
    delicada; valorar `@react-pdf/renderer` o conservar html2pdf.
  - Modal de facturas del periodo (`analisis-facturas-modal`).
- [ ] **Previsión de gasto** (`renderPrevision`, `openPrevisionModal`, acordeón por mes
  agregando facturas/impuestos/nóminas/seguros futuros).

### Hito 5 — Config y cierre
- [ ] **Ajustes / Admin** (`openAdmin`, mayoristas, presupuestos, config Gemini) + **Onboarding**
  de mayoristas + modal de **Privacidad**.
  - Deuda barata a corregir AQUÍ: mover config de `localStorage` (`pb_wholesalers`, `pb_budgets`)
    a Supabase (tu socio ya empezó con user metadata). Unificar en una sola fuente.
- [ ] **Cutover**: desplegar `web/` en Vercel (staging primero), verificar paridad módulo a
  módulo contra el legacy, y solo entonces **cambiar producción** a la app nueva.
- [ ] **Retirar el legacy** (`index.html`, `build.js`) una vez confirmada la paridad.

---

## 3. Inventario de modales (→ componentes `Dialog`)

| Modal legacy | Módulo |
|---|---|
| `modal-factura` (+ OCR) | Facturas |
| `modal-abono` | Abonos |
| `venc-list-modal` | Calendario |
| `seguro-modal`, `nomina-modal`, `trabajador-modal` | Trabajadores |
| `fiscal-modal` | Fiscalidad |
| `ranking-modal`, `analisis-facturas-modal` | Análisis |
| `prevision-modal` | Previsión |
| `admin-panel`, `onboarding-modal`, `wholesaler-onboarding-modal`, `privacy-modal` | Settings/Onboarding |
| `login-modal` | Auth |

Todos comparten patrón → **un solo componente `Dialog`** parametrizable.

---

## 4. Backend que NO cambia en esta etapa

- Tablas Supabase (`facturas`, `trabajadores`, `nominas`, `seguros_sociales`, `fiscalidad`)
  y su RLS actual (por `user_id`) **se mantienen**. La migración es solo de frontend.
- La función serverless `api/scan.js` (proxy de Gemini) **se conserva tal cual**.
- El multi-tenant (organizations + RLS por org) llega DESPUÉS de la paridad.

---

## 5. Riesgos y cómo mitigarlos

| Riesgo | Mitigación |
|---|---|
| Análisis (gráficas+PDF) se atasca | Dejarlo el penúltimo; el resto ya aporta valor. |
| Diferencias sutiles de cálculo vs legacy | Tests en `utils/dates.ts` y comparación 1:1 de totales por módulo. |
| Se cuela una feature nueva durante el freeze | Acuerdo de equipo: Vanilla solo bugfixes. |
| Cutover rompe producción | Staging de `web/` + verificación módulo a módulo antes de cambiar el dominio. |
| Tentación de "mejorar" al portar | Paridad primero. Las mejoras van después, sobre la base limpia. |
