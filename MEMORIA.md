# 🧠 MEMORIA DEL PROYECTO: GFarma

Este archivo funciona como la **memoria persistente a largo plazo** del proyecto. Está diseñado para que cualquier asistente de IA (o tú mismo) lo lea al inicio de cada sesión y comprenda inmediatamente el estado actual del desarrollo, las decisiones de diseño, la estructura técnica y las tareas pendientes.

> [!IMPORTANT]
> **REGLA DE ORO:** Al finalizar cada sesión de trabajo, el asistente de IA y el usuario deben actualizar la sección **"Historial de Sesiones y Cambios"** y los **"Siguientes Pasos"** para mantener la continuidad absoluta del proyecto.

---

## 📌 1. Descripción General
**GFarma** es una aplicación web de página única (SPA) diseñada para la gestión farmacéutica. Permite centralizar y analizar los gastos de laboratorios y proveedores, supervisar vencimientos de facturas en un calendario mensual interactivo, gestionar abonos/devoluciones y administrar la información laboral del personal (nóminas y seguros sociales).

---

## 🛠️ 2. Stack Tecnológico y Configuración
*   **Frontend**: HTML5, Vanilla JavaScript, Tailwind CSS (vía CDN) y **Chart.js** (vía CDN) para la visualización de datos y gráficos interactivos.
*   **Backend & Base de Datos**: **Supabase** (PostgreSQL) para la base de datos en tiempo real y la autenticación de usuarios.
*   **Despliegue**: **Vercel** (`vercel.json`), configurado con un comando de compilación personalizado (`node build.js`).
*   **Proceso de Compilación (`build.js`)**: Lee el archivo original `index.html`, inyecta dinámicamente las claves de Supabase y Gemini desde las variables de entorno de producción, y genera el archivo desplegable `/dist/index.html`.

---

## 💾 3. Esquema de Base de Datos (Supabase)

El proyecto cuenta con cuatro tablas principales protegidas por **Row Level Security (RLS)** bajo la política `own_data` (el usuario autenticado solo puede ver y modificar sus propios registros):

### 📑 Tabla: `facturas`
Almacena tanto las facturas de proveedores como los abonos (devoluciones).
*   `id` (UUID, PK)
*   `user_id` (UUID, FK a `auth.users`)
*   `laboratorio` (TEXT) — Nombre del proveedor o laboratorio.
*   `num_factura` (TEXT, Nullable) — Número identificador de la factura.
*   `fecha` (DATE) — Fecha de emisión.
*   `importe` (DECIMAL 10,2) — Cuantía económica.
*   `fecha_vencimiento` (DATE, Nullable) — Fecha límite de pago.
*   `pagada` (BOOLEAN) — Estado de pago.
*   `tipo` (TEXT) — Categoría del registro (`'Laboratorio'`, `'FedeFarma'`, `'Otro'`, o `'Abono'`).

### 👥 Tabla: `trabajadores`
Almacena el personal contratado.
*   `id` (UUID, PK)
*   `user_id` (UUID, FK a `auth.users`)
*   `nombre` (TEXT) — Nombre completo del trabajador.
*   `created_at` (TIMESTAMPTZ)

### 📈 Tabla: `nominas`
Almacena el histórico de salarios liquidados.
*   `id` (UUID, PK)
*   `user_id` (UUID, FK a `auth.users`)
*   `trabajador_id` (UUID, FK a `trabajadores`)
*   `trabajador_nombre` (TEXT) — Nombre guardado para búsquedas rápidas.
*   `fecha` (DATE) — Mes/año de liquidación.
*   `importe` (DECIMAL 10,2) — Importe de la nómina.
*   `concepto` (TEXT) — Detalles (ej: "Paga doble", "Nómina ordinaria").

### 🛡️ Tabla: `seguros_sociales`
Almacena los pagos a la Seguridad Social de la empresa.
*   `id` (UUID, PK)
*   `user_id` (UUID, FK a `auth.users`)
*   `fecha` (DATE) — Mes/año de la cotización.
*   `importe` (DECIMAL 10,2) — Coste.
*   `notas` (TEXT) — Observaciones adicionales.

