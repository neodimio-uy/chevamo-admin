"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useBuses } from "@/hooks/useBuses";
import { useCommunityBuses } from "@/hooks/useCommunityBuses";
import { useVehicles } from "@/hooks/useVehicles";
import { useSubteForecast } from "@/hooks/useSubteForecast";
import { useGtfsSnapshot } from "@/hooks/useGtfsSnapshot";
import { useCity } from "@/lib/cityContext";
import { getBusStops } from "@/lib/api";
import type { BusStop } from "@/lib/types";
import { COMPANIES, COMPANY_COLORS } from "@/lib/types";

// Leaflet no soporta SSR; lo cargamos solo en cliente.
const LiveMap = dynamic(() => import("@/components/LiveMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center rounded-2xl bg-bg-card">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  ),
});

/// Mapping de ciudad+modo activo a `feedId` del snapshot GTFS estático en GCS.
/// Mvd urbano usa el feed legacy IMM (sin GTFS) — devuelve null.
function feedIdFor(cityId: string, modeId: string): string | null {
  if (cityId === "ar.amba" && modeId === "bus") return "gcba-colectivos-static";
  if (cityId === "ar.amba" && modeId === "subte") return "gcba-subte-static";
  return null;
}

export default function MapPage() {
  const { city, mode } = useCity();
  const isMvdLegacy = city.legacyMvdEndpoint;
  const isCabaSubte = city.id === "ar.amba" && mode.id === "subte";

  // Mvd legacy — useBuses se desactiva cuando city != Mvd urbano.
  const { buses, lastUpdate, error } = useBuses(15000, isMvdLegacy);
  const { buses: communityBuses } = useCommunityBuses();

  // Multi-city
  const { vehicles, lastFetch: lastFetchVeh, error: vehError } = useVehicles(15000);
  const { data: subteForecast } = useSubteForecast(isCabaSubte, 15000);
  const { data: gtfsIndex } = useGtfsSnapshot(feedIdFor(city.id, mode.id));

  const [mvdStops, setMvdStops] = useState<BusStop[]>([]);
  const [showStops, setShowStops] = useState(false);
  const [companyFilter, setCompanyFilter] = useState<string>("");
  const [lineSearch, setLineSearch] = useState("");

  // Mvd: paradas legacy del feed IMM
  useEffect(() => {
    if (!isMvdLegacy) {
      setMvdStops([]);
      return;
    }
    getBusStops().then(setMvdStops).catch(() => {});
  }, [isMvdLegacy]);

  // Reset filters al cambiar ciudad/modo
  useEffect(() => {
    setLineSearch("");
    setCompanyFilter("");
  }, [city.id, mode.id]);

  const availableLines = useMemo(() => {
    const set = new Set<string>();
    if (isMvdLegacy) {
      for (const b of buses) {
        if (typeof b.line === "string" && b.line) set.add(b.line);
      }
    } else if (gtfsIndex) {
      for (const r of gtfsIndex.routesById.values()) {
        if (typeof r.route_short_name === "string" && r.route_short_name) {
          set.add(r.route_short_name);
        }
      }
    } else {
      for (const v of vehicles) {
        const l = v.trip?.routeShortName || v.displayLabel;
        if (typeof l === "string" && l) set.add(l);
      }
    }
    return Array.from(set).sort();
  }, [isMvdLegacy, buses, gtfsIndex, vehicles]);

  const filteredLine = lineSearch.trim() || undefined;

  // Total para mostrar en header. Para subte mostramos cantidad de estaciones.
  const stats = useMemo(() => {
    if (isMvdLegacy) {
      const filteredBuses = buses.filter((b) => {
        if (filteredLine && b.line !== filteredLine) return false;
        if (companyFilter && b.company !== companyFilter) return false;
        return true;
      });
      return {
        total: buses.length,
        shown: filteredBuses.length,
        unit: "buses",
      };
    }
    if (isCabaSubte) {
      const stationCount = gtfsIndex
        ? Array.from(gtfsIndex.stopsById.values()).filter((s) => s.location_type === 1).length
        : 0;
      const tripCount = subteForecast?.tripUpdates.length ?? 0;
      return {
        total: stationCount,
        shown: stationCount,
        unit: `estaciones · ${tripCount} trenes activos`,
      };
    }
    const filteredVeh = vehicles.filter((v) => {
      const l = v.trip?.routeShortName || v.displayLabel;
      if (filteredLine && l !== filteredLine) return false;
      return true;
    });
    return {
      total: vehicles.length,
      shown: filteredVeh.length,
      unit: mode.label.toLowerCase(),
    };
  }, [isMvdLegacy, isCabaSubte, buses, vehicles, filteredLine, companyFilter, gtfsIndex, subteForecast, mode]);

  const lastUpd = isMvdLegacy ? lastUpdate : lastFetchVeh;
  const errMsg = isMvdLegacy ? error : vehError;

  // Shapes a dibujar:
  //   - Subte: TODOS los shapes (son 16, render entero)
  //   - Colectivos CABA / Mvd: solo si hay filtro de línea (~10 shapes)
  const shapesToShow = useMemo(() => {
    if (!gtfsIndex) return [];
    if (isCabaSubte) return gtfsIndex.snapshot.shapes;
    if (filteredLine) {
      const matchingRouteIds: string[] = [];
      for (const r of gtfsIndex.routesById.values()) {
        if (r.route_short_name === filteredLine) matchingRouteIds.push(r.route_id);
      }
      const out = [];
      for (const rid of matchingRouteIds) {
        const arr = gtfsIndex.shapesByRoute.get(rid);
        if (arr) out.push(...arr);
      }
      return out;
    }
    return [];
  }, [gtfsIndex, isCabaSubte, filteredLine]);

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      {/* Header + controles */}
      <div className="mb-4 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-text">
            Mapa en vivo · {city.shortName} · {mode.label}
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            {errMsg
              ? `Error: ${errMsg}`
              : `${stats.shown} de ${stats.total} ${stats.unit}${lastUpd ? ` · actualizado ${timeAgo(lastUpd)}` : ""}`}
          </p>
        </div>
      </div>

      {/* Filtros */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {isMvdLegacy && (
          <select
            value={companyFilter}
            onChange={(e) => setCompanyFilter(e.target.value)}
            className="rounded-xl border border-border bg-bg-input px-4 py-2 text-sm text-text focus:border-border-focus focus:ring-1 focus:ring-border-focus"
          >
            <option value="">Todas las empresas</option>
            {COMPANIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        )}

        <input
          type="text"
          list="lines-list"
          value={lineSearch}
          onChange={(e) => setLineSearch(e.target.value)}
          placeholder={isCabaSubte ? "Filtrar por línea (A, B, C…)" : "Filtrar por línea (ej: 124)"}
          className="w-48 rounded-xl border border-border bg-bg-input px-4 py-2 text-sm text-text placeholder:text-text-muted focus:border-border-focus focus:ring-1 focus:ring-border-focus"
        />
        <datalist id="lines-list">
          {availableLines.map((l) => (
            <option key={l} value={l} />
          ))}
        </datalist>

        {(isMvdLegacy || gtfsIndex) && (
          <button
            onClick={() => setShowStops(!showStops)}
            className={`rounded-xl border px-4 py-2 text-sm font-medium transition-colors ${
              showStops
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-text-secondary hover:border-border-focus"
            }`}
          >
            {showStops ? "Ocultar paradas" : `Mostrar paradas`}
          </button>
        )}

        {isMvdLegacy && (
          <div className="ml-auto flex items-center gap-4 text-xs">
            {COMPANIES.map((c) => (
              <div key={c} className="flex items-center gap-1.5">
                <span
                  className="h-3 w-3 rounded"
                  style={{ backgroundColor: COMPANY_COLORS[c] }}
                />
                <span className="text-text-muted">{c}</span>
              </div>
            ))}
            {communityBuses.length > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-full border-2 border-[#a855f7] bg-[#a855f7]/30" />
                <span className="text-text-muted">
                  Comunidad ({communityBuses.length})
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Mapa */}
      <div className="flex-1 overflow-hidden rounded-2xl border border-border shadow-sm">
        <LiveMap
          // Mvd legacy
          buses={isMvdLegacy ? buses : []}
          stops={isMvdLegacy ? mvdStops : []}
          communityBuses={isMvdLegacy ? communityBuses : []}
          // Multi-city
          vehicles={isMvdLegacy ? [] : vehicles}
          gtfsStops={gtfsIndex ? Array.from(gtfsIndex.stopsById.values()) : []}
          onlyParentStations={isCabaSubte}
          shapes={shapesToShow}
          subteForecast={subteForecast}
          // Common
          showStops={showStops || isCabaSubte}  // subte: estaciones siempre visibles
          lineFilter={filteredLine}
          companyFilter={companyFilter || undefined}
          center={city.defaultCenter}
          zoom={city.defaultZoom}
        />
      </div>
    </div>
  );
}

function timeAgo(date: Date): string {
  const secs = Math.floor((Date.now() - date.getTime()) / 1000);
  if (secs < 5) return "ahora";
  if (secs < 60) return `hace ${secs}s`;
  return `hace ${Math.floor(secs / 60)}m`;
}
