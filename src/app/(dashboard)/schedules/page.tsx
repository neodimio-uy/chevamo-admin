"use client";

import { useEffect, useState } from "react";
import { getBusStops, getSchedules } from "@/lib/api";
import { useCity } from "@/lib/cityContext";
import type { BusStop } from "@/lib/types";

export default function SchedulesPage() {
  const { city, mode } = useCity();
  const isMvdLegacy = city.legacyMvdEndpoint;

  const [stops, setStops] = useState<BusStop[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedStop, setSelectedStop] = useState<BusStop | null>(null);
  const [schedules, setSchedules] = useState<Record<string, string[]> | null>(null);
  const [schedulesLoading, setSchedulesLoading] = useState(false);

  useEffect(() => {
    if (!isMvdLegacy) {
      setStops([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    getBusStops()
      .then(setStops)
      .finally(() => setLoading(false));
  }, [isMvdLegacy]);

  // CABA: horarios programados no disponibles (snapshot no incluye stop_times
  // por tamaño). Mostrar mensaje y dirigir al mapa para arribos en vivo.
  if (!isMvdLegacy) {
    return (
      <div>
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-text">Horarios · {city.shortName} · {mode.label}</h1>
        </div>
        <div className="rounded-2xl border border-dashed border-border bg-bg-card p-8 text-center">
          <p className="text-sm font-semibold text-text">Horarios estáticos no disponibles</p>
          <p className="mt-2 text-sm text-text-secondary max-w-md mx-auto">
            El GTFS estático de {city.shortName} no incluye <code className="font-mono">stop_times</code> por tamaño
            (~700MB descomprimido). Para próximos arribos en vivo, andá al{" "}
            <a href="/map" className="text-primary underline">Mapa</a> y tap una parada/estación.
          </p>
        </div>
      </div>
    );
  }

  useEffect(() => {
    if (!selectedStop) {
      setSchedules(null);
      return;
    }
    setSchedulesLoading(true);
    getSchedules(selectedStop.id)
      .then(setSchedules)
      .catch(() => setSchedules(null))
      .finally(() => setSchedulesLoading(false));
  }, [selectedStop]);

  const filtered = search.trim()
    ? stops.filter((s) => {
        const q = search.toLowerCase();
        const idStr = String(s?.id ?? "");
        return (
          idStr.includes(q) ||
          s.street1?.toLowerCase().includes(q) ||
          s.street2?.toLowerCase().includes(q)
        );
      })
    : stops;

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-text">Horarios</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Consultá los horarios oficiales de cualquier parada.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.5fr]">
        {/* Columna izquierda: buscador + lista de paradas */}
        <div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar parada..."
            className="mb-3 w-full rounded-xl border border-border bg-bg-input px-4 py-2.5 text-sm text-text placeholder:text-text-muted focus:border-border-focus focus:ring-1 focus:ring-border-focus"
          />

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : (
            <div className="rounded-2xl border border-border bg-bg-card shadow-sm overflow-hidden">
              <div className="max-h-[70vh] overflow-y-auto">
                {filtered.slice(0, 100).map((stop) => {
                  const displayName =
                    stop.street1 && stop.street2
                      ? `${stop.street1} y ${stop.street2}`
                      : stop.street1 || stop.street2 || `Parada ${stop.id}`;
                  const isActive = selectedStop?.id === stop.id;
                  return (
                    <button
                      key={stop.id}
                      onClick={() => setSelectedStop(stop)}
                      className={`w-full text-left border-b border-border last:border-0 px-4 py-3 transition-colors ${
                        isActive
                          ? "bg-primary-light text-primary"
                          : "hover:bg-bg"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-mono text-xs ${isActive ? "text-primary" : "text-text-muted"}`}
                        >
                          {stop.id}
                        </span>
                        <span
                          className={`text-sm font-medium ${isActive ? "text-primary" : "text-text"}`}
                        >
                          {displayName}
                        </span>
                      </div>
                    </button>
                  );
                })}
                {filtered.length > 100 && (
                  <div className="border-t border-border px-4 py-2 text-center text-xs text-text-muted">
                    Mostrando 100. Filtrá con el buscador.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Columna derecha: horarios de la parada seleccionada */}
        <div>
          {!selectedStop ? (
            <div className="rounded-2xl border border-dashed border-border bg-bg-card p-12 text-center">
              <h3 className="text-base font-semibold text-text">
                Seleccioná una parada
              </h3>
              <p className="mt-1 text-sm text-text-secondary">
                Los horarios aparecen acá.
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-border bg-bg-card p-6 shadow-sm">
              <div className="mb-4 border-b border-border pb-3">
                <p className="font-mono text-xs text-text-muted">
                  #{selectedStop.id}
                </p>
                <h2 className="text-base font-semibold text-text">
                  {selectedStop.street1 && selectedStop.street2
                    ? `${selectedStop.street1} y ${selectedStop.street2}`
                    : selectedStop.street1 ||
                      selectedStop.street2 ||
                      `Parada ${selectedStop.id}`}
                </h2>
              </div>

              {schedulesLoading ? (
                <div className="flex items-center justify-center py-10">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              ) : !schedules || Object.keys(schedules).length === 0 ? (
                <p className="py-8 text-center text-sm text-text-muted">
                  Sin horarios disponibles para esta parada.
                </p>
              ) : (
                <div className="space-y-4">
                  {Object.entries(schedules)
                    .sort((a, b) => {
                      const aNum = parseInt(a[0]);
                      const bNum = parseInt(b[0]);
                      if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum;
                      return a[0].localeCompare(b[0]);
                    })
                    .map(([line, times]) => (
                      <div key={line}>
                        <div className="mb-2 flex items-center gap-2">
                          <span className="flex h-7 items-center rounded-lg bg-primary/10 px-2.5 text-xs font-bold text-primary">
                            {line}
                          </span>
                          <span className="text-xs text-text-muted">
                            {times.length} horario{times.length !== 1 ? "s" : ""}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {times.map((time, i) => (
                            <span
                              key={i}
                              className="rounded-lg bg-bg px-2 py-1 text-xs font-mono text-text-secondary border border-border"
                            >
                              {time}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
