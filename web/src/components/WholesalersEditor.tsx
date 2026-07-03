import { useState } from 'react'
import { Check, Plus, X } from 'lucide-react'
import { PREDEFINED_WHOLESALERS } from '@/lib/config/wholesalers'
import { useTranslation } from '@/lib/i18n'

/** Editor de la lista de mayoristas: chips predefinidos + añadir personalizados. */
export function WholesalersEditor({
  value,
  onChange,
}: {
  value: string[]
  onChange: (list: string[]) => void
}) {
  const { t } = useTranslation()
  const [custom, setCustom] = useState('')

  const toggle = (w: string) =>
    onChange(value.includes(w) ? value.filter((x) => x !== w) : [...value, w])

  const addCustom = () => {
    const v = custom.trim()
    if (v && !value.includes(v)) onChange([...value, v])
    setCustom('')
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        {PREDEFINED_WHOLESALERS.map((w) => {
          const selected = value.includes(w)
          return (
            <button
              key={w}
              type="button"
              onClick={() => toggle(w)}
              className={`flex items-center justify-between rounded-xl border px-4 py-2.5 text-2xs font-bold transition-all ${
                selected
                  ? 'border-accent-blue bg-indigo-600/20 text-white'
                  : 'border-white/5 bg-slate-950/40 text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>{w}</span>
              {selected ? (
                <Check className="h-4 w-4 text-accent-blue" />
              ) : (
                <span className="h-4 w-4 rounded-full border border-white/15" />
              )}
            </button>
          )
        })}
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              addCustom()
            }
          }}
          placeholder={t('settings.add_custom_wholesaler', 'Añadir otro mayorista…')}
          className="w-full rounded-xl border border-white/10 bg-slate-950/40 px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:border-accent-blue/40 focus:outline-none"
        />
        <button
          type="button"
          onClick={addCustom}
          className="shrink-0 rounded-xl border border-white/10 px-3 text-slate-300 hover:bg-white/5"
          aria-label={t('general.add', 'Añadir')}
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {value.length === 0 && (
          <span className="text-2xs text-slate-500">{t('settings.none_selected', 'Ninguno seleccionado.')}</span>
        )}
        {value.map((w) => (
          <span
            key={w}
            className="inline-flex items-center gap-1 rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-2.5 py-1.5 text-2xs font-bold text-indigo-300"
          >
            {w}
            <button
              type="button"
              onClick={() => toggle(w)}
              className="text-indigo-400 hover:text-indigo-200"
              aria-label={`Quitar ${w}`}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </span>
        ))}
      </div>
    </div>
  )
}
