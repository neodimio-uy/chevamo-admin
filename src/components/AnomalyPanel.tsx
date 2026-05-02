"use client";

import Link from "next/link";
import type { Anomaly } from "@/lib/anomaly";

const SEVERITY: Record<
  Anomaly["severity"],
  { dot: string; text: string; bg: string }
> = {
  critical: {
    dot: "bg-danger",
    text: "text-danger",
    bg: "bg-danger-light",
  },
  warning: {
    dot: "bg-warning",
    text: "text-warning",
    bg: "bg-warning-light",
  },
  info: {
    dot: "bg-info",
    text: "text-info",
    bg: "bg-info-light",
  },
};

export default function AnomalyPanel({ anomalies }: { anomalies: Anomaly[] }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-bg-card shadow-xs">
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <p className="label-xs">Anomalías</p>
        <span className="text-[10px] font-semibold tabular-nums text-text-muted">
          {anomalies.length === 0
            ? "OK"
            : `${anomalies.length} activa${anomalies.length !== 1 ? "s" : ""}`}
        </span>
      </div>
      <div className="p-3 space-y-1.5">
        {anomalies.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-6">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-success-light">
              <svg
                className="h-4 w-4 text-success"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4.5 12.75l6 6 9-13.5"
                />
              </svg>
            </div>
            <p className="text-[12px] font-medium text-text">
              Sistema estable
            </p>
            <p className="text-[11px] text-text-muted">
              Todos los indicadores normales
            </p>
          </div>
        ) : (
          anomalies.map((anomaly, i) => {
            const style = SEVERITY[anomaly.severity];
            const query = new URLSearchParams({
              anomaly: anomaly.kind,
              title: anomaly.title,
              ...(anomaly.target ? { target: anomaly.target } : {}),
            });
            return (
              <div
                key={`${anomaly.kind}-${i}`}
                className={`rounded-lg border border-border px-3 py-2.5 ${style.bg}`}
              >
                <div className="flex items-start gap-2.5">
                  <span
                    className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${style.dot}`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className={`text-[12px] font-semibold ${style.text}`}>
                      {anomaly.title}
                    </p>
                    <p className="mt-0.5 text-[11px] text-text-secondary">
                      {anomaly.description}
                    </p>
                    {(anomaly.severity === "critical" ||
                      anomaly.severity === "warning") && (
                      <Link
                        href={`/alerts/new?${query.toString()}`}
                        className="mt-2 inline-flex items-center gap-1 rounded-md border border-border bg-bg-card px-2 py-0.5 text-[10px] font-semibold text-text hover:bg-bg-elevated transition-colors"
                      >
                        Crear alerta →
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
