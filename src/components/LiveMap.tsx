"use client";

import { useEffect, useMemo, useState } from "react";
import {
  APIProvider,
  Map,
  AdvancedMarker,
  Pin,
  InfoWindow,
  useMap,
  useApiIsLoaded,
} from "@vis.gl/react-google-maps";

// Map ID via env var (opcional). Sin Map ID, AdvancedMarker funciona en
// fallback (warning en consola pero no rompe el mapa).
const MAP_ID = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID;
import type { Bus, BusStop } from "@/lib/types";
import { COMPANY_COLORS } from "@/lib/types";
import type { CommunityBus } from "@/hooks/useCommunityBuses";
import type { TransitVehicle, GtfsStop, GtfsShape, SubteForecast } from "@/lib/api";

const DEFAULT_CENTER: [number, number] = [-34.9011, -56.1645];
const DEFAULT_ZOOM = 12;

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

/// Zoom mínimo para pintar paradas. 14 = pocas cuadras (carga manejable).
const MIN_ZOOM_STOPS = 14;
/// Zoom mínimo para pintar vehicles.
const MIN_ZOOM_VEHICLES = 11;
/// Subte CABA: 16 shapes siempre visibles (son pocas).
const SUBTE_ALWAYS_RENDER = true;
const CAP_STOPS = 800;
const CAP_VEHICLES = 1200;

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
  /** Shapes siempre visibles (sólo subte usa esto). */
  shapes?: GtfsShape[];
  /** Mapping `route_short_name` → shapes. Mostrados solo cuando user clickea bus/vehicle. */
  shapesByLineLabel?: Map<string, GtfsShape[]>;
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
  shapesByLineLabel,
  subteForecast,
  showStops = false,
  lineFilter,
  companyFilter,
  center = DEFAULT_CENTER,
  zoom = DEFAULT_ZOOM,
}: LiveMapProps) {
  const apiLoaded = useApiIsLoaded();
  const [selected, setSelected] = useState<SelectedFeature | null>(null);
  const [selectedLineLabel, setSelectedLineLabel] = useState<string | null>(null);
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
    if (arr.length === 0) return [];
    if (viewport.bounds && viewport.zoom < MIN_ZOOM_VEHICLES) return [];
    const out: TransitVehicle[] = [];
    const b = viewport.bounds;
    for (const v of arr) {
      const lineLabel = v.trip?.routeShortName || v.displayLabel || "";
      if (lineFilter && lineLabel !== lineFilter) continue;
      if (b) {
        if (
          v.position.lat > b.north ||
          v.position.lat < b.south ||
          v.position.lng > b.east ||
          v.position.lng < b.west
        ) {
          continue;
        }
      }
      out.push(v);
      if (out.length >= CAP_VEHICLES) break;
    }
    return out;
  }, [vehicles, lineFilter, viewport]);

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
        if (out.length >= CAP_STOPS) break;
      }
    }
    return out;
  }, [gtfsStops, onlyParentStations, viewport]);

  // Shapes visibles: subte siempre todas; bus/colectivo solo la línea seleccionada.
  const visibleShapes = useMemo<GtfsShape[]>(() => {
    if (onlyParentStations && SUBTE_ALWAYS_RENDER && Array.isArray(shapes)) {
      return shapes;
    }
    if (selectedLineLabel && shapesByLineLabel) {
      return shapesByLineLabel.get(selectedLineLabel) ?? [];
    }
    return [];
  }, [shapes, shapesByLineLabel, selectedLineLabel, onlyParentStations]);

  return (
    <Map
      key={`${center[0]},${center[1]},${zoom}`}
      {...(MAP_ID ? { mapId: MAP_ID } : {})}
      defaultCenter={{ lat: center[0], lng: center[1] }}
      defaultZoom={zoom}
      defaultTilt={0}
      defaultHeading={0}
      tiltInteractionEnabled={false}
      headingInteractionEnabled={false}
      className="h-full w-full overflow-hidden rounded-2xl"
      gestureHandling="greedy"
      disableDefaultUI={false}
      zoomControl
      streetViewControl={false}
      mapTypeControl={false}
      fullscreenControl={false}
      rotateControl={false}
      clickableIcons={false}
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
              <AdvancedMarker clickable
                key={`stop-${stop.id}`}
                position={{
                  lat: stop.location.coordinates[1],
                  lng: stop.location.coordinates[0],
                }}
                onClick={() => setSelected({ kind: "stop", stop })}
              >
                <StopDot color="#94a3b8" size={8} />
              </AdvancedMarker>
            ))}

          {/* Paradas/estaciones GTFS multi-city */}
          {showStops &&
            visibleStops.map((s) => {
              const arrivals = subteForecast
                ? countSubteArrivalsAtStop(subteForecast, s)
                : 0;
              const isStation = s.location_type === 1;
              return (
                <AdvancedMarker clickable
                  key={`gtfs-${s.stop_id}`}
                  position={{ lat: s.stop_lat, lng: s.stop_lon }}
                  onClick={() =>
                    setSelected({ kind: "gtfs-stop", stop: s, arrivals })
                  }
                >
                  <StopDot color="#14b8a6" size={isStation ? 12 : 8} />
                </AdvancedMarker>
              );
            })}

          {/* Vehicles multi-city */}
          {filteredVehicles.map((v) => {
            const lineLabel = v.trip?.routeShortName || v.displayLabel || "?";
            return (
              <AdvancedMarker clickable
                key={`v-${v.id}`}
                position={{ lat: v.position.lat, lng: v.position.lng }}
                title={`Línea ${lineLabel}`}
                onClick={() => {
                  setSelected({ kind: "vehicle", vehicle: v });
                  setSelectedLineLabel(lineLabel);
                }}
              >
                <Pin
                  background="#475569"
                  borderColor="#fff"
                  glyphColor="#fff"
                  scale={0.85}
                >
                  <span style={{ fontSize: 10, fontWeight: 700 }}>
                    {lineLabel}
                  </span>
                </Pin>
              </AdvancedMarker>
            );
          })}

          {/* Community buses (violeta) */}
          {communityBuses.map((cb) => (
            <AdvancedMarker clickable
              key={`cb-${cb.id}`}
              position={{ lat: cb.lat, lng: cb.lng }}
              title={`Comunidad · Línea ${cb.line}`}
              onClick={() => {
                setSelected({ kind: "community", bus: cb });
                setSelectedLineLabel(cb.line);
              }}
            >
              <StopDot color="#a855f7" size={14} />
            </AdvancedMarker>
          ))}

          {/* Buses Mvd oficiales */}
          {filteredBuses.map((bus) => {
            const coords = bus.location?.coordinates;
            if (!coords) return null;
            const color = COMPANY_COLORS[bus.company] || "#64748b";
            return (
              <AdvancedMarker clickable
                key={bus.id}
                position={{ lat: coords[1], lng: coords[0] }}
                title={`Línea ${bus.line} · ${bus.company}`}
                onClick={() => {
                  setSelected({ kind: "bus", bus });
                  setSelectedLineLabel(bus.line);
                }}
              >
                <Pin
                  background={color}
                  borderColor="#fff"
                  glyphColor="#fff"
                  scale={0.85}
                >
                  <span style={{ fontSize: 10, fontWeight: 700 }}>
                    {bus.line}
                  </span>
                </Pin>
              </AdvancedMarker>
            );
          })}

          {selected && (
            <InfoWindow
              position={getSelectedPosition(selected)}
              onCloseClick={() => {
                setSelected(null);
                setSelectedLineLabel(null);
              }}
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

/// Punto circular para paradas (children de AdvancedMarker, render en GPU).
function StopDot({ color, size }: { color: string; size: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: color,
        border: "1px solid white",
        boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
      }}
    />
  );
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
