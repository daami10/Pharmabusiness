import { formatMoney } from '@/lib/utils/money'
import type { AnalisisData } from './lib/analisis-view'

export interface ReportProps {
  period: string
  generatedAt: string
  analysis: AnalisisData
  fiscalTotal: number
  trabTotal: number
  granTotal: number
}

const MEDALS = ['1º', '2º', '3º']

/**
 * Informe imprimible (tema claro) para exportar a PDF con html2pdf.
 * Se renderiza fuera de pantalla y se captura por referencia.
 */
export function AnalisisReport({
  period,
  generatedAt,
  analysis,
  fiscalTotal,
  trabTotal,
  granTotal,
}: ReportProps) {
  const top = analysis.byLab.slice(0, 10)
  const totalLabs = analysis.byLab.reduce((s, r) => s + r.amount, 0)

  return (
    <div
      style={{
        width: '794px',
        padding: '40px',
        background: '#ffffff',
        color: '#0f172a',
        fontFamily: "'Outfit', 'Inter', sans-serif",
      }}
    >
      <div
        style={{
          borderBottom: '2px solid #2563eb',
          paddingBottom: '16px',
          marginBottom: '24px',
        }}
      >
        <h1 style={{ fontSize: '26px', fontWeight: 800, margin: 0 }}>
          GFarma — Informe de Inversiones
        </h1>
        <p style={{ fontSize: '13px', color: '#64748b', margin: '6px 0 0' }}>
          Periodo: {period} · Generado el {generatedAt}
        </p>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '12px',
          marginBottom: '24px',
        }}
      >
        {[
          { label: 'Total facturas', value: formatMoney(analysis.total) },
          { label: 'Nº facturas', value: String(analysis.count) },
          { label: 'Top proveedor', value: analysis.topLab },
          { label: 'Media', value: formatMoney(analysis.avg) },
        ].map((k) => (
          <div
            key={k.label}
            style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px' }}
          >
            <div style={{ fontSize: '16px', fontWeight: 800 }}>{k.value}</div>
            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
              {k.label}
            </div>
          </div>
        ))}
      </div>

      <h2 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '10px' }}>
        Gasto consolidado
      </h2>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '12px',
          marginBottom: '28px',
        }}
      >
        {[
          { label: 'Facturas', value: analysis.total },
          { label: 'Fiscalidad', value: fiscalTotal },
          { label: 'Trabajadores', value: trabTotal },
          { label: 'Gasto total', value: granTotal },
        ].map((k) => (
          <div
            key={k.label}
            style={{ background: '#f1f5f9', borderRadius: '10px', padding: '12px' }}
          >
            <div style={{ fontSize: '15px', fontWeight: 800 }}>
              {formatMoney(k.value)}
            </div>
            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
              {k.label}
            </div>
          </div>
        ))}
      </div>

      <h2 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '10px' }}>
        Ranking de proveedores (Top 10)
      </h2>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
            <th style={{ padding: '8px' }}>#</th>
            <th style={{ padding: '8px' }}>Proveedor</th>
            <th style={{ padding: '8px', textAlign: 'right' }}>Importe</th>
            <th style={{ padding: '8px', textAlign: 'right' }}>%</th>
          </tr>
        </thead>
        <tbody>
          {top.map((r, i) => (
            <tr key={r.lab} style={{ borderBottom: '1px solid #f1f5f9' }}>
              <td style={{ padding: '8px', fontWeight: 700 }}>
                {MEDALS[i] ?? `${i + 1}º`}
              </td>
              <td style={{ padding: '8px', fontWeight: 600 }}>{r.lab}</td>
              <td style={{ padding: '8px', textAlign: 'right', fontWeight: 700 }}>
                {formatMoney(r.amount)}
              </td>
              <td
                style={{
                  padding: '8px',
                  textAlign: 'right',
                  color: '#2563eb',
                  fontWeight: 600,
                }}
              >
                {totalLabs > 0 ? ((r.amount / totalLabs) * 100).toFixed(1) : '0.0'}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
