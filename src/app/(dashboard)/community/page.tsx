"use client";

import { useState } from "react";
import Link from "next/link";
import {
  useCommunityBuses,
  deleteCommunityBus,
  type CommunityBus,
} from "@/hooks/useCommunityBuses";
import { banUser, addStrike } from "@/hooks/useUsers";
import { useCity } from "@/lib/cityContext";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/components/Toast";
import { COMPANY_COLORS } from "@/lib/types";

const DEFAULT_CITY_ID = "uy.mvd-area-metro";

function timeAgo(date: Date): string {
  const secs = Math.floor((Date.now() - date.getTime()) / 1000);
  if (secs < 5) return "ahora";
  if (secs < 60) return `hace ${secs}s`;
  const min = Math.floor(secs / 60);
  if (min < 60) return `hace ${min}m`;
  return `hace ${Math.floor(min / 60)}h`;
}

function BusRow({ bus }: { bus: CommunityBus }) {
  const { toast } = useToast();
  const { user: adminUser } = useAuth();
  const [busy, setBusy] = useState(false);

  const updatedAt = bus.updatedAt?.toDate?.() ?? new Date();
  const startedAt = bus.startedAt?.toDate?.() ?? new Date();
  const durationMin = Math.floor(
    (updatedAt.getTime() - startedAt.getTime()) / 60000
  );
  const isStale = Date.now() - updatedAt.getTime() > 90 * 1000;

  const companyColor = COMPANY_COLORS[bus.company] || "#64748b";

  const handleTerminate = async () => {
    if (
      !confirm(
        `¿Eliminar este reporte comunitario?\n\nLínea ${bus.line} · ${bus.company}\nDuración: ${durationMin} min\nUser ID: ${bus.userId.slice(0, 8)}...`
      )
    )
      return;
    setBusy(true);
    try {
      await deleteCommunityBus(bus.id);
      toast("Reporte eliminado", "info");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Error al eliminar", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className={`rounded-2xl border bg-bg-card p-4 shadow-sm transition-opacity ${
        isStale ? "opacity-60 border-border" : "border-border"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <span
            className="flex h-10 w-14 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white"
            style={{ backgroundColor: companyColor }}
          >
            {bus.line}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-text">
              {bus.company}
              {bus.destination && (
                <span className="text-text-secondary font-normal">
                  {" · "}→ {bus.destination}
                </span>
              )}
            </p>
            <p className="text-xs text-text-muted">
              Duración {durationMin} min · Actualizado {timeAgo(updatedAt)}
              {isStale && " · stale"}
            </p>
            <p className="mt-0.5 font-mono text-xs text-text-muted">
              {bus.lat.toFixed(5)}, {bus.lng.toFixed(5)} · {(bus.speed * 3.6).toFixed(0)} km/h
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={async () => {
              if (!adminUser?.email) return toast("Sesión expirada", "error");
              const reason = prompt("¿Por qué este reporte es abusivo?");
              if (!reason?.trim()) return;
              setBusy(true);
              try {
                await deleteCommunityBus(bus.id);
                await addStrike(bus.userId, `Reporte abusivo: ${reason.trim()}`, adminUser.email, 0);
                toast("Reporte marcado abusivo + strike", "warning");
              } catch (e) {
                toast(e instanceof Error ? e.message : "Error", "error");
              } finally {
                setBusy(false);
              }
            }}
            disabled={busy}
            className="rounded-lg px-3 py-1.5 text-xs font-medium text-warning hover:bg-warning/10 disabled:opacity-50"
            title="Marcar reporte abusivo y agregar strike al user"
          >
            🚩 Abusivo
          </button>
          <button
            onClick={async () => {
              if (!adminUser?.email) return toast("Sesión expirada", "error");
              const reason = prompt("Razón del ban (visible en audit):");
              if (!reason?.trim()) return;
              if (!confirm(`¿Banear permanentemente a ${bus.userId.slice(0, 8)}…?\nRazón: ${reason.trim()}`)) return;
              setBusy(true);
              try {
                await banUser(bus.userId, reason.trim(), adminUser.email);
                await deleteCommunityBus(bus.id);
                toast("User baneado + reporte eliminado", "warning");
              } catch (e) {
                toast(e instanceof Error ? e.message : "Error", "error");
              } finally {
                setBusy(false);
              }
            }}
            disabled={busy}
            className="rounded-lg px-3 py-1.5 text-xs font-medium text-danger hover:bg-danger/10 disabled:opacity-50"
            title="Banear permanentemente al user que reportó esto"
          >
            ⛔ Banear
          </button>
          <button
            onClick={handleTerminate}
            disabled={busy}
            className="rounded-lg px-3 py-1.5 text-xs font-medium text-text-secondary hover:bg-bg-subtle disabled:opacity-50"
          >
            Terminar
          </button>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-3 border-t border-border pt-2 text-xs text-text-muted">
        <span>
          <span className="font-medium text-text-secondary">User:</span>{" "}
          <code className="font-mono">{bus.userId.slice(0, 12)}...</code>
        </span>
        <span>
          <span className="font-medium text-text-secondary">Doc:</span>{" "}
          <code className="font-mono">{bus.id.slice(0, 12)}</code>
        </span>
      </div>
    </div>
  );
}

export default function CommunityPage() {
  const { city } = useCity();
  const { buses: rawBuses, loading } = useCommunityBuses();
  const [search, setSearch] = useState("");

  // City-scope: docs sin `cityId` se asumen Mvd. Cuando se creen reportes BA
  // serán tagged con cityId="ar.amba" desde iOS (Sprint 13 BA Comunidad).
  const buses = rawBuses.filter((b) => {
    const bCity = (b as { cityId?: string }).cityId ?? DEFAULT_CITY_ID;
    return bCity === city.id;
  });

  const filtered = search.trim()
    ? buses.filter((b) => {
        const q = search.toLowerCase();
        return (
          b.line.toLowerCase().includes(q) ||
          b.company.toLowerCase().includes(q) ||
          b.destination?.toLowerCase().includes(q) ||
          b.userId.toLowerCase().includes(q)
        );
      })
    : buses;

  // Agrupar por línea
  const byLine: Record<string, CommunityBus[]> = {};
  for (const bus of buses) {
    if (!byLine[bus.line]) byLine[bus.line] = [];
    byLine[bus.line].push(bus);
  }
  const topLines = Object.entries(byLine)
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 5);

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-text">Comunidad</h1>
        <p className="mt-1 text-sm text-text-secondary">
          {loading
            ? "Cargando reportes..."
            : `${buses.length} reporte${buses.length !== 1 ? "s" : ""} activo${buses.length !== 1 ? "s" : ""} en los últimos 3 minutos.`}
        </p>
      </div>

      {/* Stats */}
      {buses.length > 0 && (
        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-border bg-bg-card p-4 shadow-sm">
            <p className="text-xs font-medium text-text-secondary uppercase tracking-wider">
              En vivo
            </p>
            <p className="mt-1 text-2xl font-bold text-text">{buses.length}</p>
            <p className="mt-0.5 text-xs text-text-muted">reportes activos</p>
          </div>
          <div className="rounded-2xl border border-border bg-bg-card p-4 shadow-sm">
            <p className="text-xs font-medium text-text-secondary uppercase tracking-wider">
              Líneas cubiertas
            </p>
            <p className="mt-1 text-2xl font-bold text-text">{Object.keys(byLine).length}</p>
            <p className="mt-0.5 text-xs text-text-muted">líneas distintas</p>
          </div>
          <div className="rounded-2xl border border-border bg-bg-card p-4 shadow-sm">
            <p className="text-xs font-medium text-text-secondary uppercase tracking-wider">
              Top línea
            </p>
            <p className="mt-1 text-2xl font-bold text-text">
              {topLines[0] ? topLines[0][0] : "—"}
            </p>
            <p className="mt-0.5 text-xs text-text-muted">
              {topLines[0] ? `${topLines[0][1].length} reporte${topLines[0][1].length !== 1 ? "s" : ""}` : ""}
            </p>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="mb-6">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por línea, empresa, destino o userId..."
          className="w-full rounded-xl border border-border bg-bg-input px-4 py-2.5 text-sm text-text placeholder:text-text-muted focus:border-border-focus focus:ring-1 focus:ring-border-focus"
        />
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-bg-card p-12 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-success/10">
            <svg
              className="h-6 w-6 text-success"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z"
              />
            </svg>
          </div>
          <h3 className="text-base font-semibold text-text">
            {search ? "Sin resultados" : "Sin reportes activos"}
          </h3>
          <p className="mt-1 text-sm text-text-secondary">
            {search
              ? `No se encontraron reportes para "${search}".`
              : "Cuando haya usuarios compartiendo viaje, aparecerán acá."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((bus) => (
            <BusRow key={bus.id} bus={bus} />
          ))}
        </div>
      )}
    </div>
  );
}
