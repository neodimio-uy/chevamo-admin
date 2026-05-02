"use client";

import { useAdminPresence } from "@/hooks/usePresence";
import { useState, useRef, useEffect } from "react";

const AVATAR_COLORS = [
  "bg-red-500",
  "bg-orange-500",
  "bg-amber-500",
  "bg-lime-500",
  "bg-emerald-500",
  "bg-teal-500",
  "bg-cyan-500",
  "bg-sky-500",
  "bg-blue-500",
  "bg-indigo-500",
  "bg-violet-500",
  "bg-fuchsia-500",
  "bg-pink-500",
  "bg-rose-500",
];

function colorForEmail(email: string): string {
  let hash = 0;
  for (let i = 0; i < email.length; i++) {
    hash = (hash << 5) - hash + email.charCodeAt(i);
    hash |= 0;
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function pathLabel(path: string): string {
  const labels: Record<string, string> = {
    "/home": "Mission Control",
    "/alerts": "Alertas",
    "/map": "Mapa",
    "/stops": "Paradas",
    "/lines": "Líneas",
    "/community": "Comunidad",
    "/support": "Soporte",
    "/templates": "Plantillas",
    "/flags": "Flags",
    "/activity": "Audit Log",
    "/b2b": "B2B",
    "/monetization": "Monetización",
    "/experiments": "Experimentos",
    "/schedules": "Horarios",
  };
  for (const [prefix, label] of Object.entries(labels)) {
    if (path === prefix || path.startsWith(prefix + "/")) return label;
  }
  return path;
}

export default function PresenceIndicator() {
  const { others } = useAdminPresence();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

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

  if (others.length === 0) return null;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 rounded-lg border border-border px-2 py-1 hover:bg-bg"
        title={`${others.length} admin${others.length !== 1 ? "s" : ""} conectado${others.length !== 1 ? "s" : ""}`}
      >
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
        </span>
        <div className="flex -space-x-1.5">
          {others.slice(0, 3).map((p) => (
            <span
              key={p.uid}
              className={`flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-bold text-white ring-2 ring-bg-card ${colorForEmail(p.email)}`}
            >
              {p.displayName.charAt(0).toUpperCase()}
            </span>
          ))}
        </div>
        {others.length > 3 && (
          <span className="text-[10px] font-medium text-text-muted">
            +{others.length - 3}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-9 z-50 w-64 overflow-hidden rounded-xl border border-border bg-bg-card shadow-lg">
          <div className="border-b border-border px-3 py-2">
            <p className="text-xs font-semibold text-text">
              {others.length} admin{others.length !== 1 ? "s" : ""} conectado
              {others.length !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {others.map((p) => (
              <div
                key={p.uid}
                className="flex items-center gap-2 border-b border-border px-3 py-2 last:border-0"
              >
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white ${colorForEmail(p.email)}`}
                >
                  {p.displayName.charAt(0).toUpperCase()}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-xs font-medium text-text">
                    {p.displayName}
                  </p>
                  <p className="truncate text-[10px] text-text-muted">
                    Viendo: {pathLabel(p.currentPath)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
