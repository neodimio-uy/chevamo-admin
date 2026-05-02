"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useBuses } from "@/hooks/useBuses";
import { useAlerts } from "@/hooks/useAlerts";
import { useCommunityBuses } from "@/hooks/useCommunityBuses";
import { useStopOverrides } from "@/hooks/useStopOverrides";
import { useBackendHealth } from "@/hooks/useBackendHealth";
import { useActivityFeed } from "@/hooks/useActivityFeed";
import { useVehicles } from "@/hooks/useVehicles";
import { useSubteForecast } from "@/hooks/useSubteForecast";
import { useGtfsSnapshot } from "@/hooks/useGtfsSnapshot";
import { useCity } from "@/lib/cityContext";
import { detectAnomalies, type Anomaly } from "@/lib/anomaly";
import { COMPANY_COLORS } from "@/lib/types";
import { useAuth } from "@/lib/auth";

/// Mapping ciudad+modo activo a feedId del snapshot GTFS estático.
function feedIdFor(cityId: string, modeId: string): string | null {
  if (cityId === "ar.amba" && modeId === "bus") return "gcba-colectivos-static";
  if (cityId === "ar.amba" && modeId === "subte") return "gcba-subte-static";
  return null;
}
import {
  PlusIcon,
  ChevronRight,
  ChevronLeft,
  AlertIcon,
  LiveIcon,
  CommunityIcon,
  StopIcon,
  XIcon,
} from "@/components/icons";
import BriefingCard from "@/components/BriefingCard";
import type { TransitAlert } from "@/lib/types";

const LiveMap = dynamic(() => import("@/components/LiveMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center bg-bg-subtle">
      <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  ),
});

type DrawerTab = "actividad" | "alertas" | "anomalias" | "empresas";

function timeAgo(date: Date): string {
  const secs = Math.floor((Date.now() - date.getTime()) / 1000);
  if (secs < 60) return `${secs}s`;
  const min = Math.floor(secs / 60);
  if (min < 60) return `${min}m`;
  return `${Math.floor(min / 60)}h`;
}

// ─── HUD: stat pill flotante ───
function HudStat({
  label,
  value,
  sub,
  accent = "neutral",
  href,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: "neutral" | "success" | "warning" | "danger";
  href?: string;
}) {
  const accentBar = {
    neutral: "bg-border-strong",
    success: "bg-success",
    warning: "bg-warning",
    danger: "bg-danger",
  }[accent];
  const content = (
    <div className="flex items-center gap-3 px-3 py-2">
      <span className={`h-8 w-[3px] rounded-full ${accentBar}`} />
      <div>
        <p className="tag-dense text-text-muted">{label}</p>
        <p className="numeric-hero text-[18px] leading-none mt-0.5 text-text">
          {value}
          {sub && (
            <span className="ml-1.5 text-[10px] font-medium text-text-secondary">
              {sub}
            </span>
          )}
        </p>
      </div>
    </div>
  );
  return href ? (
    <Link href={href} className="block hover:bg-bg-subtle/50 rounded-md transition-colors">
      {content}
    </Link>
  ) : (
    content
  );
}

