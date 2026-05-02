"use client";

import { useMemo, useState } from "react";
import { useActivityFeed } from "@/hooks/useActivityFeed";
import type { ActivityEvent } from "@/lib/extended-types";

const ICON_BY_KIND: Record<string, string> = {
  "alert.created": "🚨",
  "alert.updated": "✏️",
  "alert.deactivated": "💤",
  "alert.deleted": "🗑️",
  "stop.modified": "📍",
  "stop.suspended": "⛔",
  "stop.relocated": "↔️",
  "stop.restored": "↩️",
  "community.report.deleted": "🚫",
  "support.ticket.created": "💬",
  "support.ticket.replied": "💭",
  "feature.flag.toggled": "🎛",
  "system.event": "⚙️",
};

function timeAgo(date: Date): string {
  const secs = Math.floor((Date.now() - date.getTime()) / 1000);
  if (secs < 60) return `hace ${secs}s`;
  const min = Math.floor(secs / 60);
  if (min < 60) return `hace ${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `hace ${hr}h`;
  return `hace ${Math.floor(hr / 24)}d`;
}

export default function ActivityPage() {
  const { events, loading } = useActivityFeed(200);
  const [search, setSearch] = useState("");
  const [kindFilter, setKindFilter] = useState<string>("all");

  const filtered = useMemo(() => {
    return events.filter((e) => {
      if (kindFilter !== "all" && !e.kind.startsWith(kindFilter)) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          e.summary.toLowerCase().includes(q) ||
          e.actor.toLowerCase().includes(q) ||
          e.target.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [events, search, kindFilter]);

  // Agrupar por fecha
  const grouped = useMemo(() => {
    const groups: Record<string, ActivityEvent[]> = {};
    for (const event of filtered) {
      const date = event.createdAt?.toDate?.();
      if (!date) continue;
      const key = date.toLocaleDateString("es-UY", {
        weekday: "long",
        day: "numeric",
        month: "long",
      });
      if (!groups[key]) groups[key] = [];
      groups[key].push(event);
    }
    return groups;
  }, [filtered]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text">Audit Log</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Historial completo de acciones realizadas por el equipo.
        </p>
      </div>

      {/* Filters */}
      <div className="mb-6 flex gap-2 flex-wrap">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar en el historial..."
          className="flex-1 min-w-[250px] rounded-xl border border-border bg-bg-input px-4 py-2 text-sm text-text placeholder:text-text-muted focus:border-border-focus"
        />
        <select
          value={kindFilter}
          onChange={(e) => setKindFilter(e.target.value)}
          className="rounded-xl border border-border bg-bg-input px-3 py-2 text-sm text-text focus:border-border-focus"
        >
          <option value="all">Todas las acciones</option>
          <option value="alert">Alertas</option>
          <option value="stop">Paradas</option>
          <option value="community">Comunidad</option>
          <option value="support">Soporte</option>
          <option value="feature">Feature flags</option>
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : Object.keys(grouped).length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-bg-card p-12 text-center">
          <h3 className="text-base font-semibold text-text">
            Sin actividad
          </h3>
          <p className="mt-1 text-sm text-text-secondary">
            {search || kindFilter !== "all"
              ? "No se encontraron eventos con esos filtros."
              : "Cuando el equipo haga cambios, aparecen acá."}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([date, dayEvents]) => (
            <div key={date}>
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-text-muted">
                {date}
              </h2>
              <div className="overflow-hidden rounded-2xl border border-border bg-bg-card shadow-sm divide-y divide-border">
                {dayEvents.map((event) => {
                  const icon = ICON_BY_KIND[event.kind] || "•";
                  const date = event.createdAt?.toDate?.();
                  return (
                    <div
                      key={event.id}
                      className="flex gap-3 px-4 py-3"
                    >
                      <span className="mt-0.5 text-lg">{icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-text">{event.summary}</p>
                        <div className="mt-0.5 flex items-center gap-2 text-xs text-text-muted">
                          <span className="font-medium">
                            {event.actor.split("@")[0]}
                          </span>
                          {date && (
                            <>
                              <span>·</span>
                              <span>
                                {date.toLocaleTimeString("es-UY", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                              <span>·</span>
                              <span>{timeAgo(date)}</span>
                            </>
                          )}
                          <span>·</span>
                          <code className="font-mono text-[10px] bg-bg rounded px-1">
                            {event.kind}
                          </code>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
