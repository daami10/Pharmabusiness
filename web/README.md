# GFarma — Web (v2)

Frontend de la nueva versión de GFarma: **Vite + React + TypeScript**.
Convive con la app legacy (Vanilla JS en la raíz del repo) hasta completar la migración
módulo a módulo. Ver el plan en [`../docs/ARQUITECTURA_V2.md`](../docs/ARQUITECTURA_V2.md).

## Stack

- **Vite** + **React 19** + **TypeScript**
- **Tailwind CSS v4** (tokens de marca en `src/index.css`)
- **TanStack Query** (estado de servidor) · **React Router** · **Zustand** (estado UI)
- **Supabase** (`src/lib/supabase.ts`)
- **React Hook Form + Zod** (formularios y validación)
- **Chart.js** vía `react-chartjs-2`
- **Vitest** + **Testing Library** · **ESLint** + **Prettier**

## Puesta en marcha

```bash
cd web
cp .env.example .env   # rellena VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY
npm install
npm run dev
```

## Scripts

| Script              | Qué hace                         |
| ------------------- | -------------------------------- |
| `npm run dev`       | Servidor de desarrollo (HMR).    |
| `npm run build`     | Typecheck + build de producción. |
| `npm run typecheck` | Solo comprobación de tipos.      |
| `npm run lint`      | ESLint.                          |
| `npm test`          | Tests con Vitest.                |
| `npm run format`    | Formatea con Prettier.           |

## Variables de entorno

Solo claves **públicas** (prefijo `VITE_`, embebidas en el cliente):
`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`. La `service_role` key y la `GEMINI_KEY`
**nunca** van aquí — viven solo en el servidor.
