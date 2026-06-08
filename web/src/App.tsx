export default function App() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
      <span className="rounded-full border border-accent-blue/30 bg-accent-blue/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-accent-blue">
        v2 · React + TypeScript
      </span>
      <h1 className="text-4xl font-extrabold tracking-tight text-white">
        <span className="text-accent-blue">G</span>Farma
      </h1>
      <p className="max-w-md text-sm text-slate-400">
        Andamiaje de la nueva app (Fase 0). Vite + React + TS + Tailwind + TanStack Query
        + Supabase listos. La migración de módulos comienza en la Fase 3.
      </p>
    </main>
  )
}
