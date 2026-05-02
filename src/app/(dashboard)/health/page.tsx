"use client";

import { useMemo } from "react";
import { usePushEvents } from "@/hooks/usePushEvents";
import { useBackendHealth } from "@/hooks/useBackendHealth";

export default function HealthPage() {
  const { events, loading } = usePushEvents(200);
  const backend = useBackendHealth();

  const stats = useMemo(() => {
    const now = Date.now();
    const last24h = events.filter(
      (e) => e.sentAt && now - e.sentAt.toMillis() < 86_400_000
    );
    const last1h = events.filter(
      (e) => e.sentAt && now - e.sentAt.toMillis() < 3_600_000
    );
    const sent = last24h.filter((e) => e.status === "sent").length;
    const partial = last24h.filter((e) => e.status === "partial").length;
    const errors = last24h.filter((e) => e.status === "error").length;
    const skipped = last24h.filter((e) => e.status === "skipped_no_token").length;
    const successRate24h = last24h.length === 0 ? 100 : Math.round((sent / last24h.length) * 100);
    return { last24h, last1h, sent, partial, errors, skipped, successRate24h };
  }, [events]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-text">System Health</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Estado del backend, push delivery, errores recientes. Para logs
          detallados de Cloud Functions usar Firebase Console.
        </p>
      </header>

      {/* ━━━ Backend status ━━━ */}
      <section className="rounded-2xl border border-border bg-bg-card p-5">
        <h2 className="text-sm font-bold text-text mb-3">Backend (mvd-proxy)</h2>
        <div className="grid grid-cols-3 gap-4">
          <Stat
            label="Estado"
            value={
              backend.status === "ok" ? "✅ OK" :
              backend.status === "degraded" ? "⚠️ Degradado" :
              backend.status === "down" ? "❌ Down" : "?"
            }
            accent={backend.status === "ok" ? "green" : backend.status === "degraded" ? "yellow" : "red"}
          />
          <Stat label="Latencia" value={backend.latencyMs ? `${backend.latencyMs} ms` : "—"} />
          <Stat label="Última check" value={backend.lastCheck ? `hace ${secsAgo(backend.lastCheck)}s` : "—"} />
        </div>
        {backend.error && (
          <p className="mt-2 text-xs text-danger">{backend.error}</p>
        )}
      </section>

      {/* ━━━ Push delivery ━━━ */}
      <section className="rounded-2xl border border-border bg-bg-card p-5">
        <h2 className="text-sm font-bold text-text mb-3">Push delivery (últimas 24h)</h2>
        {loading ? (
          <p className="text-sm text-text-muted">Cargando…</p>
        ) : (
          <>
            <div className="grid grid-cols-5 gap-3">
              <Stat label="Total" value={stats.last24h.length} />
              <Stat label="Enviados OK" value={stats.sent} accent="green" />
              <Stat label="Parciales" value={stats.partial} accent="yellow" />
              <Stat label="Errores" value={stats.errors} accent="red" />
              <Stat label="Success rate" value={`${stats.successRate24h}%`} accent={stats.successRate24h >= 95 ? "green" : "yellow"} />
            </div>
            <p className="mt-3 text-xs text-text-muted">
              Última hora: {stats.last1h.length} eventos. Skipped (sin token): {stats.skipped}.
            </p>
          </>
        )}
      </section>

      {/* ━━━ Eventos recientes ━━━ */}
      <section className="rounded-2xl border border-border bg-bg-card overflow-hidden">
        <div className="border-b border-border bg-bg-subtle px-5 py-3">
          <h2 className="text-sm font-bold text-text">Eventos recientes</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-bg-subtle text-text-secondary">
              <tr>
                <th className="px-4 py-2 text-left font-semibold">Hora</th>
                <th className="px-4 py-2 text-left font-semibold">Tipo</th>
                <th className="px-4 py-2 text-left font-semibold">Status</th>
                <th className="px-4 py-2 text-left font-semibold">Recipient</th>
                <th className="px-4 py-2 text-left font-semibold">Stats</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {events.slice(0, 80).map((e) => (
                <tr key={e.id}>
                  <td className="px-4 py-2 text-text-muted whitespace-nowrap">
                    {e.sentAt ? new Date(e.sentAt.toMillis()).toLocaleString() : "—"}
                  </td>
                  <td className="px-4 py-2 text-text font-mono">{e.type}</td>
                  <td className="px-4 py-2">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      e.status === "sent" ? "bg-green-500/10 text-green-500" :
                      e.status === "partial" ? "bg-yellow-500/10 text-yellow-500" :
                      e.status === "error" ? "bg-danger/10 text-danger" :
                      "bg-bg-subtle text-text-secondary"
                    }`}>
                      {e.status}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-text-muted font-mono truncate max-w-[180px]">
                    {e.recipientUid ? e.recipientUid.slice(0, 12) + "…" : "topic"}
                  </td>
                  <td className="px-4 py-2 text-text-muted">
                    {e.successCount !== undefined && (
                      <>OK: {e.successCount}{e.failureCount ? `, fail: ${e.failureCount}` : ""}</>
                    )}
                    {e.error && <span className="text-danger ml-1">· {e.error.slice(0, 40)}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-bg-card p-5">
        <h2 className="text-sm font-bold text-text mb-2">Logs detallados</h2>
        <div className="flex flex-wrap gap-2">
          <a href="https://console.firebase.google.com/project/vamo-dbad6/functions/logs" target="_blank" rel="noopener noreferrer"
             className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary/90">Cloud Functions logs →</a>
          <a href="https://console.firebase.google.com/project/vamo-dbad6/firestore/databases/-default-/data/~2Fpush_events" target="_blank" rel="noopener noreferrer"
             className="rounded-lg bg-bg-subtle px-3 py-1.5 text-xs font-semibold text-text hover:bg-border">push_events collection →</a>
          <a href="https://console.cloud.google.com/monitoring?project=vamo-dbad6" target="_blank" rel="noopener noreferrer"
             className="rounded-lg bg-bg-subtle px-3 py-1.5 text-xs font-semibold text-text hover:bg-border">Cloud Monitoring →</a>
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string | number; accent?: "green" | "red" | "yellow" }) {
  const accentClass = {
    green: "text-green-500",
    red: "text-danger",
    yellow: "text-warning",
    undefined: "text-text",
  }[accent ?? "undefined"];
  return (
    <div className="rounded-lg bg-bg-subtle p-3">
      <p className="text-[10px] text-text-muted uppercase tracking-wider">{label}</p>
      <p className={`mt-1 text-xl font-bold ${accentClass}`}>{value}</p>
    </div>
  );
}

function secsAgo(date: Date): number {
  return Math.floor((Date.now() - date.getTime()) / 1000);
}
