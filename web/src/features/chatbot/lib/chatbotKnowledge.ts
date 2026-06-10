export interface KnowledgeArticle {
  id: string
  title: string
  keywords: string[]
  content: string
  suggestions: string[]
}

export const KNOWLEDGE_BASE: KnowledgeArticle[] = [
  {
    id: 'inicio',
    title: 'Página de Inicio y Escaneo de Facturas',
    keywords: [
      'inicio',
      'dashboard',
      'resumen',
      'escanear',
      'subir',
      'subida',
      'ocr',
      'factura',
      'subir factura',
      'arrastrar',
      'pdf',
      'png',
      'jpg',
    ],
    content:
      'En la **Página de Inicio** puedes ver un resumen global de tu farmacia. Para **subir o escanear una factura**: \n\n1. En la parte superior verás una zona que dice **"Arrastra y suelta tu factura aquí"**.\n2. Puedes arrastrar un archivo PDF, PNG o JPEG, o hacer clic en la zona para seleccionarlo.\n3. El sistema procesará el documento automáticamente mediante **OCR** para extraer el proveedor, fecha, importe y número de factura.\n4. Se abrirá el modal para revisar la información extraída y guardarla en el sistema.',
    suggestions: ['¿Cómo funciona el escaneo OCR?', '¿Qué resúmenes hay en Inicio?'],
  },
  {
    id: 'prevision',
    title: 'Pestaña / Modal de Previsión de Gasto',
    keywords: [
      'prevision',
      'previsión',
      'previsiones',
      'gasto',
      'gastos',
      'prevision de gasto',
      'prevision de gastos',
      'futuro',
      'proyeccion',
      'proyección',
      'proximos meses',
      'próximos meses',
    ],
    content:
      'La herramienta de **Previsión de Gasto** te permite planificar y proyectar tus salidas de caja futuras:\n\n* **Dónde encontrarlo**: Está disponible en la **Página de Inicio** (Dashboard) pulsando el botón de **"Previsión de gasto"** en el panel de resúmenes (icono de carpeta/gráfica).\n* **Cómo se calcula**: Agrupa mensualmente los gastos previstos para los meses restantes del año activo, sumando:\n  1. **Facturas impagadas** cuyo vencimiento esté en el futuro.\n  2. **Impuestos previstos** registrados en el módulo de Fiscalidad.\n  3. **Nóminas futuras** pre-registradas en el módulo de Trabajadores.\n  4. **Seguros Sociales previstos** programados hasta fin de año.\n* **Gestión directa**: Puedes editar o eliminar las facturas listadas en la previsión directamente desde este modal.',
    suggestions: [
      '¿De dónde salen los gastos previstos?',
      '¿Cómo registro un impuesto que se repita?',
    ],
  },
  {
    id: 'facturas',
    title: 'Gestión de Facturas de Laboratorios',
    keywords: [
      'factura',
      'facturas',
      'vencimiento',
      'pendiente',
      'pagado',
      'pagar',
      'editar factura',
      'borrar factura',
      'filtro',
      'filtrar',
      'importe',
      'laboratorio',
      'laboratorios',
      'calendario',
      'vencidos',
    ],
    content:
      'El módulo de **Facturas de Laboratorios** te permite controlar tus gastos y vencimientos:\n\n* **Añadir Factura**: Pulsa en **"Nueva factura"** arriba a la derecha. Puedes rellenar los campos o escanearla.\n* **Filtros**: Puedes filtrar por texto, mes, rango de importe, vencimiento (pagado, pendiente, vencido) y categoría (Laboratorio, Mayorista, Otro, Abono).\n* **Interactividad**: Haz clic en cualquier día con vencimientos en el calendario para seleccionar el día y filtrar instantáneamente la lista inferior.\n* **Marcar como Pagado**: Haz clic en el botón de verificación verde `✓` a la derecha de la factura en el listado para marcarla como pagada, o en `↺` para volver a ponerla como pendiente.',
    suggestions: [
      '¿Cómo marco una factura como pagada?',
      '¿Para qué sirve el calendario de facturas?',
    ],
  },
  {
    id: 'analisis',
    title: 'Análisis de Inversiones e Informes',
    keywords: [
      'analisis',
      'análisis',
      'grafica',
      'gráfico',
      'grafico',
      'pdf',
      'exportar',
      'descargar',
      'ranking',
      'mayoristas',
      'desglose',
      'inversion',
      'inversión',
      'evolucion',
      'evolución',
      'descargar pdf',
      'reporte',
    ],
    content:
      'En la sección de **Análisis** puedes estudiar la evolución financiera de tu farmacia:\n\n* **Gráficos**: Visualiza el gasto acumulado por proveedor (barras), la distribución porcentual (donut) y la evolución mensual temporal.\n* **Desglose de Mayoristas**: Si seleccionas la categoría "Mayoristas", el gráfico mensual se apilará mostrando las proporciones de cada mayorista con sus colores corporativos.\n* **Ranking**: Haz clic en la tarjeta **"Top Proveedor"** para abrir un modal con la lista ordenada de todos los proveedores y su porcentaje de participación.\n* **Exportar a PDF**: Haz clic en **"Exportar PDF"** arriba a la derecha. Se generará un informe imprimible A4 perfectamente ajustado con todos los KPIs del rango seleccionado.',
    suggestions: [
      '¿Cómo exporto los análisis a PDF?',
      '¿Qué es el gráfico de mayoristas?',
    ],
  },
  {
    id: 'abonos',
    title: 'Gestión de Abonos',
    keywords: [
      'abono',
      'abonos',
      'devolucion',
      'devolución',
      'saldo',
      'reembolso',
      'balance',
      'balance neto',
      'grafico abonos',
    ],
    content:
      'El módulo de **Abonos** está diseñado para registrar notas de crédito o reembolsos de laboratorios:\n\n* **Visualización**: Muestra el total abonado, el número de abonos y el **balance neto** (Facturas − Abonos).\n* **Listado**: Los abonos aparecen resaltados en color verde en la tabla general con un signo `+` delante de su importe.\n* **Gráficas**: Puedes ver el total abonado por laboratorio y la evolución mensual de abonos.',
    suggestions: ['¿Qué es el balance neto?', '¿Cómo distingo un abono de una factura?'],
  },
  {
    id: 'fiscalidad',
    title: 'Módulo de Fiscalidad e Impuestos',
    keywords: [
      'fiscalidad',
      'impuestos',
      'tasas',
      'iva',
      'irpf',
      'autónomo',
      'autónomos',
      'sociedades',
      'renta',
      'concepto',
      'concepto libre',
      'añadir impuesto',
      'crear impuesto',
    ],
    content:
      'En **Fiscalidad** puedes registrar impuestos y tasas corporativas de tu farmacia:\n\n* **Conceptos Libres**: Al pulsar **"Añadir impuesto"**, el campo "Concepto" es un campo de texto libre donde puedes escribir cualquier impuesto (ej: "IVA", "IRPF", "Tasa de Basuras").\n* **Tarjetas Dinámicas (KPIs)**: En la parte superior de la página se crean automáticamente tarjetas resumen individuales para cada concepto fiscal que hayas registrado, evitando marcadores vacíos a cero.\n* **Repetición**: Al crear un gasto fiscal, puedes activar la opción **"Repetir mensualmente hasta fin de año"** para generar la previsión anual automáticamente.',
    suggestions: [
      '¿Cómo añado un impuesto personalizado?',
      '¿Qué significan las tarjetas de arriba?',
    ],
  },
  {
    id: 'trabajadores',
    title: 'Gestión de Trabajadores y Personal',
    keywords: [
      'trabajador',
      'trabajadores',
      'empleados',
      'nomina',
      'nómina',
      'nominas',
      'nóminas',
      'seguro',
      'seguros',
      'seguros sociales',
      'salario',
      'personal',
      'gasto personal',
    ],
    content:
      'El módulo de **Trabajadores** centraliza la información del personal de tu farmacia:\n\n* **Directorio**: Listado de trabajadores, puesto, salario bruto y tipo de jornada. Puedes editarlos o darlos de baja.\n* **Nóminas**: Registro de los pagos mensuales de nóminas de cada empleado.\n* **Seguros Sociales**: Registro de los costes de cotización a la Seguridad Social mensuales de la farmacia.\n* **Gráficos**: En la sección de Análisis, la categoría **"Trabajadores"** muestra un gráfico de desglose de costes entre nóminas e impuestos de la seguridad social.',
    suggestions: ['¿Cómo añado una nómina?', '¿Dónde se ven los costes de personal?'],
  },
  {
    id: 'presupuestos',
    title: 'Límites de Presupuesto y Alertas',
    keywords: [
      'presupuesto',
      'presupuestos',
      'limite',
      'límite',
      'alerta',
      'alertas',
      'excedido',
      'superado',
      'rojo',
      'advertencia',
      'laboratorio presupuesto',
    ],
    content:
      'Puedes establecer un límite de presupuesto de compra anual para tus laboratorios proveedores:\n\n* **Cómo configurarlo**: Pulsa en **"Configuración"** abajo en el menú lateral y ve a la sección de presupuestos.\n* **Cómo funcionan las Alertas**: Si la suma de las facturas ingresadas para un laboratorio supera el límite configurado dentro del año activo, aparecerá una **alerta roja de advertencia** en la parte superior del módulo de **Facturas**.',
    suggestions: [
      '¿Cómo configuro un límite de presupuesto?',
      '¿Dónde se ven las alertas de presupuesto?',
    ],
  },
  {
    id: 'mayoristas_config',
    title: 'Configuración de Mayoristas Predeterminados',
    keywords: [
      'mayorista configuracion',
      'configurar mayoristas',
      'fedefarma',
      'cofares',
      'distribuidores',
      'cambiar mayoristas',
    ],
    content:
      'GFarma permite configurar los mayoristas con los que trabaja tu farmacia (ej: FedeFarma, Cofares, Bidafarma, Alliance Healthcare, etc.):\n\n* **Onboarding**: Se te pregunta por tus mayoristas al registrarte por primera vez.\n* **Edición**: Puedes cambiarlos en cualquier momento en el modal de **Configuración** (en el sidebar lateral).\n* **Impacto**: La aplicación creará opciones de filtros, insignias de colores corporativos en los listados, y generará los gráficos apilados y reportes PDF de forma totalmente adaptada a tus mayoristas seleccionados.',
    suggestions: [
      '¿Cómo cambio los mayoristas de mi farmacia?',
      '¿Qué pasa si añado un mayorista nuevo?',
    ],
  },
  {
    id: 'ano_contable',
    title: 'Selector de Año Contable',
    keywords: [
      'ano contable',
      'año contable',
      'cambiar año',
      '2025',
      '2026',
      'historico',
      'histórico',
      'cambiar de año',
      'año activo',
    ],
    content:
      'En la parte superior de la cabecera verás un selector con los años **"2025"** y **"2026"**:\n\n* **Filtrado global**: Al pulsar en un año, **toda la información de la aplicación se filtra de forma automática** para pertenecer únicamente a ese año. Esto afecta a facturas, abonos, nóminas, seguros sociales, sumarios de fiscalidad y gráficos de análisis.\n* **Sincronización**: Al cambiar el año contable superior, el calendario de vencimientos cambia de año de forma sincronizada manteniendo el mes que tenías abierto.',
    suggestions: [
      '¿Cómo veo las facturas del año pasado?',
      '¿Se sincroniza el calendario al cambiar de año?',
    ],
  },
  {
    id: 'demo',
    title: 'Demo Comercial y Semillas de Datos',
    keywords: [
      'usuario demo',
      'demo',
      'demo comercial',
      'cuenta de prueba',
      'datos demo',
      'semilla',
      'semillas',
      'probar app',
    ],
    content:
      'Para facilitar la evaluación comercial de GFarma, el sistema incluye una **cuenta de prueba** (`demo@gfarma.com`):\n\n* **Datos precargados**: Esta cuenta cuenta con un sembrado de **100 facturas de prueba**, abonos devueltos, seguros sociales programados e impuestos para los años 2025 y 2026.\n* **Objetivo**: Permite ver todas las gráficas de evolución mensual, balances netos y calendarios repletos de información simulando una farmacia real en funcionamiento.',
    suggestions: ['¿Qué datos tiene la demo?', '¿Cómo accedo a la cuenta demo?'],
  },
  {
    id: 'privacidad',
    title: 'Política de Privacidad y Seguridad',
    keywords: [
      'privacidad',
      'seguridad',
      'datos',
      'proteccion',
      'protección',
      'supabase',
      'rls',
      'cifrado',
      'mis datos',
    ],
    content:
      'GFarma se toma la seguridad muy en serio:\n\n* **Base de datos Supabase**: Todos tus registros se guardan en una base de datos segura protegida por políticas **RLS (Row Level Security)**, lo que garantiza que solo tú puedes ver y modificar tus datos.\n* **Políticas**: El acceso se detalla por completo en el modal **"Privacidad"** del menú lateral, redactado con transparencia de conformidad con el RGPD.',
    suggestions: ['¿Están seguros mis datos?', '¿Quién tiene acceso a mi cuenta?'],
  },
]

