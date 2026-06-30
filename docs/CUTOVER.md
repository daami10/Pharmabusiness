# 🚀 Cutover: pasar producción del legacy a la app `web/`

La migración a paridad está completa. La app nueva (`web/`) ya cubre todos los módulos del
legacy. Este es el plan para **cambiar producción** de la app vieja (raíz, Vanilla) a la nueva
(`web/`, React) **sin riesgo**, con staging primero.

> El cambio es **deliberado y manual** (en el panel de Vercel). Mientras no lo hagas, Vercel
> sigue sirviendo el legacy de la raíz; la carpeta `web/` es código durmiente.

## Paso 1 — Staging (probar la nueva web sin tocar producción)

Crea un **segundo proyecto de Vercel** apuntando al mismo repo pero con la app nueva:

1. Vercel → **Add New Project** → importa el repo `daami10/Pharmabusiness`.
2. **Root Directory** = `web`.
3. Framework: **Vite** (lo detecta solo). Build: `npm run build`, Output: `dist`.
4. **Environment Variables** (entornos Production + Preview):
   * **Variables del Cliente (Prefijo VITE_, públicas):**
     - `VITE_SUPABASE_URL` = la URL de tu proyecto Supabase.
     - `VITE_SUPABASE_ANON_KEY` = la anon/publishable key de Supabase.
   * **Variables de Servidor (Privadas, NUNCA con prefijo VITE_):**
     - `SUPABASE_URL` = la URL de tu proyecto Supabase (requerida por las serverless functions).
     - `SUPABASE_SERVICE_ROLE_KEY` = la clave `service_role` de Supabase (requerida para poder actualizar planes evadiendo políticas RLS).
     - `GEMINI_KEY` = la clave de API de Gemini (la usa `web/api/scan.js` para el OCR).
     - `STRIPE_SECRET_KEY` = la clave secreta de Stripe (`sk_test_...` o `sk_live_...`).
     - `STRIPE_WEBHOOK_SECRET` = el secreto de firma del Webhook de Stripe (ver sección abajo).
     - `STRIPE_PREMIUM_PRICE_ID` = el ID de precio del plan Premium en Stripe (`price_...`).
     - `STRIPE_BASIC_PRICE_ID` = el ID de precio del plan Básico en Stripe (`price_...`).

### ⚙️ Configuración del Webhook de Stripe
Para que el estado de suscripción del cliente se actualice automáticamente tras el pago en Stripe, debes configurar un Webhook:
1. Ve a tu panel de **Stripe -> Developers -> Webhooks** y haz clic en **Add endpoint**.
2. **Endpoint URL:** `https://<tu-url-de-vercel>.vercel.app/api/stripe-webhook` (cambia el host por tu URL de staging o producción real).
3. **Select events:** Selecciona los siguientes eventos obligatorios:
   - `checkout.session.completed` (cuando se completa la pasarela de pago inicial).
   - `customer.subscription.updated` (cuando se renueva, cambia o modifica una suscripción).
   - `customer.subscription.deleted` (cuando se cancela o expira una suscripción).
4. Haz clic en **Add endpoint**.
5. Copia el **Signing Secret** generado (empieza por `whsec_...`) y configúralo como la variable de entorno `STRIPE_WEBHOOK_SECRET` en Vercel.

5. Deploy → te da una URL de staging (`...vercel.app`). Pruébala módulo a módulo contra el
   legacy: facturas, calendario, abonos, fiscalidad, trabajadores, inicio, análisis, OCR, PDF y el pago/suscripción con tarjeta de pruebas de Stripe.

> Importante: staging usa **la misma base de datos** que producción. Para probar escrituras sin
> ensuciar datos reales, idealmente crea un proyecto Supabase de staging (ver ARQUITECTURA_V2).

## Paso 2 — Cutover de producción

Cuando staging esté validado, dos opciones:

**Opción A (recomendada): promover el proyecto nuevo a producción.**
- Asigna el dominio de producción al proyecto nuevo (`web`).
- El proyecto antiguo (legacy) queda como respaldo; puedes pausarlo.

**Opción B: reconfigurar el proyecto actual.**
- En el proyecto Vercel actual → Settings → **Root Directory** = `web`.
- Borra el `buildCommand`/`outputDirectory` personalizados (que apuntaban a `node build.js`);
  deja que Vite gestione el build.
- Asegúrate de las env vars `VITE_*` + `GEMINI_KEY` en Production.
- Redeploy.

## Paso 3 — Tras el cutover

- Verifica login, datos y OCR en el dominio real.
- Cuando estés seguro, elimina del repo el legacy (`index.html`, `build.js`, `api/scan.js` raíz)
  y los `__SUPABASE_*__` placeholders. (Hazlo en un PR aparte.)

## Notas

- El `web/vercel.json` ya incluye el **rewrite SPA** (para que las rutas de React Router
  funcionen con recarga/deep-link) y cache de assets.
- El OCR (`web/api/scan.js`) solo funciona una vez desplegado (necesita `GEMINI_KEY` en el
  servidor); en local usa `VITE_API_PROXY_TARGET` apuntando a un deploy.
- Pendiente tras el cutover: **multi-tenant** (organizations + RLS) — ver `ARQUITECTURA_V2.md`.
