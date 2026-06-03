# Política de Privacidad de GFarma

**Última actualización:** 3 de junio de 2026

La presente Política de Privacidad describe cómo **GFarma** (en adelante, "la Aplicación" o "el Servicio"), gestionada por el Propietario/Desarrollador (en adelante, "el Proveedor"), recopila, utiliza y protege la información y los datos de carácter personal y financiero de los usuarios (en adelante, "el Cliente" o "los Usuarios").

Al utilizar GFarma, usted acepta las prácticas descritas en esta política.

---

## 1. Información que Recopilamos

Para el correcto funcionamiento de GFarma, la aplicación procesa y almacena los siguientes datos que el propio usuario introduce voluntariamente:
* **Datos de Registro y Cuenta**: Correo electrónico y contraseña (gestionados y encriptados de forma segura a través del sistema de autenticación de Supabase).
* **Datos Financieros e Inversiones**: Información de facturas de proveedores (laboratorios, importes, números de factura, fechas de emisión y vencimiento, estado de pago).
* **Datos Laborales y Fiscales**: Nóminas del personal de la farmacia, importes de seguros sociales, impuestos municipales y estatales declarados en el módulo de Fiscalidad.
* **Documentación Adjunta (Imágenes)**: Fotografías o PDFs de facturas subidas por el usuario para su extracción de datos por Inteligencia Artificial (a través de la API de Gemini).

---

## 2. Finalidad del Tratamiento de los Datos

Los datos proporcionados se utilizan exclusivamente para:
1. Permitir al Cliente llevar un control de compras, vencimientos y previsiones de gasto.
2. Generar reportes financieros en formatos PDF o CSV descargables por el propio usuario.
3. Facilitar la automatización de la lectura de facturas físicas mediante herramientas de reconocimiento óptico por IA (Gemini).
4. Proveer soporte técnico y mantenimiento de la aplicación.

---

## 3. Seguridad de los Datos y Almacenamiento

* **Infraestructura**: Los datos se almacenan en los servidores de **Supabase**, que cuenta con medidas de seguridad físicas y lógicas de nivel empresarial.
* **Aislamiento de Datos (RLS)**: La base de datos tiene activada la tecnología **Row Level Security (RLS)**. Esto significa que los datos están blindados a nivel de base de datos para que ningún usuario de la aplicación pueda consultar, modificar o eliminar datos de otros usuarios bajo ninguna circunstancia.
* **Privacidad del Administrador**: Aunque el Proveedor actúa como administrador de la infraestructura de la base de datos (con capacidad técnica teórica de mantenimiento en Supabase), se compromete formalmente por contrato de confidencialidad a **no acceder, revisar, compartir ni modificar** los datos comerciales ni personales del Cliente, salvo autorización expresa para resolución de incidencias técnicas.

---

## 4. Transferencias a Terceros

* **Herramientas de IA (Gemini)**: Cuando el usuario utiliza la función de escaneo de facturas, la imagen se envía temporalmente de forma encriptada a la API de **Google Gemini** para la extracción de texto. Estos datos no son almacenados por el proveedor de IA para entrenar modelos públicos y se procesan de forma transitoria.
* **No comercialización**: GFarma **nunca** venderá, alquilará, compartirá ni comerciará con los datos del Cliente con terceras empresas ni agencias de publicidad.

---

## 5. Derechos del Usuario (Derechos ARCO)

De acuerdo con el Reglamento General de Protección de Datos (RGPD), el Cliente tiene derecho a:
* **Acceso**: Consultar qué datos tenemos sobre él.
* **Rectificación**: Corregir cualquier dato erróneo.
* **Supresión (Derecho al olvido)**: Solicitar la eliminación total de su cuenta y todos sus datos de la base de datos.
* **Portabilidad**: Exportar sus datos en formato estructurado (CSV/PDF) en cualquier momento.

Para ejercer cualquiera de estos derechos, el usuario puede ponerse en contacto con el Proveedor a través del canal de soporte oficial habilitado.
