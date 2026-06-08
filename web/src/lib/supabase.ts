import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  throw new Error(
    'Faltan VITE_SUPABASE_URL y/o VITE_SUPABASE_ANON_KEY. Copia web/.env.example a web/.env y rellénalas.',
  )
}

// Cliente único de Supabase. La anon key es pública (protegida por RLS);
// la service_role key NUNCA debe vivir en el frontend.
export const supabase = createClient(url, anonKey)
