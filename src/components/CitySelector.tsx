"use client";

import { useCity, type CityConfig, type ModeConfig } from "@/lib/cityContext";
import { useEffect, useRef, useState } from "react";

/**
 * Pill compacto con la ciudad+modo activos en el StatusBar. Click → menú
 * dropdown con todas las opciones (Mvd · Buses, CABA · Colectivos, CABA · Subte).
 *
 * Páginas city-aware leen `useCity()` y reaccionan al cambio.
 */
export default function CitySelector() {
  const { city, mode, setCity, setMode, allCities } = useCity();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Click fuera cierra el menú.
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-md border border-border bg-bg-subtle/50 px-2.5 py-1 text-[11px] font-semibold text-text hover:border-border-strong hover:bg-bg-subtle transition-all"
        title="Cambiar ciudad / modo"
      >
        <span className="tag-dense" style={{ color: cityAccent(city) }}>
          {city.shortName}
        </span>
        <span className="text-text-muted">·</span>
        <span className="tracking-tight">{mode.label}</span>
        <svg
          width="10"
          height="10"
          viewBox="0 0 16 16"
          className={`text-text-muted transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path
            d="M4 6l4 4 4-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 min-w-[220px] rounded-lg border border-border bg-bg-card shadow-lg overflow-hidden">
          {allCities.map((c) => (
            <CityRow
              key={c.id}
              city={c}
              activeCityId={city.id}
              activeModeId={mode.id}
              onSelect={(cId, mId) => {
                setCity(cId);
                setMode(mId);
                setOpen(false);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CityRow({
  city,
  activeCityId,
  activeModeId,
  onSelect,
}: {
  city: CityConfig;
  activeCityId: string;
  activeModeId: string;
  onSelect: (cityId: typeof city.id, modeId: ModeConfig["id"]) => void;
}) {
  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between px-3 pt-2.5 pb-1">
        <span className="text-[10px] font-bold tracking-wider uppercase text-text-muted">
          {city.shortName}
        </span>
        <span className="text-[10px] text-text-muted">{city.longName}</span>
      </div>
      {city.modes.map((m) => {
        const active = city.id === activeCityId && m.id === activeModeId;
        return (
          <button
            key={`${city.id}-${m.id}`}
            onClick={() => onSelect(city.id, m.id)}
            className={`flex items-center justify-between px-3 py-2 text-[12px] transition-colors ${
              active
                ? "bg-bg-subtle text-text font-semibold"
                : "text-text-secondary hover:bg-bg-subtle/60"
            }`}
          >
            <span>{m.label}</span>
            {active && (
              <svg width="12" height="12" viewBox="0 0 16 16">
                <path
                  d="M3 8l3.5 3.5L13 5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </button>
        );
      })}
    </div>
  );
}

/// Color por ciudad para el tag — diferenciador visual sutil.
function cityAccent(city: CityConfig): string {
  switch (city.id) {
    case "uy.mvd-area-metro": return "var(--color-success)";
    case "ar.amba":           return "var(--color-warning)";
  }
}
