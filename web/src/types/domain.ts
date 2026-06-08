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