// ─── Right Drawer: panels colapsables ───
function DrawerActividad() {
  const { events, loading } = useActivityFeed(30);
  return (
    <div className="divide-y divide-border">
      {loading ? (
        <div className="flex items-center justify-center py-10">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : events.length === 0 ? (
        <div className="px-4 py-12 text-center">
          <p className="text-[12px] text-text-muted">Sin actividad reciente</p>
        </div>
      ) : (
        events.map((event) => {
          const date = event.createdAt?.toDate?.();
          return (
            <div key={event.id} className="px-4 py-2.5 hover:bg-bg-subtle transition-colors">
              <p className="text-[12px] leading-snug text-text">{event.summary}</p>
              <p className="mt-0.5 text-[10px] text-text-muted tabular-nums">
                {event.actor.split("@")[0]} · hace {date ? timeAgo(date) : "—"}
              </p>
            </div>
          );
        })
      )}
    </div>
  );
}

function DrawerAlertas({ alerts }: { alerts: TransitAlert[] }) {
  const active = alerts.filter((a) => a.active);
  if (active.length === 0) {
    return (
      <div className="px-4 py-12 text-center">
        <p className="text-[12px] font-medium text-text">Sin alertas activas</p>
        <p className="mt-0.5 text-[11px] text-text-muted">
          Servicio operando normalmente
        </p>
      </div>
    );
  }
  return (
    <div className="divide-y divide-border">
      {active.map((alert) => {
        const color = {
          critical: "var(--color-danger)",
          warning: "var(--color-warning)",
          info: "var(--color-info)",
        }[alert.severity];
        return (
          <Link
            key={alert.id}
            href={`/alerts/edit?id=${alert.id}`}
            className="block px-4 py-3 hover:bg-bg-subtle transition-colors"
          >
            <div className="flex items-start gap-2.5">
              <span
                className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full"
                style={{ backgroundColor: color }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-semibold text-text">{alert.title}</p>
                {alert.body && (
                  <p className="mt-0.5 text-[11px] text-text-muted line-clamp-2">
                    {alert.body}
                  </p>
                )}
                {alert.affectedLines.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {alert.affectedLines.slice(0, 6).map((line) => (
                      <span
                        key={line}
                        className="rounded bg-bg-subtle px-1.5 py-0.5 text-[9px] font-bold text-text tabular-nums border border-border"
                      >
                        {line}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

function DrawerAnomalias({ anomalies }: { anomalies: Anomaly[] }) {
  if (anomalies.length === 0) {
    return (
      <div className="px-4 py-12 text-center">
        <p className="text-[12px] font-medium text-text">Sistema estable</p>
        <p className="mt-0.5 text-[11px] text-text-muted">
          Todos los indicadores normales
        </p>
      </div>
    );
  }
  return (
    <div className="divide-y divide-border">
      {anomalies.map((a, i) => {
        const query = new URLSearchParams({
          anomaly: a.kind,
          title: a.title,
          ...(a.target ? { target: a.target } : {}),
        });
        const color = {
          critical: "var(--color-danger)",
          warning: "var(--color-warning)",
          info: "var(--color-info)",
        }[a.severity];
        return (
          <div key={`${a.kind}-${i}`} className="px-4 py-3">
            <div className="flex items-start gap-2.5">
              <span
                className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full"
                style={{ backgroundColor: color }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-semibold text-text">{a.title}</p>
                <p className="mt-0.5 text-[11px] text-text-muted">{a.description}</p>
                {(a.severity === "critical" || a.severity === "warning") && (
                  <Link
                    href={`/alerts/new?${query.toString()}`}
                    className="mt-2 inline-block rounded-md border border-border bg-bg-card px-2 py-0.5 text-[10px] font-semibold text-text hover:bg-bg-subtle transition-colors"
                  >
                    Crear alerta →
                  </Link>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DrawerEmpresas({ buses }: { buses: import("@/lib/types").Bus[] }) {
  const byCompany: Record<string, number> = {};
  for (const bus of buses) {
    byCompany[bus.company] = (byCompany[bus.company] || 0) + 1;
  }
  const sorted = Object.entries(byCompany).sort((a, b) => b[1] - a[1]);

  return (
    <div className="p-4 space-y-3">
      {sorted.map(([company, count]) => {
        const pct = buses.length > 0 ? (count / buses.length) * 100 : 0;
        const color = COMPANY_COLORS[company] || "#9c9ca3";
        return (
          <div key={company}>
            <div className="mb-1.5 flex items-center justify-between text-[12px]">
              <div className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-[3px]"
                  style={{ backgroundColor: color }}
                />
                <span className="font-semibold text-text">{company}</span>
              </div>
              <span className="font-mono text-text tabular-nums">
                <span className="font-semibold">{count}</span>
                <span className="ml-1.5 text-text-muted">
                  {pct.toFixed(0)}%
                </span>
              </span>
            </div>
            <div className="h-1 overflow-hidden rounded-full bg-bg-subtle">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${pct}%`, backgroundColor: color }}
              />
            </div>
          </div>
        );
      })}
      {sorted.length === 0 && (
        <p className="py-6 text-center text-[12px] text-text-muted">
          Cargando flota...
        </p>
      )}
    </div>
  );
}

// ─── MAIN ───
export default function HomePage() {
  const { user } = useAuth();
  const { city, mode } = useCity();
  const isMvdLegacy = city.legacyMvdEndpoint;
  const isCabaSubte = city.id === "ar.amba" && mode.id === "subte";

  // Mvd legacy
  const { buses } = useBuses(15000, isMvdLegacy);
  const { alerts } = useAlerts();
  const { buses: communityBuses } = useCommunityBuses();
  const { overrides } = useStopOverrides();
  const health = useBackendHealth(30000);

  // Multi-city
  const { vehicles } = useVehicles(15000);
  const { data: subteForecast } = useSubteForecast(isCabaSubte, 15000);
  const { data: gtfsIndex } = useGtfsSnapshot(feedIdFor(city.id, mode.id));

  const [drawerOpen, setDrawerOpen] = useState(true);
  const [drawerTab, setDrawerTab] = useState<DrawerTab>("actividad");
  const [briefingOpen, setBriefingOpen] = useState(false);

  const activeAlerts = alerts.filter((a) => a.active);
  const criticalAlerts = activeAlerts.filter((a) => a.severity === "critical");
  const suspendedStops = Object.values(overrides).filter((o) => o.suspended);

  // Anomalies y BriefingCard hoy son Mvd-bound (consumen Bus[] enriquecido).
  // Cuando la ciudad no es Mvd, vacío hasta hacer multi-city aware (post-launch).
  const anomalies = useMemo(
    () =>
      isMvdLegacy
        ? detectAnomalies({
            buses,
            backendLatencyMs: health.latencyMs,
            communityBusesCount: communityBuses.length,
          })
        : [],
    [isMvdLegacy, buses, health.latencyMs, communityBuses.length]
  );

  // Stat principal del HUD según ciudad+modo
  const primaryStat = useMemo(() => {
    if (isMvdLegacy) {
      return { label: "Buses", value: buses.length, sub: "activos" };
    }
    if (isCabaSubte) {
      const stationCount = gtfsIndex
        ? Array.from(gtfsIndex.stopsById.values()).filter((s) => s.location_type === 1).length
        : 0;
      const tripCount = subteForecast?.tripUpdates.length ?? 0;
      return { label: "Estaciones", value: stationCount, sub: `${tripCount} trenes` };
    }
    return {
      label: mode.label,
      value: vehicles.length,
      sub: "activos",
    };
  }, [isMvdLegacy, isCabaSubte, buses.length, vehicles.length, gtfsIndex, subteForecast, mode]);

  const firstName = user?.displayName?.split(" ")?.[0] || "";
  const greeting =
    new Date().getHours() < 12
      ? "Buenos días"
      : new Date().getHours() < 19
        ? "Buenas tardes"
        : "Buenas noches";

  const tabs: { id: DrawerTab; label: string; count: number | null }[] = isMvdLegacy
    ? [
        { id: "actividad", label: "Actividad", count: null },
        { id: "alertas", label: "Alertas", count: activeAlerts.length },
        { id: "anomalias", label: "Anomalías", count: anomalies.length },
        { id: "empresas", label: "Flota", count: null },
      ]
    : [
        { id: "actividad", label: "Actividad", count: null },
        { id: "alertas", label: "Alertas", count: activeAlerts.length },
      ];

  return (
    <div className="relative h-full w-full">
      {/* MAPA FULL-VIEWPORT */}
      <div className="absolute inset-0">
        <LiveMap
          buses={isMvdLegacy ? buses : []}
          communityBuses={isMvdLegacy ? communityBuses : []}
          vehicles={isMvdLegacy ? [] : vehicles}
          gtfsStops={gtfsIndex ? Array.from(gtfsIndex.stopsById.values()) : []}
          onlyParentStations={isCabaSubte}
          shapes={gtfsIndex && isCabaSubte ? gtfsIndex.snapshot.shapes : []}
          subteForecast={subteForecast}
          showStops={isCabaSubte}
          center={city.defaultCenter}
          zoom={city.defaultZoom}
        />
      </div>

      {/* HUD: top-left — stats panel */}
      <div className="pointer-events-none absolute top-4 left-4 max-w-[360px] animate-slide-right">
        <div className="pointer-events-auto hud rounded-xl overflow-hidden">
          <div className="flex items-center gap-2 border-b border-border px-3 py-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-success" />
            </span>
            <p className="tag-dense text-text">Sistema en vivo</p>
            <span className="ml-auto font-mono text-[10px] text-text-muted tabular-nums">
              {new Date().toLocaleTimeString("es-UY", { hour12: false })}
            </span>
          </div>
          <div className="grid grid-cols-2">
            <HudStat
              label={primaryStat.label}
              value={primaryStat.value}
              sub={primaryStat.sub}
              accent="success"
              href="/map"
            />
            <HudStat
              label="Alertas"
              value={activeAlerts.length}
              sub={criticalAlerts.length > 0 ? `${criticalAlerts.length} críticas` : undefined}
              accent={
                criticalAlerts.length > 0
                  ? "danger"
                  : activeAlerts.length > 0
                    ? "warning"
                    : "neutral"
              }
            />
            <HudStat
              label="Comunidad"
              value={isMvdLegacy ? communityBuses.length : 0}
              sub={isMvdLegacy ? "en vivo" : "—"}
              accent="neutral"
              href="/community"
            />
            <HudStat
              label="Paradas"
              value={isMvdLegacy ? Object.keys(overrides).length : (gtfsIndex?.snapshot.counts.stops ?? 0)}
              sub={
                isMvdLegacy
                  ? suspendedStops.length > 0 ? `${suspendedStops.length} suspendidas` : "editadas"
                  : "GTFS"
              }
              accent={isMvdLegacy && suspendedStops.length > 0 ? "warning" : "neutral"}
              href="/stops"
            />
          </div>
        </div>

        {/* Greeting */}
        <div className="pointer-events-auto mt-2 hud rounded-xl px-3 py-2">
          <p className="text-[12px] font-semibold tracking-tight text-text">
            {greeting}{firstName ? `, ${firstName}` : ""}.
          </p>
          <p className="text-[11px] text-text-secondary">
            Panel de operaciones de Vamo · {city.longName} · {mode.label}
          </p>
        </div>
      </div>

      {/* Critical alerts ticker — top center */}
      {criticalAlerts.length > 0 && (
        <div className="pointer-events-none absolute top-4 left-1/2 -translate-x-1/2 z-10 animate-slide-up">
          <Link
            href={`/alerts/edit?id=${criticalAlerts[0].id}`}
            className="pointer-events-auto flex items-center gap-2.5 rounded-full bg-danger px-4 py-2 text-white shadow-lg hover:brightness-110"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-70" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
            </span>
            <span className="text-[12px] font-bold tracking-tight">
              {criticalAlerts.length > 1
                ? `${criticalAlerts.length} alertas críticas`
                : criticalAlerts[0].title}
            </span>
            <ChevronRight size={14} />
          </Link>
        </div>
      )}

      {/* FAB: nueva alerta — bottom-right */}
      <div className="absolute bottom-4 right-4 flex flex-col gap-2 items-end">
        <Link
          href="/alerts/new"
          className="flex items-center gap-1.5 rounded-full bg-text px-4 py-2.5 text-[12px] font-semibold text-bg-card shadow-hud hover:shadow-xl transition-all"
        >
          <PlusIcon size={14} strokeWidth={2.5} />
          Nueva alerta
        </Link>
      </div>

      {/* Briefing button — bottom-left. Solo Mvd hoy (BriefingCard consume
          Bus[] + anomalies Mvd-bound). Multi-city briefing es post-launch. */}
      <div className="absolute bottom-4 left-4" hidden={!isMvdLegacy}>
        {!briefingOpen ? (
          <button
            onClick={() => setBriefingOpen(true)}
            className="flex items-center gap-2 rounded-full hud px-3 py-2 text-[11px] font-semibold text-text hover:brightness-105 transition-all"
          >
            <span
              className="flex h-5 w-5 items-center justify-center rounded-full text-white text-[10px] font-bold"
              style={{
                background: "linear-gradient(135deg, #2563eb 0%, #6366f1 100%)",
              }}
            >
              AI
            </span>
            Briefing del sistema
            <ChevronRight size={12} />
          </button>
        ) : (
          <div className="w-[340px] animate-slide-up">
            <div className="flex items-center justify-between mb-1.5 px-1">
              <p className="tag-dense text-text-muted">Briefing IA</p>
              <button
                onClick={() => setBriefingOpen(false)}
                className="text-text-muted hover:text-text"
              >
                <XIcon size={14} />
              </button>
            </div>
            <div className="hud rounded-xl">
              <BriefingCard
                buses={buses}
                alerts={alerts}
                communityBuses={communityBuses}
                anomalies={anomalies}
                overridesCount={Object.keys(overrides).length}
              />
            </div>
          </div>
        )}
      </div>

      {/* DRAWER DERECHO */}
      <div
        className={`absolute top-0 right-0 h-full transition-transform duration-300 ease-out ${
          drawerOpen ? "translate-x-0" : "translate-x-[calc(100%-2rem)]"
        }`}
        style={{ width: 360 }}
      >
        {/* Toggle handle */}
        <button
          onClick={() => setDrawerOpen(!drawerOpen)}
          className="absolute top-4 -left-4 z-10 flex h-8 w-8 items-center justify-center rounded-l-lg hud text-text-secondary hover:text-text"
          title={drawerOpen ? "Ocultar panel" : "Mostrar panel"}
        >
          {drawerOpen ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>

        <div className="flex h-full flex-col hud border-l border-border">
          {/* Tab bar */}
          <div className="flex border-b border-border overflow-x-auto no-scrollbar">
            {tabs.map((t) => {
              const active = drawerTab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setDrawerTab(t.id)}
                  className={`relative flex-1 px-3 py-3 text-[11px] font-semibold tracking-tight whitespace-nowrap transition-colors ${
                    active ? "text-text" : "text-text-muted hover:text-text-secondary"
                  }`}
                >
                  <span className="flex items-center justify-center gap-1.5">
                    {t.label}
                    {t.count !== null && t.count > 0 && (
                      <span
                        className={`rounded-full px-1.5 py-px text-[9px] font-bold tabular-nums ${
                          active
                            ? "bg-text text-bg-card"
                            : "bg-bg-subtle text-text-secondary"
                        }`}
                      >
                        {t.count}
                      </span>
                    )}
                  </span>
                  {active && (
                    <span className="absolute bottom-0 left-3 right-3 h-[2px] bg-text rounded-full" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {drawerTab === "actividad" && <DrawerActividad />}
            {drawerTab === "alertas" && <DrawerAlertas alerts={alerts} />}
            {drawerTab === "anomalias" && <DrawerAnomalias anomalies={anomalies} />}
            {drawerTab === "empresas" && <DrawerEmpresas buses={buses} />}
          </div>
        </div>
      </div>
    </div>
  );
}
