/**
 * Catálogo de colores por línea de bus/colectivo.
 *
 * **A diferencia del Subte (`subteColors.ts`), los buses NO tienen color
 * institucional asignado por el operador.** Los colores los identificamos
 * mirando los buses reales en la vía pública: viendo qué color o combinación
 * pinta cada compañía a las unidades de cada línea.
 *
 * El catálogo arranca **vacío** y se va llenando a medida que vamos
 * identificando líneas. Mientras una línea no esté en este mapping, el bus
 * se pinta con el color de la empresa (Mvd) o el gris default (BUE).
 *
 * Replicar en:
 *   - chevamo-live (este repo) ← source de verdad
 *   - chevamo-admin (sync manual)
 *   - iOS Vamo/Models/BusLineColors.swift (TODO)
 *   - Android vamo-android/.../BusLineColors.kt (TODO)
 *
 * Cómo agregar una línea identificada:
 *   1. Sacar foto / observar el bus de la línea X
 *   2. Aproximar a hex el color predominante (y secundario si tiene 2 colores)
 *   3. Agregar entrada en el record de la ciudad correspondiente
 *   4. Notas opcionales con detalle (ej. "Mvd 100 — rojo CUTCSA con franja blanca")
 */

export interface BusLineColor {
  /** Color principal del bus (hex). */
  primary: string;
  /** Opcional: color secundario para buses con 2 colores principales. */
  secondary?: string;
  /** Opcional: notas de cómo se identificó (fecha, observación). */
  notes?: string;
}

/**
 * Líneas Mvd identificadas. Key = `route_short_name` (ej "100", "G", "D9").
 * Vacío hoy — se va llenando.
 */
export const MVD_BUS_COLORS: Record<string, BusLineColor> = {
  // Ej: "100": { primary: "#FF0000", notes: "2026-05-XX, identificado en Plaza Indep" }
};

/**
 * Líneas BUE Colectivos identificadas. Key = `route_short_name` (ej "152", "60", "159B").
 * Vacío hoy — se va llenando.
 */
export const BUE_BUS_COLORS: Record<string, BusLineColor> = {
  // Ej: "152": { primary: "#FFC107", notes: "2026-05-XX, observado en Av. Cabildo" }
};

/**
 * Resuelve color para una línea de bus dado el cityId y el route_short_name.
 * Devuelve `null` si no está identificada — el caller decide el fallback
 * (color empresa para Mvd, gris para BUE).
 */
export function busColorForLine(
  cityId: string,
  routeShortName: string | null | undefined
): BusLineColor | null {
  if (!routeShortName) return null;
  const catalog =
    cityId === "uy.mvd-area-metro"
      ? MVD_BUS_COLORS
      : cityId === "ar.amba"
      ? BUE_BUS_COLORS
      : null;
  if (!catalog) return null;
  return catalog[routeShortName] ?? null;
}
