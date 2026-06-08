import { Dialog } from '@/components/ui/Dialog'

export function PrivacyModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onClose={onClose} title="Política de privacidad">
      <div className="max-h-[60vh] space-y-4 overflow-y-auto pr-1 text-sm leading-relaxed text-slate-300">
        <p>
          GFarma trata los datos de tu farmacia (facturas, proveedores, nóminas y seguros
          sociales) con el único fin de prestarte el servicio de gestión económica.
        </p>
        <p>
          <strong className="text-slate-100">Responsable y finalidad.</strong> Los datos
          se almacenan de forma segura en Supabase y solo son accesibles por tu cuenta. No
          se ceden a terceros ni se usan con fines distintos a los del servicio.
        </p>
        <p>
          <strong className="text-slate-100">Datos de empleados.</strong> Si registras
          nóminas o seguros sociales de tu personal, eres responsable de informar a las
          personas afectadas y de contar con base legal para su tratamiento.
        </p>
        <p>
          <strong className="text-slate-100">Tus derechos.</strong> Puedes acceder,
          rectificar o eliminar tus datos en cualquier momento desde la propia aplicación
          o solicitándolo al equipo de GFarma.
        </p>
        <p className="text-xs text-slate-500">
          Documento resumido. La política completa y el contrato de encargado de
          tratamiento (DPA) están disponibles bajo solicitud.
        </p>
      </div>
      <button
        type="button"
        onClick={onClose}
        className="mt-6 w-full rounded-xl border border-white/10 py-3 text-sm font-semibold text-slate-300 transition-all hover:bg-white/5"
      >
        Cerrar
      </button>
    </Dialog>
  )
}
