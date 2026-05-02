"use client";

import { useEffect, useState } from "react";
import { getBuses } from "@/lib/api";
import type { Bus } from "@/lib/types";

export function useBuses(pollMs: number = 30000, enabled: boolean = true) {
  const [buses, setBuses] = useState<Bus[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      setBuses([]);
      setLoading(false);
      return;
    }
    let cancelled = false;

    async function fetchBuses() {
      try {
        const data = await getBuses();
        if (cancelled) return;
        setBuses(data);
        setLastUpdate(new Date());
        setError(null);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Error fetching buses");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchBuses();
    const interval = setInterval(fetchBuses, pollMs);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [pollMs, enabled]);

  return { buses, loading, lastUpdate, error };
}
