import { formatMoney } from '@/lib/utils/money'
import { useTranslation, translateConcept } from '@/lib/i18n'

export interface InvoiceLike {
  id?: string
  importe: number
  laboratorio?: string | null
  fecha?: string | null
  fecha_vencimiento?: string | null
  tipo?: string | null
  num_factura?: string | null
}

export interface FiscalLike {
  id?: string
  importe: number
  concepto: string
  fecha: string | null
}

export interface NominaLike {
  id?: string
  importe: number
  trabajador_nombre?: string | null
  fecha: string | null
}

export interface SeguroLike {
  id?: string
  importe: number
  fecha: string | null
}

export interface ReportProps {
  period: string
  generatedAt: string
  includeFacturas: boolean
  includeAbonos: boolean
  includeFiscalidad: boolean
  includeTrabajadores: boolean
  facturas: InvoiceLike[]
  abonos: InvoiceLike[]
  fiscal: FiscalLike[]
  nominas: NominaLike[]
  seguros: SeguroLike[]
}

const MEDALS = ['1º', '2º', '3º']

export function AnalisisReport({
  period,
  generatedAt,
  includeFacturas,
  includeAbonos,
  includeFiscalidad,
  includeTrabajadores,
  facturas,
  abonos,
  fiscal,
  nominas,
  seguros,
}: ReportProps) {
  const { t } = useTranslation()

  // 1. Calculations - Facturas
  const totalFacturas = facturas.reduce((sum, f) => sum + f.importe, 0)
  const countFacturas = facturas.length
  const avgFactura = countFacturas ? totalFacturas / countFacturas : 0

  const providerTotals: Record<string, number> = {}
  for (const f of facturas) {
    const p = f.laboratorio || t('general.sin_nombre', 'Sin nombre')
    providerTotals[p] = (providerTotals[p] ?? 0) + f.importe
  }
  const sortedProviders = Object.entries(providerTotals).sort((a, b) => b[1] - a[1])
  const topProvider = sortedProviders[0]?.[0] ?? '—'
  const allProviders = sortedProviders.map(([lab, amount]) => ({ lab, amount }))

  // 2. Calculations - Abonos
  const totalAbonos = abonos.reduce((sum, a) => sum + a.importe, 0)
  const countAbonos = abonos.length
  const avgAbono = countAbonos ? totalAbonos / countAbonos : 0

  const abonoTotals: Record<string, number> = {}
  for (const a of abonos) {
    const l = a.laboratorio || t('general.sin_nombre', 'Sin nombre')
    abonoTotals[l] = (abonoTotals[l] ?? 0) + a.importe
  }
  const sortedAbonos = Object.entries(abonoTotals).sort((a, b) => b[1] - a[1])
  const allAbonosProviders = sortedAbonos.map(([lab, amount]) => ({ lab, amount }))

  // 3. Calculations - Fiscalidad
  const totalFiscal = fiscal.reduce((sum, f) => sum + f.importe, 0)
  const countFiscal = fiscal.length
  const avgFiscal = countFiscal ? totalFiscal / countFiscal : 0
  const sortedFiscal = [...fiscal].sort((a, b) => {
    const da = a.fecha || ''
    const db = b.fecha || ''
    return db.localeCompare(da)
  })

  // 4. Calculations - Trabajadores
  const totalNominas = nominas.reduce((sum, n) => sum + n.importe, 0)
  const totalSeguros = seguros.reduce((sum, s) => sum + s.importe, 0)
  const totalTrabajadores = totalNominas + totalSeguros
  const countTrabajadores = nominas.length + seguros.length

  const personnelItems = [
    ...nominas.map((n) => ({
      concepto: n.trabajador_nombre || t('trabajadores.nomina.de_trabajador', 'Nómina de Trabajador'),
      tipo: t('inicio.nomina', 'Nómina'),
      fecha: n.fecha,
      importe: n.importe,
    })),
    ...seguros.map((s) => ({
      concepto: t('trabajadores.seguros_sociales', 'Seguros Sociales'),
      tipo: t('trabajadores.seguros_sociales', 'Seguros Sociales'),
      fecha: s.fecha,
      importe: s.importe,
    })),
  ].sort((a, b) => {
    const da = a.fecha || ''
    const db = b.fecha || ''
    return db.localeCompare(da)
  })

  // 5. Calculations - Net Consolidated
  let granTotal = 0
  if (includeFacturas) granTotal += totalFacturas
  if (includeAbonos) granTotal -= totalAbonos
  if (includeFiscalidad) granTotal += totalFiscal
  if (includeTrabajadores) granTotal += totalTrabajadores

  const formatFecha = (dStr: string | null | undefined) => {
    if (!dStr) return '—'
    const clean = dStr.slice(0, 10)
    const [y, m, d] = clean.split('-')
    if (!y || !m || !d) return clean
    return `${d}/${m}/${y}`
  }

  return (
    <div
      style={{
        width: '715px',
        padding: '32px',
        background: '#ffffff',
        color: '#0f172a',
        fontFamily: "'Outfit', 'Inter', sans-serif",
      }}
    >
      {/* Header */}
      <div
        style={{
          borderBottom: '2px solid #2563eb',
          paddingBottom: '16px',
          marginBottom: '24px',
        }}
      >
        <h1 style={{ fontSize: '24px', fontWeight: 800, margin: 0, color: '#1e293b' }}>
          GFarma — {t('pdf.report_title', 'Informe de Inversiones')}
        </h1>
        <p style={{ fontSize: '12px', color: '#64748b', margin: '6px 0 0', fontWeight: 500 }}>
          {t('general.periodo', 'Periodo')}: {period} · {t('general.generado_el', 'Generado el')} {generatedAt}
        </p>
      </div>

      {/* Resumen de Gasto Consolidado */}
      <div style={{ marginBottom: '28px' }}>
        <h2 style={{ fontSize: '14px', fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>
          {t('pdf.consolidated_expense', 'Gasto Consolidado del Periodo')}
        </h2>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          {includeFacturas && (
            <div style={{ flex: '1 1 120px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px' }}>
              <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px' }}>{t('nav.facturas', 'Facturas')}</div>
              <div style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>{formatMoney(totalFacturas)}</div>
            </div>
          )}
          {includeAbonos && (
            <div style={{ flex: '1 1 120px', background: '#f0fdf4', border: '1px solid #dcfce7', borderRadius: '10px', padding: '12px' }}>
              <div style={{ fontSize: '11px', color: '#166534', fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px' }}>{t('nav.abonos', 'Abonos')}</div>
              <div style={{ fontSize: '15px', fontWeight: 800, color: '#15803d' }}>-{formatMoney(totalAbonos)}</div>
            </div>
          )}
          {includeFiscalidad && (
            <div style={{ flex: '1 1 120px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px' }}>
              <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px' }}>{t('nav.fiscalidad', 'Fiscalidad')}</div>
              <div style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>{formatMoney(totalFiscal)}</div>
            </div>
          )}
          {includeTrabajadores && (
            <div style={{ flex: '1 1 120px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px' }}>
              <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px' }}>{t('nav.trabajadores', 'Trabajadores')}</div>
              <div style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>{formatMoney(totalTrabajadores)}</div>
            </div>
          )}
          <div style={{ flex: '1 1 120px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '10px', padding: '12px' }}>
            <div style={{ fontSize: '11px', color: '#1e40af', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>{t('pdf.total_balance', 'Balance Total')}</div>
            <div style={{ fontSize: '16px', fontWeight: 900, color: '#1d4ed8' }}>{formatMoney(granTotal)}</div>
          </div>
        </div>
      </div>

      {/* Secciones Detalladas */}
      
      {/* 1. FACTURAS DETALLADO */}
      {includeFacturas && (
        <div style={{ pageBreakInside: 'avoid', marginTop: '28px', borderTop: '1px solid #e2e8f0', paddingTop: '20px' }}>
          <h2 style={{ fontSize: '14px', fontWeight: 800, color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#2563eb' }}></span>
            {t('pdf.invoice_detail', 'Detalle de Facturas Proveedores')}
          </h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '20px' }}>
            <div style={{ border: '1px solid #f1f5f9', borderRadius: '8px', padding: '10px', background: '#fafafa' }}>
              <div style={{ fontSize: '14px', fontWeight: 800 }}>{formatMoney(totalFacturas)}</div>
              <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>{t('pdf.total_invested', 'Total Invertido')}</div>
            </div>
            <div style={{ border: '1px solid #f1f5f9', borderRadius: '8px', padding: '10px', background: '#fafafa' }}>
              <div style={{ fontSize: '14px', fontWeight: 800 }}>{countFacturas}</div>
              <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>{t('pdf.num_invoices', 'Nº Facturas')}</div>
            </div>
            <div style={{ border: '1px solid #f1f5f9', borderRadius: '8px', padding: '10px', background: '#fafafa' }}>
              <div style={{ fontSize: '14px', fontWeight: 800 }}>{formatMoney(avgFactura)}</div>
              <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>{t('pdf.avg_invoice', 'Promedio / Factura')}</div>
            </div>
          </div>

          <div style={{ border: '1px solid #f1f5f9', borderRadius: '8px', padding: '10px', background: '#fafafa', marginBottom: '20px' }}>
            <div style={{ fontSize: '13px', fontWeight: 700 }}>{topProvider}</div>
            <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>{t('pdf.main_supplier', 'Proveedor Principal')}</div>
          </div>

          <h3 style={{ fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '10px' }}>{t('pdf.supplier_ranking', 'Ranking de Proveedores')}</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', marginBottom: '24px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left', color: '#64748b' }}>
                <th style={{ padding: '6px 8px' }}>#</th>
                <th style={{ padding: '6px 8px' }}>{t('general.proveedor', 'Proveedor')}</th>
                <th style={{ padding: '6px 8px', textAlign: 'right' }}>{t('general.importe', 'Importe')}</th>
                <th style={{ padding: '6px 8px', textAlign: 'right' }}>%</th>
              </tr>
            </thead>
            <tbody>
              {allProviders.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ padding: '12px', textAlign: 'center', color: '#94a3b8' }}>{t('pdf.no_invoices', 'Sin facturas en este rango.')}</td>
                </tr>
              ) : (
                allProviders.map((r, i) => (
                  <tr key={r.lab} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '6px 8px', fontWeight: 700, color: '#64748b' }}>{MEDALS[i] ?? `${i + 1}º`}</td>
                    <td style={{ padding: '6px 8px', fontWeight: 600 }}>{r.lab}</td>
                    <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700 }}>{formatMoney(r.amount)}</td>
                    <td style={{ padding: '6px 8px', textAlign: 'right', color: '#2563eb', fontWeight: 600 }}>
                      {totalFacturas > 0 ? ((r.amount / totalFacturas) * 100).toFixed(1) : '0.0'}%
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          <h3 style={{ fontSize: '12px', fontWeight: 700, color: '#475569', marginTop: '24px', marginBottom: '10px' }}>{t('pdf.invoice_list', 'Listado Detallado de Facturas')}</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left', color: '#64748b' }}>
                <th style={{ padding: '6px 8px' }}>{t('general.fecha', 'Fecha')}</th>
                <th style={{ padding: '6px 8px' }}>{t('general.proveedor', 'Proveedor')}</th>
                <th style={{ padding: '6px 8px' }}>{t('facturas.label.invoice_number', 'Nº factura')}</th>
                <th style={{ padding: '6px 8px', textAlign: 'right' }}>{t('general.importe', 'Importe')}</th>
              </tr>
            </thead>
            <tbody>
              {facturas.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ padding: '12px', textAlign: 'center', color: '#94a3b8' }}>{t('pdf.no_invoices', 'Sin facturas en este rango.')}</td>
                </tr>
              ) : (
                [...facturas]
                  .sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''))
                  .map((f, idx) => (
                    <tr key={f.id || idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '6px 8px', color: '#475569' }}>{formatFecha(f.fecha)}</td>
                      <td style={{ padding: '6px 8px', fontWeight: 600 }}>{f.laboratorio || t('general.sin_nombre', 'Sin nombre')}</td>
                      <td style={{ padding: '6px 8px', color: '#64748b' }}>{f.num_factura || '—'}</td>
                      <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700 }}>{formatMoney(f.importe)}</td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* 2. ABONOS DETALLADO */}
      {includeAbonos && (
        <div style={{ pageBreakInside: 'avoid', marginTop: '28px', borderTop: '1px solid #e2e8f0', paddingTop: '20px' }}>
          <h2 style={{ fontSize: '14px', fontWeight: 800, color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#16a34a' }}></span>
            {t('pdf.abonos_detail', 'Detalle de Abonos y Devoluciones')}
          </h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '20px' }}>
            <div style={{ border: '1px solid #f1f5f9', borderRadius: '8px', padding: '10px', background: '#fafafa' }}>
              <div style={{ fontSize: '14px', fontWeight: 800, color: '#166534' }}>{formatMoney(totalAbonos)}</div>
              <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>{t('pdf.total_credited', 'Total Abonado')}</div>
            </div>
            <div style={{ border: '1px solid #f1f5f9', borderRadius: '8px', padding: '10px', background: '#fafafa' }}>
              <div style={{ fontSize: '14px', fontWeight: 800 }}>{countAbonos}</div>
              <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>{t('pdf.num_abonos', 'Nº Abonos')}</div>
            </div>
            <div style={{ border: '1px solid #f1f5f9', borderRadius: '8px', padding: '10px', background: '#fafafa' }}>
              <div style={{ fontSize: '14px', fontWeight: 800 }}>{formatMoney(avgAbono)}</div>
              <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>{t('pdf.avg_abono', 'Promedio / Abono')}</div>
            </div>
          </div>

          <h3 style={{ fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '10px' }}>{t('pdf.abonos_breakdown', 'Desglose de Abonos por Laboratorio')}</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', marginBottom: '24px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left', color: '#64748b' }}>
                <th style={{ padding: '6px 8px' }}>#</th>
                <th style={{ padding: '6px 8px' }}>{t('general.laboratorio', 'Laboratorio')}</th>
                <th style={{ padding: '6px 8px', textAlign: 'right' }}>{t('general.importe', 'Importe')}</th>
                <th style={{ padding: '6px 8px', textAlign: 'right' }}>%</th>
              </tr>
            </thead>
            <tbody>
              {allAbonosProviders.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ padding: '12px', textAlign: 'center', color: '#94a3b8' }}>{t('pdf.no_abonos', 'Sin abonos en este rango.')}</td>
                </tr>
              ) : (
                allAbonosProviders.map((r, i) => (
                  <tr key={r.lab} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '6px 8px', fontWeight: 700, color: '#64748b' }}>{MEDALS[i] ?? `${i + 1}º`}</td>
                    <td style={{ padding: '6px 8px', fontWeight: 600 }}>{r.lab}</td>
                    <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700, color: '#166534' }}>{formatMoney(r.amount)}</td>
                    <td style={{ padding: '6px 8px', textAlign: 'right', color: '#16a34a', fontWeight: 600 }}>
                      {totalAbonos > 0 ? ((r.amount / totalAbonos) * 100).toFixed(1) : '0.0'}%
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          <h3 style={{ fontSize: '12px', fontWeight: 700, color: '#475569', marginTop: '24px', marginBottom: '10px' }}>{t('pdf.abonos_list', 'Listado Detallado de Abonos')}</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left', color: '#64748b' }}>
                <th style={{ padding: '6px 8px' }}>{t('general.fecha', 'Fecha')}</th>
                <th style={{ padding: '6px 8px' }}>{t('general.laboratorio', 'Laboratorio')}</th>
                <th style={{ padding: '6px 8px', textAlign: 'right' }}>{t('general.importe', 'Importe')}</th>
              </tr>
            </thead>
            <tbody>
              {abonos.length === 0 ? (
                <tr>
                  <td colSpan={3} style={{ padding: '12px', textAlign: 'center', color: '#94a3b8' }}>{t('pdf.no_abonos', 'Sin abonos en este rango.')}</td>
                </tr>
              ) : (
                [...abonos]
                  .sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''))
                  .map((a, idx) => (
                    <tr key={a.id || idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '6px 8px', color: '#475569' }}>{formatFecha(a.fecha)}</td>
                      <td style={{ padding: '6px 8px', fontWeight: 600 }}>{a.laboratorio || t('general.sin_nombre', 'Sin nombre')}</td>
                      <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700, color: '#166534' }}>{formatMoney(a.importe)}</td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* 3. FISCALIDAD DETALLADO */}
      {includeFiscalidad && (
        <div style={{ pageBreakInside: 'avoid', marginTop: '28px', borderTop: '1px solid #e2e8f0', paddingTop: '20px' }}>
          <h2 style={{ fontSize: '14px', fontWeight: 800, color: '#0d9488', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#0d9488' }}></span>
            {t('pdf.fiscal_detail', 'Detalle de Impuestos y Tasas (Fiscalidad)')}
          </h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '20px' }}>
            <div style={{ border: '1px solid #f1f5f9', borderRadius: '8px', padding: '10px', background: '#fafafa' }}>
              <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f766e' }}>{formatMoney(totalFiscal)}</div>
              <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>{t('pdf.total_paid', 'Total Pagado')}</div>
            </div>
            <div style={{ border: '1px solid #f1f5f9', borderRadius: '8px', padding: '10px', background: '#fafafa' }}>
              <div style={{ fontSize: '14px', fontWeight: 800 }}>{countFiscal}</div>
              <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>{t('pdf.num_liquidaciones', 'Nº Liquidaciones')}</div>
            </div>
            <div style={{ border: '1px solid #f1f5f9', borderRadius: '8px', padding: '10px', background: '#fafafa' }}>
              <div style={{ fontSize: '14px', fontWeight: 800 }}>{formatMoney(avgFiscal)}</div>
              <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>{t('pdf.avg_payment', 'Promedio / Pago')}</div>
            </div>
          </div>

          <h3 style={{ fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '10px' }}>{t('pdf.fiscal_breakdown', 'Desglose de Liquidaciones Fiscales')}</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left', color: '#64748b' }}>
                <th style={{ padding: '6px 8px' }}>{t('general.fecha', 'Fecha')}</th>
                <th style={{ padding: '6px 8px' }}>{t('pdf.concept_tax', 'Concepto / Impuesto')}</th>
                <th style={{ padding: '6px 8px', textAlign: 'right' }}>{t('general.importe', 'Importe')}</th>
              </tr>
            </thead>
            <tbody>
              {sortedFiscal.length === 0 ? (
                <tr>
                  <td colSpan={3} style={{ padding: '12px', textAlign: 'center', color: '#94a3b8' }}>{t('pdf.no_fiscal', 'Sin registros fiscales en este rango.')}</td>
                </tr>
              ) : (
                sortedFiscal.map((f, idx) => (
                  <tr key={f.id || idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '6px 8px', color: '#475569' }}>{formatFecha(f.fecha)}</td>
                    <td style={{ padding: '6px 8px', fontWeight: 600 }}>{translateConcept(f.concepto, t)}</td>
                    <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700, color: '#0f766e' }}>{formatMoney(f.importe)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* 4. TRABAJADORES DETALLADO */}
      {includeTrabajadores && (
        <div style={{ pageBreakInside: 'avoid', marginTop: '28px', borderTop: '1px solid #e2e8f0', paddingTop: '20px' }}>
          <h2 style={{ fontSize: '14px', fontWeight: 800, color: '#ea580c', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#ea580c' }}></span>
            {t('pdf.personal_detail', 'Detalle de Gasto de Trabajadores y Personal')}
          </h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' }}>
            <div style={{ border: '1px solid #f1f5f9', borderRadius: '8px', padding: '10px', background: '#fafafa' }}>
              <div style={{ fontSize: '13px', fontWeight: 800, color: '#c2410c' }}>{formatMoney(totalTrabajadores)}</div>
              <div style={{ fontSize: '9px', color: '#64748b', marginTop: '2px' }}>{t('pdf.total_personal', 'Total Personal')}</div>
            </div>
            <div style={{ border: '1px solid #f1f5f9', borderRadius: '8px', padding: '10px', background: '#fafafa' }}>
              <div style={{ fontSize: '13px', fontWeight: 800 }}>{countTrabajadores}</div>
              <div style={{ fontSize: '9px', color: '#64748b', marginTop: '2px' }}>{t('pdf.num_records', 'Nº Registros')}</div>
            </div>
            <div style={{ border: '1px solid #f1f5f9', borderRadius: '8px', padding: '10px', background: '#fafafa' }}>
              <div style={{ fontSize: '13px', fontWeight: 800 }}>{formatMoney(totalNominas)}</div>
              <div style={{ fontSize: '9px', color: '#64748b', marginTop: '2px' }}>{t('pdf.nominas_netas', 'Nóminas Netas')}</div>
            </div>
            <div style={{ border: '1px solid #f1f5f9', borderRadius: '8px', padding: '10px', background: '#fafafa' }}>
              <div style={{ fontSize: '13px', fontWeight: 800 }}>{formatMoney(totalSeguros)}</div>
              <div style={{ fontSize: '9px', color: '#64748b', marginTop: '2px' }}>{t('trabajadores.seguros_sociales', 'Seguros Sociales')}</div>
            </div>
          </div>

          <h3 style={{ fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '10px' }}>{t('pdf.personal_breakdown', 'Desglose de Gastos de Personal')}</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left', color: '#64748b' }}>
                <th style={{ padding: '6px 8px' }}>{t('general.fecha', 'Fecha')}</th>
                <th style={{ padding: '6px 8px' }}>{t('pdf.personal_detail_col', 'Detalle')}</th>
                <th style={{ padding: '6px 8px' }}>{t('pdf.personal_type_col', 'Tipo')}</th>
                <th style={{ padding: '6px 8px', textAlign: 'right' }}>{t('general.importe', 'Importe')}</th>
              </tr>
            </thead>
            <tbody>
              {personnelItems.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ padding: '12px', textAlign: 'center', color: '#94a3b8' }}>{t('pdf.no_personal', 'Sin registros de personal en este rango.')}</td>
                </tr>
              ) : (
                personnelItems.map((p, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '6px 8px', color: '#475569' }}>{formatFecha(p.fecha)}</td>
                    <td style={{ padding: '6px 8px', fontWeight: 600 }}>{p.concepto === 'Seguros Sociales' ? t('trabajadores.seguros_sociales', 'Seguros Sociales') : p.concepto}</td>
                    <td style={{ padding: '6px 8px', color: '#64748b' }}>{p.tipo === 'Seguros Sociales' ? t('trabajadores.seguros_sociales', 'Seguros Sociales') : p.tipo === 'Nómina' ? t('inicio.nomina', 'Nómina') : p.tipo}</td>
                    <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700, color: '#c2410c' }}>{formatMoney(p.importe)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
