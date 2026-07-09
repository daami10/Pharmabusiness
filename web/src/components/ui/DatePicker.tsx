import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react'
import { useTranslation } from '@/lib/i18n'

interface DatePickerProps {
  /** Valor en formato ISO 'YYYY-MM-DD' (o '' si vacío). */
  value: string
  onChange: (value: string) => void
  placeholder?: string
  /** Clases para el disparador (para imitar el input nativo que reemplaza). */
  className?: string
  min?: string
  max?: string
  disabled?: boolean
  id?: string
}

const pad = (n: number) => String(n).padStart(2, '0')
const toISO = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`

function parseISO(v: string): { y: number; m: number; d: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(v)
  if (!match) return null
  return { y: Number(match[1]), m: Number(match[2]) - 1, d: Number(match[3]) }
}

/** Muestra SIEMPRE dd/mm/YYYY, independiente del idioma del SO. */
function formatDisplay(v: string): string {
  const p = parseISO(v)
  return p ? `${pad(p.d)}/${pad(p.m + 1)}/${p.y}` : ''
}

export function DatePicker({
  value,
  onChange,
  placeholder,
  className,
  min,
  max,
  disabled,
  id,
}: DatePickerProps) {
  const { language } = useTranslation()
  const locale = language === 'ca' ? 'ca-ES' : 'es-ES'

  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const popupRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null)

  const [view, setView] = useState(() => {
    const p = parseISO(value)
    const now = new Date()
    return p ? { y: p.y, m: p.m } : { y: now.getFullYear(), m: now.getMonth() }
  })

  // Abrir/cerrar. Al abrir se sincroniza el mes visible con el valor y se calcula
  // la posición aquí (en el handler, no en un effect, para no encadenar renders).
  const toggle = () => {
    if (open) {
      setOpen(false)
      return
    }
    const p = parseISO(value)
    if (p) setView({ y: p.y, m: p.m })
    updatePosition()
    setOpen(true)
  }

  function updatePosition() {
    const el = triggerRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const popupHeight = 340
    const below = window.innerHeight - r.bottom
    // Si no cabe abajo pero sí arriba, se despliega hacia arriba.
    const openUp = below < popupHeight && r.top > popupHeight
    setPos({
      top: openUp ? r.top - popupHeight - 4 : r.bottom + 4,
      left: Math.min(r.left, window.innerWidth - 288 - 8),
      width: r.width,
    })
  }

  // Reposicionar en scroll/resize; cerrar al pulsar fuera.
  useEffect(() => {
    if (!open) return
    const onScrollResize = () => updatePosition()
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node
      if (triggerRef.current?.contains(t) || popupRef.current?.contains(t)) return
      setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('scroll', onScrollResize, true)
    window.addEventListener('resize', onScrollResize)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('scroll', onScrollResize, true)
      window.removeEventListener('resize', onScrollResize)
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const monthNames = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) =>
        new Intl.DateTimeFormat(locale, { month: 'long' }).format(new Date(2000, i, 1)),
      ),
    [locale],
  )
  const weekdays = useMemo(() => {
    const fmt = new Intl.DateTimeFormat(locale, { weekday: 'short' })
    // 2024-01-01 fue lunes → semana empezando en lunes.
    return Array.from({ length: 7 }, (_, i) =>
      fmt.format(new Date(2024, 0, 1 + i)).replace('.', ''),
    )
  }, [locale])

  const grid = useMemo(() => {
    const startWeekday = (new Date(view.y, view.m, 1).getDay() + 6) % 7 // lunes = 0
    const daysInMonth = new Date(view.y, view.m + 1, 0).getDate()
    const cells: (number | null)[] = []
    for (let i = 0; i < startWeekday; i++) cells.push(null)
    for (let d = 1; d <= daysInMonth; d++) cells.push(d)
    return cells
  }, [view])

  const now = new Date()
  const todayISO = toISO(now.getFullYear(), now.getMonth(), now.getDate())
  const isDisabled = (d: number) => {
    const iso = toISO(view.y, view.m, d)
    return (min != null && iso < min) || (max != null && iso > max)
  }

  const prevMonth = () =>
    setView((v) => (v.m === 0 ? { y: v.y - 1, m: 11 } : { y: v.y, m: v.m - 1 }))
  const nextMonth = () =>
    setView((v) => (v.m === 11 ? { y: v.y + 1, m: 0 } : { y: v.y, m: v.m + 1 }))
  const select = (d: number) => {
    onChange(toISO(view.y, view.m, d))
    setOpen(false)
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        id={id}
        disabled={disabled}
        onClick={toggle}
        className={`flex items-center justify-between gap-2 text-left ${className ?? 'w-full rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2 text-sm text-slate-200 focus:border-[#00f2fe]/40 focus:outline-none transition-all'}`}
      >
        <span className={value ? 'text-slate-200' : 'text-slate-500'}>
          {value ? formatDisplay(value) : (placeholder ?? 'dd/mm/aaaa')}
        </span>
        <CalendarIcon className="h-4 w-4 shrink-0 text-[#00f2fe]/70" />
      </button>

      {open &&
        pos &&
        createPortal(
          <div
            ref={popupRef}
            style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: 100 }}
            className="w-72 rounded-2xl border border-[#00f2fe]/20 bg-[#0b111e] p-3 shadow-[0_0_40px_rgba(0,0,0,0.6)]"
          >
            {/* Cabecera mes/año */}
            <div className="mb-2 flex items-center justify-between">
              <button
                type="button"
                onClick={prevMonth}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-white/5 hover:text-white transition-colors"
                aria-label="Mes anterior"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm font-bold capitalize text-white">
                {monthNames[view.m]} {view.y}
              </span>
              <button
                type="button"
                onClick={nextMonth}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-white/5 hover:text-white transition-colors"
                aria-label="Mes siguiente"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {/* Días de la semana */}
            <div className="mb-1 grid grid-cols-7 gap-1">
              {weekdays.map((w, i) => (
                <div
                  key={i}
                  className="text-center text-[10px] font-bold uppercase text-slate-500"
                >
                  {w}
                </div>
              ))}
            </div>

            {/* Rejilla de días */}
            <div className="grid grid-cols-7 gap-1">
              {grid.map((d, i) => {
                if (d === null) return <div key={i} />
                const iso = toISO(view.y, view.m, d)
                const selected = iso === value
                const isToday = iso === todayISO
                const disabledDay = isDisabled(d)
                return (
                  <button
                    key={i}
                    type="button"
                    disabled={disabledDay}
                    onClick={() => select(d)}
                    className={`h-8 rounded-lg text-xs font-semibold transition-all ${
                      selected
                        ? 'bg-[#00f2fe] text-slate-950'
                        : isToday
                          ? 'border border-[#00f2fe]/40 text-[#00f2fe]'
                          : 'text-slate-300 hover:bg-white/10'
                    } ${disabledDay ? 'cursor-not-allowed opacity-30 hover:bg-transparent' : 'cursor-pointer'}`}
                  >
                    {d}
                  </button>
                )
              })}
            </div>

            {/* Pie: Hoy / Limpiar */}
            <div className="mt-2 flex items-center justify-between border-t border-white/5 pt-2">
              <button
                type="button"
                onClick={() => {
                  onChange(todayISO)
                  setOpen(false)
                }}
                className="text-[11px] font-bold text-[#00f2fe] hover:underline"
              >
                {language === 'ca' ? 'Avui' : 'Hoy'}
              </button>
              <button
                type="button"
                onClick={() => {
                  onChange('')
                  setOpen(false)
                }}
                className="text-[11px] font-semibold text-slate-500 hover:text-slate-300"
              >
                {language === 'ca' ? 'Netejar' : 'Limpiar'}
              </button>
            </div>
          </div>,
          document.body,
        )}
    </>
  )
}
