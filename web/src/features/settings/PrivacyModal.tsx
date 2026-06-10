import { Dialog } from '@/components/ui/Dialog'

export function PrivacyModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onClose={onClose} title="Política de privacidad" size="2xl">
      <div className="space-y-4 pr-1 text-sm leading-relaxed text-slate-300">
        <p className="text-xs text-slate-400">
          <strong className="font-bold text-slate-300">Última actualización:</strong> 3 de junio de 2026
        </p>

        <p>
          La presente Política de Privacidad describe cómo{' '}
          <strong className="font-bold text-slate-100">GFarma</strong> (en adelante, "la Aplicación" o
          "el Servicio"), gestionada por el Propietario/Desarrollador (en adelante,
          "el Proveedor"), recopila, utiliza y protege la información y los datos de carácter personal
          y financiero de los usuarios (en adelante, "el Cliente" o "los Usuarios").
        </p>
        <p>Al utilizar GFarma, usted acepta las prácticas descritas en esta política.</p>

        <hr className="border-white/5 my-4" />

        <h4 className="font-bold text-slate-100 text-base">1. Información que Recopilamos</h4>
        <p>
          Para el correcto funcionamiento de GFarma, la aplicación procesa y almacena los siguientes
          datos que el propio usuario introduce voluntariamente:
        </p>
        <ul className="list-disc pl-5 space-y-1.5 text-slate-300">
          <li>
            <strong className="font-bold text-slate-200">Datos de Registro y Cuenta:</strong> Correo
            electrónico y contraseña (gestionados y encriptados de forma segura a través del sistema
            de autenticación de Supabase).
          </li>
          <li>
            <strong className="font-bold text-slate-200">Datos Financieros e Inversiones:</strong>{' '}
            Información de facturas de proveedores (laboratorios, importes, números de factura,
            fechas de emisión y vencimiento, estado de pago).
          </li>
          <li>
            <strong className="font-bold text-slate-200">Datos Laborales y Fiscales:</strong> Nóminas
            del personal de la farmacia, importes de seguros sociales, impuestos municipales y
            estatales declarados en el módulo de Fiscalidad.
          </li>
          <li>
            <strong className="font-bold text-slate-200">Documentación Adjunta (Imágenes):</strong>{' '}
            Fotografías o PDFs de facturas subidas por el usuario para su extracción de datos por
            Inteligencia Artificial (a través de la API de Gemini).
          </li>
        </ul>

        <h4 className="font-bold text-slate-100 text-base mt-4">2. Finalidad del Tratamiento de los Datos</h4>
        <p>Los datos proporcionados se utilizan exclusivamente para:</p>
        <ol className="list-decimal pl-5 space-y-1.5 text-slate-300">
          <li>Permitir al Cliente llevar un control de compras, vencimientos y previsiones de gasto.</li>
          <li>Generar reportes financieros en formatos PDF o CSV descargables por el propio usuario.</li>
          <li>
            Facilitar la automatización de la lectura de facturas físicas mediante herramientas de
            reconocimiento óptico por IA (Gemini).
          </li>
          <li>Proveer soporte técnico y mantenimiento de la aplicación.</li>
        </ol>

        <h4 className="font-bold text-slate-100 text-base mt-4">3. Seguridad de los Datos y Almacenamiento</h4>
        <ul className="list-disc pl-5 space-y-1.5 text-slate-300">
          <li>
            <strong className="font-bold text-slate-200">Infraestructura:</strong> Los datos se
            almacenan en los servidores de <strong className="font-bold text-slate-100">Supabase</strong>,
            que cuenta con medidas de seguridad físicas y lógicas de nivel empresarial.
          </li>
          <li>
            <strong className="font-bold text-slate-200">Aislamiento de Datos (RLS):</strong> La base
            de datos tiene activada la tecnología{' '}
            <strong className="font-bold text-slate-100">Row Level Security (RLS)</strong>. Esto
            significa que los datos están blindados a nivel de base de datos para que ningún usuario
            de la aplicación pueda consultar, modificar o eliminar datos de otros usuarios bajo ninguna
            circunstancia.
          </li>
          <li>
            <strong className="font-bold text-slate-200">Privacidad del Administrador:</strong> Aunque
            el Proveedor actúa como administrador de la infraestructura de la base de datos (con
            capacidad técnica teórica de mantenimiento en Supabase), se compromete formalmente por
            contrato de confidencialidad a{' '}
            <strong className="font-bold text-slate-150">no acceder, revisar, compartir ni modificar</strong>{' '}
            los datos comerciales ni personales del Cliente, salvo autorización expresa para resolución
            de incidencias técnicas.
          </li>
        </ul>

        <h4 className="font-bold text-slate-100 text-base mt-4">4. Transferencias a Terceros</h4>
        <ul className="list-disc pl-5 space-y-1.5 text-slate-300">
          <li>
            <strong className="font-bold text-slate-200">Herramientas de IA (Gemini):</strong> Cuando
            el usuario utiliza la función de escaneo de facturas, la imagen se envía temporalmente de
            forma encriptada a la API de{' '}
            <strong className="font-bold text-slate-100">Google Gemini</strong> para la extracción de
            texto. Estos datos no son almacenados por el proveedor de IA para entrenar modelos públicos
            y se procesan de forma transitoria.
          </li>
          <li>
            <strong className="font-bold text-slate-200">No comercialización:</strong> GFarma{' '}
            <strong className="font-bold text-slate-100">nunca</strong> venderá, alquilará, compartirá
            ni comerciará con los datos del Cliente con terceras empresas ni agencias de publicidad.
          </li>
        </ul>

        <h4 className="font-bold text-slate-100 text-base mt-4">5. Derechos del Usuario (Derechos ARCO)</h4>
        <p>De acuerdo con el Reglamento General de Protección de Datos (RGPD), el Cliente tiene derecho a:</p>
        <ul className="list-disc pl-5 space-y-1.5 text-slate-300">
          <li>
            <strong className="font-bold text-slate-200">Acceso:</strong> Consultar qué datos tenemos
            sobre él.
          </li>
          <li>
            <strong className="font-bold text-slate-200">Rectificación:</strong> Corregir cualquier
            dato erróneo.
          </li>
          <li>
            <strong className="font-bold text-slate-200">Supresión (Derecho al olvido):</strong>{' '}
            Solicitar la eliminación total de su cuenta y todos sus datos de la base de datos.
          </li>
          <li>
            <strong className="font-bold text-slate-200">Portabilidad:</strong> Exportar sus datos en
            formato estructurado (CSV/PDF) en cualquier momento.
          </li>
        </ul>
        <p>
          Para ejercer cualquiera de estos derechos, el usuario puede ponerse en contacto con el
          Proveedor a través del canal de soporte oficial habilitado.
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
