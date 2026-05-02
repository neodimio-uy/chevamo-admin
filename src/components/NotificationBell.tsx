"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useActivityFeed } from "@/hooks/useActivityFeed";
import { useAlerts } from "@/hooks/useAlerts";
import { BellIcon } from "./icons";

const READ_STORAGE_KEY = "vamo-dashboard-last-read-event";

function timeAgo(date: Date): string {
  const secs = Math.floor((Date.now() - date.getTime()) / 1000);
  if (secs < 60) return `${secs}s`;
  const min = Math.floor(secs / 60);
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  return `${Math.floor(hr / 24)}d`;
}

export default function NotificationBell() {
  const { events } = useActivityFeed(20);
  const { alerts } = useAlerts();
  const [open, setOpen] = useState(false);
  const [lastRead, setLastRead] = useState<number>(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stored = parseInt(localStorage.getItem(READ_STORAGE_KEY) || "0");
    setLastRead(stored);
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener("mousedown", handler);
      return () => document.removeEventListener("mousedown", handler);
    }
  }, [open]);

  const criticalAlerts = alerts.filter(
    (a) => a.active && a.severity === "critical"
  );
  const unreadEvents = events.filter(
    (e) => (e.createdAt?.toMillis?.() ?? 0) > lastRead
  );
  const totalUnread = unreadEvents.length + criticalAlerts.length;

  const handleOpen = () => {
    setOpen(!open);
    if (!open && events.length > 0) {
      const newestMs = events[0].createdAt?.toMillis?.() ?? Date.now();
      setLastRead(newestMs);
      localStorage.setItem(READ_STORAGE_KEY, String(newestMs));
    }
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={handleOpen}
        className="relative flex h-7 w-7 items-center justify-center rounded-md text-text-secondary hover:bg-bg-subtle hover:text-text transition-all"
      >
        <BellIcon size={14} />
        {totalUnread > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold text-white tabular-nums"
            style={{
              background: "var(--color-danger)",
              boxShadow: "0 0 0 2px var(--color-bg-card)",
            }}
          >
            {totalUnread > 9 ? "9+" : totalUnread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-10 z-50 w-80 overflow-hidden rounded-xl border border-border-strong bg-bg-card shadow-lg animate-scale-in">
          <div className="border-b border-border px-4 py-2.5">
            <p className="label-xs">Notificaciones</p>
          </div>

          {criticalAlerts.length > 0 && (
            <div className="border-b border-border bg-danger-light px-4 py-2.5">
              <p className="text-[11px] font-bold uppercase tracking-wider text-danger">
                {criticalAlerts.length} alerta crítica activa
              </p>
              {criticalAlerts.slice(0, 2).map((a) => (
                <Link
                  key={a.id}
                  href={`/alerts/edit?id=${a.id}`}
                  onClick={() => setOpen(false)}
                  className="mt-1 block truncate text-[12px] font-medium text-text hover:underline"
                >
                  {a.title}
                </Link>
              ))}
            </div>
          )}

          <div className="max-h-80 overflow-y-auto">
            {events.length === 0 ? (
              <p className="py-6 text-center text-[12px] text-text-muted">
                Sin actividad reciente
              </p>
            ) : (
              events.slice(0, 15).map((event) => {
                const date = event.createdAt?.toDate?.();
                const isUnread =
                  (event.createdAt?.toMillis?.() ?? 0) > lastRead;
                return (
                  <div
                    key={event.id}
                    className={`border-b border-border px-4 py-2.5 last:border-0 ${isUnread ? "bg-primary-light" : ""}`}
                  >
                    <p className="text-[12px] text-text leading-snug">{event.summary}</p>
                    <p className="mt-0.5 text-[10px] text-text-muted tabular-nums">
                      {event.actor.split("@")[0]} · hace {date ? timeAgo(date) : "—"}
                    </p>
                  </div>
                );
              })
            )}
          </div>

          {events.length > 0 && (
            <Link
              href="/activity"
              onClick={() => setOpen(false)}
              className="block border-t border-border bg-bg-subtle px-4 py-2 text-center text-[11px] font-semibold text-primary-text hover:bg-bg-elevated transition-colors"
            >
              Ver todo el audit log →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
