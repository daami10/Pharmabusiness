import type { Factura } from '@/types/domain'
import { buildExportFilename } from '@/lib/utils/exportName'

function cell(v: string | number): string {
  return `"${String(v).replace(/"/g, '""')}"`
}

/** Construye el contenido CSV (con BOM y `sep=,` para Excel). Función pura, testeable. */
export function buildFacturasCSV(facturas: Factura[], t: (key: string, fallback: string) => string): string {
  const headers = [
    t('general.fecha', 'Fecha'),
    t('general.laboratorio', 'Laboratorio'),
    t('general.tipo', 'Tipo'),
    t('facturas.label.invoice_number', 'Nº Factura'),
    t('general.importe', 'Importe'),
    t('pdf.due_date_col', 'Fecha Vencimiento'),
    t('pdf.paid_col', 'Pagada'),
    t('general.notas', 'Notas'),
  ]

  const rows = facturas.map((f) =>
    [
      f.fecha ?? '',
      f.laboratorio || '',
      f.tipo || '',
      f.num_factura ?? '',
      f.importe,
      f.fecha_vencimiento ?? '',
      f.pagada ? t('general.si', 'Sí') : t('general.no', 'No'),
      f.notas ?? '',
    ]
      .map(cell)
      .join(','),
  )
  const BOM = '\uFEFF'
  return BOM + 'sep=,\r\n' + [headers.join(','), ...rows].join('\r\n')
}

/** Descarga las facturas como CSV en el navegador. */
export function downloadFacturasCSV(
  facturas: Factura[],
  t: (key: string, fallback: string) => string,
  orgName?: string | null,
): void {
  const blob = new Blob([buildFacturasCSV(facturas, t)], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = buildExportFilename(orgName, 'Facturas', 'csv')
  a.click()
  URL.revokeObjectURL(url)
}
