"use client";

import { useEffect, useState } from "react";
import { getVehicles, type TransitVehicle } from "@/lib/api";
import { useCity } from "@/lib/cityContext";

/**
 * Hook que pollea vehículos vivos según ciudad+modo activos en `useCity`.
 * Devuelve `[]` si la ciudad activa es Mvd urbano (ese path usa el feed
 * legacy `/buses` vía `useBuses` — el caller debe leer ambos hooks y elegir
 * según `city.legacyMvdEndpoint`).
 *
 * Cuando el modo es `subte`, retorna `[]` también — el subte CABA no expone
 * posiciones GPS de trenes (ver `useSubteForecast` para arribos por estación).
 */
export function useVehicles(pollMs = 15000) {
  const { city, mode } = useCity();
  const [vehicles, setVehicles] = useState<TransitVehicle[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFetch, setLastFetch] = useState<Date | null>(null);

  useEffect(() => {
    // Mvd urbano usa el feed legacy IMM, no este endpoint.
    if (city.legacyMvdEndpoint) {
      setVehicles([]);
      setLoading(false);
      setError(null);
      return;
    }
    // Subte: feed RT no entrega GPS — el dashboard muestra estaciones, no trenes.
    if (mode.id === "subte") {
      setVehicles([]);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const fetchOnce = async () => {
      try {
        setLoading(true);
        const data = await getVehicles(city, mode.id);
        if (cancelled) return;
        setVehicles(data);
        setLastFetch(new Date());
        setError(null);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Error desconocido");
      } finally {
        if (!cancelled) setLoading(false);
      }
      if (!cancelled) timer = setTimeout(fetchOnce, pollMs);
    };
    fetchOnce();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [city, mode, pollMs]);

  return { vehicles, loading, error, lastFetch };
}
