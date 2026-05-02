"use client";

import { useActivityFeed } from "@/hooks/useActivityFeed";
import type { ActivityEvent } from "@/lib/extended-types";

/** Prefix tipográfico por tipo de evento — reemplaza emojis */
const KIND_TAG: Record<string, { label: string; color: string }> = {
  "alert.created": { label: "ALERT", color: "var(--color-danger)" },
  "alert.updated": { label: "ALERT", color: "var(--color-warning)" },
  "alert.deactivated": { label: "ALERT", color: "var(--color-text-muted)" },
  "alert.deleted": { label: "ALERT", color: "var(--color-text-muted)" },
  "stop.modified": { label: "STOP", color: "var(--color-primary)" },
  "stop.suspended": { label: "STOP", color: "var(--color-danger)" },
  "stop.relocated": { label: "STOP", color: "var(--color-warning)" },
  "stop.restored": { label: "STOP", color: "var(--color-success)" },
  "community.report.deleted": { label: "COMM", color: "var(--color-text-muted)" },
  "support.ticket.created": { label: "SUPP", color: "var(--color-info)" },
  "support.ticket.replied": { label: "SUPP", color: "var(--color-info)" },
  "feature.flag.toggled": { label: "FLAG", color: "var(--color-primary)" },
  "system.event": { label: "SYS", color: "var(--color-text-muted)" },
};

function timeAgo(date: Date): string {
  const secs = Math.floor((Date.now() - date.getTime()) / 1000);
  if (secs < 60) return `${secs}s`;
  const min = Math.floor(secs / 60);
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  return `${Math.floor(hr / 24)}d`;
}

function EventRow({ event }: { event: ActivityEvent }) {
  const tag = KIND_TAG[event.kind] || { label: "EVT", color: "var(--color-text-muted)" };
  const date = event.createdAt?.toDate?.();
  return (
    <div className="flex items-start gap-2.5 px-4 py-2.5 border-b border-border last:border-0 hover:bg-bg-subtle transition-colors">
      <span
        className="mt-0.5 rounded px-1.5 py-px shrink-0 text-[9px] font-bold tracking-wider text-white"
        style={{ backgroundColor: tag.color }}
      >
        {tag.label}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-[12px] leading-snug text-text">{event.summary}</p>
        <p className="mt-0.5 text-[10px] text-text-muted tabular-nums">
          <span className="font-medium">{event.actor.split("@")[0]}</span>
          {date && ` · hace ${timeAgo(date)}`}
        </p>
      </div>
    </div>
  );
}

export default function ActivityFeedPanel({
  title = "Actividad",
  maxItems = 30,
}: {
  title?: string;
  maxItems?: number;
}) {
  const { events, loading } = useActivityFeed(maxItems);

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-bg-card shadow-xs">
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <p className="tag">{title}</p>
        {events.length > 0 && (
          <span className="text-[10px] text-text-muted tabular-nums">
            {events.length} {events.length === 1 ? "evento" : "eventos"}
          </span>
        )}
      </div>
      <div className="max-h-[440px] overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : events.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-[12px] text-text-muted">Sin actividad reciente</p>
          </div>
        ) : (
          events.map((event) => <EventRow key={event.id} event={event} />)
        )}
      </div>
    </div>
  );
}
