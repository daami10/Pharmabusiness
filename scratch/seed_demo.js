const https = require('https');

// Configuración de Supabase (valores obtenidos de claves.txt)
const SUPABASE_URL = 'https://rapzkwdeuyoecrvwhygq.supabase.co';
const SUPABASE_SERVICE_KEY = 'sb_secret_fFPPijtDKBNuV4Vhl1zmqg_IBygAtKf';
const DEMO_EMAIL = 'demo@gfarma.com';
const DEMO_PASSWORD = 'DemoGFarma2026!';

// Helper para realizar peticiones HTTPS nativas
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

async function getOrCreateDemoUser() {
  try {
    console.log(`Intentando crear usuario en Supabase Auth: ${DEMO_EMAIL}...`);
    const res = await apiRequest('POST', '/auth/v1/admin/users', {
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
      email_confirm: true
    });
    console.log('Usuario de demostración creado con éxito. ID:', res.id);
    return res.id;
  } catch(e) {
    console.log('El usuario ya existe o hubo un error al crear. Buscando ID existente...');
    try {
      const res = await apiRequest('GET', '/auth/v1/admin/users');
      const userList = Array.isArray(res) ? res : (res && res.users) || [];
      const user = userList.find(u => u.email === DEMO_EMAIL);
      if (user) {
        console.log('Encontrado usuario existente con ID:', user.id);
        return user.id;
      }
    } catch(err) {
      console.error('Error al listar usuarios:', err.message);
    }
    throw new Error(`No se pudo crear ni encontrar el usuario demo. Detalle: ${e.message}`);
  }
}

async function clearExistingData(userId) {
  console.log('Limpiando datos existentes en tablas para el usuario:', userId);
  // Eliminamos nóminas y seguros sociales antes que trabajadores debido a claves foráneas
  await apiRequest('DELETE', `/rest/v1/nominas?user_id=eq.${userId}`);
  await apiRequest('DELETE', `/rest/v1/seguros_sociales?user_id=eq.${userId}`);
  await apiRequest('DELETE', `/rest/v1/trabajadores?user_id=eq.${userId}`);
  await apiRequest('DELETE', `/rest/v1/facturas?user_id=eq.${userId}`);
  await apiRequest('DELETE', `/rest/v1/fiscalidad?user_id=eq.${userId}`);
  console.log('Limpieza completada.');
}

