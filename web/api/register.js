import { createClient } from '@supabase/supabase-js'

// Registro server-side (CRÍTICO 2 + 3).
//
// El registro público de Supabase debe estar DESACTIVADO (Authentication →
// "Allow new users to sign up" = OFF). El único camino de alta es este endpoint,
// que valida ANTES de crear el usuario:
//   - Alta de titular: exige el código secreto SIGNUP_CODE (variable de entorno,
//     nunca en el bundle del navegador).
//   - Trabajador invitado: exige el token secreto de la invitación (que viaja en
//     el enlace ?invite_token=...), verifica que coincide el email y que no ha caducado.
//
// El usuario se crea con la service_role (admin API), que ignora el ajuste de signup
// público. El resto del alta (crear org / unir a la org) lo hace el trigger handle_new_user.
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' })

  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const signupCode = process.env.SIGNUP_CODE

  const missing = []
  if (!supabaseUrl) missing.push('SUPABASE_URL')
  if (!supabaseServiceKey) missing.push('SUPABASE_SERVICE_ROLE_KEY')
  if (!signupCode) missing.push('SIGNUP_CODE')
  if (missing.length > 0) {
    console.error(`Missing environment variables: ${missing.join(', ')}`)
    return res.status(500).json({ error: 'Server misconfiguration.' })
  }

  try {
    const { email, password, organizationName, inviteCode, inviteToken } = req.body || {}

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({ error: 'Introduce un email válido.' })
    }
    if (!password || typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres.' })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const cleanEmail = email.trim()
    let userMetadata = {}

    if (inviteToken) {
      // --- Trabajador invitado: validar token + email + caducidad ---
      const { data: inv, error: invError } = await supabase
        .from('invitations')
        .select('email, expires_at')
        .eq('token', inviteToken)
        .maybeSingle()

      if (invError) {
        console.error('Error looking up invitation:', invError)
        return res.status(500).json({ error: 'Error al validar la invitación.' })
      }
      if (!inv) {
        return res.status(400).json({ error: 'Invitación no válida.' })
      }
      if (inv.email.toLowerCase() !== cleanEmail.toLowerCase()) {
        return res.status(400).json({ error: 'El email no coincide con el de la invitación.' })
      }
      if (new Date(inv.expires_at).getTime() < Date.now()) {
        return res.status(400).json({ error: 'La invitación ha caducado. Pide una nueva al titular.' })
      }
      // El trigger vuelve a validar el token y une al usuario a la org correcta.
      userMetadata = { invite_token: inviteToken }
    } else {
      // --- Alta de titular: exige el código secreto ---
      if (!inviteCode || inviteCode !== signupCode) {
        return res.status(400).json({ error: 'Código de invitación incorrecto.' })
      }
      if (!organizationName || organizationName.trim().length === 0) {
        return res.status(400).json({ error: 'Introduce el nombre de tu farmacia.' })
      }
      userMetadata = { organization_name: organizationName.trim() }
    }

    // Crear el usuario. email_confirm: true → puede iniciar sesión de inmediato
    // (el secreto real es el código/token, no la verificación de email).
    const { error: createError } = await supabase.auth.admin.createUser({
      email: cleanEmail,
      password,
      email_confirm: true,
      user_metadata: userMetadata,
    })

    if (createError) {
      // Email ya registrado u otro error de auth.
      return res.status(400).json({ error: createError.message })
    }

    return res.status(200).json({ success: true })
  } catch (err) {
    console.error('Error in register endpoint:', err)
    return res.status(500).json({ error: 'Error al procesar el registro.' })
  }
}
