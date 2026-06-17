/**
 * Tipos de dominio (filas planas de Supabase, sin el wrapper Airtable del legacy).
 * TODO: sustituir por tipos generados con `supabase gen types typescript`.
 */

/** Categoría de una factura. Los mayoristas son valores dinámicos configurables. */
export type FacturaTipo = 'Laboratorio' | 'Otro' | 'Abono' | (string & {})

export interface Factura {
  id: string
  user_id: string
  tipo: FacturaTipo
  laboratorio: string
  num_factura: string | null
  fecha: string | null
  importe: number
  fecha_vencimiento: string | null
  notas: string | null
  pagada: boolean
}

/** Datos de una factura al crear/editar (sin id ni user_id, que los gestiona la capa de datos). */
export type FacturaInput = Omit<Factura, 'id' | 'user_id'>

// ─── Fiscalidad ───────────────────────────────────────────────────────────────
export interface Fiscal {
  id: string
  user_id: string
  concepto: string
  fecha: string // YYYY-MM-01
  importe: number
  notas: string | null
}
export type FiscalInput = Omit<Fiscal, 'id' | 'user_id'>

// ─── Trabajadores / Nóminas / Seguros Sociales ─────────────────────────────────
export interface Trabajador {
  id: string
  user_id: string
  nombre: string
  activo?: boolean
}

export interface Nomina {
  id: string
  user_id: string
  trabajador_id: string | null
  trabajador_nombre: string
  fecha: string // YYYY-MM-01
  importe: number
  concepto: string | null
}
export type NominaInput = Omit<Nomina, 'id' | 'user_id'>

export interface Seguro {
  id: string
  user_id: string
  fecha: string // YYYY-MM-01
  importe: number
  notas: string | null
}
export type SeguroInput = Omit<Seguro, 'id' | 'user_id'>
