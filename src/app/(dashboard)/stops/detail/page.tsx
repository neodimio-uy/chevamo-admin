"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/components/Toast";
import { useStopOverride, saveStopOverride, clearStopOverride } from "@/hooks/useStopOverrides";
import { getBusStops, getLinesAtStop } from "@/lib/api";
import type { BusStop } from "@/lib/types";

function StopDetailContent() {
  const router = useRouter();
  const params = useSearchParams();
  const id = params.get("id");
  const { user } = useAuth();
  const { toast } = useToast();
  const { override, loading: overrideLoading } = useStopOverride(id ?? "");

  const [stop, setStop] = useState<BusStop | null>(null);
  const [defaultLines, setDefaultLines] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [lines, setLines] = useState<string[]>([]);
  const [newLine, setNewLine] = useState("");
  const [suspended, setSuspended] = useState(false);
  const [note, setNote] = useState("");
  const [tempLat, setTempLat] = useState("");
  const [tempLng, setTempLng] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    const stopId = Number(id);
    Promise.all([getBusStops(), getLinesAtStop(stopId).catch(() => [])])
      .then(([allStops, stopLines]) => {
        const found = allStops.find((s) => s.id === stopId);
        setStop(found ?? null);
        setDefaultLines(stopLines);
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (overrideLoading) return;
    if (override) {
      setLines(override.lines ?? defaultLines);
      setSuspended(override.suspended);
      setNote(override.note ?? "");
      setTempLat(override.tempLocation?.lat?.toString() ?? "");
      setTempLng(override.tempLocation?.lng?.toString() ?? "");
    } else {
      setLines(defaultLines);
    }
  }, [override, overrideLoading, defaultLines]);

  if (!id) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-bg-card p-12 text-center">
        <h3 className="text-base font-semibold text-text">ID no especificado</h3>
        <Link
          href="/stops"
          className="mt-4 inline-block rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover"
        >
          Volver a paradas
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!stop) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-bg-card p-12 text-center">
        <h3 className="text-base font-semibold text-text">Parada no encontrada</h3>
        <Link
          href="/stops"
          className="mt-4 inline-block rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover"
        >
          Volver a paradas
        </Link>
      </div>
    );
  }

  const addLine = () => {
    const clean = newLine.trim().toUpperCase();
    if (!clean) return;
    if (lines.includes(clean)) {
      toast(`La línea ${clean} ya está`, "info");
      return;
    }
    setLines([...lines, clean].sort(naturalSort));
    setNewLine("");
  };

  const removeLine = (line: string) => {
    setLines(lines.filter((l) => l !== line));
  };

  const hasOverride = override !== null;
  const linesChanged = !arraysEqual(lines.slice().sort(), defaultLines.slice().sort());

  const handleSave = async () => {
    if (!user?.email) return;
    setSaving(true);
    try {
      const tempLocation =
        tempLat && tempLng
          ? { lat: parseFloat(tempLat), lng: parseFloat(tempLng) }
          : null;

      await saveStopOverride(
        id,
        {
          lines: linesChanged ? lines : null,
          suspended,
          tempLocation,
          note: note.trim() || null,
        },
        user.email
      );
      toast("Cambios guardados", "success");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Error al guardar", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!confirm("¿Eliminar todos los overrides y volver al default?")) return;
    setSaving(true);
    try {
      await clearStopOverride(id);
      toast("Overrides eliminados", "info");
      router.push("/stops");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Error al eliminar", "error");
    } finally {
      setSaving(false);
    }
  };

  const displayName =
    stop.street1 && stop.street2
      ? `${stop.street1} y ${stop.street2}`
      : stop.street1 || stop.street2 || `Parada ${stop.id}`;

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/stops"
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.75 19.5 8.25 12l7.5-7.5"
            />
          </svg>
          Volver a paradas
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-xs text-text-muted">#{stop.id}</span>
              {hasOverride && (
                <span className="rounded-full bg-warning/10 px-2 py-0.5 text-xs font-medium text-warning">
                  Modificada
                </span>
              )}
              {suspended && (
                <span className="rounded-full bg-danger/10 px-2 py-0.5 text-xs font-medium text-danger">
                  Suspendida
                </span>
              )}
            </div>
            <h1 className="text-2xl font-bold text-text">{displayName}</h1>
            <p className="mt-1 text-sm text-text-secondary font-mono">
              {stop.location?.coordinates
                ? `${stop.location.coordinates[1].toFixed(5)}, ${stop.location.coordinates[0].toFixed(5)}`
                : "Sin coordenadas"}
            </p>
          </div>
        </div>
      </div>

      {/* Secciones de edición */}
      <div className="space-y-6">
        {/* Líneas */}
        <section className="rounded-2xl border border-border bg-bg-card p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-text">Líneas que pasan</h2>
              <p className="text-xs text-text-secondary">
                {linesChanged
                  ? `Modificado: ${lines.length} línea${lines.length !== 1 ? "s" : ""} (default: ${defaultLines.length})`
                  : `${lines.length} línea${lines.length !== 1 ? "s" : ""} (default)`}
              </p>
            </div>
            {linesChanged && (
              <button
                onClick={() => setLines(defaultLines)}
                className="text-xs font-medium text-text-muted hover:text-text"
              >
                Restaurar default
              </button>
            )}
          </div>

          <div className="mb-4 flex flex-wrap gap-2">
            {lines.length === 0 ? (
              <p className="text-sm text-text-muted">Sin líneas</p>
            ) : (
              lines.map((line) => (
                <div
                  key={line}
                  className="group flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary"
                >
                  <span>{line}</span>
                  <button
                    onClick={() => removeLine(line)}
                    className="ml-0.5 rounded hover:bg-primary/20"
                    title="Quitar"
                  >
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M6 18 18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              ))
            )}
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={newLine}
              onChange={(e) => setNewLine(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addLine();
                }
              }}
              placeholder="Ej: 124, D10, L1..."
              className="flex-1 rounded-xl border border-border bg-bg-input px-4 py-2 text-sm text-text placeholder:text-text-muted focus:border-border-focus focus:ring-1 focus:ring-border-focus"
            />
            <button
              onClick={addLine}
              disabled={!newLine.trim()}
              className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-50"
            >
              Agregar
            </button>
          </div>
        </section>

        {/* Estado */}
        <section className="rounded-2xl border border-border bg-bg-card p-6 shadow-sm">
          <h2 className="mb-4 text-base font-semibold text-text">Estado de la parada</h2>
          <div className="flex items-start gap-3">
            <button
              onClick={() => setSuspended(!suspended)}
              className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors ${
                suspended ? "bg-danger" : "bg-border"
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                  suspended ? "translate-x-5" : ""
                }`}
              />
            </button>
            <div className="flex-1">
              <p className="text-sm font-medium text-text">
                {suspended ? "Parada suspendida" : "Parada operativa"}
              </p>
              <p className="mt-0.5 text-xs text-text-secondary">
                {suspended
                  ? "Se muestra como fuera de servicio en la app. Los buses no paran acá."
                  : "Funcionamiento normal."}
              </p>
            </div>
          </div>
        </section>

        {/* Reubicación temporal */}
        <section className="rounded-2xl border border-border bg-bg-card p-6 shadow-sm">
          <h2 className="mb-1 text-base font-semibold text-text">
            Reubicación temporal
          </h2>
          <p className="mb-4 text-xs text-text-secondary">
            Si la parada está desplazada por obras u otro motivo, poné las
            coordenadas nuevas. Las apps van a mostrar esta ubicación en vez de la
            original.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-text-secondary">
                Latitud
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={tempLat}
                onChange={(e) => setTempLat(e.target.value)}
                placeholder={stop.location?.coordinates[1].toFixed(5) ?? ""}
                className="w-full rounded-xl border border-border bg-bg-input px-4 py-2 text-sm font-mono text-text placeholder:text-text-muted focus:border-border-focus focus:ring-1 focus:ring-border-focus"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-text-secondary">
                Longitud
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={tempLng}
                onChange={(e) => setTempLng(e.target.value)}
                placeholder={stop.location?.coordinates[0].toFixed(5) ?? ""}
                className="w-full rounded-xl border border-border bg-bg-input px-4 py-2 text-sm font-mono text-text placeholder:text-text-muted focus:border-border-focus focus:ring-1 focus:ring-border-focus"
              />
            </div>
          </div>
          {(tempLat || tempLng) && (
            <button
              onClick={() => {
                setTempLat("");
                setTempLng("");
              }}
              className="mt-2 text-xs font-medium text-text-muted hover:text-text"
            >
              Limpiar reubicación
            </button>
          )}
        </section>

        {/* Nota */}
        <section className="rounded-2xl border border-border bg-bg-card p-6 shadow-sm">
          <h2 className="mb-1 text-base font-semibold text-text">Nota interna</h2>
          <p className="mb-3 text-xs text-text-secondary">
            Visible solo para el equipo. Útil para contextualizar los cambios.
          </p>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder="En reparación hasta el 15/04 — obra de saneamiento"
            className="w-full rounded-xl border border-border bg-bg-input px-4 py-2 text-sm text-text placeholder:text-text-muted focus:border-border-focus focus:ring-1 focus:ring-border-focus resize-none"
          />
        </section>

        {/* Metadata */}
        {override && (
          <div className="rounded-xl border border-border bg-bg px-4 py-3 text-xs text-text-muted">
            Última modificación:{" "}
            {override.updatedAt?.toDate?.()?.toLocaleString("es-UY") ?? "—"}
            {override.updatedBy && ` por ${override.updatedBy}`}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-primary-hover disabled:opacity-50"
          >
            {saving ? "Guardando..." : "Guardar cambios"}
          </button>
          {hasOverride && (
            <button
              onClick={handleReset}
              disabled={saving}
              className="rounded-xl border border-danger/30 px-4 py-3 text-sm font-semibold text-danger hover:bg-danger/5 disabled:opacity-50"
            >
              Eliminar overrides
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function StopDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      }
    >
      <StopDetailContent />
    </Suspense>
  );
}

function arraysEqual(a: string[], b: string[]) {
  if (a.length !== b.length) return false;
  return a.every((v, i) => v === b[i]);
}

function naturalSort(a: string, b: string) {
  const aNum = parseInt(a);
  const bNum = parseInt(b);
  if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum;
  return a.localeCompare(b);
}
