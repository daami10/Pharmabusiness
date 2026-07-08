-- Migration: aplicar en servidor los permisos de Abonos (separados de Facturas)
-- Path: supabase/migrations/20260708000001_enforce_abonos_permissions.sql
--
-- Contexto (A3): abonos_read/abonos_write existían como toggles en la UI pero la RLS
-- no los miraba: los abonos son filas de `facturas` con tipo='Abono', y las policies
-- solo comprobaban facturas_read/facturas_write. Un empleado con permiso de facturas
-- gestionaba abonos aunque tuviera abonos_write desactivado.
--
-- Fix (opción B, elegida por el usuario): las policies de facturas pasan a ser
-- CONSCIENTES DEL TIPO. Las filas tipo='Abono' se gobiernan por abonos_read/abonos_write;
-- el resto por facturas_read/facturas_write. (El titular sigue pasando todo por su rol,
-- porque has_org_permission devuelve true para role='titular'.)
--
-- Efecto de negocio: un empleado sin abonos_read ya NO ve las filas de abono (sus
-- totales/gráficas excluyen las devoluciones); sin abonos_write no puede crearlas/editarlas.
-- Un empleado solo con abonos_read (sin facturas_read) ve únicamente los abonos.
--
-- NOTA: membresías antiguas cuyo JSON de permisos no tenga la clave abonos_read
-- dejarán de ver los abonos hasta que el titular se la active (comportamiento deseado).
-- DELETE se deja como estaba (solo titular) para cualquier fila de facturas.

DO $$
BEGIN
  DROP POLICY IF EXISTS "org_member_select_facturas" ON public.facturas;
  DROP POLICY IF EXISTS "org_member_insert_facturas" ON public.facturas;
  DROP POLICY IF EXISTS "org_member_update_facturas" ON public.facturas;
END $$;

-- SELECT: abono -> abonos_read ; resto -> facturas_read
CREATE POLICY "org_member_select_facturas" ON public.facturas FOR SELECT TO authenticated
  USING (
    public.has_active_access(org_id)
    AND CASE WHEN tipo = 'Abono'
      THEN public.has_org_permission(org_id, 'abonos_read')
      ELSE public.has_org_permission(org_id, 'facturas_read')
    END
  );

-- INSERT: abono -> abonos_write ; resto -> facturas_write
CREATE POLICY "org_member_insert_facturas" ON public.facturas FOR INSERT TO authenticated
  WITH CHECK (
    public.has_active_access(org_id)
    AND CASE WHEN tipo = 'Abono'
      THEN public.has_org_permission(org_id, 'abonos_write')
      ELSE public.has_org_permission(org_id, 'facturas_write')
    END
  );

-- UPDATE: se comprueba el tipo tanto en la fila vieja (USING) como en la nueva (WITH CHECK),
-- así cambiar el tipo factura<->abono exige el permiso de escritura de ambos lados.
CREATE POLICY "org_member_update_facturas" ON public.facturas FOR UPDATE TO authenticated
  USING (
    public.has_active_access(org_id)
    AND CASE WHEN tipo = 'Abono'
      THEN public.has_org_permission(org_id, 'abonos_write')
      ELSE public.has_org_permission(org_id, 'facturas_write')
    END
  )
  WITH CHECK (
    public.has_active_access(org_id)
    AND CASE WHEN tipo = 'Abono'
      THEN public.has_org_permission(org_id, 'abonos_write')
      ELSE public.has_org_permission(org_id, 'facturas_write')
    END
  );

-- (org_member_delete_facturas se mantiene de 20260701000000: solo titular + has_active_access)
