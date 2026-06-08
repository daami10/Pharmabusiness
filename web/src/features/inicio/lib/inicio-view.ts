import { monthLabel } from '@/lib/utils/dates'
import type { Factura, Fiscal, Nomina, Seguro } from '@/types/domain'

export interface DataSets {
  facturas: Factura[]
  fiscal: Fiscal[]
  nominas: Nomina[]
  seguros: Seguro[]
}

export interface InicioKpis {
  facturas: { total: number; count: number }
  abonos: { total: number; count: number }
  fiscal: { total: number; count: number }
  trabajadores: { total: number; nominas: number; seguros: number }
}

/** KPIs del mes indicado (`monthKey` = YYYY-MM). Paridad con renderInicio del legacy. */
export function computeInicioKpis(data: DataSets, monthKey: string): InicioKpis {
  const facturasMes = data.facturas.filter((f) => {
    if (f.tipo === 'Abono') return false
    const dueThisMonth = (f.fecha_vencimiento ?? '').slice(0, 7) === monthKey
    const paidThisMonth = f.pagada && (f.fecha ?? '').slice(0, 7) === monthKey
    return dueThisMonth || paidThisMonth
  })
  const abonosMes = data.facturas.filter(
    (f) => f.tipo === 'Abono' && (f.fecha ?? '').slice(0, 7) === monthKey,
  )
  const fiscalMes = data.fiscal.filter((f) => (f.fecha ?? '').slice(0, 7) === monthKey)
  const nominasMes = data.nominas.filter((n) => (n.fecha ?? '').slice(0, 7) === monthKey)
  const segurosMes = data.seguros.filter((s) => (s.fecha ?? '').slice(0, 7) === monthKey)

  const sum = (arr: { importe: number }[]) => arr.reduce((s, r) => s + r.importe, 0)

  return {
    facturas: { total: sum(facturasMes), count: facturasMes.length },
    abonos: { total: sum(abonosMes), count: abonosMes.length },
    fiscal: { total: sum(fiscalMes), count: fiscalMes.length },
    trabajadores: {
      total: sum(nominasMes) + sum(segurosMes),
      nominas: nominasMes.length,
      seguros: segurosMes.length,
    },
  }
}

export interface PrevisionSection {
  key: string
  label: string
  invoices: Factura[]
  taxes: Fiscal[]
  payrolls: Nomina[]
  seguros: Seguro[]
  total: number
}

function isFuture(
  dateStr: string | null | undefined,
  nowYear: number,
  nowMonth: number,
): boolean {
  if (!dateStr) return false
  const [y, m] = dateStr.split('-')
  const yr = parseInt(y, 10)
  const mo = parseInt(m, 10)
  return yr > nowYear || (yr === nowYear && mo > nowMonth)
}

/** Agrega gastos futuros (facturas impagadas, impuestos, nóminas, seguros) por mes. */
export function buildPrevision(
  data: DataSets,
  nowYear: number,
  nowMonth: number,
): PrevisionSection[] {
  const map = new Map<string, PrevisionSection>()
  const section = (key: string): PrevisionSection => {
    let s = map.get(key)
    if (!s) {
      s = {
        key,
        label: monthLabel(key),
        invoices: [],
        taxes: [],
        payrolls: [],
        seguros: [],
        total: 0,
      }
      map.set(key, s)
    }
    return s
  }

  for (const f of data.facturas) {
    if (f.tipo === 'Abono' || f.pagada) continue
    const date = f.fecha_vencimiento ?? f.fecha
    if (!isFuture(date, nowYear, nowMonth)) continue
    const s = section(date!.slice(0, 7))
    s.invoices.push(f)
    s.total += f.importe
  }
  for (const t of data.fiscal) {
    if (!isFuture(t.fecha, nowYear, nowMonth)) continue
    const s = section(t.fecha.slice(0, 7))
    s.taxes.push(t)
    s.total += t.importe
  }
  for (const n of data.nominas) {
    if (!isFuture(n.fecha, nowYear, nowMonth)) continue
    const s = section(n.fecha.slice(0, 7))
    s.payrolls.push(n)
    s.total += n.importe
  }
  for (const sg of data.seguros) {
    if (!isFuture(sg.fecha, nowYear, nowMonth)) continue
    const s = section(sg.fecha.slice(0, 7))
    s.seguros.push(sg)
    s.total += sg.importe
  }

  return [...map.values()].sort((a, b) => a.key.localeCompare(b.key))
}
