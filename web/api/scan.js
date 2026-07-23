// Proxy serverless de Gemini para el OCR de facturas.
// La GEMINI_KEY vive SOLO aquí (variable de entorno del servidor), nunca en el cliente.
//
// SEGURIDAD: este endpoint exige un usuario autenticado y miembro de una organización.
// Antes era un proxy ABIERTO (sin auth, CORS *), lo que permitía a cualquiera en
// Internet consumir la GEMINI_KEY gratis y agotar la cuota. Ahora valida el JWT.
import { createClient } from '@supabase/supabase-js'

// Modelos vigentes. Google retiró las familias 2.0 y 1.5, así que solo quedan
// las 2.5. El primero que responda OK se usa; el resto son fallback.
// Verifica los disponibles para tu key con:
//   GET https://generativelanguage.googleapis.com/v1beta/models?key=<GEMINI_KEY>
const BASE_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-2.5-pro',
]

// Límite de tamaño del payload base64 (~8 MB de imagen ≈ ~11 MB en base64).
const MAX_BASE64_LEN = 11_000_000

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' })

  // --- Autenticación: solo usuarios logueados y miembros de una org ---
  const token = req.headers.authorization?.split(' ')[1]
  if (!token) return res.status(401).json({ error: 'No autorizado.' })

  const supabaseUrl = process.env.SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const geminiKey = process.env.GEMINI_KEY

  if (!supabaseUrl || !serviceKey) {
    console.error('Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY')
    return res.status(500).json({ error: 'Server misconfiguration.' })
  }
  if (!geminiKey) {
    return res.status(500).json({ error: 'GEMINI_KEY no está configurada en el servidor.' })
  }

  const supabase = createClient(supabaseUrl, serviceKey)
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(token)
  if (authError || !user) {
    return res.status(401).json({ error: 'Sesión no válida o expirada.' })
  }

  const { data: membership } = await supabase
    .from('memberships')
    .select('org_id')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle()
  if (!membership) {
    return res.status(403).json({ error: 'El usuario no está asociado a ninguna farmacia.' })
  }

  // --- Validación del payload ---
  const { mimeType, base64Data, model } = req.body || {}
  if (!mimeType || !base64Data) {
    return res.status(400).json({ error: 'Faltan mimeType o base64Data' })
  }
  if (typeof base64Data !== 'string' || base64Data.length > MAX_BASE64_LEN) {
    return res.status(413).json({ error: 'El archivo es demasiado grande.' })
  }

  // Solo se acepta un `model` del cliente si está en la allowlist (evita dirigir la
  // petición a rutas arbitrarias del host de Gemini).
  const SCAN_MODELS =
    model && BASE_MODELS.includes(model)
      ? [model, ...BASE_MODELS.filter((m) => m !== model)]
      : BASE_MODELS

  const RETRYABLE = new Set([429, 500, 503])
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
  const requestBody = JSON.stringify({
    contents: [
      {
        parts: [
          { inline_data: { mime_type: mimeType, data: base64Data } },
          {
            text: 'Esta es una factura farmacéutica. Extrae los siguientes datos y responde SOLO con un JSON válido (sin markdown, sin texto extra): {"laboratorio":"...","importe":0.00,"numFactura":"...","fecha":"YYYY-MM-DD","vencimiento":"YYYY-MM-DD"}. Si no encuentras algún campo, déjalo vacío o en 0.',
          },
        ],
      },
    ],
  })

  let apiResponse = null
  let firstError = ''

  for (const m of SCAN_MODELS) {
    // Reintenta ante errores transitorios (rate limit / 5xx), habituales en la
    // subida masiva donde se escanean varias facturas casi a la vez.
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        apiResponse = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${geminiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: requestBody,
          },
        )
        if (apiResponse.ok) break
        if (RETRYABLE.has(apiResponse.status) && attempt < 2) {
          await sleep(600 * 2 ** attempt) // 600ms, 1200ms
          continue
        }
        const errData = await apiResponse.json().catch(() => ({}))
        if (!firstError)
          firstError = `[${m}] ${errData.error?.message || apiResponse.statusText}`
        break
      } catch (e) {
        if (!firstError) firstError = `[${m}] ${e.message}`
        break
      }
    }
    if (apiResponse && apiResponse.ok) break
  }

  if (!apiResponse || !apiResponse.ok) {
    return res
      .status(502)
      .json({ error: `Ningún modelo Gemini disponible. ${firstError}` })
  }

  const data = await apiResponse.json()
  return res.status(200).json(data)
}
