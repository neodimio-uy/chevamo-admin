"use client";

import { useState } from "react";

interface Experiment {
  id: string;
  name: string;
  hypothesis: string;
  status: "draft" | "running" | "completed" | "paused";
  rollout: number;
  variants: string[];
  startedAt?: string;
  metrics?: {
    variant: string;
    users: number;
    conversionRate: number;
  }[];
}

const SAMPLE_EXPERIMENTS: Experiment[] = [
  {
    id: "exp-onboarding-copy",
    name: "Copy del onboarding",
    hypothesis:
      "Un copy con beneficios concretos aumenta el % de usuarios que completan el onboarding vs copy genérico.",
    status: "draft",
    rollout: 0,
    variants: ["control-generico", "test-beneficios-concretos"],
  },
  {
    id: "exp-chat-position",
    name: "Botón de Chat IA: flotante vs tab",
    hypothesis:
      "Un FAB siempre visible aumenta el uso del Chat IA comparado con esconderlo en un tab.",
    status: "draft",
    rollout: 0,
    variants: ["control-tab", "test-fab"],
  },
  {
    id: "exp-community-prompt",
    name: "Timing del prompt de comunidad",
    hypothesis:
      "Pedirle al usuario reportar después del primer viaje convierte mejor que pedirlo al onboarding.",
    status: "draft",
    rollout: 0,
    variants: ["control-onboarding", "test-post-trip"],
  },
];

const STATUS_STYLES: Record<Experiment["status"], string> = {
  draft: "bg-text-muted/10 text-text-muted border-border",
  running: "bg-success/10 text-success border-success/30",
  paused: "bg-warning/10 text-warning border-warning/30",
  completed: "bg-primary/10 text-primary border-primary/30",
};

const STATUS_LABELS: Record<Experiment["status"], string> = {
  draft: "Borrador",
  running: "Corriendo",
  paused: "Pausado",
  completed: "Finalizado",
};

export default function ExperimentsPage() {
  const [experiments] = useState<Experiment[]>(SAMPLE_EXPERIMENTS);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text">A/B Testing</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Experimentos activos en las apps iOS y Android. Cuando tengamos
          analytics instrumentado, se populan automáticamente con resultados.
        </p>
      </div>

      {/* Info */}
      <div className="mb-6 rounded-2xl border border-warning/30 bg-warning/5 p-4">
        <div className="flex items-start gap-3">
          <span className="text-xl">🧪</span>
          <div>
            <p className="text-sm font-semibold text-warning">
              Infraestructura pendiente
            </p>
            <p className="mt-1 text-xs text-text-secondary">
              Para que los experimentos funcionen end-to-end, las apps necesitan
              consultar <code className="font-mono text-xs">experiments/*</code>{" "}
              al iniciar y reportar eventos con el variant asignado. Este UI
              sirve como plan base.
            </p>
          </div>
        </div>
      </div>

      {/* Experiments list */}
      <div className="space-y-3">
        {experiments.map((exp) => (
          <div
            key={exp.id}
            className="rounded-2xl border border-border bg-bg-card p-5 shadow-sm"
          >
            <div className="mb-3 flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="mb-1 flex items-center gap-2">
                  <code className="font-mono text-xs text-text-muted">
                    {exp.id}
                  </code>
                  <span
                    className={`rounded-md border px-1.5 py-0.5 text-[10px] font-medium ${STATUS_STYLES[exp.status]}`}
                  >
                    {STATUS_LABELS[exp.status]}
                  </span>
                </div>
                <h2 className="text-base font-semibold text-text">
                  {exp.name}
                </h2>
                <p className="mt-1 text-sm text-text-secondary">
                  {exp.hypothesis}
                </p>
              </div>
            </div>

            {/* Variants */}
            <div className="mb-3 flex flex-wrap gap-2">
              {exp.variants.map((variant, i) => (
                <div
                  key={variant}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${
                    i === 0
                      ? "border-border bg-bg text-text-secondary"
                      : "border-primary/30 bg-primary/10 text-primary"
                  }`}
                >
                  {i === 0 && "🎯 "}
                  {variant}
                </div>
              ))}
            </div>

            {/* Rollout */}
            <div className="flex items-center gap-4 border-t border-border pt-3">
              <div className="flex items-center gap-2 text-xs text-text-muted">
                <span>Rollout:</span>
                <div className="flex h-1.5 w-24 overflow-hidden rounded-full bg-bg">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${exp.rollout}%` }}
                  />
                </div>
                <span className="font-mono">{exp.rollout}%</span>
              </div>
              <button
                disabled
                className="ml-auto rounded-lg border border-border px-3 py-1 text-xs font-medium text-text-muted opacity-50"
              >
                Activar cuando haya analytics
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Create new */}
      <div className="mt-6 rounded-2xl border border-dashed border-border p-6 text-center">
        <p className="text-sm text-text-secondary">
          Cuando el sistema esté conectado, vas a poder crear experimentos
          nuevos desde acá.
        </p>
      </div>
    </div>
  );
}