async function main() {
  try {
    const userId = await getOrCreateDemoUser();
    await clearExistingData(userId);

    // 1. CREAR TRABAJADORES
    console.log('Insertando trabajadores...');
    const trabajadores = [
      { user_id: userId, nombre: 'Laura García' },
      { user_id: userId, nombre: 'Carlos Martínez' },
      { user_id: userId, nombre: 'María Rodríguez' }
    ];
    const insertedTrab = await apiRequest('POST', '/rest/v1/trabajadores', trabajadores, {
      'Prefer': 'return=representation'
    });
    console.log(`Trabajadores creados: ${insertedTrab.length}`);

    // Mapear nombres a IDs
    const trabMap = {};
    insertedTrab.forEach(t => {
      trabMap[t.nombre] = t.id;
    });

    // 2. GENERAR RANGOS DE MESES (Últimos 12 meses + actual: Junio 2025 a Junio 2026)
    const months = [];
    const startDate = new Date(2025, 5, 1); // 1 de Junio de 2025
    const endDate = new Date(2026, 5, 1);   // 1 de Junio de 2026 (mes actual en el sistema)
    let cur = new Date(startDate);
    while (cur <= endDate) {
      months.push(new Date(cur));
      cur.setMonth(cur.getMonth() + 1);
    }

    // 3. SEEDING DE NÓMINAS, SEGUROS SOCIALES Y FISCALIDAD
    console.log('Generando nóminas, seguros sociales y fiscalidad...');
    const nominas = [];
    const segurosSociales = [];
    const fiscalidad = [];

    months.forEach(date => {
      const monthStr = date.toISOString().slice(0, 7);
      const fecha = `${monthStr}-01`;

      // Nóminas mensuales para la plantilla
      nominas.push({
        user_id: userId,
        trabajador_id: trabMap['Laura García'],
        trabajador_nombre: 'Laura García',
        fecha: fecha,
        importe: 2150.00,
        concepto: 'Nómina ordinaria'
      });
      nominas.push({
        user_id: userId,
        trabajador_id: trabMap['Carlos Martínez'],
        trabajador_nombre: 'Carlos Martínez',
        fecha: fecha,
        importe: 1550.00,
        concepto: 'Nómina ordinaria'
      });
      nominas.push({
        user_id: userId,
        trabajador_id: trabMap['María Rodríguez'],
        trabajador_nombre: 'María Rodríguez',
        fecha: fecha,
        importe: 1250.00,
        concepto: 'Nómina ordinaria'
      });

      // Paga extra en Diciembre (Navidad) y Junio (Verano)
      const mesNum = date.getMonth(); // 0-indexed
      if (mesNum === 11) { // Diciembre
        nominas.push({
          user_id: userId,
          trabajador_id: trabMap['Laura García'],
          trabajador_nombre: 'Laura García',
          fecha: fecha,
          importe: 2150.00,
          concepto: 'Paga extra Navidad'
        });
        nominas.push({
          user_id: userId,
          trabajador_id: trabMap['Carlos Martínez'],
          trabajador_nombre: 'Carlos Martínez',
          fecha: fecha,
          importe: 1550.00,
          concepto: 'Paga extra Navidad'
        });
        nominas.push({
          user_id: userId,
          trabajador_id: trabMap['María Rodríguez'],
          trabajador_nombre: 'María Rodríguez',
          fecha: fecha,
          importe: 1250.00,
          concepto: 'Paga extra Navidad'
        });
      }

      // Seguro Social mensual fijo
      segurosSociales.push({
        user_id: userId,
        fecha: fecha,
        importe: 1480.00,
        notas: 'Cuota patronal Seguridad Social'
      });

      // Estimación de impuestos / Fiscalidad
      // IVA Trimestral (Enero, Abril, Julio, Octubre)
      if (mesNum === 0 || mesNum === 3 || mesNum === 6 || mesNum === 9) {
        fiscalidad.push({
          user_id: userId,
          concepto: 'Trimestral IVA (Modelo 303)',
          fecha: fecha,
          importe: parseFloat((3000 + Math.random() * 1500).toFixed(2)),
          notas: 'Declaración trimestral de IVA liquidado'
        });
      }
      // Retenciones IRPF mensuales (Modelo 111)
      fiscalidad.push({
        user_id: userId,
        concepto: 'Retenciones IRPF (Modelo 111)',
        fecha: fecha,
        importe: 620.00,
        notas: 'Retenciones trabajadores y profesionales'
      });
      // Pago Pago fraccionado Impuesto de Sociedades (Octubre, Diciembre, Abril) (Modelo 202)
      if (mesNum === 9 || mesNum === 11 || mesNum === 3) {
        fiscalidad.push({
          user_id: userId,
          concepto: 'Pago a cuenta Sociedades (Modelo 202)',
          fecha: fecha,
          importe: 950.00,
          notas: 'Pago fraccionado IS'
        });
      }
    });

    await apiRequest('POST', '/rest/v1/nominas', nominas);
    await apiRequest('POST', '/rest/v1/seguros_sociales', segurosSociales);
    await apiRequest('POST', '/rest/v1/fiscalidad', fiscalidad);

    console.log(`Nóminas insertadas: ${nominas.length}`);
    console.log(`Seguros sociales insertados: ${segurosSociales.length}`);
    console.log(`Impuestos/Fiscalidad insertados: ${fiscalidad.length}`);

    // 4. GENERAR 100 FACTURAS (Y ABONOS)
    console.log('Generando 100 facturas...');

    const laboratorios = [
      { nombre: 'Cinfa', tipo: 'Laboratorio' },
      { nombre: 'Bayer', tipo: 'Laboratorio' },
      { nombre: 'Pfizer', tipo: 'Laboratorio' },
      { nombre: 'Kern Pharma', tipo: 'Laboratorio' },
      { nombre: 'Normon', tipo: 'Laboratorio' },
      { nombre: 'GlaxoSmithKline (GSK)', tipo: 'Laboratorio' },
      { nombre: 'Boehringer Ingelheim', tipo: 'Laboratorio' },
      { nombre: 'Almirall', tipo: 'Laboratorio' },
      { nombre: 'Sanofi', tipo: 'Laboratorio' },
      { nombre: 'Roche', tipo: 'Laboratorio' },
      { nombre: 'Novartis', tipo: 'Laboratorio' }
    ];

    const otrosProveedores = [
      { nombre: 'Endesa', tipo: 'Otro' },
      { nombre: 'Iberdrola', tipo: 'Otro' },
      { nombre: 'Movistar', tipo: 'Otro' },
      { nombre: 'Condis', tipo: 'Otro' },
      { nombre: 'MRW Courier', tipo: 'Otro' },
      { nombre: 'Suministros Oficina Rossy', tipo: 'Otro' },
      { nombre: 'Mantenimiento Clima', tipo: 'Otro' },
      { nombre: 'Gestoría Contable', tipo: 'Otro' }
    ];

    const facturas = [];
    const today = new Date(2026, 5, 5); // 5 de Junio de 2026 (fecha actual del sistema)

    for (let i = 1; i <= 100; i++) {
      // Elegir mes aleatorio del último año
      const randomMonthIndex = Math.floor(Math.random() * months.length);
      const invoiceMonth = new Date(months[randomMonthIndex]);
      
      // Asignar un día aleatorio entre 1 y 28
      const randomDay = Math.floor(Math.random() * 28) + 1;
      const invoiceDate = new Date(invoiceMonth.getFullYear(), invoiceMonth.getMonth(), randomDay);
      const fechaStr = invoiceDate.toISOString().slice(0, 10);

      // Decidir si es un Abono (5% de probabilidad)
      const isAbono = Math.random() < 0.07;

      let proveedor, tipo, importe;

      if (isAbono) {
        // Los abonos suelen ser de laboratorios
        proveedor = laboratorios[Math.floor(Math.random() * laboratorios.length)].nombre;
        tipo = 'Abono';
        importe = parseFloat((30 + Math.random() * 550).toFixed(2));
      } else {
        // Distribuidores principales (FedeFarma) - 20%
        // Laboratorios - 60%
        // Otros - 20%
        const rand = Math.random();
        if (rand < 0.20) {
          proveedor = 'FedeFarma';
          tipo = 'FedeFarma';
          importe = parseFloat((4000 + Math.random() * 16000).toFixed(2));
        } else if (rand < 0.80) {
          const lab = laboratorios[Math.floor(Math.random() * laboratorios.length)];
          proveedor = lab.nombre;
          tipo = lab.tipo;
          importe = parseFloat((120 + Math.random() * 2800).toFixed(2));
        } else {
          const ot = otrosProveedores[Math.floor(Math.random() * otrosProveedores.length)];
          proveedor = ot.nombre;
          tipo = ot.tipo;
          importe = parseFloat((15 + Math.random() * 480).toFixed(2));
        }
      }

      // Determinar estado de pago y fecha de vencimiento
      let pagada = false;
      let vencimientoStr = null;

      if (tipo === 'Abono') {
        pagada = false; // Los abonos no se marcan como "pagados" en la UI de la misma forma, se resta el importe
        vencimientoStr = null;
      } else {
        // Para facturas en el pasado (más de 30 días de antigüedad con respecto a today)
        // Se define un 85% de probabilidad de que estén PAGADAS, y un 15% de que estén por pagar (para generar la visualización de "VENCIDAS" en rojo).
        const diffTime = today - invoiceDate;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays > 30) {
          // Factura antigua
          pagada = Math.random() < 0.85; // 85% pagadas, 15% vencidas
          // Fecha de vencimiento es fecha de emisión + 30 días
          const vencDate = new Date(invoiceDate);
          vencDate.setDate(vencDate.getDate() + 30);
          vencimientoStr = vencDate.toISOString().slice(0, 10);
        } else {
          // Factura reciente (últimos 30 días o futuras)
          // La mayoría (80%) por pagar (pagada: false) para que aparezcan en el calendario o previsión
          pagada = Math.random() < 0.20; 
          
          // Fecha de vencimiento es fecha de emisión + 30 días
          const vencDate = new Date(invoiceDate);
          vencDate.setDate(vencDate.getDate() + 30);
          vencimientoStr = vencDate.toISOString().slice(0, 10);
        }
      }

      const numFactura = isAbono ? `ABO-2026-${String(i).padStart(3, '0')}` : `FAC-2026-${String(i).padStart(3, '0')}`;
      const notas = isAbono ? 'Devolución de material caducado o roto' : `Factura correspondiente al suministro del lote de medicamentos #${1000 + i}`;

      facturas.push({
        user_id: userId,
        laboratorio: proveedor,
        num_factura: numFactura,
        fecha: fechaStr,
        importe: importe,
        fecha_vencimiento: vencimientoStr,
        pagada: pagada,
        tipo: tipo,
        notas: notas
      });
    }

    // Insertar en lotes de 50 para evitar sobrecargar la petición
    const batch1 = facturas.slice(0, 50);
    const batch2 = facturas.slice(50, 100);

    await apiRequest('POST', '/rest/v1/facturas', batch1);
    await apiRequest('POST', '/rest/v1/facturas', batch2);

    console.log(`Total facturas insertadas correctamente: ${facturas.length}`);
    console.log(`  PAGADAS: ${facturas.filter(f => f.pagada).length}`);
    console.log(`  POR PAGAR (Pendientes / Vencidas): ${facturas.filter(f => !f.pagada && f.tipo !== 'Abono').length}`);
    console.log(`  ABONOS: ${facturas.filter(f => f.tipo === 'Abono').length}`);
    console.log('\n--- SEEDING COMPLETADO CON ÉXITO ---');
    console.log(`Usuario: ${DEMO_EMAIL}`);
    console.log(`Contraseña: ${DEMO_PASSWORD}`);

  } catch(e) {
    console.error('ERROR CRÍTICO en el seeding:', e.message);
    process.exit(1);
  }
}

main();
