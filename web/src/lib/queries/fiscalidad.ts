import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Fiscal, FiscalInput } from '@/types/domain'
import { useAuth } from '@/features/auth/AuthProvider'

const KEY = ['fiscalidad'] as const

export function useFiscalidad() {
  return useQuery({
    queryKey: KEY,
    queryFn: async (): Promise<Fiscal[]> => {
      const { data, error } = await supabase
        .from('fiscalidad')
        .select('*')
        .order('fecha', { ascending: false })
      if (error) throw new Error(error.message)
      return (data ?? []) as Fiscal[]
    },
  })
}

/** Inserta uno o varios registros (los varios provienen de la recurrencia mensual). */
export function useCreateFiscales() {
  const qc = useQueryClient()
  const { activeOrgId } = useAuth()
  return useMutation({
    mutationFn: async (inputs: FiscalInput[]) => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error('No hay sesión activa.')
      if (!activeOrgId) throw new Error('No hay organización activa.')
      const rows = inputs.map((i) => ({ ...i, user_id: user.id, org_id: activeOrgId }))
      const { error } = await supabase.from('fiscalidad').insert(rows)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export function useUpdateFiscal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: FiscalInput }) => {
      const { error } = await supabase.from('fiscalidad').update(input).eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export function useDeleteFiscal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('fiscalidad').delete().eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}
