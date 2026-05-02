"use client";

import Link from "next/link";
import { useAlerts, toggleAlert, deleteAlert } from "@/hooks/useAlerts";
import { useToast } from "@/components/Toast";
import {
  ALERT_TYPE_LABELS,
  ALERT_SEVERITY_LABELS,
} from "@/lib/types";
import type { TransitAlert } from "@/lib/types";

function SeverityBadge({ severity }: { severity: TransitAlert["severity"] }) {
  const styles = {
    critical:
      "bg-[var(--color-severity-critical)] border-[var(--color-severity-critical-border)] text-[var(--color-severity-critical-text)]",
    warning:
      "bg-[var(--color-severity-warning)] border-[var(--color-severity-warning-border)] text-[var(--color-severity-warning-text)]",
    info: "bg-[var(--color-severity-info)] border-[var(--color-severity-info-border)] text-[var(--color-severity-info-text)]",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${styles[severity]}`}
    >
      {ALERT_SEVERITY_LABELS[severity]}
    </span>
  );
}

function AlertCard({ alert }: { alert: TransitAlert }) {
  const { toast } = useToast();

  const handleToggle = async () => {
    await toggleAlert(alert.id);
    toast(
      alert.active ? "Alerta desactivada" : "Alerta activada",
      alert.active ? "info" : "success"
    );
  };

  const handleDelete = async () => {
    if (!confirm("¿Eliminar esta alerta permanentemente?")) return;
    await deleteAlert(alert.id);
    toast("Alerta eliminada", "info");
  };

  const createdDate = alert.createdAt?.toDate?.();
  const timeAgo = createdDate
    ? formatTimeAgo(createdDate)
    : "";

  return (
    <div
      className={`group rounded-2xl border bg-bg-card p-5 shadow-sm transition-shadow hover:shadow-md ${
        alert.active ? "border-border" : "border-border opacity-60"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <SeverityBadge severity={alert.severity} />
            <span className="text-xs text-text-muted">
              {ALERT_TYPE_LABELS[alert.type]}
            </span>
            {!alert.active && (
              <span className="text-xs font-medium text-text-muted">
                (inactiva)
              </span>
            )}
          </div>
          <h3 className="text-base font-semibold text-text">{alert.title}</h3>
          {alert.body && (
            <p className="mt-1 text-sm text-text-secondary line-clamp-2">
              {alert.body}
            </p>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {alert.affectedLines.length > 0 ? (
              alert.affectedLines.map((line) => (
                <span
                  key={line}
                  className="rounded-lg bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
                >
                  {line}
                </span>
              ))
            ) : (
              <span className="text-xs text-text-muted">
                Todas las líneas
              </span>
            )}
            {alert.pushSent && (
              <span
                className="inline-flex items-center gap-1 rounded-lg bg-success/10 px-2 py-0.5 text-xs font-medium text-success"
                title="Push enviado"
              >
                <svg
                  className="h-3 w-3"
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
                Push enviado
              </span>
            )}
            <span className="text-xs text-text-muted ml-auto">
              {timeAgo}
              {alert.createdBy && ` · ${alert.createdBy.split("@")[0]}`}
            </span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-4 flex items-center gap-2 border-t border-border pt-3">
        <Link
          href={`/alerts/edit?id=${alert.id}`}
          className="rounded-lg px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary-light"
        >
          Editar
        </Link>
        <button
          onClick={handleToggle}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
            alert.active
              ? "text-warning hover:bg-warning/10"
              : "text-success hover:bg-success/10"
          }`}
        >
          {alert.active ? "Desactivar" : "Activar"}
        </button>
        <button
          onClick={handleDelete}
          className="rounded-lg px-3 py-1.5 text-xs font-medium text-danger hover:bg-danger/10 ml-auto"
        >
          Eliminar
        </button>
      </div>
    </div>
  );
}

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return "ahora";
  if (diffMin < 60) return `hace ${diffMin}m`;

  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `hace ${diffH}h`;

  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) return `hace ${diffD}d`;

  return date.toLocaleDateString("es-UY", {
    day: "numeric",
    month: "short",
  });
}

export default function AlertsPage() {
  const { alerts, loading } = useAlerts();

  const activeAlerts = alerts.filter((a) => a.active);
  const inactiveAlerts = alerts.filter((a) => !a.active);

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">Alertas</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Gestioná las alertas que ven los usuarios en la app.
          </p>
        </div>
        <Link
          href="/alerts/new"
          className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-hover"
        >
          Nueva alerta
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : alerts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-bg-card p-12 text-center">
          <div className="mb-3 text-5xl">🌤️</div>
          <h3 className="text-base font-semibold text-text">
            Todo tranquilo
          </h3>
          <p className="mt-1 text-sm text-text-secondary">
            No hay alertas. Cuando algo pase, creala desde acá o desde una anomalía del home.
          </p>
          <div className="mt-4 flex items-center justify-center gap-2">
            <Link
              href="/alerts/new"
              className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover"
            >
              Crear alerta
            </Link>
            <Link
              href="/templates"
              className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-text-secondary hover:bg-bg"
            >
              Ver plantillas
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Activas */}
          {activeAlerts.length > 0 && (
            <section>
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-text-secondary uppercase tracking-wider">
                <span className="h-2 w-2 rounded-full bg-success" />
                Activas ({activeAlerts.length})
              </h2>
              <div className="space-y-3">
                {activeAlerts.map((alert) => (
                  <AlertCard key={alert.id} alert={alert} />
                ))}
              </div>
            </section>
          )}

          {/* Inactivas */}
          {inactiveAlerts.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-semibold text-text-muted uppercase tracking-wider">
                Pasadas ({inactiveAlerts.length})
              </h2>
              <div className="space-y-3">
                {inactiveAlerts.map((alert) => (
                  <AlertCard key={alert.id} alert={alert} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
