"use client";

import Link from "next/link";
import { useState } from "react";
import {
  useAlertTemplates,
  createAlertTemplate,
  deleteAlertTemplate,
  DEFAULT_TEMPLATES,
} from "@/hooks/useAlertTemplates";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/components/Toast";
import {
  ALERT_TYPE_LABELS,
  ALERT_SEVERITY_LABELS,
} from "@/lib/types";
import type {
  AlertType,
  AlertSeverity,
} from "@/lib/types";

const SEVERITY_STYLES: Record<AlertSeverity, string> = {
  critical: "bg-danger/10 text-danger border-danger/30",
  warning: "bg-warning/10 text-warning border-warning/30",
  info: "bg-info/10 text-info border-info/30",
};

export default function TemplatesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { templates, loading } = useAlertTemplates();
  const [creating, setCreating] = useState(false);

  const handleAdoptDefaults = async () => {
    if (!user?.email) return;
    if (
      !confirm(
        `Se van a crear ${DEFAULT_TEMPLATES.length} plantillas default. ¿Continuar?`
      )
    )
      return;
    setCreating(true);
    try {
      for (const t of DEFAULT_TEMPLATES) {
        await createAlertTemplate({ ...t, createdBy: user.email });
      }
      toast(`${DEFAULT_TEMPLATES.length} plantillas creadas`, "success");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Error", "error");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`¿Eliminar plantilla "${name}"?`)) return;
    try {
      await deleteAlertTemplate(id);
      toast("Plantilla eliminada", "info");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Error", "error");
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text">Plantillas de alertas</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Plantillas reutilizables para crear alertas rápido durante incidentes.
          </p>
        </div>
        {templates.length === 0 && !loading && (
          <button
            onClick={handleAdoptDefaults}
            disabled={creating}
            className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-50"
          >
            {creating ? "Creando..." : `Adoptar ${DEFAULT_TEMPLATES.length} plantillas default`}
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : templates.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-bg-card p-12 text-center">
          <h3 className="text-base font-semibold text-text">
            Sin plantillas todavía
          </h3>
          <p className="mt-1 text-sm text-text-secondary">
            Las plantillas ahorran tiempo durante incidentes. Podés empezar con
            las {DEFAULT_TEMPLATES.length} que ya preparamos o crear las tuyas desde cero.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <div
              key={template.id}
              className="group flex flex-col rounded-2xl border border-border bg-bg-card p-4 shadow-sm transition-all hover:shadow-md hover:border-border-focus"
            >
              <div className="mb-2 flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span
                      className={`rounded-md border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${SEVERITY_STYLES[template.severity as AlertSeverity]}`}
                    >
                      {ALERT_SEVERITY_LABELS[template.severity as AlertSeverity]}
                    </span>
                    <span className="text-[10px] font-medium uppercase tracking-wider text-text-muted">
                      {ALERT_TYPE_LABELS[template.type as AlertType]}
                    </span>
                  </div>
                  <h3 className="text-[13px] font-semibold text-text">
                    {template.name}
                  </h3>
                </div>
              </div>

              <div className="mb-3 rounded-xl bg-bg p-2.5 border border-border">
                <p className="text-xs font-semibold text-text line-clamp-1">
                  {template.title}
                </p>
                <p className="mt-0.5 text-xs text-text-muted line-clamp-2">
                  {template.body}
                </p>
              </div>

              <div className="mt-auto flex items-center justify-between gap-2 text-xs text-text-muted">
                <span>
                  Usada {template.usageCount} {template.usageCount === 1 ? "vez" : "veces"}
                </span>
                <div className="flex items-center gap-1">
                  <Link
                    href={`/alerts/new?template=${template.id}`}
                    className="rounded-lg bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary hover:bg-primary/20"
                  >
                    Usar
                  </Link>
                  <button
                    onClick={() => handleDelete(template.id, template.name)}
                    className="rounded-lg px-2 py-1 text-xs text-danger hover:bg-danger/10 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Eliminar"
                  >
                    ✕
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
