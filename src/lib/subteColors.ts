/**
 * Colores oficiales del Subte de Buenos Aires (SBASE).
 *
 * Source: marca SBASE / Subterráneos de Buenos Aires SE. Hex aproximados a
 * los oficiales — usados en señalética de estaciones y mapas oficiales.
 *
 * IMPORTANTE: este mapping es la fuente de verdad y debe replicarse en:
 *   - chevamo-live (web pública) — este repo
 *   - chevamo-admin (operativo) — chevamo-admin/src/lib/subteColors.ts
 *   - iOS — Vamo/Models/SubteLineColors.swift (TODO)
 *   - Android — vamo-android/.../SubteLineColors.kt (TODO)
 *
 * Si actualizás un color, actualizá en todas las plataformas.
 */
export const SUBTE_COLORS: Record<string, string> = {
  A: "#00B5E2",       // Celeste
  B: "#E2231A",       // Roja
  C: "#1A4FA0",       // Azul
  D: "#00A04A",       // Verde
  E: "#7A4DAA",       // Violeta
  H: "#FFD200",       // Amarillo
  PM: "#FFD200",      // Premetro — Amarillo (igual que H, son del mismo operador)
  Premetro: "#FFD200",
};

/// Color por defecto para líneas no mapeadas (gris neutro).
export const SUBTE_DEFAULT_COLOR = "#475569";

/// Resuelve color por short_name del route. Si no matchea, devuelve default.
export function subteColorForLine(routeShortName: string | null | undefined): string {
  if (!routeShortName) return SUBTE_DEFAULT_COLOR;
  return SUBTE_COLORS[routeShortName] ?? SUBTE_DEFAULT_COLOR;
}
