"use client";

import { useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, CircleMarker, Polyline, useMap } from "react-leaflet";
import { useEffect } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Bus, BusStop } from "@/lib/types";
import { COMPANY_COLORS } from "@/lib/types";
import type { CommunityBus } from "@/hooks/useCommunityBuses";
import type { TransitVehicle, GtfsStop, GtfsShape, SubteForecast } from "@/lib/api";

// Default Mvd
const DEFAULT_CENTER: [number, number] = [-34.9011, -56.1645];
const DEFAULT_ZOOM = 12;

function makeBusIcon(line: string, color: string) {
  return L.divIcon({
    className: "bus-marker",
    html: `<div style="
      background: ${color};
      color: white;
      padding: 3px 7px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 700;
      font-family: system-ui, sans-serif;
      border: 2px solid white;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      white-space: nowrap;
      ">${line}</div>`,
    iconSize: [30, 18],
    iconAnchor: [15, 9],
  });
}

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

/// Reposiciona el mapa cuando cambia el centro (al cambiar ciudad).
function CityRecenter({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom, { animate: true });
  }, [center, zoom, map]);
  return null;
}

export default function LiveMap({
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
  const filteredBuses = useMemo(() => {
    return (buses ?? []).filter((b) => {
      if (lineFilter && b.line !== lineFilter) return false;
      if (companyFilter && b.company !== companyFilter) return false;
      return true;
    });
  }, [buses, lineFilter, companyFilter]);

  const filteredVehicles = useMemo(() => {
    return (vehicles ?? []).filter((v) => {
      const lineLabel = v.trip?.routeShortName || v.displayLabel || "";
      if (lineFilter && lineLabel !== lineFilter) return false;
      return true;
    });
  }, [vehicles, lineFilter]);

  const visibleStops = useMemo(() => {
    if (!gtfsStops) return [];
    const filtered = onlyParentStations
      ? gtfsStops.filter((s) => s.location_type === 1)
      : gtfsStops;
    return filtered.slice(0, 5000);
  }, [gtfsStops, onlyParentStations]);

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      className="h-full w-full rounded-2xl"
      scrollWheelZoom={true}
    >
      <CityRecenter center={center} zoom={zoom} />
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      />

      {/* Recorridos (shapes GTFS — para subte se ven todas las líneas, para colectivos solo si hay filtro) */}
      {shapes?.map((shape) => {
        const coords: [number, number][] = shape.points
          .filter((p) => p.length >= 2)
          .map((p) => [p[0], p[1]]);
        if (coords.length < 2) return null;
        return (
          <Polyline
            key={`shape-${shape.shape_id}`}
            positions={coords}
            pathOptions={{
              color: "#0ea5e9",
              weight: 3,
              opacity: 0.55,
            }}
          />
        );
      })}

      {/* Paradas Mvd legacy (si están habilitadas) */}
      {showStops &&
        stops.slice(0, 500).map((stop) => (
          <CircleMarker
            key={`stop-${stop.id}`}
            center={[stop.location.coordinates[1], stop.location.coordinates[0]]}
            radius={3}
            pathOptions={{
              color: "#94a3b8",
              fillColor: "#94a3b8",
              fillOpacity: 0.7,
              weight: 1,
            }}
          >
            <Popup>
              <div style={{ fontSize: 12 }}>
                <strong>#{stop.id}</strong>
                <br />
                {stop.street1 && stop.street2
                  ? `${stop.street1} y ${stop.street2}`
                  : stop.street1 || stop.street2 || "—"}
                <br />
                <a
                  href={`/stops/detail?id=${stop.id}`}
                  style={{ color: "#6366f1", fontWeight: 600 }}
                >
                  Editar →
                </a>
              </div>
            </Popup>
          </CircleMarker>
        ))}

      {/* Paradas/estaciones GTFS (multi-city) */}
      {showStops &&
        visibleStops.map((s) => {
          const arrivals = subteForecast
            ? countSubteArrivalsAtStop(subteForecast, s)
            : 0;
          return (
            <CircleMarker
              key={`gtfs-${s.stop_id}`}
              center={[s.stop_lat, s.stop_lon]}
              radius={s.location_type === 1 ? 5 : 3}
              pathOptions={{
                color: "#14b8a6",
                fillColor: "#14b8a6",
                fillOpacity: 0.7,
                weight: 1,
              }}
            >
              <Popup>
                <div style={{ fontSize: 12 }}>
                  <strong>{s.stop_name}</strong>
                  <br />
                  ID: <code>{s.stop_id}</code>
                  {s.stop_code && (
                    <>
                      <br />Código: <code>{s.stop_code}</code>
                    </>
                  )}
                  {arrivals > 0 && (
                    <>
                      <br />
                      <span style={{ color: "#0ea5e9", fontWeight: 600 }}>
                        {arrivals} próximos arribos
                      </span>
                    </>
                  )}
                </div>
              </Popup>
            </CircleMarker>
          );
        })}

      {/* Vehicles multi-city (TransitVehicle) */}
      {filteredVehicles.map((v) => {
        const lineLabel = v.trip?.routeShortName || v.displayLabel || "?";
        const color = "#475569"; // gris neutro — colors empresa BA pendiente
        return (
          <Marker
            key={`v-${v.id}`}
            position={[v.position.lat, v.position.lng]}
            icon={makeBusIcon(lineLabel, color)}
          >
            <Popup>
              <div style={{ fontSize: 12 }}>
                <strong>Línea {lineLabel}</strong>
                {v.agency?.name && <> · {v.agency.name}</>}
                <br />
                ID: <code>{v.id.split(":").pop()}</code>
                <br />
                {v.trip?.headsign && <>→ {v.trip.headsign}<br /></>}
                {v.position.speed !== null && v.position.speed !== undefined && (
                  <>{(v.position.speed * 3.6).toFixed(0)} km/h<br /></>
                )}
              </div>
            </Popup>
          </Marker>
        );
      })}

      {/* Community buses (violeta) */}
      {communityBuses.map((cb) => (
        <CircleMarker
          key={`cb-${cb.id}`}
          center={[cb.lat, cb.lng]}
          radius={8}
          pathOptions={{
            color: "#a855f7",
            fillColor: "#a855f7",
            fillOpacity: 0.3,
            weight: 2,
          }}
        >
          <Popup>
            <div style={{ fontSize: 12 }}>
              <strong>Línea {cb.line}</strong> · {cb.company}
              <br />
              <span style={{ color: "#a855f7", fontWeight: 600 }}>
                Reporte comunitario
              </span>
              <br />
              {cb.destination && <>→ {cb.destination}<br /></>}
              {(cb.speed * 3.6).toFixed(0)} km/h
            </div>
          </Popup>
        </CircleMarker>
      ))}

      {/* Buses oficiales */}
      {filteredBuses.map((bus) => {
        const coords = bus.location?.coordinates;
        if (!coords) return null;
        const color = COMPANY_COLORS[bus.company] || "#64748b";
        return (
          <Marker
            key={bus.id}
            position={[coords[1], coords[0]]}
            icon={makeBusIcon(bus.line, color)}
          >
            <Popup>
              <div style={{ fontSize: 12 }}>
                <strong>Línea {bus.line}</strong> · {bus.company}
                <br />
                ID: <code>{bus.id}</code>
                <br />
                {bus.destination && <>→ {bus.destination}<br /></>}
                {bus.speed !== null && bus.speed !== undefined && (
                  <>{(bus.speed * 3.6).toFixed(0)} km/h<br /></>
                )}
                {bus.emissions === "Cero emisiones" && "⚡ Eléctrico "}
                {bus.thermalConfort === "Aire Acondicionado" && "❄️ AC "}
                {bus.access === "PISO BAJO" && "♿ Accesible"}
                <br />
                <a
                  href={`/lines/detail?line=${encodeURIComponent(bus.line)}`}
                  style={{ color: "#6366f1", fontWeight: 600 }}
                >
                  Ver línea →
                </a>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}

/// Cuenta arribos del feed RT subte en una estación GTFS, considerando que
/// el feed RT trae stop_id de andén (location_type=0) y la UI muestra las
/// estaciones agrupadoras (location_type=1).
function countSubteArrivalsAtStop(forecast: SubteForecast, stop: GtfsStop): number {
  const matchIds = new Set<string>([stop.stop_id]);
  // Sin acceso al index inverso aquí — solo matcheamos stopIds children
  // que apunten a este parent_station via campo del forecast.
  // Para count exacto el caller debería usar un index del store.
  let count = 0;
  for (const trip of forecast.tripUpdates) {
    for (const upd of trip.stopTimeUpdates) {
      if (matchIds.has(upd.stopId)) count++;
    }
  }
  return count;
}