---

## 🔑 4. Credenciales y Entorno (Producción)
Para desplegar el proyecto en Vercel, es necesario configurar las siguientes variables de entorno en el panel de Vercel:
*   `SUPABASE_URL`: URL del proyecto de Supabase.
*   `SUPABASE_ANON_KEY`: Clave anónima pública del frontend.
*   `GEMINI_KEY`: Clave de API de Gemini para características inteligentes.

> [!CAUTION]
> **Seguridad:** Los valores de producción reales se encuentran documentados localmente en `claves.txt`. Nunca subas dicho archivo ni lo incluyas en el repositorio público de Git.

---

## 📅 5. Historial de Sesiones y Cambios

| Sesión | Fecha | Resumen de Cambios | Estado / Decisión |
| :--- | :--- | :--- | :--- |
| **0** | *Antes de hoy* | Migración exitosa de Airtable a Supabase. Configuración de tablas, triggers de autenticación y RLS en la base de datos. Creación de gráficos en la pestaña Análisis. | Completado |
| **1** | `2026-06-01` | Creación de **`MEMORIA.md`** para persistencia de contexto. Corrección de **fuga de datos en el cierre de sesión (`signOut`)** en `index.html`. Rediseño estético total a **Dark Mode Premium & Glassmorphism** (Header, Calendario, KPIs vibrantes, Tablas y todos los Modales de la app). Compilación final exitosa para producción en Vercel. | Completado |
| **2** | `2026-06-01` | Integración del **modal interactivo de ranking de gasto** para la tarjeta **Top Proveedor** en la pestaña de Análisis (activo en categorías de Laboratorio y Otros, con insignias de podio, porcentajes relativos y barras de progreso en degradado de azul a cian). Rediseño completo de la aplicación al estilo **Sleek Midnight Blue (Medianoche Eléctrico)** con degradado marino, bordes de neón cian y glows unificados. **Corrección de contraste y rediseño de legibilidad en la pestaña de Trabajadores** (reemplazando colores claros incompatibles por diseño integrado con textos en blanco puro de alta visibilidad). | Completado |
| **3** | `2026-06-03` | **Pestaña Inicio**: Creación de un Dashboard de bienvenida que resume KPIs del mes en curso y aloja las **Acciones Rápidas** y el **Drag & Drop** global para escanear facturas. **Seguridad y OCR**: Proxy seguro `/api/scan.js` para Gemini, actualización del prompt de IA para extraer y autorrellenar fechas de vencimiento. **Mejoras UX y Edición**: Selectores Dropdown de mes/año para nóminas/seguros sociales, botones de edición en listas (lápiz), reubicación de Previsión de Gasto a Inicio con rediseño esmeralda. **Legales**: Redacción de Política de Privacidad y DPA en `docs/` e integración del modal de Privacidad en el sidebar. | Completado |
| **4** | `2026-06-05` | **Corrección de bugs y UX**: Eliminado el renderizado literal de `&nbsp;` en el KPI de Personal del Inicio. Mejorada la visibilidad en modo oscuro de los iconos de calendario en selectores nativos (`input[type="date"]`) e invertido los colores del grid del Calendario de Vencimientos para alta legibilidad. **Sembrado de Demo Comercial**: Creación del usuario `demo@gfarma.com` y seeding masivo de 100 facturas/abonos de prueba, nóminas, cuota fija de seguros sociales y estimaciones de fiscalidad. **Generalización a Mayoristas**: Rediseño y generalización de la categoría hardcodeada 'FedeFarma' a 'Mayorista' configurable (pudiendo definir múltiples distribuidores en el panel de configuración que se integran dinámicamente en filtros, dropdowns, KPIs, gráficas y PDFs). Se ha implementado un modal de onboarding que pregunta a los nuevos usuarios qué mayoristas utilizan al iniciar sesión por primera vez. | Completado |
| **5** | `2026-06-05` | **Separación Contable por Año y Contraste**: Integración de un Selector de Año contable dinámico en la cabecera (2025/2026) en [index.html](file:///c:/Users/Usuario/Desktop/GFarma/index.html). El selector filtra de forma reactiva la información contable por el año seleccionado en todas las pestañas (facturas, abonos, nóminas, seguros sociales, fiscalidad y gráficos de análisis sin rango). El año del calendario se sincroniza con el año global seleccionado. Se corrigieron los sumatorios acumulados de nóminas y seguros sociales para que solo sumen los registros del año activo. Se solucionó el contraste deficiente del Balance Neto en la pestaña de abonos (cambiando el texto oscuro por blanco o verde esmeralda). | Completado |
| **6** | `2026-06-08` | **Edición Unificada**: Botones de edición/eliminación en el Calendario, modal de KPIs y tarjetas de Previsión con refresco reactivo automático. **Gastos Recurrentes**: Casilla "Repetir" en Fiscalidad, Seguros y Nóminas para autogenerar registros mensuales e insertarlos en lote (*batch insert*) hasta fin del año contable. **Persistencia de Mayoristas**: Configuración de onboarding sincronizada con `user_metadata` en Supabase para evitar diálogos repetidos en nuevos navegadores y limpieza en logout. **Ajuste Fiscal**: Eliminación del KPI de IVA por Recargo de Equivalencia en farmacias (desglose a 3 columnas), exclusión de "Declaración de IVA" y agrupación de IRPF en Renta/Sociedades. **Negocio**: Exportación de informe en PDF (`prevision_negocio.pdf`) en el Escritorio con desglose de costes fijos/variables y proyección a 50 farmacias. | Completado |
| **7** | `2026-06-10` | **Rediseño Estético y Limpieza de Código**: Unificación del fondo de login (eliminando corte de pantalla y líneas divisorias) y simplificación del showcase. Integración de nuevos logotipos SVG transparentes en login y barra lateral. Eliminación completa de la sección de presupuestos de gasto por laboratorio. Reubicación del simulador de plan/licenciamiento a Configuración e inserción automática de plan Premium para testeo. Recreación de la guía PDF de Stripe. Ajuste estético de los botones de envío en el login al degradado azul-cian moderno de "+ Nuevo Registro" y resolución de advertencias de linter (ESLint) en CI. | Completado |
| **8** | `2026-06-15` | **Corrección de Bugs y Rediseño de Contornos Neón (React + Vanilla)**: Solucionado el desfase de alineación a la derecha en los botones rápidos de "Registrar Seguro Social" y "Añadir Impuesto / Tasa" en el dashboard. Corregido el Calendario de Vencimientos para que remueva el contorno de selección del día actual cuando el usuario selecciona cualquier otro día, evitando bordes duplicados. | Completado |
| **9** | `2026-06-16` | **Fase 4 — Integración de Stripe (Checkout, Portal y Webhooks)**: Implementación de endpoints de Stripe Checkout y Portal de Clientes. Webhook seguro con firma para sincronización automatizada de suscripciones (Básico y Premium). Solucionado error de fecha `Invalid time value` dando soporte a la estructura de Stripe Billing v2 (Flexible Billing). | Completado |

---

## 🛠️ 6. Reglas de Desarrollo y Flujo de Trabajo
*   **Gestión de Ramas (Crítico)**: Queda terminantemente prohibido realizar commits o pushes directamente a las ramas `staging` o `main`. Todo el desarrollo se debe realizar en ramas de características (`feat/...`) o correcciones (`fix/...`). El usuario será el único encargado de probar y fusionar estas ramas hacia `staging` y `main`.
*   **Bypass de RLS**: Las escrituras de actualización del plan y estado de suscripción de la organización deben ser exclusivas del backend usando la clave de servicio de Supabase (`SUPABASE_SERVICE_ROLE_KEY`) a través de webhooks firmados por Stripe.

---

## 🚀 7. Próximos Pasos y Roadmap de Escabilidad
1.  *Implementar un sistema de alertas por email o notificaciones de vencimiento.*
2.  *Permitir la descarga de reportes consolidados en Excel o CSV además de PDF.*
3.  *Mejorar y pulir el OCR por lotes si el cliente decide subir varias imágenes a la vez.*
4.  *Desplegar en producción real (Stripe Live Mode) una vez que el flujo test sea completamente verificado.*