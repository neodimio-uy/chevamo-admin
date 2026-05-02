"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getLineVariants } from "@/lib/api";
import { useLineOverrides, suspendLine, unsuspendLine } from "@/hooks/useLineOverrides";
import { useGtfsSnapshot } from "@/hooks/useGtfsSnapshot";
import { useCity } from "@/lib/cityContext";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/components/Toast";
import type { LineVariant } from "@/lib/types";

function feedIdFor(cityId: string, modeId: string): string | null {
  if (cityId === "ar.amba" && modeId === "bus") return "gcba-colectivos-static";
  if (cityId === "ar.amba" && modeId === "subte") return "gcba-subte-static";
  return null;
}

interface GroupedLine {
  line: string;
  variants: LineVariant[];
  companies: Set<string>;
}

export default function LinesPage() {
  const { city, mode } = useCity();
  const isMvdLegacy = city.legacyMvdEndpoint;

  const { data: gtfsIndex, loading: gtfsLoading } = useGtfsSnapshot(
    feedIdFor(city.id, mode.id)
  );

  const [variants, setVariants] = useState<LineVariant[]>([]);
  const [loadingMvd, setLoadingMvd] = useState(true);
  const [search, setSearch] = useState("");
  const { overrides } = useLineOverrides();
  const { user } = useAuth();
  const { toast } = useToast();
  const [pendingLine, setPendingLine] = useState<string | null>(null);

  const loading = isMvdLegacy ? loadingMvd : gtfsLoading;

  const onToggleSuspend = async (lineCode: string, isSuspended: boolean) => {
    if (!user?.email) return toast("Sesión expirada", "error");
    setPendingLine(lineCode);
    try {
      if (isSuspended) {
        await unsuspendLine(lineCode, user.email);
        toast(`Línea ${lineCode} reactivada`, "success");
      } else {
        const note = prompt(`¿Por qué suspender línea ${lineCode}?`);
        if (!note?.trim()) {
          setPendingLine(null);
          return;
        }
        await suspendLine(lineCode, note.trim(), user.email);
        toast(`Línea ${lineCode} suspendida`, "warning");
      }
    } catch (e) {
      toast(e instanceof Error ? e.message : "Error", "error");
    } finally {
      setPendingLine(null);
    }
  };

  useEffect(() => {
    if (!isMvdLegacy) {
      setVariants([]);
      setLoadingMvd(false);
      return;
    }
    setLoadingMvd(true);
    getLineVariants()
      .then(setVariants)
      .finally(() => setLoadingMvd(false));
  }, [isMvdLegacy]);

  /// Lista de líneas para no-Mvd, derivada del GTFS estático.
  const cabaRoutes = useMemo(() => {
    if (!gtfsIndex) return [];
    const out: { line: string; long: string; route_id: string; color: string }[] = [];
    for (const r of gtfsIndex.routesById.values()) {
      out.push({
        line: r.route_short_name,
        long: r.route_long_name,
        route_id: r.route_id,
        color: r.route_color ?? "0066CC",
      });
    }
    out.sort((a, b) => {
      const aN = parseInt(a.line);
      const bN = parseInt(b.line);
      if (!isNaN(aN) && !isNaN(bN)) return aN - bN;
      return a.line.localeCompare(b.line);
    });
    return out;
  }, [gtfsIndex]);

  // Agrupar variantes por línea
  const grouped: GroupedLine[] = [];
  const lineMap = new Map<string, GroupedLine>();

  for (const v of variants) {
    let group = lineMap.get(v.line);
    if (!group) {
      group = { line: v.line, variants: [], companies: new Set() };
      lineMap.set(v.line, group);
      grouped.push(group);
    }
    group.variants.push(v);
  }

  // Sort numérico/alfanumérico
  grouped.sort((a, b) => {
    const aNum = parseInt(a.line);
    const bNum = parseInt(b.line);
    if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum;
    return a.line.localeCompare(b.line);
  });

  const filtered = search.trim()
    ? grouped.filter((g) => {
        const q = search.toLowerCase();
        return (
          g.line.toLowerCase().includes(q) ||
          g.variants.some(
            (v) =>
              v.destination?.toLowerCase().includes(q) ||
              v.origin?.toLowerCase().includes(q)
          )
        );
      })
    : grouped;

  // CABA: tabla read-only de routes del GTFS, sin overrides.
  if (!isMvdLegacy) {
    const filteredCaba = search.trim()
      ? cabaRoutes.filter((r) => {
          const q = search.toLowerCase();
          return r.line.toLowerCase().includes(q) || r.long.toLowerCase().includes(q);
        })
      : cabaRoutes;
    return (
      <div>
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-text">Líneas · {city.shortName} · {mode.label}</h1>
          <p className="mt-1 text-sm text-text-secondary">
            {gtfsLoading
              ? "Cargando GTFS estático…"
              : `${cabaRoutes.length} ${mode.label.toLowerCase()} · GTFS-${gtfsIndex?.snapshot.feedId ?? ""}`}
          </p>
        </div>
        <div className="mb-6">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por número o destino…"
            className="w-full rounded-xl border border-border bg-bg-input px-4 py-2.5 text-sm text-text placeholder:text-text-muted focus:border-border-focus focus:ring-1 focus:ring-border-focus"
          />
        </div>
        {gtfsLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filteredCaba.slice(0, 200).map((r) => (
              <Link
                key={r.route_id}
                href={`/lines/detail?line=${encodeURIComponent(r.line)}`}
                className="block rounded-2xl border border-border bg-bg-card p-4 shadow-sm transition-all hover:shadow-md hover:border-primary"
              >
                <div className="flex items-center gap-3">
                  <span
                    className="flex h-10 w-14 items-center justify-center rounded-xl text-sm font-bold text-white"
                    style={{ backgroundColor: `#${r.color}` }}
                  >
                    {r.line}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium text-text">{r.long || "—"}</p>
                    <p className="text-xs text-text-muted font-mono">{r.route_id}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
        {filteredCaba.length > 200 && (
          <p className="mt-4 text-center text-xs text-text-muted">
            Mostrando primeras 200 de {filteredCaba.length}. Filtrá para ver más.
          </p>
        )}
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-text">Líneas</h1>
        <p className="mt-1 text-sm text-text-secondary">
          {grouped.length > 0
            ? `${grouped.length} líneas con ${variants.length} variantes.`
            : "Cargando líneas del sistema..."}
        </p>
      </div>

      {/* Search */}
      <div className="mb-6">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por número de línea o destino..."
          className="w-full rounded-xl border border-border bg-bg-input px-4 py-2.5 text-sm text-text placeholder:text-text-muted focus:border-border-focus focus:ring-1 focus:ring-border-focus"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-bg-card p-12 text-center">
          <h3 className="text-base font-semibold text-text">
            {search ? "Sin resultados" : "Sin líneas"}
          </h3>
          <p className="mt-1 text-sm text-text-secondary">
            {search
              ? `No se encontraron líneas para "${search}".`
              : "No se pudieron cargar las líneas."}
          </p>
        </div>
      ) : (
        <>
          <p className="mb-3 text-xs text-text-muted">
            Mostrando {filtered.length} de {grouped.length} líneas
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.slice(0, 120).map((group) => {
              const destinations = [
                ...new Set(
                  group.variants
                    .map((v) => v.destination || v.subline)
                    .filter(Boolean)
                ),
              ];

              const override = overrides[group.line];
              const isSuspended = override?.suspended ?? false;
              return (
                <div
                  key={group.line}
                  className={`rounded-2xl border bg-bg-card p-4 shadow-sm transition-all hover:shadow-md ${
                    isSuspended ? "border-danger/40 bg-danger/5" : "border-border hover:border-primary"
                  }`}
                >
                  <Link
                    href={`/lines/detail?line=${encodeURIComponent(group.line)}`}
                    className="block"
                  >
                    <div className="flex items-center gap-3">
                      <span className={`flex h-10 w-14 items-center justify-center rounded-xl text-sm font-bold ${
                        isSuspended ? "bg-danger/10 text-danger line-through" : "bg-primary/10 text-primary"
                      }`}>
                        {group.line}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-sm font-medium text-text">
                          {destinations.slice(0, 2).join(" / ") || "—"}
                        </p>
                        <p className="text-xs text-text-muted">
                          {group.variants.length} variante
                          {group.variants.length !== 1 ? "s" : ""}
                          {group.variants.some((v) => v.special) && " · especial"}
                        </p>
                      </div>
                    </div>
                  </Link>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    {isSuspended ? (
                      <span className="text-[10px] font-bold text-danger uppercase tracking-wider">
                        ⛔ Suspendida{override?.note ? ` · ${override.note.slice(0, 30)}` : ""}
                      </span>
                    ) : (
                      <span className="text-[10px] text-green-500">activa</span>
                    )}
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        onToggleSuspend(group.line, isSuspended);
                      }}
                      disabled={pendingLine === group.line}
                      className={`rounded px-2 py-1 text-[10px] font-semibold ${
                        isSuspended
                          ? "bg-green-500/10 text-green-500 hover:bg-green-500/20"
                          : "bg-danger/10 text-danger hover:bg-danger/20"
                      } disabled:opacity-50`}
                    >
                      {isSuspended ? "Reactivar" : "Suspender"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          {filtered.length > 120 && (
            <p className="mt-4 text-center text-xs text-text-muted">
              Mostrando primeras 120. Usá el buscador para filtrar.
            </p>
          )}
        </>
      )}
    </div>
  );
}
