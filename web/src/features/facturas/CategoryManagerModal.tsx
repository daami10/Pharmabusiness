import { useState } from 'react'
import { Plus, Tag, Trash2 } from 'lucide-react'
import { Dialog } from '@/components/ui/Dialog'
import { useTranslation } from '@/lib/i18n'
import { useAuth } from '@/features/auth/AuthProvider'
import { useCategoriesStore } from '@/stores/categoriesStore'
import { useWholesalersStore } from '@/stores/wholesalersStore'
import { isReservedCategory } from '@/lib/config/categories'

// Alta/baja de categorías personalizadas de la organización. Se abre desde las
// Acciones Rápidas de Inicio. Solo el titular puede sincronizar en BD (RLS), pero
// la UI es la misma; en "org de uno" el titular es el usuario habitual.
export function CategoryManagerModal({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const { t } = useTranslation()
  const { activeOrgId, userRole } = useAuth()
  const categories = useCategoriesStore((s) => s.categories)
  const addCategory = useCategoriesStore((s) => s.addCategory)
  const removeCategory = useCategoriesStore((s) => s.removeCategory)
  const wholesalers = useWholesalersStore((s) => s.wholesalers)

  const [value, setValue] = useState('')
  const [error, setError] = useState('')

  const isTitular = userRole === 'titular'

  const submit = async () => {
    const v = value.trim()
    setError('')
    if (!v) return
    if (isReservedCategory(v, wholesalers)) {
      setError(t('categories.error.reserved', 'Ese nombre ya es una categoría de sistema o un mayorista.'))
      return
    }
    if (categories.some((c) => c.toLowerCase() === v.toLowerCase())) {
      setError(t('categories.error.duplicate', 'Esa categoría ya existe.'))
      return
    }
    await addCategory(v, activeOrgId)
    setValue('')
  }

  return (
    <Dialog open={open} onClose={onClose} title={t('categories.title', 'Categorías personalizadas')}>
      <div className="space-y-4">
        <p className="text-sm text-slate-400">
          {t(
            'categories.intro',
            'Crea categorías propias (además de Laboratorio, Mayoristas y Otro) para clasificar tus facturas y verlas en Análisis.',
          )}
        </p>

        {!isTitular && (
          <p className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs text-amber-400">
            {t('categories.only_titular', 'Solo el titular puede guardar cambios en las categorías.')}
          </p>
        )}

        {/* Añadir */}
        <div className="flex gap-2">
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                submit()
              }
            }}
            placeholder={t('categories.placeholder', 'Ej: Parafarmacia, Limpieza…')}
            disabled={!isTitular}
            className="flex-1 rounded-xl border border-white/10 bg-slate-950/40 px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:border-accent-blue/40 focus:outline-none disabled:opacity-50"
          />
          <button
            type="button"
            onClick={submit}
            disabled={!isTitular || !value.trim()}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:from-blue-400 hover:to-indigo-500 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            {t('general.anadir', 'Añadir')}
          </button>
        </div>
        {error && <p className="text-xs text-red-400">{error}</p>}

        {/* Lista */}
        <div className="space-y-2">
          {categories.length === 0 ? (
            <p className="py-4 text-center text-xs text-slate-500">
              {t('categories.empty', 'Aún no tienes categorías personalizadas.')}
            </p>
          ) : (
            categories.map((c) => (
              <div
                key={c}
                className="flex items-center justify-between rounded-xl border border-white/5 bg-slate-950/40 px-4 py-2.5"
              >
                <span className="flex items-center gap-2 text-sm font-semibold text-slate-200">
                  <Tag className="h-4 w-4 text-accent-blue" />
                  {c}
                </span>
                {isTitular && (
                  <button
                    type="button"
                    onClick={() => removeCategory(c, activeOrgId)}
                    className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-white/5 hover:text-red-400"
                    title={t('general.eliminar', 'Eliminar')}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))
          )}
        </div>
        <p className="text-3xs text-slate-500">
          {t(
            'categories.remove_hint',
            'Eliminar una categoría no borra las facturas que ya la usan; solo deja de ofrecerse para nuevas.',
          )}
        </p>
      </div>
    </Dialog>
  )
}
