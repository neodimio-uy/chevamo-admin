"use client";

import { useEffect, useMemo, useState } from "react";
import {
  APIProvider,
  Map,
  Marker,
  InfoWindow,
  useMap,
  useApiIsLoaded,
} from "@vis.gl/react-google-maps";
import type { Bus, BusStop } from "@/lib/types";
import { COMPANY_COLORS } from "@/lib/types";
import type { CommunityBus } from "@/hooks/useCommunityBuses";
import type { TransitVehicle, GtfsStop, GtfsShape, SubteForecast } from "@/lib/api";

const DEFAULT_CENTER: [number, number] = [-34.9011, -56.1645];
const DEFAULT_ZOOM = 12;

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

/// Zoom mínimo para pintar paradas. 13 ~ barrios; 14 ~ pocas cuadras.
const MIN_ZOOM_STOPS = 13;
/// Zoom mínimo para pintar shapes (más caros que stops).
const MIN_ZOOM_SHAPES = 12;
/// Subte CABA tiene 16 shapes — render entero sin importar zoom.
const SUBTE_ALWAYS_RENDER = true;

interface LiveMapProps {
  // Legacy Mvd (feed IMM enriquecido)
  buses?: Bus[];
  stops?: BusStop[];
  communityBuses?: CommunityBus[];

  // Multi-city (TransitVehicle + GTFS estático)
  vehicles?: TransitVehicle[];
  gtfsStops?: GtfsStop[];
  /** Para subte: solo `location_type=1` (estaciones agrupadoras). */
  onlyParentStations?: boolean;
  shapes?: GtfsShape[];
  /** Forecast del subte para mostrar arribos en popup de estación. */
  subteForecast?: SubteForecast | null;

  // Common
  showStops?: boolean;
  lineFilter?: string;
  companyFilter?: string;
  /** Centro del mapa por ciudad activa. */
  center?: [number, number];
  zoom?: number;
}

type SelectedFeature =
  | { kind: "bus"; bus: Bus }
  | { kind: "vehicle"; vehicle: TransitVehicle }
  | { kind: "community"; bus: CommunityBus }
  | { kind: "stop"; stop: BusStop }
  | { kind: "gtfs-stop"; stop: GtfsStop; arrivals: number };

interface Viewport {
  bounds: { north: number; south: number; east: number; west: number } | null;
  zoom: number;
}

interface ShapeWithBbox {
  shape: GtfsShape;
  bbox: { north: number; south: number; east: number; west: number };
}

function shapeBbox(shape: GtfsShape): ShapeWithBbox["bbox"] {
  let north = -90, south = 90, east = -180, west = 180;
  for (const p of shape.points) {
    if (p.length < 2) continue;
    const [lat, lng] = p;
    if (lat > north) north = lat;
    if (lat < south) south = lat;
    if (lng > east) east = lng;
    if (lng < west) west = lng;
  }
  return { north, south, east, west };
}

function bboxIntersects(
  a: { north: number; south: number; east: number; west: number },
  b: { north: number; south: number; east: number; west: number }
): boolean {
  if (a.east < b.west) return false;
  if (a.west > b.east) return false;
  if (a.north < b.south) return false;
  if (a.south > b.north) return false;
  return true;
}

export default function LiveMap(props: LiveMapProps) {
  if (!API_KEY) {
    return (
      <div className="flex h-full w-full items-center justify-center rounded-2xl bg-bg-subtle p-6 text-center text-sm text-text-muted">
        Falta NEXT_PUBLIC_GOOGLE_MAPS_API_KEY en el entorno.
      </div>
    );
  }
  return (
    <APIProvider apiKey={API_KEY} libraries={["geometry"]}>
      <LiveMapInner {...props} />
    </APIProvider>
  );
}

