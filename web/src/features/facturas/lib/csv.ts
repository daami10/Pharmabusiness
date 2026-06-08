import type { Factura } from '@/types/domain'

const HEADERS = [
  'Fecha',
  'Laboratorio',
  'Tipo',
  'Nº Factura',
  'Importe',
  'FechaVencimiento',
  'Pagada',
  'Notas',
]

function cell(v: string | number): string {
  return `"${String(v).replace(/"/g, '""')}"`
}

/** Construye el contenido CSV (con BOM y `sep=,` para Excel). Función pura, testeable. */
export function buildFacturasCSV(facturas: Factura[]): string {
  const rows = facturas.map((f) =>
    [
      f.fecha ?? '',
      f.laboratorio,
      f.tipo,
      f.num_factura ?? '',
      f.importe,
      f.fecha_vencimiento ?? '',
      f.pagada ? 'Sí' : 'No',
      f.notas ?? '',
    ]
      .map(cell)
      .join(','),
  )
  const BOM = '﻿'
  return BOM + 'sep=,\r\n' + [HEADERS.join(','), ...rows].join('\r\n')
}

/** Descarga las facturas como CSV en el navegador. */
export function downloadFacturasCSV(facturas: Factura[]): void {
  const blob = new Blob([buildFacturasCSV(facturas)], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `facturas_${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
