import { create } from 'zustand'

export type Language = 'es' | 'ca'

interface LanguageState {
  language: Language
  setLanguage: (language: Language) => void
}

export const useLanguageStore = create<LanguageState>((set) => ({
  language: (localStorage.getItem('gfarma_lang') as Language) || 'es',
  setLanguage: (language) => {
    localStorage.setItem('gfarma_lang', language)
    set({ language })
  },
}))

export const translations: Record<Language, Record<string, string>> = {
  es: {
    // Navigation
    'nav.inicio': 'Inicio',
    'nav.facturas': 'Facturas',
    'nav.analisis': 'Análisis',
    'nav.abonos': 'Abonos',
    'nav.fiscalidad': 'Fiscalidad',
    'nav.trabajadores': 'Trabajadores',
    'nav.admin': 'Panel Admin',
    'nav.configuracion': 'Configuración',
    'nav.privacidad': 'Privacidad',
    'nav.salir': 'Salir',

    // General Actions / Words
    'general.guardar': 'Guardar',
    'general.cancelar': 'Cancelar',
    'general.editar': 'Editar',
    'general.eliminar': 'Eliminar',
    'general.cerrar': 'Cerrar',
    'general.total': 'Total',
    'general.fecha': 'Fecha',
    'general.importe': 'Importe',
    'general.notas': 'Notas',
    'general.guardando': 'Guardando...',

    // Settings Modal
    'settings.title': 'Configuración de la Farmacia',
    'settings.tab.wholesalers': 'General y Mayoristas',
    'settings.tab.users': 'Equipo y Permisos',
    'settings.farmacia_name': 'Nombre de la farmacia',
    'settings.mayoristas_selected': 'Mayoristas seleccionados',
    'settings.guardar_cambios': 'Guardar ajustes',
    'settings.language_section': 'Idioma de la aplicación',
    'settings.language_spanish': 'Español (Castellano)',
    'settings.language_catalan': 'Català (Catalán)',

    // InicioPage
    'inicio.title': 'Inicio',
    'inicio.welcome': 'Hola, bienvenido a tu panel de gestión.',
    'inicio.prevision': 'Previsión de Pagos e Impuestos',

    // FacturasPage
    'facturas.title': 'Facturas de Laboratorios',
    'facturas.subtitle': 'Registro centralizado por proveedor farmacéutico',
    'facturas.dropzone': 'Arrastra y suelta tu factura aquí o haz clic para buscar',
    'facturas.tab.todas': 'Todas',
    'facturas.tab.pendientes': 'Pendientes',
    'facturas.tab.vencidas': 'Vencidas',
    'facturas.tab.pagadas': 'Pagadas',
    'facturas.button.nueva': 'Nueva factura',
    'facturas.filter.placeholder': 'Buscar proveedor...',
    'facturas.no_invoices': 'No se encontraron facturas en este periodo.',

    // AbonosPage
    'abonos.title': 'Abonos y Devoluciones',
    'abonos.subtitle': 'Monitorización y control de abonos pendientes de distribuidores',
    'abonos.button.nuevo': 'Nuevo abono',
    'abonos.no_records': 'No se encontraron abonos en este periodo.',

    // AnalisisPage
    'analisis.title': 'Análisis de Gasto',
    'analisis.subtitle': 'Estudia la evolución de las compras de tu farmacia',
    'analisis.kpi.total': 'Total Invertido',
    'analisis.kpi.num_facturas': 'Nº Facturas',
    'analisis.kpi.top_proveedor': 'Top Proveedor',
    'analisis.kpi.promedio': 'Promedio / Factura',
    'analisis.charts.gasto_proveedor': 'Gasto por Proveedor',
    'analisis.charts.distribucion': 'Distribución de Gasto',
    'analisis.charts.evolucion': 'Evolución de Compras',

    // FiscalidadPage
    'fiscalidad.title': 'Estimación Fiscal',
    'fiscalidad.subtitle': 'Previsualización en tiempo real de impuestos y declaraciones trimestrales',
    'fiscalidad.card.iva': 'Estimación de IVA',
    'fiscalidad.card.irpf': 'Retenciones IRPF',
    'fiscalidad.card.resultado': 'Resultado Estimado',

    // TrabajadoresPage
    'trabajadores.title': 'Gestión de Trabajadores',
    'trabajadores.subtitle': 'Control de nóminas, cotizaciones y permisos de acceso del equipo',
    'trabajadores.button.nuevo': 'Nuevo trabajador',
    'trabajadores.no_records': 'No hay trabajadores registrados en la organización.',
  },
  ca: {
    // Navigation
    'nav.inicio': 'Inici',
    'nav.facturas': 'Factures',
    'nav.analisis': 'Anàlisi',
    'nav.abonos': 'Abonaments',
    'nav.fiscalidad': 'Fiscalitat',
    'nav.trabajadores': 'Treballadors',
    'nav.admin': 'Panell Admin',
    'nav.configuracion': 'Configuració',
    'nav.privacidad': 'Privacitat',
    'nav.salir': 'Sortir',

    // General Actions / Words
    'general.guardar': 'Desar',
    'general.cancelar': 'Cancel·lar',
    'general.editar': 'Editar',
    'general.eliminar': 'Eliminar',
    'general.cerrar': 'Tancar',
    'general.total': 'Total',
    'general.fecha': 'Data',
    'general.importe': 'Import',
    'general.notas': 'Notes',
    'general.guardando': 'Desant...',

    // Settings Modal
    'settings.title': 'Configuració de la Farmàcia',
    'settings.tab.wholesalers': 'General i Majoristes',
    'settings.tab.users': 'Equip i Permisos',
    'settings.farmacia_name': 'Nom de la farmàcia',
    'settings.mayoristas_selected': 'Majoristes seleccionats',
    'settings.guardar_cambios': 'Desar ajustos',
    'settings.language_section': 'Idioma de l\'aplicació',
    'settings.language_spanish': 'Español (Castellà)',
    'settings.language_catalan': 'Català',

    // InicioPage
    'inicio.title': 'Inici',
    'inicio.welcome': 'Hola, benvingut al teu panell de gestió.',
    'inicio.prevision': 'Previsió de Pagaments i Impostos',

    // FacturasPage
    'facturas.title': 'Factures de Laboratoris',
    'facturas.subtitle': 'Registre centralitzat per proveïdor farmacèutic',
    'facturas.dropzone': 'Arrossega i deixa anar la teva factura aquí o fes clic per cercar',
    'facturas.tab.todas': 'Totes',
    'facturas.tab.pendientes': 'Pendents',
    'facturas.tab.vencidas': 'Vencudes',
    'facturas.tab.pagadas': 'Pagades',
    'facturas.button.nueva': 'Nova factura',
    'facturas.filter.placeholder': 'Cercar proveïdor...',
    'facturas.no_invoices': 'No s\'han trobat factures en aquest període.',

    // AbonosPage
    'abonos.title': 'Abonaments i Devolucions',
    'abonos.subtitle': 'Monitoratge i control d\'abonaments pendents de distribuïdors',
    'abonos.button.nuevo': 'Nou abonament',
    'abonos.no_records': 'No s\'han trobat abonaments en aquest període.',

    // AnalisisPage
    'analisis.title': 'Anàlisi de Despesa',
    'analisis.subtitle': 'Estudia l\'evolució de les compres de la teva farmàcia',
    'analisis.kpi.total': 'Total Invertit',
    'analisis.kpi.num_facturas': 'Nº Factures',
    'analisis.kpi.top_proveedor': 'Top Proveïdor',
    'analisis.kpi.promedio': 'Mitjana / Factura',
    'analisis.charts.gasto_proveedor': 'Despesa per Proveïdor',
    'analisis.charts.distribucion': 'Distribució de Despesa',
    'analisis.charts.evolucion': 'Evolució de Compres',

    // FiscalidadPage
    'fiscalidad.title': 'Estimació Fiscal',
    'fiscalidad.subtitle': 'Previsualització en temps real d\'impostos i declaracions trimestrals',
    'fiscalidad.card.iva': 'Estimació d\'IVA',
    'fiscalidad.card.irpf': 'Retencions IRPF',
    'fiscalidad.card.resultado': 'Resultat Estimat',

    // TrabajadoresPage
    'trabajadores.title': 'Gestió de Treballadors',
    'trabajadores.subtitle': 'Control de nòmines, cotitzacions i permisos d\'accés de l\'equip',
    'trabajadores.button.nuevo': 'Nou treballador',
    'trabajadores.no_records': 'No hi ha treballadors registrats a l\'organització.',
  },
}

export function useTranslation() {
  const language = useLanguageStore((s) => s.language)
  
  const t = (key: string, defaultValue?: string) => {
    return translations[language][key] || defaultValue || key
  }
  
  return { t, language, setLanguage: useLanguageStore.getState().setLanguage }
}