function LiveMapInner({
  buses,
  stops = [],
  communityBuses = [],
  vehicles,
  gtfsStops,
  onlyParentStations,
  shapes,
  subteForecast,
  showStops = false,
  lineFilter,
  companyFilter,
  center = DEFAULT_CENTER,
  zoom = DEFAULT_ZOOM,
}: LiveMapProps) {
  const apiLoaded = useApiIsLoaded();
  const [selected, setSelected] = useState<SelectedFeature | null>(null);
  const [viewport, setViewport] = useState<Viewport>({
    bounds: null,
    zoom: zoom,
  });

  const filteredBuses = useMemo(() => {
    const arr = Array.isArray(buses) ? buses : [];
    return arr.filter((b) => {
      if (lineFilter && b.line !== lineFilter) return false;
      if (companyFilter && b.company !== companyFilter) return false;
      return true;
    });
  }, [buses, lineFilter, companyFilter]);

  const filteredVehicles = useMemo(() => {
    const arr = Array.isArray(vehicles) ? vehicles : [];
    return arr.filter((v) => {
      const lineLabel = v.trip?.routeShortName || v.displayLabel || "";
      if (lineFilter && lineLabel !== lineFilter) return false;
      return true;
    });
  }, [vehicles, lineFilter]);

  // Pre-compute bbox de cada shape (una sola vez por dataset).
  const shapesIndexed = useMemo<ShapeWithBbox[]>(() => {
    const arr = Array.isArray(shapes) ? shapes : [];
    return arr.map((shape) => ({ shape, bbox: shapeBbox(shape) }));
  }, [shapes]);

  // Stops visibles por viewport+zoom (subte siempre muestra estaciones).
  const visibleStops = useMemo(() => {
    const arr = Array.isArray(gtfsStops) ? gtfsStops : [];
    if (arr.length === 0) return [];
    const baseFiltered = onlyParentStations
      ? arr.filter((s) => s.location_type === 1)
      : arr;
    if (onlyParentStations) return baseFiltered;
    if (!viewport.bounds) return [];
    if (viewport.zoom < MIN_ZOOM_STOPS) return [];
    const b = viewport.bounds;
    const out: GtfsStop[] = [];
    for (const s of baseFiltered) {
      if (
        s.stop_lat <= b.north &&
        s.stop_lat >= b.south &&
        s.stop_lon <= b.east &&
        s.stop_lon >= b.west
      ) {
        out.push(s);
        if (out.length >= 1500) break;
      }
    }
    return out;
  }, [gtfsStops, onlyParentStations, viewport]);

  // Shapes visibles por viewport+zoom (subte siempre).
  const visibleShapes = useMemo(() => {
    if (shapesIndexed.length === 0) return [];
    if (onlyParentStations && SUBTE_ALWAYS_RENDER) {
      return shapesIndexed.map((s) => s.shape);
    }
    if (!viewport.bounds) return [];
    if (viewport.zoom < MIN_ZOOM_SHAPES) return [];
    const b = viewport.bounds;
    const out: GtfsShape[] = [];
    for (const s of shapesIndexed) {
      if (bboxIntersects(s.bbox, b)) {
        out.push(s.shape);
        if (out.length >= 800) break;
      }
    }
    return out;
  }, [shapesIndexed, viewport, onlyParentStations]);

  return (
    <Map
      key={`${center[0]},${center[1]},${zoom}`}
      defaultCenter={{ lat: center[0], lng: center[1] }}
      defaultZoom={zoom}
      className="h-full w-full overflow-hidden rounded-2xl"
      gestureHandling="greedy"
      disableDefaultUI={false}
      zoomControl
      streetViewControl={false}
      mapTypeControl={false}
      fullscreenControl={false}
      clickableIcons={false}
      // defaultCenter/defaultZoom (uncontrolled): el user mueve libremente, el
      // mapa NO se reposiciona en cada render del padre. `key` fuerza re-mount
      // cuando cambia la ciudad (vía nuevo defaultCenter/defaultZoom).
    >
      <ViewportTracker onChange={setViewport} />

      {/* Recorridos (shapes GTFS) — filtrados por viewport+zoom */}
      {visibleShapes.map((shape) => (
        <ShapePolyline key={`shape-${shape.shape_id}`} shape={shape} />
      ))}

      {/* Markers requieren google.maps.SymbolPath / Point — solo después de api loaded */}
      {apiLoaded && (
        <>
          {/* Paradas Mvd legacy */}
          {showStops &&
            stops.slice(0, 500).map((stop) => (
              <Marker
                key={`stop-${stop.id}`}
                position={{
                  lat: stop.location.coordinates[1],
                  lng: stop.location.coordinates[0],
                }}
                icon={dotIcon("#94a3b8", 4)}
                onClick={() => setSelected({ kind: "stop", stop })}
              />
            ))}

          {/* Paradas/estaciones GTFS multi-city */}
          {showStops &&
            visibleStops.map((s) => {
              const arrivals = subteForecast
                ? countSubteArrivalsAtStop(subteForecast, s)
                : 0;
              return (
                <Marker
                  key={`gtfs-${s.stop_id}`}
                  position={{ lat: s.stop_lat, lng: s.stop_lon }}
                  icon={dotIcon("#14b8a6", s.location_type === 1 ? 6 : 4)}
                  onClick={() =>
                    setSelected({ kind: "gtfs-stop", stop: s, arrivals })
                  }
                />
              );
            })}

          {/* Vehicles multi-city */}
          {filteredVehicles.map((v) => {
            const lineLabel = v.trip?.routeShortName || v.displayLabel || "?";
            return (
              <Marker
                key={`v-${v.id}`}
                position={{ lat: v.position.lat, lng: v.position.lng }}
                icon={busIcon("#475569")}
                label={busLabel(lineLabel)}
                title={`Línea ${lineLabel}`}
                onClick={() => setSelected({ kind: "vehicle", vehicle: v })}
              />
            );
          })}

          {/* Community buses (violeta) */}
          {communityBuses.map((cb) => (
            <Marker
              key={`cb-${cb.id}`}
              position={{ lat: cb.lat, lng: cb.lng }}
              icon={dotIcon("#a855f7", 8)}
              title={`Comunidad · Línea ${cb.line}`}
              onClick={() => setSelected({ kind: "community", bus: cb })}
            />
          ))}

          {/* Buses Mvd oficiales */}
          {filteredBuses.map((bus) => {
            const coords = bus.location?.coordinates;
            if (!coords) return null;
            const color = COMPANY_COLORS[bus.company] || "#64748b";
            return (
              <Marker
                key={bus.id}
                position={{ lat: coords[1], lng: coords[0] }}
                icon={busIcon(color)}
                label={busLabel(bus.line)}
                title={`Línea ${bus.line} · ${bus.company}`}
                onClick={() => setSelected({ kind: "bus", bus })}
              />
            );
          })}

          {selected && (
            <InfoWindow
              position={getSelectedPosition(selected)}
              onCloseClick={() => setSelected(null)}
            >
              <SelectedPopup feature={selected} />
            </InfoWindow>
          )}
        </>
      )}
    </Map>
  );
}

