const fs = require('fs');
const https = require('https');

const SUPABASE_URL = 'https://rapzkwdeuyoecrvwhygq.supabase.co';
const SUPABASE_SERVICE_KEY = 'sb_secret_fFPPijtDKBNuV4Vhl1zmqg_IBygAtKf';
const USER_ID = '4658ead9-2d59-47d8-b455-6f63fc4e5028';
const CSV_PATH = 'C:\\Users\\Usuario\\Desktop\\Facturas-Facturas.csv';

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') { inQuotes = !inQuotes; }
    else if (c === ',' && !inQuotes) { result.push(current); current = ''; }
    else { current += c; }
  }
  result.push(current);
  return result;
}

function parseDate(str) {
  if (!str || !str.trim()) return null;
  const parts = str.trim().split('/');
  if (parts.length !== 3) return null;
  return `${parts[2]}-${parts[1].padStart(2,'0')}-${parts[0].padStart(2,'0')}`;
}

function parseImporte(str) {
  if (!str || !str.trim()) return 0;
  return parseFloat(str.replace(',', '.')) || 0;
}

const csv = fs.readFileSync(CSV_PATH, 'utf8');
const lines = csv.trim().split('\n');

const rows = [];
for (let i = 1; i < lines.length; i++) {
  const line = lines[i].trim();
  if (!line) continue;
  const f = parseCSVLine(line);
  // Columnas: Laboratorio,Notas,NumFactura,Fecha,Importe,FechaVencimiento,Pagada,Tipo
  rows.push({
    user_id:          USER_ID,
    laboratorio:      f[0] || '',
    notas:            f[1] || '',
    num_factura:      f[2] || '',
    fecha:            parseDate(f[3]),
    importe:          parseImporte(f[4]),
    fecha_vencimiento: parseDate(f[5]),
    pagada:           f[6] === 'checked',
    tipo:             f[7] || ''
  });
}

console.log(`Importando ${rows.length} facturas...`);

const body = JSON.stringify(rows);
const url = new URL(`${SUPABASE_URL}/rest/v1/facturas`);
const options = {
  hostname: url.hostname,
  path: url.pathname,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'apikey': SUPABASE_SERVICE_KEY,
    'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
    'Prefer': 'return=minimal'
  }
};

const req = https.request(options, res => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    if (res.statusCode === 201 || res.statusCode === 200) {
      console.log(`Listo. ${rows.length} facturas importadas correctamente.`);
    } else {
      console.error(`Error ${res.statusCode}: ${data}`);
    }
  });
});

req.on('error', e => console.error('Error de red:', e.message));
req.write(body);
req.end();
