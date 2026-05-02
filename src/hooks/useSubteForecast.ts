"use client";

import { useEffect, useState } from "react";
import { getSubteForecast, type SubteForecast } from "@/lib/api";

/**
 * Hook que pollea el forecast del subte CABA. Devuelve la respuesta completa
 * + helpers para resolver arribos por estación.
 *
 * Se activa solo si `enabled=true` (típicamente cuando city=CABA y mode=subte).
 */
export function useSubteForecast(enabled: boolean, pollMs = 15000) {
  const [data, setData] = useState<SubteForecast | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const fetchOnce = async () => {
      try {
        setLoading(true);
        const d = await getSubteForecast();
        if (cancelled) return;
        setData(d);
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
  }, [enabled, pollMs]);

  return { data, loading, error };
}
