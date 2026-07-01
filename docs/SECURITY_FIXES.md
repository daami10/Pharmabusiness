# Correcciones de seguridad críticas (rama `fix/critical-security-rls`)

Mueven la autorización del cliente (React) al servidor (RLS + endpoint), que es la
única frontera real. Resuelven los 3 fallos críticos de la auditoría de `staging`.

## Qué cambia en el código

| Fichero | Cambio |
|---|---|
| `supabase/migrations/20260701000000_critical_security_fixes.sql` | Función `has_active_access()` + gate de pago en las 5 tablas; token/caducidad en `invitations`; `REVOKE` de RPCs; trigger `handle_new_user` por token; `search_path`. |
| `web/api/register.js` (nuevo) | Alta server-side: valida código secreto (titular) o token de invitación (empleado) antes de crear el usuario con service_role. |
| `web/src/features/auth/LoginPage.tsx` | El registro llama a `/api/register`. Se elimina el código `GFARMA2026` hardcodeado y la RPC pública `is_email_invited`. El token de invitación se lee de la URL (`?invite_token=`). |
| `web/src/features/settings/SettingsModal.tsx` | Botón para copiar el enlace secreto de invitación (`/login?invite_token=<token>`) de cada invitación pendiente. |

## Fallos que cierran

1. **Paywall solo visual** → el acceso a datos ahora exige suscripción activa / trial vivo en RLS. Un trial caducado ya no puede leer ni escribir vía la API de Supabase. **Bloqueo total** al caducar.
2. **Código `GFARMA2026` en el bundle y bypasseable** → el código pasa a `process.env.SIGNUP_CODE` (servidor) y el alta solo ocurre por `/api/register`.
3. **Invitaciones sin secreto + enumeración pública** → token secreto con caducidad de 7 días, `REVOKE` de `is_email_invited`, y el trigger une a la org solo con el token correcto.

## Pasos manuales requeridos (fuera del código)

Sin estos pasos, el registro dejará de funcionar (es lo esperado: el alta ahora depende del servidor).

1. **Supabase → Authentication → Providers → Email**: desactivar **"Allow new users to sign up"**. Así el único camino de alta es `/api/register` (que usa la admin API y no se ve afectada por este ajuste).
2. **Vercel → proyecto → Settings → Environment Variables** (los dos entornos): añadir
   - `SIGNUP_CODE` = el código secreto para altas de titular (sustituye a `GFARMA2026`).
   - Verificar que ya existen `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` (los usa también checkout/portal).
3. **Aplicar la migración** `20260701000000_critical_security_fixes.sql` en Supabase (staging primero).

## Verificación recomendada tras desplegar

- Alta de titular con código correcto → crea farmacia. Con código incorrecto o vacío → rechazada por el servidor.
- Invitar a un empleado en Ajustes → copiar enlace → registrarse con ese enlace y el email invitado → entra en la org. Con otro email → rechazado.
- Forzar trial caducado en una org de prueba (`UPDATE organizations SET subscription_status='trialing', trial_ends_at=now()-interval '1 day' WHERE id='...'`) y comprobar en la consola del navegador que `supabase.from('facturas').select()` devuelve 0 filas.

## Notas / decisiones

- `email_confirm: true` en el endpoint: el usuario puede iniciar sesión de inmediato. El secreto real es el código/token, no la verificación de email. Si más adelante se quiere verificación por email, cambiar a un flujo `generateLink` + SMTP.
- `is_email_invited` queda revocada y sin uso en cliente; puede eliminarse en una limpieza futura.
- Fuera de alcance de esta rama (eran severidad menor en la auditoría): idempotencia del webhook de Stripe, super-admin por email hardcodeado, CORS `*`, precio Premium incoherente en la UI.
