const https = require('https');

const SUPABASE_URL = 'https://rapzkwdeuyoecrvwhygq.supabase.co';
const SUPABASE_SERVICE_KEY = 'sb_secret_fFPPijtDKBNuV4Vhl1zmqg_IBygAtKf';
const DEMO_EMAIL = 'demo@gfarma.com';

function apiRequest(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${SUPABASE_URL}${path}`);
    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
        ...headers
      }
    };
    const req = https.request(options, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(data ? JSON.parse(data) : null);
          } catch(e) {
            resolve(data);
          }
        } else {
          reject(new Error(`Error de API ${res.statusCode} en ${method} ${path}: ${data}`));
        }
      });
    });
    req.on('error', reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function main() {
  try {
    const users = await apiRequest('GET', '/auth/v1/admin/users');
    const userList = Array.isArray(users) ? users : (users && users.users) || [];
    const user = userList.find(u => u.email === DEMO_EMAIL);
    if (!user) {
      console.log('Usuario demo no encontrado.');
      return;
    }
    const userId = user.id;
    console.log('Usuario demo encontrado. ID:', userId);

    const facturas = await apiRequest('GET', `/rest/v1/facturas?user_id=eq.${userId}`);
    const nominas = await apiRequest('GET', `/rest/v1/nominas?user_id=eq.${userId}`);
    const seguros = await apiRequest('GET', `/rest/v1/seguros_sociales?user_id=eq.${userId}`);
    const fiscalidad = await apiRequest('GET', `/rest/v1/fiscalidad?user_id=eq.${userId}`);

    console.log('Facturas:', facturas.length);
    console.log('Nóminas:', nominas.length);
    console.log('Seguros sociales:', seguros.length);
    console.log('Fiscalidad:', fiscalidad.length);

    // Group nominas by month
    const nominasByMonth = {};
    nominas.forEach(n => {
      const month = n.fecha.slice(0, 7);
      nominasByMonth[month] = (nominasByMonth[month] || 0) + 1;
    });
    console.log('Nóminas por mes:', nominasByMonth);

    // Group unpaid invoices by month
    const pendingInvoicesByMonth = {};
    facturas.filter(f => !f.pagada && f.tipo !== 'Abono').forEach(f => {
      const dateVal = f.fecha_vencimiento || f.fecha;
      const month = dateVal.slice(0, 7);
      pendingInvoicesByMonth[month] = (pendingInvoicesByMonth[month] || 0) + 1;
    });
    console.log('Facturas pendientes por mes:', pendingInvoicesByMonth);
  } catch(e) {
    console.error('Error:', e.message);
  }
}

main();
