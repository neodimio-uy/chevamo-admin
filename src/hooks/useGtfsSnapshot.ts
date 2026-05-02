"use client";

import { useEffect, useState } from "react";
import {
  getGtfsSnapshot,
  type GtfsSnapshot,
  type GtfsRoute,
  type GtfsStop,
  type GtfsShape,
  type GtfsTrip,
} from "@/lib/api";

/**
 * Cache en memoria de snapshots GTFS estáticos por feedId. Una sola descarga
 * por sesión, compartida entre páginas que lo necesitan (`/buses`, `/lines`,
 * `/stops`, `/map`). Para CABA colectivos (~8MB JSON) y CABA subte (~30KB)
 * cabe perfectamente en memoria.
 */
const cache = new Map<string, GtfsSnapshot>();
const inflight = new Map<string, Promise<GtfsSnapshot>>();

export interface IndexedGtfs {
  snapshot: GtfsSnapshot;
  stopsById: Map<string, GtfsStop>;
  routesById: Map<string, GtfsRoute>;
  tripsById: Map<string, GtfsTrip>;
  shapesById: Map<string, GtfsShape>;
  /** route_id → [stop_id...] (con propagación a parent_station para subte) */
  stopsByRoute: Map<string, Set<string>>;
  /** stop_id → [route_id...] (inverso de stopsByRoute) */
  routesByStop: Map<string, Set<string>>;
  /** route_id → [BAShape...] (vía trips.shape_id) */
  shapesByRoute: Map<string, GtfsShape[]>;
}

function indexSnapshot(snap: GtfsSnapshot): IndexedGtfs {
  const stopsById = new Map<string, GtfsStop>();
  const routesById = new Map<string, GtfsRoute>();
  const tripsById = new Map<string, GtfsTrip>();
  const shapesById = new Map<string, GtfsShape>();
  const stopsByRoute = new Map<string, Set<string>>();
  const routesByStop = new Map<string, Set<string>>();
  const shapesByRoute = new Map<string, GtfsShape[]>();

  for (const s of snap.stops) stopsById.set(s.stop_id, s);
  for (const r of snap.routes) routesById.set(r.route_id, r);
  for (const t of snap.trips) tripsById.set(t.trip_id, t);
  for (const sh of snap.shapes) shapesById.set(String(sh.shape_id), sh);

  // route ↔ shape via trips
  const seenShapeIdsPerRoute = new Map<string, Set<string>>();
  for (const trip of snap.trips) {
    if (!trip.shape_id) continue;
    const sh = shapesById.get(String(trip.shape_id));
    if (!sh) continue;
    let seen = seenShapeIdsPerRoute.get(trip.route_id);
    if (!seen) {
      seen = new Set();
      seenShapeIdsPerRoute.set(trip.route_id, seen);
    }
    if (!seen.has(String(trip.shape_id))) {
      seen.add(String(trip.shape_id));
      let arr = shapesByRoute.get(trip.route_id);
      if (!arr) {
        arr = [];
        shapesByRoute.set(trip.route_id, arr);
      }
      arr.push(sh);
    }
  }

  // route ↔ stop con propagación a parent_station (subte tiene andenes
  // location_type=0 con parent_station=ID y la estación agrupadora con
  // location_type=1 sin parent — el feed RT trae arrivals con stop_id de
  // andén pero el user típicamente busca por estación agrupadora).
  if (snap.stopsByRoute) {
    for (const [routeId, stopIds] of Object.entries(snap.stopsByRoute)) {
      const setForRoute = new Set<string>(stopIds);
      for (const sid of stopIds) {
        let routes = routesByStop.get(sid);
        if (!routes) {
          routes = new Set();
          routesByStop.set(sid, routes);
        }
        routes.add(routeId);
        const parent = stopsById.get(sid)?.parent_station;
        if (parent) {
          let pRoutes = routesByStop.get(parent);
          if (!pRoutes) {
            pRoutes = new Set();
            routesByStop.set(parent, pRoutes);
          }
          pRoutes.add(routeId);
          setForRoute.add(parent);
        }
      }
      stopsByRoute.set(routeId, setForRoute);
    }
  }

  return {
    snapshot: snap,
    stopsById,
    routesById,
    tripsById,
    shapesById,
    stopsByRoute,
    routesByStop,
    shapesByRoute,
  };
}

const indexCache = new Map<string, IndexedGtfs>();

/**
 * Hook que carga el snapshot GTFS de un feedId y devuelve la versión indexada.
 * Auto-cachea — segunda llamada a `useGtfsSnapshot('gcba-colectivos-static')`
 * en otra página devuelve la misma instancia inmediatamente.
 *
 * Pasar `null` como feedId lo deja en idle (útil cuando la ciudad no tiene
 * snapshot — Mvd urbano usa el feed IMM legacy, no GTFS estático).
 */
export function useGtfsSnapshot(feedId: string | null): {
  data: IndexedGtfs | null;
  loading: boolean;
  error: string | null;
} {
  const [data, setData] = useState<IndexedGtfs | null>(() =>
    feedId ? indexCache.get(feedId) ?? null : null
  );
  const [loading, setLoading] = useState(!data && !!feedId);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!feedId) {
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }

    const cached = indexCache.get(feedId);
    if (cached) {
      setData(cached);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    const promise = inflight.get(feedId) ??
      (async () => {
        const snap = await getGtfsSnapshot(feedId);
        cache.set(feedId, snap);
        return snap;
      })();
    inflight.set(feedId, promise);

    promise
      .then((snap) => {
        if (cancelled) return;
        const indexed = indexCache.get(feedId) ?? indexSnapshot(snap);
        indexCache.set(feedId, indexed);
        setData(indexed);
        setLoading(false);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Error desconocido");
        setLoading(false);
      })
      .finally(() => {
        inflight.delete(feedId);
      });

    return () => {
      cancelled = true;
    };
  }, [feedId]);

  return { data, loading, error };
}
