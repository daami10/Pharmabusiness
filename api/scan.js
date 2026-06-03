export default async function handler(req, res) {
  // Configurar cabeceras CORS básicas
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { mimeType, base64Data, model } = req.body;
  if (!mimeType || !base64Data) {
    return res.status(400).json({ error: 'Missing mimeType or base64Data' });
  }

  const geminiKey = process.env.GEMINI_KEY;
  if (!geminiKey) {
    return res.status(500).json({ error: 'La API Key de Gemini no está configurada en las variables de entorno del servidor de Vercel.' });
  }

  const BASE_MODELS = ['gemini-2.0-flash', 'gemini-2.0-flash-lite', 'gemini-2.0-flash-001', 'gemini-2.5-flash', 'gemini-1.5-flash'];
  const SCAN_MODELS = model ? [model, ...BASE_MODELS.filter(m => m !== model)] : BASE_MODELS;

  let apiResponse = null;
  let firstError = '';

  for (const m of SCAN_MODELS) {
    try {
      apiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${geminiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { inline_data: { mime_type: mimeType, data: base64Data } },
              { text: 'Esta es una factura farmacéutica. Extrae los siguientes datos y responde SOLO con un JSON válido (sin markdown, sin texto extra): {"laboratorio":"...","importe":0.00,"numFactura":"...","fecha":"YYYY-MM-DD","vencimiento":"YYYY-MM-DD"}. Si no encuentras algún campo, déjalo vacío o en 0.' }
            ]
          }]
        })
      });

      if (apiResponse.ok) {
        break;
      }

      const errData = await apiResponse.json().catch(() => ({}));
      if (!firstError) {
        firstError = `[${m}] ${errData.error?.message || apiResponse.statusText}`;
      }
    } catch (e) {
      if (!firstError) firstError = `[${m}] ${e.message}`;
    }
  }

  if (!apiResponse || !apiResponse.ok) {
    return res.status(502).json({ error: `Ningún modelo Gemini disponible en el servidor. Detalles: ${firstError}` });
  }

  const data = await apiResponse.json();
  return res.status(200).json(data);
}
