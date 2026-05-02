"use client";

import { useState } from "react";
import {
  useIncidents,
  createIncident,
  updateIncidentStatus,
  SEVERITY_LABELS,
  SEVERITY_COLORS,
  KIND_OPTIONS,
} from "@/hooks/useIncidents";
import { useCity } from "@/lib/cityContext";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/components/Toast";
import { INCIDENT_KIND_LABELS, type IncidentKind, type IncidentSeverity } from "@/lib/extended-types";

const DEFAULT_CITY_ID = "uy.mvd-area-metro";

const STATUS_LABELS = { active: "Activo", monitoring: "Monitoreando", resolved: "Resuelto" } as const;

export default function IncidentsPage() {
  const { city } = useCity();
  const { incidents, loading } = useIncidents();
  const { user } = useAuth();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState<"all" | "active" | "resolved">("active");

  // City-scope: docs sin `cityId` field se asumen Mvd (compatibilidad con
  // schema previo). Cuando creemos incidents nuevos vamos a setear cityId
  // explícito al de la ciudad activa al momento de crear.
  const cityFiltered = incidents.filter((i) => {
    const incCity = (i as { cityId?: string }).cityId ?? DEFAULT_CITY_ID;
    return incCity === city.id;
  });

  const filtered = cityFiltered.filter((i) => {
    if (filter === "all") return true;
    if (filter === "active") return i.status !== "resolved";
    if (filter === "resolved") return i.status === "resolved";
    return true;
  });

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">Incidencias</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Eventos operativos del sistema (paros, accidentes, desvíos, fallas).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as "all" | "active" | "resolved")}
            className="rounded-lg border border-border bg-bg px-3 py-1.5 text-sm text-text"
          >
            <option value="active">Activas</option>
            <option value="resolved">Resueltas</option>
            <option value="all">Todas</option>
          </select>
          <button
            onClick={() => setShowForm(true)}
            className="rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-white hover:bg-primary/90"
          >
            + Nueva incidencia
          </button>
        </div>
      </header>

      {showForm && (
        <CreateIncidentForm
          onClose={() => setShowForm(false)}
          onCreate={(msg) => {
            toast(msg, "success");
            setShowForm(false);
          }}
          onError={(msg) => toast(msg, "error")}
          adminEmail={user?.email ?? null}
        />
      )}

      <section className="rounded-2xl border border-border bg-bg-card overflow-hidden">
        {loading ? (
          <p className="px-5 py-8 text-center text-text-muted">Cargando…</p>
        ) : filtered.length === 0 ? (
          <p className="px-5 py-8 text-center text-text-muted">Sin incidencias.</p>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map((inc) => (
              <div key={inc.id} className="px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-text">{inc.title}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${SEVERITY_COLORS[inc.severity]}`}>
                        {SEVERITY_LABELS[inc.severity]}
                      </span>
                      <span className="rounded-full bg-bg-subtle px-2 py-0.5 text-[10px] text-text-secondary">
                        {INCIDENT_KIND_LABELS[inc.kind]}
                      </span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        inc.status === "resolved" ? "bg-green-500/10 text-green-500" :
                        inc.status === "monitoring" ? "bg-blue-500/10 text-blue-500" :
                        "bg-danger/10 text-danger"
                      }`}>
                        {STATUS_LABELS[inc.status]}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-text-secondary line-clamp-2">{inc.description}</p>
                    <div className="mt-2 flex items-center gap-4 text-[11px] text-text-muted">
                      {inc.affectedLines.length > 0 && (
                        <span>Líneas: {inc.affectedLines.join(", ")}</span>
                      )}
                      {inc.affectedStops.length > 0 && (
                        <span>{inc.affectedStops.length} paradas afectadas</span>
                      )}
                      {inc.estimatedResolutionMin && (
                        <span>ETA resolución: {inc.estimatedResolutionMin} min</span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    {inc.status !== "resolved" && (
                      <>
                        {inc.status !== "monitoring" && (
                          <button
                            onClick={() => user?.email && updateIncidentStatus(inc.id, "monitoring", user.email)}
                            className="rounded px-2 py-1 text-[11px] text-blue-500 hover:bg-blue-500/10"
                          >
                            Monitorear
                          </button>
                        )}
                        <button
                          onClick={() => user?.email && updateIncidentStatus(inc.id, "resolved", user.email)}
                          className="rounded px-2 py-1 text-[11px] text-green-500 hover:bg-green-500/10"
                        >
                          Resolver
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function CreateIncidentForm({
  onClose,
  onCreate,
  onError,
  adminEmail,
}: {
  onClose: () => void;
  onCreate: (msg: string) => void;
  onError: (msg: string) => void;
  adminEmail: string | null;
}) {
  const [kind, setKind] = useState<IncidentKind>("congestion");
  const [severity, setSeverity] = useState<IncidentSeverity>("medium");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [linesText, setLinesText] = useState("");
  const [eta, setEta] = useState("");
  const [pending, setPending] = useState(false);

  const onSubmit = async () => {
    if (!adminEmail) return onError("Sesión expirada");
    if (!title.trim() || !description.trim()) return onError("Título y descripción requeridos");
    setPending(true);
    try {
      const lines = linesText.split(",").map((s) => s.trim()).filter(Boolean);
      const etaNum = eta ? parseInt(eta, 10) : null;
      await createIncident(
        {
          kind,
          severity,
          status: "active",
          title: title.trim(),
          description: description.trim(),
          affectedLines: lines,
          affectedStops: [],
          estimatedResolutionMin: etaNum && !isNaN(etaNum) ? etaNum : null,
          linkedAlertId: null,
        },
        adminEmail
      );
      onCreate(`Incidente "${title.trim()}" creado`);
    } catch (e) {
      onError(e instanceof Error ? e.message : "Error");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="rounded-2xl border border-primary/30 bg-bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-text">Nueva incidencia</h2>
        <button onClick={onClose} className="text-text-muted hover:text-text text-xs">✕</button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[11px] text-text-secondary uppercase tracking-wider">Tipo</label>
          <select value={kind} onChange={(e) => setKind(e.target.value as IncidentKind)} className="mt-1 w-full rounded-lg border border-border bg-bg px-2 py-1.5 text-sm">
            {KIND_OPTIONS.map((k) => (
              <option key={k} value={k}>{INCIDENT_KIND_LABELS[k]}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[11px] text-text-secondary uppercase tracking-wider">Severidad</label>
          <select value={severity} onChange={(e) => setSeverity(e.target.value as IncidentSeverity)} className="mt-1 w-full rounded-lg border border-border bg-bg px-2 py-1.5 text-sm">
            <option value="low">Baja</option>
            <option value="medium">Media</option>
            <option value="high">Alta</option>
            <option value="critical">Crítica</option>
          </select>
        </div>
      </div>
      <div>
        <label className="text-[11px] text-text-secondary uppercase tracking-wider">Título</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ej: Paro CUTCSA línea 192"
          className="mt-1 w-full rounded-lg border border-border bg-bg px-2 py-1.5 text-sm"
        />
      </div>
      <div>
        <label className="text-[11px] text-text-secondary uppercase tracking-wider">Descripción</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder="Detalles del incidente, alcance, qué se sabe…"
          className="mt-1 w-full rounded-lg border border-border bg-bg px-2 py-1.5 text-sm"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[11px] text-text-secondary uppercase tracking-wider">Líneas afectadas</label>
          <input
            type="text"
            value={linesText}
            onChange={(e) => setLinesText(e.target.value)}
            placeholder="192, CA1, 405 (separadas por coma)"
            className="mt-1 w-full rounded-lg border border-border bg-bg px-2 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="text-[11px] text-text-secondary uppercase tracking-wider">ETA resolución (min)</label>
          <input
            type="number"
            value={eta}
            onChange={(e) => setEta(e.target.value)}
            placeholder="60"
            className="mt-1 w-full rounded-lg border border-border bg-bg px-2 py-1.5 text-sm"
          />
        </div>
      </div>
      <div className="flex items-center justify-end gap-2 pt-2">
        <button onClick={onClose} className="rounded-lg px-3 py-1.5 text-sm text-text-secondary">Cancelar</button>
        <button
          onClick={onSubmit}
          disabled={pending}
          className="rounded-lg bg-primary px-4 py-1.5 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50"
        >
          {pending ? "Creando…" : "Crear incidente"}
        </button>
      </div>
    </div>
  );
}
