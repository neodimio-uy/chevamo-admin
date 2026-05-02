"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getBusStops } from "@/lib/api";
import { useStopOverrides } from "@/hooks/useStopOverrides";
import { useCustomStops, createCustomStop, deleteCustomStop } from "@/hooks/useCustomStops";
import { useGtfsSnapshot } from "@/hooks/useGtfsSnapshot";
import { useCity } from "@/lib/cityContext";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/components/Toast";
import type { BusStop } from "@/lib/types";

function feedIdFor(cityId: string, modeId: string): string | null {
  if (cityId === "ar.amba" && modeId === "bus") return "gcba-colectivos-static";
  if (cityId === "ar.amba" && modeId === "subte") return "gcba-subte-static";
  return null;
}

export default function StopsPage() {
  const { city, mode } = useCity();
  const isMvdLegacy = city.legacyMvdEndpoint;
  const isCabaSubte = city.id === "ar.amba" && mode.id === "subte";

  const { data: gtfsIndex, loading: gtfsLoading } = useGtfsSnapshot(
    feedIdFor(city.id, mode.id)
  );

  const [stops, setStops] = useState<BusStop[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterModified, setFilterModified] = useState(false);
  const [showNewForm, setShowNewForm] = useState(false);
  const { overrides } = useStopOverrides();
  const { stops: customStops } = useCustomStops();
  const { user } = useAuth();
  const { toast } = useToast();

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

  /// CABA stops del GTFS estático. Para subte mostramos solo `location_type=1`
  /// (estaciones agrupadoras, ~108) y no andenes/entradas peatonales.
  const cabaStops = useMemo(() => {
    if (!gtfsIndex) return [];
    const all = Array.from(gtfsIndex.stopsById.values());
    return isCabaSubte ? all.filter((s) => s.location_type === 1) : all;
  }, [gtfsIndex, isCabaSubte]);

  const filtered = stops.filter((s) => {
    const idStr = String(s?.id ?? "");
    if (filterModified && !overrides[idStr]) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      idStr.includes(q) ||
      s.street1?.toLowerCase().includes(q) ||
      s.street2?.toLowerCase().includes(q)
    );
  });

  const modifiedCount = Object.keys(overrides).length;
  const suspendedCount = Object.values(overrides).filter((o) => o.suspended).length;

  // CABA: tabla read-only de GTFS stops.
  if (!isMvdLegacy) {
    const filteredCaba = cabaStops.filter((s) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        s.stop_name.toLowerCase().includes(q) ||
        s.stop_id.toLowerCase().includes(q) ||
        (s.stop_code ?? "").toLowerCase().includes(q)
      );
    });
    const label = isCabaSubte ? "Estaciones de Subte" : "Paradas de Colectivos";
    return (
      <div>
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-text">{label} · {city.shortName}</h1>
          <p className="mt-1 text-sm text-text-secondary">
            {gtfsLoading ? "Cargando GTFS estático…" : `${cabaStops.length} ${isCabaSubte ? "estaciones" : "paradas"}.`}
          </p>
        </div>
        <div className="mb-6">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre o código…"
            className="w-full rounded-xl border border-border bg-bg-input px-4 py-2.5 text-sm text-text placeholder:text-text-muted focus:border-border-focus focus:ring-1 focus:ring-border-focus"
          />
        </div>
        {gtfsLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : (
          <section className="rounded-2xl border border-border bg-bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-bg-subtle text-text-secondary">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs uppercase tracking-wider font-semibold">ID</th>
                    <th className="px-4 py-2 text-left text-xs uppercase tracking-wider font-semibold">Nombre</th>
                    <th className="px-4 py-2 text-left text-xs uppercase tracking-wider font-semibold">Código</th>
                    <th className="px-4 py-2 text-right text-xs uppercase tracking-wider font-semibold">Lat / Lng</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredCaba.slice(0, 500).map((s) => (
                    <tr key={s.stop_id}>
                      <td className="px-4 py-2 font-mono text-xs text-text">{s.stop_id}</td>
                      <td className="px-4 py-2 text-text">{s.stop_name}</td>
                      <td className="px-4 py-2 text-text-secondary">{s.stop_code ?? "—"}</td>
                      <td className="px-4 py-2 text-right text-text-secondary tabular-nums font-mono text-xs">
                        {s.stop_lat.toFixed(4)}, {s.stop_lon.toFixed(4)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filteredCaba.length > 500 && (
              <p className="border-t border-border px-4 py-2 text-center text-xs text-text-muted">
                Mostrando primeras 500 de {filteredCaba.length}. Filtrá para ver más.
              </p>
            )}
          </section>
        )}
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text">Paradas</h1>
          <p className="mt-1 text-sm text-text-secondary">
            {stops.length > 0
              ? `${stops.length} paradas STM${modifiedCount > 0 ? ` · ${modifiedCount} modificada${modifiedCount !== 1 ? "s" : ""}` : ""}${suspendedCount > 0 ? ` · ${suspendedCount} suspendida${suspendedCount !== 1 ? "s" : ""}` : ""}${customStops.length > 0 ? ` · ${customStops.length} custom` : ""}`
              : "Cargando paradas del sistema..."}
          </p>
        </div>
        <button
          onClick={() => setShowNewForm(true)}
          className="rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-white hover:bg-primary/90 whitespace-nowrap"
        >
          + Nueva parada custom
        </button>
      </div>

      {showNewForm && (
        <NewCustomStopForm
          onClose={() => setShowNewForm(false)}
          onCreate={(msg) => { toast(msg, "success"); setShowNewForm(false); }}
          onError={(msg) => toast(msg, "error")}
          adminEmail={user?.email ?? null}
        />
      )}

      {customStops.length > 0 && (
        <section className="mb-6 rounded-2xl border border-warning/30 bg-warning/5 overflow-hidden">
          <div className="border-b border-warning/30 bg-warning/10 px-5 py-2">
            <h2 className="text-xs font-bold text-warning uppercase tracking-wider">
              Paradas custom ({customStops.length})
            </h2>
            <p className="mt-0.5 text-[11px] text-text-secondary">
              Paradas creadas por admin que no existen en el feed STM. iOS las
              consume mergeando con el feed oficial.
            </p>
          </div>
          <div className="divide-y divide-border">
            {customStops.map((cs) => (
              <div key={cs.id} className="flex items-center justify-between px-5 py-2.5">
                <div>
                  <p className="text-sm text-text font-medium">
                    {cs.street1}{cs.street2 ? ` y ${cs.street2}` : ""}
                  </p>
                  <p className="text-[11px] text-text-muted font-mono">
                    {cs.lat.toFixed(5)}, {cs.lng.toFixed(5)}
                    {cs.lines.length > 0 && ` · líneas: ${cs.lines.join(", ")}`}
                  </p>
                </div>
                <button
                  onClick={async () => {
                    if (!user?.email) return;
                    if (!confirm(`¿Borrar parada custom "${cs.street1}"?`)) return;
                    try {
                      await deleteCustomStop(cs.id, user.email);
                      toast("Parada borrada", "success");
                    } catch (e) {
                      toast(e instanceof Error ? e.message : "Error", "error");
                    }
                  }}
                  className="text-xs text-danger hover:underline"
                >
                  Borrar
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Search + filter */}
      <div className="mb-6 flex gap-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre de calle o ID..."
          className="flex-1 rounded-xl border border-border bg-bg-input px-4 py-2.5 text-sm text-text placeholder:text-text-muted focus:border-border-focus focus:ring-1 focus:ring-border-focus"
        />
        {modifiedCount > 0 && (
          <button
            onClick={() => setFilterModified(!filterModified)}
            className={`rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors ${
              filterModified
                ? "border-warning bg-warning/10 text-warning"
                : "border-border text-text-secondary hover:border-border-focus"
            }`}
          >
            Solo modificadas ({modifiedCount})
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-bg-card p-12 text-center">
          <h3 className="text-base font-semibold text-text">
            {search || filterModified ? "Sin resultados" : "Sin paradas"}
          </h3>
          <p className="mt-1 text-sm text-text-secondary">
            {search
              ? `No se encontraron paradas para "${search}".`
              : filterModified
                ? "No hay paradas con overrides."
                : "No se pudieron cargar las paradas."}
          </p>
        </div>
      ) : (
        <>
          <p className="mb-3 text-xs text-text-muted">
            Mostrando {filtered.length} de {stops.length} paradas
          </p>
          <div className="overflow-hidden rounded-2xl border border-border bg-bg-card shadow-sm">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-bg">
                  <th className="px-4 py-3 font-medium text-text-secondary">ID</th>
                  <th className="px-4 py-3 font-medium text-text-secondary">
                    Ubicación
                  </th>
                  <th className="px-4 py-3 font-medium text-text-secondary">
                    Estado
                  </th>
                  <th className="px-4 py-3 font-medium text-text-secondary">
                    Coordenadas
                  </th>
                  <th className="px-4 py-3 text-right"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, 100).map((stop) => {
                  const override = overrides[String(stop.id)];
                  const displayName =
                    stop.street1 && stop.street2
                      ? `${stop.street1} y ${stop.street2}`
                      : stop.street1 || stop.street2 || `Parada ${stop.id}`;
                  return (
                    <tr
                      key={stop.id}
                      className="border-b border-border last:border-0 hover:bg-primary-light/30 transition-colors"
                    >
                      <td className="px-4 py-3 font-mono text-xs text-text-muted">
                        {stop.id}
                      </td>
                      <td className="px-4 py-3 font-medium text-text">
                        {displayName}
                        {override?.note && (
                          <p className="mt-0.5 text-xs font-normal text-text-muted line-clamp-1">
                            {override.note}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {override ? (
                          <div className="flex flex-wrap gap-1">
                            {override.suspended && (
                              <span className="rounded-full bg-danger/10 px-2 py-0.5 text-xs font-medium text-danger">
                                Suspendida
                              </span>
                            )}
                            {override.tempLocation && (
                              <span className="rounded-full bg-warning/10 px-2 py-0.5 text-xs font-medium text-warning">
                                Reubicada
                              </span>
                            )}
                            {override.lines && (
                              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                                Líneas modificadas
                              </span>
                            )}
                            {!override.suspended && !override.tempLocation && !override.lines && (
                              <span className="text-xs text-text-muted">Con nota</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-text-muted">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-text-muted">
                        {stop.location?.coordinates
                          ? `${stop.location.coordinates[1].toFixed(4)}, ${stop.location.coordinates[0].toFixed(4)}`
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/stops/detail?id=${stop.id}`}
                          className="rounded-lg px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary-light"
                        >
                          Editar
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filtered.length > 100 && (
              <div className="border-t border-border px-4 py-3 text-center text-xs text-text-muted">
                Mostrando primeras 100. Usá el buscador para filtrar.
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function NewCustomStopForm({
  onClose,
  onCreate,
  onError,
  adminEmail,
}: {
  onClose: () => void;
  onCreate: (msg: string) => void;
  onError: (msg: string) => void;
  adminEmail: string | null;
}) {
  const [street1, setStreet1] = useState("");
  const [street2, setStreet2] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [linesText, setLinesText] = useState("");
  const [pending, setPending] = useState(false);

  const onSubmit = async () => {
    if (!adminEmail) return onError("Sesión expirada");
    if (!street1.trim()) return onError("Calle principal requerida");
    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);
    if (isNaN(latNum) || isNaN(lngNum)) return onError("Coordenadas inválidas");
    setPending(true);
    try {
      await createCustomStop(
        {
          street1: street1.trim(),
          street2: street2.trim() || null,
          lat: latNum,
          lng: lngNum,
          lines: linesText.split(",").map((s) => s.trim()).filter(Boolean),
          note: null,
        },
        adminEmail
      );
      onCreate(`Parada "${street1.trim()}" creada`);
    } catch (e) {
      onError(e instanceof Error ? e.message : "Error");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="mb-6 rounded-2xl border border-primary/30 bg-bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-text">Nueva parada custom</h2>
        <button onClick={onClose} className="text-text-muted hover:text-text text-xs">✕</button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[11px] text-text-secondary uppercase tracking-wider">Calle 1 *</label>
          <input
            type="text"
            value={street1}
            onChange={(e) => setStreet1(e.target.value)}
            className="mt-1 w-full rounded-lg border border-border bg-bg px-2 py-1.5 text-sm"
            placeholder="Ej: 18 de Julio"
          />
        </div>
        <div>
          <label className="text-[11px] text-text-secondary uppercase tracking-wider">Calle 2 (esquina)</label>
          <input
            type="text"
            value={street2}
            onChange={(e) => setStreet2(e.target.value)}
            className="mt-1 w-full rounded-lg border border-border bg-bg px-2 py-1.5 text-sm"
            placeholder="Ej: Tristán Narvaja"
          />
        </div>
        <div>
          <label className="text-[11px] text-text-secondary uppercase tracking-wider">Latitud *</label>
          <input
            type="text"
            value={lat}
            onChange={(e) => setLat(e.target.value)}
            className="mt-1 w-full rounded-lg border border-border bg-bg px-2 py-1.5 text-sm font-mono"
            placeholder="-34.90578"
          />
        </div>
        <div>
          <label className="text-[11px] text-text-secondary uppercase tracking-wider">Longitud *</label>
          <input
            type="text"
            value={lng}
            onChange={(e) => setLng(e.target.value)}
            className="mt-1 w-full rounded-lg border border-border bg-bg px-2 py-1.5 text-sm font-mono"
            placeholder="-56.19132"
          />
        </div>
      </div>
      <div>
        <label className="text-[11px] text-text-secondary uppercase tracking-wider">Líneas que sirven (opcional)</label>
        <input
          type="text"
          value={linesText}
          onChange={(e) => setLinesText(e.target.value)}
          className="mt-1 w-full rounded-lg border border-border bg-bg px-2 py-1.5 text-sm"
          placeholder="192, CA1, 405 (separadas por coma)"
        />
      </div>
      <div className="flex items-center justify-end gap-2">
        <button onClick={onClose} className="rounded-lg px-3 py-1.5 text-sm text-text-secondary">Cancelar</button>
        <button
          onClick={onSubmit}
          disabled={pending}
          className="rounded-lg bg-primary px-4 py-1.5 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50"
        >
          {pending ? "Creando…" : "Crear parada"}
        </button>
      </div>
    </div>
  );
}
