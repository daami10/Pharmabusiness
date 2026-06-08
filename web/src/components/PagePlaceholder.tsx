export function PagePlaceholder({ title }: { title: string }) {
  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <h1 className="text-3xl font-extrabold tracking-tight text-white">{title}</h1>
      <p className="mt-2 text-sm text-slate-400">
        Módulo pendiente de migrar desde el legacy (Hito 2+).
      </p>
    </div>
  )
}