function getSelectedPosition(f: SelectedFeature): google.maps.LatLngLiteral {
  switch (f.kind) {
    case "bus":
      return {
        lat: f.bus.location.coordinates[1],
        lng: f.bus.location.coordinates[0],
      };
    case "vehicle":
      return { lat: f.vehicle.position.lat, lng: f.vehicle.position.lng };
    case "community":
      return { lat: f.bus.lat, lng: f.bus.lng };
    case "stop":
      return {
        lat: f.stop.location.coordinates[1],
        lng: f.stop.location.coordinates[0],
      };
    case "gtfs-stop":
      return { lat: f.stop.stop_lat, lng: f.stop.stop_lon };
  }
}

function SelectedPopup({ feature }: { feature: SelectedFeature }) {
  switch (feature.kind) {
    case "bus": {
      const b = feature.bus;
      const speedKmh =
        b.speed !== null && b.speed !== undefined ? (b.speed * 3.6).toFixed(0) : null;
      return (
        <div style={{ fontSize: 12, lineHeight: 1.5 }}>
          <strong>Línea {b.line}</strong> · {b.company}
          <br />
          ID: <code>{b.id}</code>
          {b.destination && (
            <>
              <br />→ {b.destination}
            </>
          )}
          {speedKmh && (
            <>
              <br />
              {speedKmh} km/h
            </>
          )}
          {b.emissions === "Cero emisiones" && (
            <>
              <br />Eléctrico
            </>
          )}
          {b.thermalConfort === "Aire Acondicionado" && (
            <>
              <br />AC
            </>
          )}
          {b.access === "PISO BAJO" && (
            <>
              <br />Accesible
            </>
          )}
          <br />
          <a
            href={`/lines/detail?line=${encodeURIComponent(b.line)}`}
            style={{ color: "#6366f1", fontWeight: 600 }}
          >
            Ver línea →
          </a>
        </div>
      );
    }
    case "vehicle": {
      const v = feature.vehicle;
      const lineLabel = v.trip?.routeShortName || v.displayLabel || "?";
      const speedKmh =
        v.position.speed !== null && v.position.speed !== undefined
          ? (v.position.speed * 3.6).toFixed(0)
          : null;
      return (
        <div style={{ fontSize: 12, lineHeight: 1.5 }}>
          <strong>Línea {lineLabel}</strong>
          {v.agency?.name && <> · {v.agency.name}</>}
          <br />
          ID: <code>{v.id.split(":").pop()}</code>
          {v.trip?.headsign && (
            <>
              <br />→ {v.trip.headsign}
            </>
          )}
          {speedKmh && (
            <>
              <br />
              {speedKmh} km/h
            </>
          )}
        </div>
      );
    }
    case "community": {
      const cb = feature.bus;
      return (
        <div style={{ fontSize: 12, lineHeight: 1.5 }}>
          <strong>Línea {cb.line}</strong> · {cb.company}
          <br />
          <span style={{ color: "#a855f7", fontWeight: 600 }}>
            Reporte comunitario
          </span>
          {cb.destination && (
            <>
              <br />→ {cb.destination}
            </>
          )}
          <br />
          {(cb.speed * 3.6).toFixed(0)} km/h
        </div>
      );
    }
    case "stop": {
      const s = feature.stop;
      return (
        <div style={{ fontSize: 12, lineHeight: 1.5 }}>
          <strong>#{s.id}</strong>
          <br />
          {s.street1 && s.street2
            ? `${s.street1} y ${s.street2}`
            : s.street1 || s.street2 || "—"}
          <br />
          <a
            href={`/stops/detail?id=${s.id}`}
            style={{ color: "#6366f1", fontWeight: 600 }}
          >
            Editar →
          </a>
        </div>
      );
    }
    case "gtfs-stop": {
      const s = feature.stop;
      return (
        <div style={{ fontSize: 12, lineHeight: 1.5 }}>
          <strong>{s.stop_name}</strong>
          <br />
          ID: <code>{s.stop_id}</code>
          {s.stop_code && (
            <>
              <br />Código: <code>{s.stop_code}</code>
            </>
          )}
          {feature.arrivals > 0 && (
            <>
              <br />
              <span style={{ color: "#0ea5e9", fontWeight: 600 }}>
                {feature.arrivals} próximos arribos
              </span>
            </>
          )}
        </div>
      );
    }
  }
}

