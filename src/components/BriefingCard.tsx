"use client";

import { useState } from "react";
import type { Bus } from "@/lib/types";
import type { TransitAlert } from "@/lib/types";
import type { CommunityBus } from "@/hooks/useCommunityBuses";
import type { Anomaly } from "@/lib/anomaly";

interface BriefingCardProps {
  buses: Bus[];
  alerts: TransitAlert[];
  communityBuses: CommunityBus[];
  anomalies: Anomaly[];
  overridesCount: number;
}

function generateTemplate(params: BriefingCardProps): {
  summary: string;
  highlights: string[];
} {
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Buenos días" : hour < 19 ? "Buenas tardes" : "Buenas noches";

  const activeAlerts = params.alerts.filter((a) => a.active);
  const criticalAlerts = activeAlerts.filter((a) => a.severity === "critical");
  const byCompany: Record<string, number> = {};
  for (const bus of params.buses) {
    byCompany[bus.company] = (byCompany[bus.company] || 0) + 1;
  }
  const topCompany = Object.entries(byCompany).sort((a, b) => b[1] - a[1])[0];

  const paragraphs: string[] = [];
  paragraphs.push(
    `${greeting}. Hay ${params.buses.length} bus${params.buses.length !== 1 ? "es" : ""} en vivo${topCompany ? `, liderado por ${topCompany[0]} con ${topCompany[1]} unidades` : ""}.`
  );

  if (criticalAlerts.length > 0) {
    paragraphs.push(
      `Atención: ${criticalAlerts.length} alerta${criticalAlerts.length !== 1 ? "s" : ""} crítica${criticalAlerts.length !== 1 ? "s" : ""} activa${criticalAlerts.length !== 1 ? "s" : ""}.`
    );
  } else if (activeAlerts.length > 0) {
    paragraphs.push(
      `${activeAlerts.length} alerta${activeAlerts.length !== 1 ? "s" : ""} activa${activeAlerts.length !== 1 ? "s" : ""} de baja severidad.`
    );
  } else {
    paragraphs.push("Sin alertas activas. Servicio normal.");
  }

  if (params.communityBuses.length > 0) {
    const uniqueLines = new Set(params.communityBuses.map((c) => c.line)).size;
    paragraphs.push(
      `${params.communityBuses.length} reporte${params.communityBuses.length !== 1 ? "s" : ""} comunitario${params.communityBuses.length !== 1 ? "s" : ""} sobre ${uniqueLines} línea${uniqueLines !== 1 ? "s" : ""}.`
    );
  }

  const highlights: string[] = [];
  if (criticalAlerts.length > 0)
    highlights.push(`Atender ${criticalAlerts.length} alertas críticas`);
  if (params.anomalies.filter((a) => a.severity === "critical").length > 0)
    highlights.push("Revisar anomalías críticas de flota");
  if (params.communityBuses.length > 20)
    highlights.push(`Alta participación: ${params.communityBuses.length} reportes`);

  return { summary: paragraphs.join(" "), highlights };
}

export default function BriefingCard(props: BriefingCardProps) {
  const [brief, setBrief] = useState<{
    summary: string;
    highlights: string[];
    generatedAt: Date;
    source: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const byCompany: Record<string, number> = {};
      for (const b of props.buses) {
        byCompany[b.company] = (byCompany[b.company] || 0) + 1;
      }
      const activeAlerts = props.alerts.filter((a) => a.active);
      const criticalAlerts = activeAlerts.filter((a) => a.severity === "critical");

      const context = {
        buses: props.buses.length,
        companies: byCompany,
        alerts: {
          active: activeAlerts.length,
          critical: criticalAlerts.length,
          titles: activeAlerts.slice(0, 5).map((a) => a.title),
        },
        community: props.communityBuses.length,
        overrides: props.overridesCount,
        suspendedStops: 0,
        anomalies: props.anomalies.map((a) => ({
          title: a.title,
          severity: a.severity,
        })),
      };

      const res = await fetch(
        "https://southamerica-east1-vamo-dbad6.cloudfunctions.net/adminBriefing",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(context),
        }
      );
      const body = await res.json();

      if (body.ok && body.data) {
        setBrief({
          summary: body.data.summary,
          highlights: Array.isArray(body.data.highlights)
            ? body.data.highlights
            : [],
          generatedAt: new Date(),
          source: body.meta?.source ?? "unknown",
        });
      } else {
        const { summary, highlights } = generateTemplate(props);
        setBrief({
          summary,
          highlights,
          generatedAt: new Date(),
          source: "template-fallback",
        });
      }
    } catch {
      const { summary, highlights } = generateTemplate(props);
      setBrief({
        summary,
        highlights,
        generatedAt: new Date(),
        source: "template-fallback",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="overflow-hidden rounded-xl border border-border bg-bg-card shadow-xs"
      style={{
        backgroundImage:
          "radial-gradient(circle at top right, rgba(99, 102, 241, 0.04) 0%, transparent 50%)",
      }}
    >
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span
            className="rounded px-1.5 py-0.5 text-[9px] font-bold tracking-wider text-white"
            style={{
              background: "linear-gradient(135deg, #2563eb 0%, #6366f1 100%)",
            }}
          >
            AI
          </span>
          <p className="tag-dense text-text-secondary">Briefing del sistema</p>
        </div>
        {brief && (
          <span className="text-[10px] text-text-muted tabular-nums">
            {brief.source === "gemini" ? "Gemini" : "Local"} ·{" "}
            {brief.generatedAt.toLocaleTimeString("es-UY", { hour12: false })}
          </span>
        )}
      </div>

      <div className="p-4">
        {!brief ? (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <p className="text-[12px] text-text-secondary leading-relaxed">
              Obtené un resumen ejecutivo del estado actual del sistema,
              generado con Gemini 2.0 Flash.
            </p>
            <button
              onClick={handleGenerate}
              disabled={loading}
              className="rounded-lg bg-text px-3.5 py-1.5 text-[12px] font-semibold text-bg-card shadow-sm transition-all hover:shadow-md active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? "Generando..." : "Generar briefing"}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-[13px] leading-relaxed text-text">{brief.summary}</p>
            {brief.highlights.length > 0 && (
              <div className="rounded-lg bg-bg-subtle p-3 border border-border">
                <p className="tag mb-2">Prioridades</p>
                <ul className="space-y-1.5">
                  {brief.highlights.map((h, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-[12px] text-text"
                    >
                      <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-primary" />
                      <span>{h}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <button
              onClick={handleGenerate}
              disabled={loading}
              className="text-[11px] font-semibold text-primary-text hover:underline"
            >
              {loading ? "Regenerando..." : "↻ Regenerar"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
