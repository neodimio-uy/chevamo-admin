import type { Bus } from "./types";

export interface Anomaly {
  kind: "no-buses" | "low-fleet" | "stale-api" | "low-coverage";
  severity: "info" | "warning" | "critical";
  title: string;
  description: string;
  target?: string;
}

/**
 * Detector simple de anomalías basado en reglas.
 * Sin ML — comparaciones absolutas y relativas. Cuando tengamos datos
 * históricos, ampliamos con baselines por hora/día.
 */
export function detectAnomalies(params: {
  buses: Bus[];
  backendLatencyMs: number | null;
  communityBusesCount: number;
}): Anomaly[] {
  const anomalies: Anomaly[] = [];

  // 1. Backend lento
  if (params.backendLatencyMs !== null && params.backendLatencyMs > 2000) {
    anomalies.push({
      kind: "stale-api",
      severity: "warning",
      title: "Backend respondiendo lento",
      description: `Latencia de ${params.backendLatencyMs}ms (umbral 2000ms).`,
    });
  }

  // 2. Cero buses totales → la API seguramente está caída o hay paro general
  if (params.buses.length === 0) {
    anomalies.push({
      kind: "no-buses",
      severity: "critical",
      title: "Ningún bus en el sistema",
      description:
        "La IMM no reporta buses activos. Posible paro total o API caída.",
    });
    return anomalies; // si no hay buses, el resto no aplica
  }

  // 3. Distribución por empresa anómala
  const byCompany: Record<string, number> = {};
  for (const bus of params.buses) {
    byCompany[bus.company] = (byCompany[bus.company] || 0) + 1;
  }
  const EXPECTED_COMPANIES = ["CUTCSA", "COETC", "COME", "UCOT"];
  for (const company of EXPECTED_COMPANIES) {
    const count = byCompany[company] || 0;
    if (count === 0) {
      anomalies.push({
        kind: "low-fleet",
        severity: "critical",
        title: `${company} sin buses activos`,
        description: `No hay buses reportando de ${company}. Posible paro o problema operativo.`,
        target: company,
      });
    } else if (count < 5) {
      anomalies.push({
        kind: "low-fleet",
        severity: "warning",
        title: `${company} con pocos buses`,
        description: `Solo ${count} bus${count !== 1 ? "es" : ""} activo${count !== 1 ? "s" : ""}.`,
        target: company,
      });
    }
  }

  // 4. Baja cobertura de reportes comunidad (solo como info, no warning)
  // Si hay < 1% de buses con reporte, es esperable al inicio.
  const coverage = params.buses.length > 0
    ? (params.communityBusesCount / params.buses.length) * 100
    : 0;
  if (params.buses.length > 50 && coverage > 10) {
    // Nota: este es un caso positivo — mucha cobertura.
    // No genera anomalía. Solo se reporta en métricas.
  }

  return anomalies;
}
