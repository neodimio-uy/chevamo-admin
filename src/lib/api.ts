import type { BusStop, LineVariant, Bus } from "./types";
import type { CityConfig, ModeId } from "./cityContext";

const API_BASE = "https://api.chevamo.com.uy";

/**
 * El backend usa el Sanitizer Box: envuelve toda respuesta en
 * `{ ok, data, meta, error }`. Este helper extrae `.data` y maneja el caso
 * de error de forma uniforme.
 */
interface BackendEnvelope<T> {
  ok: boolean;
  data?: T;
  meta?: {
    source?: string;
    stale?: boolean;
    count?: number;
  };
  error?: { code: string; message?: string };
}

async function fetchBackend<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, init);
  if (!res.ok) {
    throw new Error(`API error ${res.status}: ${path}`);
  }
  const body = (await res.json()) as BackendEnvelope<T>;
  if (!body.ok || body.data === undefined) {
    throw new Error(
      body.error?.message || body.error?.code || `API returned ok=false: ${path}`
    );
  }
  return body.data;
}

export async function getBuses(): Promise<Bus[]> {
  return fetchBackend("/buses");
}

export async function getBusStops(): Promise<BusStop[]> {
  return fetchBackend("/busstops");
}

export async function getLineVariants(): Promise<LineVariant[]> {
  return fetchBackend("/buses/linevariants");
}

export async function getUpcoming(
  stopId: number,
  amount = 5
): Promise<unknown[]> {
  return fetchBackend(`/busstops/${stopId}/upcoming?amount=${amount}`);
}

export async function getSchedules(
  stopId: number
): Promise<Record<string, string[]>> {
  return fetchBackend(`/busstops/${stopId}/schedules`);
}

export async function getLinesAtStop(stopId: number): Promise<string[]> {
  return fetchBackend(`/busstops/${stopId}/lines`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Multi-city — endpoints genéricos para CABA y futuras ciudades
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Vehicle canónico (TransitVehicle del backend Vamo). Compartido entre
 * colectivos y otros modos motorizados con GPS. Subte CABA NO usa este
 * endpoint — los trenes no publican posiciones (ver `getSubteForecast`).
 */
export interface TransitVehicle {
  id: string;
  feedSource: string;
  cityId: string;
  mode: string;
  position: {
    lat: number;
    lng: number;
    bearing?: number | null;
    speed?: number | null;
  };
  trip?: {
    routeId: string;
    routeShortName?: string | null;
    tripId?: string | null;
    headsign?: string | null;
    direction?: number | null;
  } | null;
  agency?: { id?: string | null; name?: string | null } | null;
  displayLabel?: string;
  timestamp?: number | null;
}

/**
 * Devuelve los vehículos vivos de una ciudad+modo. Para Mvd urbano se debe
 * preferir `getBuses()` (feed legacy IMM con datos enriquecidos: company,
 * destination, etc). Para CABA y otras, este endpoint genérico.
 */
export async function getVehicles(
  city: CityConfig,
  mode: ModeId
): Promise<TransitVehicle[]> {
  const qs = new URLSearchParams({
    country: city.country,
    zone: city.zone,
    mode,
  });
  return fetchBackend(`/vehicles?${qs.toString()}`);
}

/**
 * Próximos arribos del subte CABA. El feed RT del subte CABA (gcba-subte-forecast)
 * devuelve arribos por estación pre-computados — NO posiciones GPS de trenes.
 */
export interface SubteStopTimeUpdate {
  stopId: string;
  stopName: string;
  arrivalTime: number | null;        // Unix epoch s
  arrivalDelaySeconds: number | null;
  departureTime: number | null;
  departureDelaySeconds: number | null;
}
export interface SubteTripUpdate {
  id: string;
  routeId: string;
  routeShortName: string;
  tripId: string;
  directionId: number | null;
  startTime: string | null;
  startDate: string | null;
  stopTimeUpdates: SubteStopTimeUpdate[];
  feedTimestamp: number;
}
export interface SubteForecast {
  tripUpdates: SubteTripUpdate[];
  jurisdictionId: string;
  feedTimestamp: number;
}

export async function getSubteForecast(): Promise<SubteForecast> {
  return fetchBackend("/subte-forecast?jurisdictionId=ar.caba");
}

// ─────────────────────────────────────────────────────────────────────────────
// GTFS snapshots públicos en GCS — descarga directa, sin auth.
// ─────────────────────────────────────────────────────────────────────────────

const GCS_SNAPSHOTS_BASE =
  "https://storage.googleapis.com/vamo-dbad6.firebasestorage.app/gtfs-snapshots";

export interface GtfsStop {
  stop_id: string;
  stop_code: string | null;
  stop_name: string;
  stop_lat: number;
  stop_lon: number;
  location_type: number | null;
  parent_station: string | null;
  wheelchair_boarding: number | null;
}
export interface GtfsRoute {
  route_id: string;
  agency_id: string | null;
  route_short_name: string;
  route_long_name: string;
  route_type: number;
  route_color: string | null;
  route_text_color: string | null;
}
export interface GtfsTrip {
  route_id: string;
  service_id: string;
  trip_id: string;
  trip_headsign: string | null;
  direction_id: number | null;
  shape_id: string | null;
  block_id: string | null;
}
export interface GtfsShape {
  shape_id: string | number;
  points: number[][]; // [[lat, lng], ...]
}
export interface GtfsAgency {
  agency_id: string | null;
  agency_name: string;
  agency_url: string | null;
  agency_timezone: string | null;
}
export interface GtfsSnapshot {
  feedId: string;
  counts: {
    stops: number;
    routes: number;
    trips: number;
    shapes: number;
  };
  stops: GtfsStop[];
  routes: GtfsRoute[];
  trips: GtfsTrip[];
  shapes: GtfsShape[];
  agency: GtfsAgency[];
  /** route_id → [stop_id...] (pre-computado por el pipeline backend). */
  stopsByRoute?: Record<string, string[]>;
}

/**
 * Descarga el snapshot GTFS estático para un feedId dado. El servidor GCS
 * devuelve el .json.gz pero en browsers modernos `fetch` con `Accept-Encoding`
 * default lo des-comprime automáticamente — accedemos al JSON parseado directo.
 */
export async function getGtfsSnapshot(feedId: string): Promise<GtfsSnapshot> {
  const url = `${GCS_SNAPSHOTS_BASE}/${feedId}/latest/snapshot.json.gz`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`GTFS snapshot ${feedId} HTTP ${res.status}`);
  }
  return (await res.json()) as GtfsSnapshot;
}
