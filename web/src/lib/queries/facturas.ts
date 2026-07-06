import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Factura, FacturaInput } from '@/types/domain'
import { useAuth } from '@/features/auth/AuthProvider'

const FACTURAS_KEY = ['facturas'] as const

/** Lista todas las facturas (incluye abonos). El filtrado por año/categoría es en cliente. */
export function useFacturas() {
  return useQuery({
    queryKey: FACTURAS_KEY,
    queryFn: async (): Promise<Factura[]> => {
      const { data, error } = await supabase
        .from('facturas')
        .select('*')
        .order('fecha', { ascending: false, nullsFirst: false })
      if (error) throw new Error(error.message)
      return (data ?? []) as Factura[]
    },
  })
}

export function useCreateFactura() {
  const qc = useQueryClient()
  const { activeOrgId } = useAuth()
  return useMutation({
    mutationFn: async (input: FacturaInput) => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error('No hay sesión activa.')
      if (!activeOrgId) throw new Error('No hay organización activa.')
      const { error } = await supabase
        .from('facturas')
        .insert([{ ...input, user_id: user.id, org_id: activeOrgId }])
      if (error) throw new Error(error.message)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: FACTURAS_KEY }),
  })
}

export function useUpdateFactura() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: FacturaInput }) => {
      const { error } = await supabase.from('facturas').update(input).eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: FACTURAS_KEY }),
  })
}

export function useSetPagada() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, pagada }: { id: string; pagada: boolean }) => {
      const { error } = await supabase.from('facturas').update({ pagada }).eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: FACTURAS_KEY }),
  })
}

export function useDeleteFactura() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('facturas').delete().eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: FACTURAS_KEY }),
  })
}

export function useCreateFacturas() {
  const qc = useQueryClient()
  const { activeOrgId } = useAuth()
  return useMutation({
    mutationFn: async (inputs: FacturaInput[]) => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error('No hay sesión activa.')
      if (!activeOrgId) throw new Error('No hay organización activa.')
      const { error } = await supabase
        .from('facturas')
        .insert(
          inputs.map((input) => ({ ...input, user_id: user.id, org_id: activeOrgId })),
        )
      if (error) throw new Error(error.message)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: FACTURAS_KEY }),
  })
}
