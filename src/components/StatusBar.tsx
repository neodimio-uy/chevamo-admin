"use client";

import { useBackendHealth, type HealthStatus } from "@/hooks/useBackendHealth";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import ThemeToggle from "./ThemeToggle";
import NotificationBell from "./NotificationBell";
import PresenceIndicator from "./PresenceIndicator";
import CitySelector from "./CitySelector";
import { SearchIcon } from "./icons";

const STATUS_DOT: Record<HealthStatus, string> = {
  ok: "bg-success",
  degraded: "bg-warning",
  down: "bg-danger",
  unknown: "bg-text-muted",
};

const STATUS_LABEL: Record<HealthStatus, string> = {
  ok: "OPERATIVO",
  degraded: "DEGRADADO",
  down: "CAÍDO",
  unknown: "—",
};

const PATH_LABELS: Record<string, string> = {
  "/home": "En vivo",
  "/alerts": "Alertas",
  "/alerts/new": "Nueva alerta",
  "/alerts/edit": "Editar alerta",
  "/map": "Mapa",
  "/stops": "Paradas",
  "/stops/detail": "Parada",
  "/lines": "Líneas",
  "/lines/detail": "Línea",
  "/schedules": "Horarios",
  "/community": "Comunidad",
  "/support": "Soporte",
  "/templates": "Plantillas",
  "/flags": "Feature Flags",
  "/activity": "Audit Log",
  "/b2b": "B2B",
  "/monetization": "Recargas",
  "/experiments": "Tests A/B",
};

function currentLabel(pathname: string): string {
  for (const [path, label] of Object.entries(PATH_LABELS)) {
    if (pathname === path || pathname.startsWith(path + "/")) {
      return label;
    }
  }
  return "";
}

export default function StatusBar({
  onCommandPalette,
}: {
  onCommandPalette: () => void;
}) {
  const health = useBackendHealth(30000);
  const pathname = usePathname();
  const [now, setNow] = useState<Date>(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const label = currentLabel(pathname);

  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-border bg-bg-card px-4 z-30 relative">
      {/* Left: breadcrumb */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-[12px]">
          <span className="tag-dense">Vamo</span>
          <span className="text-text-muted">/</span>
          <span className="font-semibold tracking-tight text-text">{label}</span>
        </div>

        <div className="h-4 w-px bg-border mx-1" />

        {/* Selector de ciudad / modo (multi-tenant del dashboard) */}
        <CitySelector />

        <div className="h-4 w-px bg-border mx-1" />

        {/* System status */}
        <div className="flex items-center gap-2">
          <span className="relative flex h-1.5 w-1.5">
            {health.status === "ok" && (
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
            )}
            <span className={`relative inline-flex h-1.5 w-1.5 rounded-full ${STATUS_DOT[health.status]}`} />
          </span>
          <span className="tag-dense" style={{ color: health.status === "ok" ? "var(--color-success)" : health.status === "degraded" ? "var(--color-warning)" : "var(--color-danger)" }}>
            {STATUS_LABEL[health.status]}
          </span>
          {health.latencyMs !== null && (
            <span className="mono text-[10px] font-medium text-text-muted tabular-nums">
              {health.latencyMs}ms
            </span>
          )}
        </div>
      </div>

      {/* Center: command palette */}
      <button
        onClick={onCommandPalette}
        className="hidden items-center gap-2 rounded-md border border-border bg-bg-subtle/50 px-2.5 py-1 text-[11px] text-text-muted hover:border-border-strong hover:bg-bg-subtle hover:text-text-secondary transition-all md:flex"
      >
        <SearchIcon size={12} />
        <span className="tracking-tight">Buscar</span>
        <span className="ml-4 flex items-center gap-0.5">
          <kbd>⌘</kbd>
          <kbd>K</kbd>
        </span>
      </button>

      {/* Right */}
      <div className="flex items-center gap-2">
        <PresenceIndicator />
        <span className="hidden mono text-[10px] font-semibold text-text-muted tabular-nums sm:block">
          {now.toLocaleTimeString("es-UY", { hour12: false })}
        </span>
        <div className="h-4 w-px bg-border mx-1 hidden sm:block" />
        <NotificationBell />
        <ThemeToggle />
      </div>
    </header>
  );
}
