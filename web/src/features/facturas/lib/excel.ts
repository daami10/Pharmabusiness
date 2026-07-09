import * as XLSX from 'xlsx'
import type { Factura } from '@/types/domain'
import { buildExportFilename } from '@/lib/utils/exportName'

/**
 * Generates and downloads an Excel (.xlsx) spreadsheet containing the given invoices.
 */
export function downloadFacturasExcel(
  facturas: Factura[],
  t: (key: string, fallback: string) => string,
  orgName?: string | null,
): void {
  const data = facturas.map((f) => ({
    [t('general.fecha', 'Fecha')]: f.fecha ?? '',
    [t('general.laboratorio', 'Laboratorio')]: f.laboratorio,
    [t('general.tipo', 'Tipo')]: f.tipo,
    [t('facturas.label.invoice_number', 'Nº Factura')]: f.num_factura ?? '',
    [t('general.importe', 'Importe')]: f.importe,
    [t('pdf.due_date_col', 'Fecha Vencimiento')]: f.fecha_vencimiento ?? '',
    [t('pdf.paid_col', 'Pagada')]: f.pagada ? t('general.si', 'Sí') : t('general.no', 'No'),
    [t('general.notas', 'Notas')]: f.notas ?? '',
  }))

  const worksheet = XLSX.utils.json_to_sheet(data)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, t('nav.facturas', 'Facturas'))

  // Auto-fit column widths for better visual layout
  const colWidths = [
    { wch: 12 }, // Fecha
    { wch: 25 }, // Laboratorio
    { wch: 15 }, // Tipo
    { wch: 15 }, // Nº Factura
    { wch: 12 }, // Importe
    { wch: 18 }, // Fecha Vencimiento
    { wch: 10 }, // Pagada
    { wch: 30 }, // Notas
  ]
  worksheet['!cols'] = colWidths

  // Write and trigger download in client browser
  XLSX.writeFile(workbook, buildExportFilename(orgName, 'Facturas', 'xlsx'))
}
