"use client";

import type { AlertSeverity, AlertType } from "@/lib/types";
import { ALERT_SEVERITY_LABELS } from "@/lib/types";

interface AlertPreviewProps {
  title: string;
  body: string;
  severity: AlertSeverity;
  type: AlertType;
  affectedLines: string[];
}

export default function AlertPreview({
  title,
  body,
  severity,
  affectedLines,
}: AlertPreviewProps) {
  const severityColor = {
    critical: "#ef4444",
    warning: "#f59e0b",
    info: "#3b82f6",
  }[severity];

  return (
    <div className="space-y-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">
        Preview en la app
      </p>

      {/* iPhone frame */}
      <div className="mx-auto w-full max-w-[280px]">
        <div className="relative rounded-[2.5rem] border-[10px] border-gray-800 bg-gray-800 shadow-xl">
          {/* Notch */}
          <div className="absolute left-1/2 top-0 z-10 h-6 w-28 -translate-x-1/2 rounded-b-2xl bg-gray-800" />

          {/* Screen */}
          <div className="relative overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-slate-100 to-slate-200 aspect-[9/16] pt-8">
            {/* Status bar */}
            <div className="flex items-center justify-between px-5 pb-2 text-[10px] font-semibold text-gray-900">
              <span>9:41</span>
              <span>•••</span>
              <span>📶 100%</span>
            </div>

            {/* Header simulated */}
            <div className="px-3 pb-2">
              <p className="text-xs font-bold text-gray-900">Vamo</p>
            </div>

            {/* Alert banner */}
            <div className="mx-3 mb-3">
              <div
                className="rounded-2xl bg-white/80 p-3 shadow-md backdrop-blur-sm"
                style={{
                  borderWidth: 1,
                  borderStyle: "solid",
                  borderColor: `${severityColor}50`,
                }}
              >
                <div className="flex items-start gap-2">
                  <span
                    className="mt-1 h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: severityColor }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-900 line-clamp-1">
                      {title || "Título de la alerta"}
                    </p>
                    {body && (
                      <p className="mt-0.5 text-[10px] text-gray-600 line-clamp-2">
                        {body}
                      </p>
                    )}
                    {affectedLines.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-0.5">
                        {affectedLines.slice(0, 4).map((line) => (
                          <span
                            key={line}
                            className="rounded-md px-1 py-0 text-[8px] font-bold text-white"
                            style={{ backgroundColor: severityColor }}
                          >
                            {line}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Map placeholder */}
            <div className="mx-3 h-32 rounded-2xl bg-gradient-to-br from-green-100 to-blue-100 flex items-center justify-center text-xs text-gray-500">
              🗺️ Mapa
            </div>

            {/* Bottom sheet hint */}
            <div className="absolute bottom-0 left-0 right-0 rounded-t-2xl bg-white/90 px-3 py-2 backdrop-blur-sm">
              <div className="mx-auto h-1 w-8 rounded-full bg-gray-300 mb-2" />
              <p className="text-[9px] font-semibold text-gray-900">
                Paradas cerca
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Spec */}
      <div className="rounded-xl border border-border bg-bg p-3 space-y-1 text-xs">
        <p className="text-text-muted">
          <span className="font-semibold text-text">Severidad:</span>{" "}
          <span style={{ color: severityColor }}>
            {ALERT_SEVERITY_LABELS[severity]}
          </span>
        </p>
        <p className="text-text-muted">
          <span className="font-semibold text-text">Alcance:</span>{" "}
          {affectedLines.length === 0
            ? "Todos los usuarios"
            : `${affectedLines.length} línea${affectedLines.length !== 1 ? "s" : ""}: ${affectedLines.join(", ")}`}
        </p>
      </div>
    </div>
  );
}
