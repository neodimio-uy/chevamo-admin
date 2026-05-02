"use client";

import { useMemo, useState } from "react";
import { useBusOverrides, setBusOverride, clearBusOverride } from "@/hooks/useBusOverrides";
import { useBuses } from "@/hooks/useBuses";
import { useVehicles } from "@/hooks/useVehicles";
import { useCity } from "@/lib/cityContext";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/components/Toast";

/**
 * /buses — gestión manual de buses individuales.
 *
 * Combina el feed STM en vivo con los overrides admin (`bus_overrides/*`).
 * Permite marcar bus fuera de servicio, corregir línea/destino visible,
 * o sobrescribir coordenadas si el feed reporta mal.
 */
export default function BusesPage() {
  const { city, mode } = useCity();
  const isMvdLegacy = city.legacyMvdEndpoint;
  const isCabaSubte = city.id === "ar.amba" && mode.id === "subte";

  const { buses, loading: busesLoading } = useBuses(30000, isMvdLegacy);
  const { vehicles, loading: vehiclesLoading } = useVehicles(15000);
  const { overrides } = useBusOverrides();
  const { user } = useAuth();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [showOnlyOverridden, setShowOnlyOverridden] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const loading = isMvdLegacy ? busesLoading : vehiclesLoading;

  const overrideMap = useMemo(() => {
    const m = new Map<string, (typeof overrides)[0]>();
    for (const o of overrides) m.set(o.id, o);
    return m;
  }, [overrides]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return buses
      .filter((b) => {
        const id = String(b.id);
        if (showOnlyOverridden && !overrideMap.has(id)) return false;
        if (!q) return true;
        return (
          id.includes(q) ||
          (b.line ?? "").toLowerCase().includes(q) ||
          (b.company ?? "").toLowerCase().includes(q) ||
          (b.destination ?? "").toLowerCase().includes(q)
        );
      })
      .slice(0, 200);
  }, [buses, search, showOnlyOverridden, overrideMap]);

  const handleToggleOOS = async (busId: string, current: boolean) => {
    if (!user?.email) return toast("Sesión expirada", "error");
    const reason = current
      ? null
      : prompt("Razón para marcar bus fuera de servicio:");
    if (!current && !reason) return;
    setPendingId(busId);
    try {
      await setBusOverride(
        busId,
        { outOfService: !current, reason: reason ?? null },
        user.email
      );
      toast(!current ? "Bus marcado fuera de servicio" : "Bus reactivado", "success");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Error", "error");
    } finally {
      setPendingId(null);
    }
  };

  const handleClear = async (busId: string) => {
    if (!user?.email) return toast("Sesión expirada", "error");
    if (!confirm("¿Quitar todos los overrides de este bus?")) return;
    setPendingId(busId);
    try {
      await clearBusOverride(busId, user.email);
      toast("Overrides quitados", "success");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Error", "error");
    } finally {
      setPendingId(null);
    }
  };

  // CABA Subte: la página `/buses` no aplica (subte no es GPS de trenes).
  if (isCabaSubte) {
    return (
      <div className="space-y-4">
        <header>
          <h1 className="text-2xl font-bold text-text">{mode.label}</h1>
          <p className="mt-1 text-sm text-text-secondary">
            El subte CABA no expone posiciones GPS de trenes. Mirá próximos arribos por estación en{" "}
            <a href="/map" className="text-primary underline">Mapa</a> o{" "}
            <a href="/stops" className="text-primary underline">Paradas</a>.
          </p>
        </header>
      </div>
    );
  }

  // CABA Bus: tabla read-only de TransitVehicle (sin overrides — overrides
  // son Mvd-only por ahora; el flow de override individual no existe en CABA).
  if (!isMvdLegacy) {
    return (
      <div className="space-y-4">
        <header className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-text">{mode.label} · {city.shortName}</h1>
            <p className="mt-1 text-sm text-text-secondary">
              {vehicles.length} vehículos en vivo. Overrides individuales solo en Mvd.
            </p>
          </div>
          <input
            type="text"
            placeholder="Buscar por línea / id / agencia…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text w-72"
          />
        </header>
        <section className="rounded-2xl border border-border bg-bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-bg-subtle text-text-secondary">
                <tr>
                  <th className="px-4 py-2 text-left text-xs uppercase tracking-wider font-semibold">ID</th>
                  <th className="px-4 py-2 text-left text-xs uppercase tracking-wider font-semibold">Línea</th>
                  <th className="px-4 py-2 text-left text-xs uppercase tracking-wider font-semibold">Agencia</th>
                  <th className="px-4 py-2 text-left text-xs uppercase tracking-wider font-semibold">Destino</th>
                  <th className="px-4 py-2 text-right text-xs uppercase tracking-wider font-semibold">Velocidad</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading && (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-text-muted">Cargando…</td></tr>
                )}
                {!loading && vehicles.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-text-muted">Sin vehículos en vivo.</td></tr>
                )}
                {vehicles
                  .filter((v) => {
                    const q = search.trim().toLowerCase();
                    if (!q) return true;
                    const line = (v.trip?.routeShortName ?? v.displayLabel ?? "").toLowerCase();
                    const agency = (v.agency?.name ?? "").toLowerCase();
                    const headsign = (v.trip?.headsign ?? "").toLowerCase();
                    return line.includes(q) || v.id.toLowerCase().includes(q) || agency.includes(q) || headsign.includes(q);
                  })
                  .slice(0, 200)
                  .map((v) => (
                    <tr key={v.id}>
                      <td className="px-4 py-2 font-mono text-xs text-text">{v.id.split(":").pop()}</td>
                      <td className="px-4 py-2 text-text font-semibold">{v.trip?.routeShortName ?? v.displayLabel ?? "—"}</td>
                      <td className="px-4 py-2 text-text-secondary truncate max-w-[200px]">{v.agency?.name ?? "—"}</td>
                      <td className="px-4 py-2 text-text-secondary truncate max-w-[260px]">{v.trip?.headsign ?? "—"}</td>
                      <td className="px-4 py-2 text-right text-text-secondary tabular-nums">
                        {v.position.speed != null ? `${(v.position.speed * 3.6).toFixed(0)} km/h` : "—"}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    );
  }

  // Mvd urbano: tabla original con overrides.
  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text">Buses</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Feed STM en vivo + overrides admin. {buses.length} buses activos, {overrides.length} con override.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Buscar por id / línea / empresa…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text w-72"
          />
          <label className="flex items-center gap-2 text-xs text-text-secondary cursor-pointer">
            <input
              type="checkbox"
              checked={showOnlyOverridden}
              onChange={(e) => setShowOnlyOverridden(e.target.checked)}
            />
            Solo con override
          </label>
        </div>
      </header>

      <section className="rounded-2xl border border-border bg-bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-bg-subtle text-text-secondary">
              <tr>
                <th className="px-4 py-2 text-left text-xs uppercase tracking-wider font-semibold">Bus ID</th>
                <th className="px-4 py-2 text-left text-xs uppercase tracking-wider font-semibold">Línea</th>
                <th className="px-4 py-2 text-left text-xs uppercase tracking-wider font-semibold">Empresa</th>
                <th className="px-4 py-2 text-left text-xs uppercase tracking-wider font-semibold">Destino</th>
                <th className="px-4 py-2 text-center text-xs uppercase tracking-wider font-semibold">Estado</th>
                <th className="px-4 py-2 text-right text-xs uppercase tracking-wider font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-text-muted">Cargando…</td></tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-text-muted">Sin resultados.</td></tr>
              )}
              {filtered.map((b) => {
                const id = String(b.id);
                const override = overrideMap.get(id);
                const oos = override?.outOfService ?? false;
                return (
                  <tr key={id} className={oos ? "opacity-60 bg-danger/5" : ""}>
                    <td className="px-4 py-2 font-mono text-xs text-text">{id}</td>
                    <td className="px-4 py-2 text-text font-semibold">{b.line || "—"}</td>
                    <td className="px-4 py-2 text-text-secondary">{b.company || "—"}</td>
                    <td className="px-4 py-2 text-text-secondary truncate max-w-[200px]">{b.destination || "—"}</td>
                    <td className="px-4 py-2 text-center">
                      {oos ? (
                        <span className="rounded-full bg-danger/10 px-2 py-0.5 text-[10px] font-bold text-danger">
                          FUERA DE SERVICIO
                        </span>
                      ) : override ? (
                        <span className="rounded-full bg-warning/10 px-2 py-0.5 text-[10px] font-bold text-warning">
                          OVERRIDE
                        </span>
                      ) : (
                        <span className="text-xs text-green-500">activo</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right space-x-2 whitespace-nowrap">
                      <button
                        onClick={() => handleToggleOOS(id, oos)}
                        disabled={pendingId === id}
                        className={`rounded px-2 py-1 text-[11px] font-semibold ${
                          oos
                            ? "bg-green-500/10 text-green-500 hover:bg-green-500/20"
                            : "bg-danger/10 text-danger hover:bg-danger/20"
                        } disabled:opacity-50`}
                      >
                        {oos ? "Reactivar" : "Marcar OOS"}
                      </button>
                      {override && (
                        <button
                          onClick={() => handleClear(id)}
                          disabled={pendingId === id}
                          className="rounded px-2 py-1 text-[11px] text-text-secondary hover:bg-bg-subtle disabled:opacity-50"
                        >
                          Limpiar
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
