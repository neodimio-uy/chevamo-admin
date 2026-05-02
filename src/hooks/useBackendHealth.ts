"use client";

import { useEffect, useState } from "react";

const API_BASE = "https://api.chevamo.com.uy";

export type HealthStatus = "ok" | "degraded" | "down" | "unknown";

interface HealthState {
  status: HealthStatus;
  latencyMs: number | null;
  lastCheck: Date | null;
  error: string | null;
}

export function useBackendHealth(intervalMs = 30000) {
  const [state, setState] = useState<HealthState>({
    status: "unknown",
    latencyMs: null,
    lastCheck: null,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;

    const ping = async () => {
      const start = performance.now();
      try {
        const res = await fetch(`${API_BASE}/health`, {
          signal: AbortSignal.timeout(5000),
        });
        const latency = Math.round(performance.now() - start);
        if (cancelled) return;
        if (!res.ok) {
          setState({
            status: "degraded",
            latencyMs: latency,
            lastCheck: new Date(),
            error: `HTTP ${res.status}`,
          });
          return;
        }
        const status: HealthStatus =
          latency > 2000 ? "degraded" : "ok";
        setState({
          status,
          latencyMs: latency,
          lastCheck: new Date(),
          error: null,
        });
      } catch (e) {
        if (cancelled) return;
        setState((prev) => ({
          ...prev,
          status: "down",
          lastCheck: new Date(),
          error: e instanceof Error ? e.message : "Connection failed",
        }));
      }
    };

    ping();
    const interval = setInterval(ping, intervalMs);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [intervalMs]);

  return state;
}