// Normalización de texto simple en español (quitar tildes y diéresis)
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

/**
 * Busca en la base de conocimientos y retorna el artículo más adecuado
 */
export function searchKnowledge(
  query: string,
  currentPath: string = '',
): { response: string; suggestions: string[] } {
  const normQuery = normalizeText(query)
  if (!normQuery) {
    return {
      response:
        '¡Hola! Soy tu asistente de GFarma. ¿En qué módulo o funcionalidad tienes dudas hoy? Puedo ayudarte con las facturas, el escáner OCR, los gráficos de análisis, la fiscalidad o los trabajadores.',
      suggestions: [
        '¿Cómo escaneo una factura?',
        '¿Cómo funciona la fiscalidad?',
        '¿Cómo exportar a PDF?',
      ],
    }
  }

  // Si es un saludo sencillo
  const greetings = [
    'hola',
    'buenos dias',
    'buenas',
    'buenas tardes',
    'saludos',
    'hi',
    'hello',
  ]
  if (greetings.includes(normQuery)) {
    return {
      response:
        '¡Hola! Encantado de saludarte. ¿Cómo te puedo ayudar hoy con el funcionamiento de la aplicación?',
      suggestions: ['¿Cómo se suben facturas?', '¿Cómo se configuran presupuestos?'],
    }
  }

  // Si agradecen
  const thanks = [
    'gracias',
    'muchas gracias',
    'perfecto',
    'ok',
    'de acuerdo',
    'entendido',
  ]
  if (thanks.includes(normQuery)) {
    return {
      response:
        '¡De nada! Si tienes cualquier otra duda sobre las herramientas de GFarma, pregúntame sin compromiso.',
      suggestions: ['¿Cómo añado un abono?', '¿Dónde cambio mis mayoristas?'],
    }
  }

  let bestMatch: KnowledgeArticle | null = null
  let maxScore = 0

  for (const article of KNOWLEDGE_BASE) {
    let score = 0
    // Buscar coincidencia en palabras clave
    for (const kw of article.keywords) {
      const normKw = normalizeText(kw)
      if (normQuery.includes(normKw)) {
        score += 2
        // Puntuación extra si la palabra clave coincide de forma exacta con una palabra del query
        if (new RegExp(`\\b${normKw}\\b`).test(normQuery)) {
          score += 2
        }
      }
    }

    // Context-awareness: Priorizar la página actual en caso de empate o coincidencia relevante
    const pathId = currentPath.replace(/^\//, '').split('/')[0] || 'inicio'
    if (article.id === pathId && score > 0) {
      score += 3 // bonus por relevancia de contexto
    }

    if (score > maxScore) {
      maxScore = score
      bestMatch = article
    }
  }

  if (bestMatch && maxScore >= 2) {
    return {
      response: `### ${bestMatch.title}\n\n${bestMatch.content}`,
      suggestions: bestMatch.suggestions,
    }
  }

  // Respuesta por defecto si no hay coincidencias claras
  return {
    response:
      'Vaya, no he encontrado una respuesta exacta a tu pregunta en la base de conocimientos de GFarma. \n\nPrueba a preguntarme usando palabras clave más sencillas como **"escanear factura"**, **"exportar PDF"**, **"previsión de gasto"** o **"nóminas"**, o utiliza una de las sugerencias de abajo.',
    suggestions: [
      '¿Cómo funciona la previsión de gasto?',
      '¿Cómo se añade un impuesto?',
      '¿Cómo marco una factura pagada?',
    ],
  }
}
