# 🧠 MEMORIA DEL PROYECTO: PharmaBusiness

Este archivo funciona como la **memoria persistente a largo plazo** del proyecto. Está diseñado para que cualquier asistente de IA (o tú mismo) lo lea al inicio de cada sesión y comprenda inmediatamente el estado actual del desarrollo, las decisiones de diseño, la estructura técnica y las tareas pendientes.

> [!IMPORTANT]
> **REGLA DE ORO:** Al finalizar cada sesión de trabajo, el asistente de IA y el usuario deben actualizar la sección **"Historial de Sesiones y Cambios"** y los **"Siguientes Pasos"** para mantener la continuidad absoluta del proyecto.

---

## 📌 1. Descripción General
**PharmaBusiness** es una aplicación web de página única (SPA) diseñada para la gestión farmacéutica. Permite centralizar y analizar los gastos de laboratorios y proveedores, supervisar vencimientos de facturas en un calendario mensual interactivo, gestionar abonos/devoluciones y administrar la información laboral del personal (nóminas y seguros sociales).

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

---

## 🚀 6. Próximos Pasos y Roadmap de Escabilidad
Aquí definiremos las nuevas características que queremos añadir y escalar:
1.  *Añadir soporte para presupuestos acumulados mensuales detallados.*
2.  *Implementar reportes descargables en PDF de la sección de Análisis.*
3.  *Optimizar y ampliar la precisión de la extracción por IA con Gemini.*

