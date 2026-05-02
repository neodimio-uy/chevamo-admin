"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { getBusStops, getLineVariants, getBuses } from "@/lib/api";
import type { BusStop, LineVariant, Bus } from "@/lib/types";
import { COMPANY_COLORS } from "@/lib/types";

function LineDetailContent() {
  const params = useSearchParams();
  const line = params.get("line");

  const [variants, setVariants] = useState<LineVariant[]>([]);
  const [buses, setBuses] = useState<Bus[]>([]);
  const [stops, setStops] = useState<BusStop[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getLineVariants(), getBuses(), getBusStops()])
      .then(([v, b, s]) => {
        setVariants(v);
        setBuses(b);
        setStops(s);
      })
      .finally(() => setLoading(false));
  }, []);

  const lineVariants = useMemo(
    () => variants.filter((v) => v.line === line),
    [variants, line]
  );
  const lineBuses = useMemo(
    () => buses.filter((b) => b.line === line),
    [buses, line]
  );

  if (!line) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-bg-card p-12 text-center">
        <h3 className="text-base font-semibold text-text">Línea no especificada</h3>
        <Link
          href="/lines"
          className="mt-4 inline-block rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover"
        >
          Volver a líneas
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

  if (lineVariants.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-bg-card p-12 text-center">
        <h3 className="text-base font-semibold text-text">
          Línea {line} no encontrada
        </h3>
        <Link
          href="/lines"
          className="mt-4 inline-block rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover"
        >
          Volver a líneas
        </Link>
      </div>
    );
  }

  // Company: tomar la más común entre buses activos o la primera variante
  const company = lineBuses[0]?.company || "CUTCSA";
  const companyColor = COMPANY_COLORS[company] || "#6366f1";

  // Destinos únicos
  const destinations = [
    ...new Set(
      lineVariants
        .map((v) => v.destination || v.subline)
        .filter((d): d is string => Boolean(d))
    ),
  ];

  // Stats de los buses
  const electricCount = lineBuses.filter(
    (b) => b.emissions === "Cero emisiones"
  ).length;
  const acCount = lineBuses.filter(
    (b) => b.thermalConfort === "Aire Acondicionado"
  ).length;
  const lowFloorCount = lineBuses.filter((b) => b.access === "PISO BAJO").length;

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/lines"
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
          Volver a líneas
        </Link>
        <div className="flex items-start gap-4">
          <div
            className="flex h-16 w-24 shrink-0 items-center justify-center rounded-2xl text-2xl font-bold text-white shadow-md"
            style={{ backgroundColor: companyColor }}
          >
            {line}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-text">{destinations.join(" / ") || `Línea ${line}`}</h1>
            <p className="mt-1 text-sm text-text-secondary">
              {company} · {lineVariants.length} variante{lineVariants.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
      </div>

      {/* Stats en vivo */}
      <div className="mb-6 grid gap-4 sm:grid-cols-4">
        <div className="rounded-2xl border border-border bg-bg-card p-4 shadow-sm">
          <p className="text-xs font-medium text-text-secondary uppercase tracking-wider">
            En vivo
          </p>
          <p className="mt-1 text-2xl font-bold text-text">{lineBuses.length}</p>
          <p className="mt-0.5 text-xs text-text-muted">buses activos</p>
        </div>
        <div className="rounded-2xl border border-border bg-bg-card p-4 shadow-sm">
          <p className="text-xs font-medium text-text-secondary uppercase tracking-wider">
            Eléctricos
          </p>
          <p className="mt-1 text-2xl font-bold text-success">{electricCount}</p>
          <p className="mt-0.5 text-xs text-text-muted">cero emisiones</p>
        </div>
        <div className="rounded-2xl border border-border bg-bg-card p-4 shadow-sm">
          <p className="text-xs font-medium text-text-secondary uppercase tracking-wider">
            Con AC
          </p>
          <p className="mt-1 text-2xl font-bold text-info">{acCount}</p>
          <p className="mt-0.5 text-xs text-text-muted">aire acondicionado</p>
        </div>
        <div className="rounded-2xl border border-border bg-bg-card p-4 shadow-sm">
          <p className="text-xs font-medium text-text-secondary uppercase tracking-wider">
            Piso bajo
          </p>
          <p className="mt-1 text-2xl font-bold text-text">{lowFloorCount}</p>
          <p className="mt-0.5 text-xs text-text-muted">accesibles</p>
        </div>
      </div>

      {/* Variantes */}
      <section className="mb-6 rounded-2xl border border-border bg-bg-card p-6 shadow-sm">
        <h2 className="mb-4 text-base font-semibold text-text">Variantes</h2>
        <div className="space-y-2">
          {lineVariants.map((v) => (
            <div
              key={v.id}
              className="flex items-center justify-between rounded-xl border border-border px-4 py-3"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text">
                  {v.origin && v.destination
                    ? `${v.origin} → ${v.destination}`
                    : v.destination || v.subline || `Variante ${v.id}`}
                </p>
                <p className="text-xs text-text-muted">
                  ID {v.id}
                  {v.subline && ` · ${v.subline}`}
                </p>
              </div>
              {v.special && (
                <span className="rounded-full bg-warning/10 px-2 py-0.5 text-xs font-medium text-warning">
                  Especial
                </span>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Buses activos */}
      {lineBuses.length > 0 && (
        <section className="rounded-2xl border border-border bg-bg-card p-6 shadow-sm">
          <h2 className="mb-4 text-base font-semibold text-text">
            Buses activos ahora
          </h2>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {lineBuses.slice(0, 30).map((bus) => (
              <div
                key={bus.id}
                className="rounded-xl border border-border px-3 py-2 text-xs"
              >
                <p className="font-mono font-semibold text-text">{bus.id}</p>
                <p className="text-text-muted">
                  {bus.destination || "Sin destino"}
                  {bus.speed !== null && bus.speed !== undefined && (
                    <span> · {(bus.speed * 3.6).toFixed(0)} km/h</span>
                  )}
                </p>
              </div>
            ))}
          </div>
          {lineBuses.length > 30 && (
            <p className="mt-3 text-xs text-text-muted">
              Mostrando 30 de {lineBuses.length}. Ver todos en el mapa.
            </p>
          )}
        </section>
      )}
    </div>
  );
}

export default function LineDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      }
    >
      <LineDetailContent />
    </Suspense>
  );
}
