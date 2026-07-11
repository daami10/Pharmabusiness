import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react'
import { useTranslation } from '@/lib/i18n'

interface DatePickerProps {
  /** Valor ISO: 'YYYY-MM-DD' en modo date, 'YYYY-MM' en modo month (o '' si vacío). */
  value: string
  onChange: (value: string) => void
  /** 'date' (día, por defecto) o 'month' (selector de mes). */
  mode?: 'date' | 'month'
  placeholder?: string
  /** Clases para el contenedor (para imitar el input nativo que reemplaza). */
  className?: string
  min?: string
  max?: string
  disabled?: boolean
  id?: string
}

const pad = (n: number) => String(n).padStart(2, '0')

export function DatePicker({
  value,
  onChange,
  mode = 'date',
  placeholder,
  className,
  min,
  max,
  disabled,
  id,
}: DatePickerProps) {
  const { language } = useTranslation()
  const locale = language === 'ca' ? 'ca-ES' : 'es-ES'
  const isMonth = mode === 'month'

  // --- Parseo/formato según el modo ---
  const parseValue = (v: string): { y: number; m: number; d: number } | null => {
    if (isMonth) {
      const m = /^(\d{4})-(\d{2})/.exec(v)
      return m ? { y: Number(m[1]), m: Number(m[2]) - 1, d: 1 } : null
    }
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(v)
    return m ? { y: Number(m[1]), m: Number(m[2]) - 1, d: Number(m[3]) } : null
  }
  const emit = (y: number, m: number, d: number) =>
    isMonth ? `${y}-${pad(m + 1)}` : `${y}-${pad(m + 1)}-${pad(d)}`
  // Muestra SIEMPRE mm/YYYY (month) o dd/mm/YYYY (date), sin depender del SO.
  const formatDisplay = (v: string): string => {
    const p = parseValue(v)
    if (!p) return ''
    return isMonth ? `${pad(p.m + 1)}/${p.y}` : `${pad(p.d)}/${pad(p.m + 1)}/${p.y}`
  }
  // Interpreta lo tecleado a mano.
  const parseTyped = (s: string): string | null => {
    if (isMonth) {
      const m = /^\s*(\d{1,2})[/\-.](\d{2,4})\s*$/.exec(s)
      if (!m) return null
      const mo = Number(m[1])
      const y = m[2].length <= 2 ? 2000 + Number(m[2]) : Number(m[2])
      if (mo < 1 || mo > 12) return null
      return `${y}-${pad(mo)}`
    }
    const m = /^\s*(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})\s*$/.exec(s)
    if (!m) return null
    const d = Number(m[1])
    const mo = Number(m[2])
    const y = m[3].length <= 2 ? 2000 + Number(m[3]) : Number(m[3])
    if (mo < 1 || mo > 12) return null
    const daysInMonth = new Date(y, mo, 0).getDate()
    if (d < 1 || d > daysInMonth) return null
    return `${y}-${pad(mo)}-${pad(d)}`
  }

  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [focused, setFocused] = useState(false)
  const shown = focused ? text : formatDisplay(value)

  const wrapperRef = useRef<HTMLDivElement>(null)
  const popupRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)

  const [view, setView] = useState(() => {
    const p = parseValue(value)
    const now = new Date()
    return p ? { y: p.y, m: p.m } : { y: now.getFullYear(), m: now.getMonth() }
  })

  function updatePosition() {
    const el = wrapperRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const popupHeight = isMonth ? 240 : 340
    const below = window.innerHeight - r.bottom
    const openUp = below < popupHeight && r.top > popupHeight
    setPos({
      top: openUp ? r.top - popupHeight - 4 : r.bottom + 4,
      left: Math.min(r.left, window.innerWidth - 288 - 8),
    })
  }

  const toggle = () => {
    if (open) {
      setOpen(false)
      return
    }
    const p = parseValue(value)
    if (p) setView({ y: p.y, m: p.m })
    updatePosition()
    setOpen(true)
  }

  const onType = (raw: string) => {
    setText(raw)
    if (raw.trim() === '') {
      onChange('')
      return
    }
    const iso = parseTyped(raw)
    if (iso) onChange(iso)
  }

  useEffect(() => {
    if (!open) return
    const onScrollResize = () => updatePosition()
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node
      if (wrapperRef.current?.contains(t) || popupRef.current?.contains(t)) return
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const monthNamesLong = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) =>
        new Intl.DateTimeFormat(locale, { month: 'long' }).format(new Date(2000, i, 1)),
      ),
    [locale],
  )
  const monthNamesShort = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) =>
        new Intl.DateTimeFormat(locale, { month: 'short' }).format(new Date(2000, i, 1)).replace('.', ''),
      ),
    [locale],
  )
  const weekdays = useMemo(() => {
    const fmt = new Intl.DateTimeFormat(locale, { weekday: 'short' })
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
  const todayISO = emit(now.getFullYear(), now.getMonth(), now.getDate())
  const isDisabledDay = (d: number) => {
    const iso = emit(view.y, view.m, d)
    return (min != null && iso < min) || (max != null && iso > max)
  }

  const prevMonth = () =>
    setView((v) => (v.m === 0 ? { y: v.y - 1, m: 11 } : { y: v.y, m: v.m - 1 }))
  const nextMonth = () =>
    setView((v) => (v.m === 11 ? { y: v.y + 1, m: 0 } : { y: v.y, m: v.m + 1 }))
  const selectDay = (d: number) => {
    onChange(emit(view.y, view.m, d))
    setFocused(false)
    setOpen(false)
  }
  const selectMonth = (mi: number) => {
    onChange(emit(view.y, mi, 1))
    setFocused(false)
    setOpen(false)
  }

  const selected = parseValue(value)

  return (
    <>
      <div
        ref={wrapperRef}
        className={`flex items-center gap-2 ${className ?? 'w-full rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2 text-sm text-slate-200 transition-all'}`}
      >
        <input
          id={id}
          type="text"
          inputMode="numeric"
          disabled={disabled}
          value={shown}
          placeholder={placeholder ?? (isMonth ? 'mm/aaaa' : 'dd/mm/aaaa')}
          onFocus={() => {
            setFocused(true)
            setText(formatDisplay(value))
          }}
          onChange={(e) => onType(e.target.value)}
          onBlur={() => setFocused(false)}
          className="min-w-0 flex-1 border-0 bg-transparent p-0 text-inherit placeholder-slate-500 focus:outline-none"
        />
        <button
          type="button"
          disabled={disabled}
          onClick={toggle}
          className="shrink-0 text-[#00f2fe]/70 hover:text-[#00f2fe] transition-colors"
          aria-label="Abrir calendario"
        >
          <CalendarIcon className="h-4 w-4" />
        </button>
      </div>

      {open &&
        pos &&
        createPortal(
          <div
            ref={popupRef}
            style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: 100 }}
            className="w-72 rounded-2xl border border-[#00f2fe]/20 bg-[#0b111e] p-3 shadow-[0_0_40px_rgba(0,0,0,0.6)]"
          >
            {/* Cabecera: mes+año (date) o solo año (month) */}
            <div className="mb-2 flex items-center justify-between">
              <button
                type="button"
                onClick={() => (isMonth ? setView((v) => ({ ...v, y: v.y - 1 })) : prevMonth())}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-white/5 hover:text-white transition-colors"
                aria-label="Anterior"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm font-bold capitalize text-white">
                {isMonth ? view.y : `${monthNamesLong[view.m]} ${view.y}`}
              </span>
              <button
                type="button"
                onClick={() => (isMonth ? setView((v) => ({ ...v, y: v.y + 1 })) : nextMonth())}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-white/5 hover:text-white transition-colors"
                aria-label="Siguiente"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {isMonth ? (
              // Rejilla de 12 meses
              <div className="grid grid-cols-3 gap-2">
                {monthNamesShort.map((name, mi) => {
                  const isSel = selected && selected.y === view.y && selected.m === mi
                  return (
                    <button
                      key={mi}
                      type="button"
                      onClick={() => selectMonth(mi)}
                      className={`rounded-lg py-2 text-xs font-semibold capitalize transition-all ${
                        isSel
                          ? 'bg-[#00f2fe] text-slate-950'
                          : 'text-slate-300 hover:bg-white/10'
                      }`}
                    >
                      {name}
                    </button>
                  )
                })}
              </div>
            ) : (
              <>
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
                <div className="grid grid-cols-7 gap-1">
                  {grid.map((d, i) => {
                    if (d === null) return <div key={i} />
                    const iso = emit(view.y, view.m, d)
                    const isSel = iso === value
                    const isToday = iso === todayISO
                    const disabledDay = isDisabledDay(d)
                    return (
                      <button
                        key={i}
                        type="button"
                        disabled={disabledDay}
                        onClick={() => selectDay(d)}
                        className={`h-8 rounded-lg text-xs font-semibold transition-all ${
                          isSel
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
              </>
            )}

            <div className="mt-2 flex items-center justify-between border-t border-white/5 pt-2">
              <button
                type="button"
                onClick={() => {
                  onChange(todayISO)
                  setFocused(false)
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
                  setText('')
                  setFocused(false)
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
