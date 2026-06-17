import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Nomina, NominaInput, Seguro, SeguroInput, Trabajador } from '@/types/domain'
import { useAuth } from '@/features/auth/AuthProvider'

async function currentUserId(): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('No hay sesión activa.')
  return user.id
}

// ─── Trabajadores ───────────────────────────────────────────────────────────
const TRAB_KEY = ['trabajadores'] as const

export function useTrabajadores() {
  return useQuery({
    queryKey: TRAB_KEY,
    queryFn: async (): Promise<Trabajador[]> => {
      const { data, error } = await supabase
        .from('trabajadores')
        .select('*')
        .order('nombre')
      if (error) throw new Error(error.message)
      return (data ?? []) as Trabajador[]
    },
  })
}

export function useCreateTrabajador() {
  const qc = useQueryClient()
  const { activeOrgId } = useAuth()
  return useMutation({
    mutationFn: async (nombre: string) => {
      const user_id = await currentUserId()
      if (!activeOrgId) throw new Error('No hay organización activa.')
      const { error } = await supabase
        .from('trabajadores')
        .insert([{ nombre, user_id, org_id: activeOrgId }])
      if (error) throw new Error(error.message)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: TRAB_KEY }),
  })
}

export function useUpdateTrabajador() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, activo }: { id: string; activo: boolean }) => {
      const { error } = await supabase
        .from('trabajadores')
        .update({ activo })
        .eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: TRAB_KEY }),
  })
}

// ─── Nóminas ──────────────────────────────────────────────────────────────────
const NOM_KEY = ['nominas'] as const

export function useNominas() {
  return useQuery({
    queryKey: NOM_KEY,
    queryFn: async (): Promise<Nomina[]> => {
      const { data, error } = await supabase
        .from('nominas')
        .select('*')
        .order('fecha', { ascending: false })
      if (error) throw new Error(error.message)
      return (data ?? []) as Nomina[]
    },
  })
}

export function useCreateNominas() {
  const qc = useQueryClient()
  const { activeOrgId } = useAuth()
  return useMutation({
    mutationFn: async (inputs: NominaInput[]) => {
      const user_id = await currentUserId()
      if (!activeOrgId) throw new Error('No hay organización activa.')
      const { error } = await supabase
        .from('nominas')
        .insert(inputs.map((i) => ({ ...i, user_id, org_id: activeOrgId })))
      if (error) throw new Error(error.message)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: NOM_KEY }),
  })
}

export function useUpdateNomina() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: NominaInput }) => {
      const { error } = await supabase.from('nominas').update(input).eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: NOM_KEY }),
  })
}

export function useDeleteNomina() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('nominas').delete().eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: NOM_KEY }),
  })
}

// ─── Seguros Sociales ───────────────────────────────────────────────────────
const SEG_KEY = ['seguros'] as const

export function useSeguros() {
  return useQuery({
    queryKey: SEG_KEY,
    queryFn: async (): Promise<Seguro[]> => {
      const { data, error } = await supabase
        .from('seguros_sociales')
        .select('*')
        .order('fecha', { ascending: false })
      if (error) throw new Error(error.message)
      return (data ?? []) as Seguro[]
    },
  })
}

export function useCreateSeguros() {
  const qc = useQueryClient()
  const { activeOrgId } = useAuth()
  return useMutation({
    mutationFn: async (inputs: SeguroInput[]) => {
      const user_id = await currentUserId()
      if (!activeOrgId) throw new Error('No hay organización activa.')
      const { error } = await supabase
        .from('seguros_sociales')
        .insert(inputs.map((i) => ({ ...i, user_id, org_id: activeOrgId })))
      if (error) throw new Error(error.message)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: SEG_KEY }),
  })
}

export function useUpdateSeguro() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: SeguroInput }) => {
      const { error } = await supabase.from('seguros_sociales').update(input).eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: SEG_KEY }),
  })
}

export function useDeleteSeguro() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('seguros_sociales').delete().eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: SEG_KEY }),
  })
}
