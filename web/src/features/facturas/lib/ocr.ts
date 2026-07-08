import { z } from 'zod'
import { supabase } from '@/lib/supabase'

// Datos que la IA intenta extraer de la imagen de la factura.
const extractedSchema = z.object({
  laboratorio: z.string().optional().default(''),
  importe: z.coerce.number().optional().default(0),
  numFactura: z.string().optional().default(''),
  fecha: z.string().optional().default(''),
  vencimiento: z.string().optional().default(''),
})
export type OcrResult = z.infer<typeof extractedSchema>

function fileToBase64(file: File): Promise<{ base64: string; mime: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = String(reader.result)
      resolve({ base64: dataUrl.split(',')[1] ?? '', mime: file.type || 'image/jpeg' })
    }
    reader.onerror = () => reject(new Error('No se pudo leer el archivo'))
    reader.readAsDataURL(file)
  })
}

/**
 * Envía la imagen al proxy serverless `/api/scan` (que guarda la GEMINI_KEY) y
 * devuelve los datos extraídos, validados con Zod.
 */
export async function scanInvoice(file: File): Promise<OcrResult> {
  const { base64, mime } = await fileToBase64(file)
  // El endpoint /api/scan exige sesión: adjuntamos el JWT del usuario.
  const {
    data: { session },
  } = await supabase.auth.getSession()
  const token = session?.access_token
  const res = await fetch('/api/scan', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ mimeType: mime, base64Data: base64 }),
  })
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string }
    throw new Error(err.error || `Error del servidor (${res.status})`)
  }
  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[]
  }
  const raw = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
  const match = raw.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('La IA no encontró datos de factura en la imagen.')
  return extractedSchema.parse(JSON.parse(match[0]))
}
