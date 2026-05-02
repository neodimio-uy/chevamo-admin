"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

/**
 * Multi-city context del admin Vamo.
 *
 * Gestiona la ciudad y el modo activos en todo el dashboard. Persiste a
 * localStorage para que el operador retome donde dejó. Páginas city-aware
 * (`/home`, `/map`, `/buses`, `/lines`, `/stops`, `/schedules`, etc.) leen
 * `useCity()` y reaccionan al cambio cargando los datos de la ciudad/modo.
 *
 * Páginas infra-only (`/alerts`, `/users`, `/support`, `/flags`, etc.) no
 * dependen del context — son globales del proyecto.
 */

export type CityId = "uy.mvd-area-metro" | "ar.amba";
export type ModeId = "bus" | "subte";

export interface ModeConfig {
  id: ModeId;
  label: string;          // texto para UI en la región (es-UY: "Buses", es-AR: "Colectivos")
  shortLabel: string;     // versión compacta para chips (ej "Bus", "Subte")
}

export interface CityBBox {
  swLat: number;
  swLng: number;
  neLat: number;
  neLng: number;
}

export interface CityConfig {
  id: CityId;
  shortName: string;      // "Mvd", "CABA"
  longName: string;       // "Montevideo", "Buenos Aires Ciudad"
  country: "uy" | "ar";
  zone: string;           // "mvd-area-metro" o "amba" (parámetro `zone` del backend)
  defaultCenter: [number, number]; // [lat, lng]
  defaultZoom: number;
  bbox: CityBBox;
  modes: ModeConfig[];
  /// True si la ciudad usa el feed legacy IMM `/buses` (Mvd urbano). Para
  /// el resto se usa `/vehicles?country=...&zone=...&mode=...`.
  legacyMvdEndpoint: boolean;
}

export const CITIES: CityConfig[] = [
  {
    id: "uy.mvd-area-metro",
    shortName: "Mvd",
    longName: "Montevideo",
    country: "uy",
    zone: "mvd-area-metro",
    defaultCenter: [-34.9058, -56.1913],
    defaultZoom: 12,
    bbox: { swLat: -34.95, swLng: -56.30, neLat: -34.78, neLng: -56.05 },
    modes: [{ id: "bus", label: "Buses", shortLabel: "Bus" }],
    legacyMvdEndpoint: true,
  },
  {
    id: "ar.amba",
    shortName: "CABA",
    longName: "Buenos Aires Ciudad",
    country: "ar",
    zone: "amba",
    defaultCenter: [-34.6037, -58.3816],
    defaultZoom: 12,
    bbox: { swLat: -34.72, swLng: -58.55, neLat: -34.50, neLng: -58.30 },
    modes: [
      { id: "bus", label: "Colectivos", shortLabel: "Bus" },
      { id: "subte", label: "Subte", shortLabel: "Subte" },
    ],
    legacyMvdEndpoint: false,
  },
];

const DEFAULT_CITY = CITIES[0];
const DEFAULT_MODE = CITIES[0].modes[0];

const LS_CITY_KEY = "vamo.admin.cityId";
const LS_MODE_KEY = "vamo.admin.modeId";

interface CityContextValue {
  city: CityConfig;
  mode: ModeConfig;
  setCity: (id: CityId) => void;
  setMode: (id: ModeId) => void;
  allCities: CityConfig[];
}

const CityContext = createContext<CityContextValue | null>(null);

export function CityProvider({ children }: { children: ReactNode }) {
  const [cityId, setCityId] = useState<CityId>(DEFAULT_CITY.id);
  const [modeId, setModeId] = useState<ModeId>(DEFAULT_MODE.id);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate desde localStorage en el primer render del cliente. Antes de eso
  // los componentes ven los defaults (Mvd / Bus) — coincide con el server-side
  // render para no romper Next.js hydration.
  useEffect(() => {
    try {
      const lsCity = localStorage.getItem(LS_CITY_KEY) as CityId | null;
      const lsMode = localStorage.getItem(LS_MODE_KEY) as ModeId | null;
      if (lsCity && CITIES.some((c) => c.id === lsCity)) {
        setCityId(lsCity);
      }
      if (lsMode) {
        setModeId(lsMode);
      }
    } catch {
      // localStorage puede estar bloqueado en incognito / Safari restrictivo
    }
    setHydrated(true);
  }, []);

  const city = useMemo(
    () => CITIES.find((c) => c.id === cityId) ?? DEFAULT_CITY,
    [cityId]
  );

  const mode = useMemo(
    () => city.modes.find((m) => m.id === modeId) ?? city.modes[0],
    [city, modeId]
  );

  // Persist + auto-corregir mode si la ciudad nueva no lo soporta.
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(LS_CITY_KEY, city.id);
    } catch { /* noop */ }
    if (!city.modes.some((m) => m.id === modeId)) {
      setModeId(city.modes[0].id);
    }
  }, [city, modeId, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(LS_MODE_KEY, mode.id);
    } catch { /* noop */ }
  }, [mode, hydrated]);

  const setCity = useCallback((id: CityId) => setCityId(id), []);
  const setMode = useCallback((id: ModeId) => setModeId(id), []);

  const value: CityContextValue = {
    city,
    mode,
    setCity,
    setMode,
    allCities: CITIES,
  };

  return <CityContext.Provider value={value}>{children}</CityContext.Provider>;
}

export function useCity(): CityContextValue {
  const ctx = useContext(CityContext);
  if (!ctx) {
    throw new Error("useCity debe usarse dentro de <CityProvider>");
  }
  return ctx;
}
