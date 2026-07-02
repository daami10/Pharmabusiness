import * as XLSX from 'xlsx'
import type { Factura } from '@/types/domain'

/**
 * Generates and downloads an Excel (.xlsx) spreadsheet containing the given invoices.
 */
export function downloadFacturasExcel(facturas: Factura[]): void {
  const data = facturas.map((f) => ({
    'Fecha': f.fecha ?? '',
    'Laboratorio': f.laboratorio,
    'Tipo': f.tipo,
    'Nº Factura': f.num_factura ?? '',
    'Importe': f.importe,
    'Fecha Vencimiento': f.fecha_vencimiento ?? '',
    'Pagada': f.pagada ? 'Sí' : 'No',
    'Notas': f.notas ?? '',
  }))

  const worksheet = XLSX.utils.json_to_sheet(data)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Facturas')

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
  XLSX.writeFile(workbook, `facturas_${new Date().toISOString().slice(0, 10)}.xlsx`)
}