/// Escucha movimientos del mapa (pan/zoom) y reporta el viewport actual.
/// Usa el evento `idle` (después de gestos) — clave para no quemar CPU.
function ViewportTracker({
  onChange,
}: {
  onChange: (v: Viewport) => void;
}) {
  const map = useMap();
  useEffect(() => {
    if (!map) return;
    const update = () => {
      const b = map.getBounds();
      const z = map.getZoom();
      onChange({
        bounds: b
          ? {
              north: b.getNorthEast().lat(),
              south: b.getSouthWest().lat(),
              east: b.getNorthEast().lng(),
              west: b.getSouthWest().lng(),
            }
          : null,
        zoom: typeof z === "number" ? z : DEFAULT_ZOOM,
      });
    };
    update();
    const idleListener = map.addListener("idle", update);
    return () => idleListener.remove();
  }, [map, onChange]);
  return null;
}

/// Polyline que vive como side-effect en el mapa (Google Maps no expone un
/// componente declarativo en @vis.gl/react-google-maps todavía).
function ShapePolyline({ shape }: { shape: GtfsShape }) {
  const map = useMap();
  useEffect(() => {
    if (!map) return;
    const path = shape.points
      .filter((p) => p.length >= 2)
      .map((p) => ({ lat: p[0], lng: p[1] }));
    if (path.length < 2) return;
    const polyline = new google.maps.Polyline({
      path,
      geodesic: false,
      strokeColor: "#0ea5e9",
      strokeOpacity: 0.55,
      strokeWeight: 3,
      map,
    });
    return () => polyline.setMap(null);
  }, [map, shape]);
  return null;
}

function dotIcon(color: string, size: number): google.maps.Symbol | undefined {
  if (typeof google === "undefined" || !google.maps) return undefined;
  return {
    path: google.maps.SymbolPath.CIRCLE,
    fillColor: color,
    fillOpacity: 0.85,
    strokeColor: "white",
    strokeWeight: 1,
    scale: size,
  };
}

function busIcon(color: string): google.maps.Symbol | undefined {
  if (typeof google === "undefined" || !google.maps) return undefined;
  return {
    path: "M -12,-9 L 12,-9 Q 16,-9 16,-5 L 16,5 Q 16,9 12,9 L -12,9 Q -16,9 -16,5 L -16,-5 Q -16,-9 -12,-9 Z",
    fillColor: color,
    fillOpacity: 1,
    strokeColor: "white",
    strokeWeight: 2,
    scale: 1,
    anchor: new google.maps.Point(0, 0),
    labelOrigin: new google.maps.Point(0, 0),
  };
}

function busLabel(line: string): google.maps.MarkerLabel {
  return {
    text: line,
    color: "white",
    fontSize: "11px",
    fontWeight: "700",
    fontFamily: "system-ui, sans-serif",
  };
}

function countSubteArrivalsAtStop(
  forecast: SubteForecast,
  stop: GtfsStop
): number {
  const matchIds = new Set<string>([stop.stop_id]);
  let count = 0;
  for (const trip of forecast.tripUpdates) {
    for (const upd of trip.stopTimeUpdates) {
      if (matchIds.has(upd.stopId)) count++;
    }
  }
  return count;
}
