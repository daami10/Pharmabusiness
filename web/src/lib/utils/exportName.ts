// Construye el nombre de los archivos exportados: GFarma_<Farmacia>_<Modulo>_<fecha>.<ext>
// Ej: GFarma_Farmacia_Central_Analisis_2026-07-09.pdf
export function buildExportFilename(
  orgName: string | null | undefined,
  modulo: string,
  ext: string,
): string {
  const safeName =
    (orgName || 'Farmacia')
      .normalize('NFD') // separa acentos de la letra base
      // eslint-disable-next-line no-control-regex
      .replace(/[^\x00-\x7F]/g, '') // quita lo no-ASCII (acentos, ñ->n queda 'n')
      .replace(/[^a-zA-Z0-9]+/g, '_') // no-alfanumérico -> _
      .replace(/^_+|_+$/g, '') || 'Farmacia' // recorta _ sobrantes
  const date = new Date().toISOString().slice(0, 10)
  return `GFarma_${safeName}_${modulo}_${date}.${ext}`
}
