"use client";

import { useMemo, useState } from "react";
import { useBuses } from "@/hooks/useBuses";
import { useAlerts } from "@/hooks/useAlerts";
import { useCommunityBuses } from "@/hooks/useCommunityBuses";
import { COMPANIES, COMPANY_COLORS } from "@/lib/types";

export default function B2BPage() {
  const { buses } = useBuses(30000);
  const { alerts } = useAlerts();
  const { buses: communityBuses } = useCommunityBuses();
  const [selectedCompany, setSelectedCompany] = useState<string>("CUTCSA");

  const stats = useMemo(() => {
    const companyBuses = buses.filter((b) => b.company === selectedCompany);
    const companyAlerts = alerts.filter((a) => {
      if (a.affectedLines.length === 0) return false;
      // Si al menos una línea afectada tiene buses de esta empresa
      return a.affectedLines.some((line) =>
        companyBuses.some((b) => b.line === line)
      );
    });
    const companyCommunity = communityBuses.filter(
      (c) => c.company === selectedCompany
    );

    const electricCount = companyBuses.filter(
      (b) => b.emissions === "Cero emisiones"
    ).length;
    const acCount = companyBuses.filter(
      (b) => b.thermalConfort === "Aire Acondicionado"
    ).length;
    const lowFloorCount = companyBuses.filter(
      (b) => b.access === "PISO BAJO"
    ).length;

    const uniqueLines = new Set(companyBuses.map((b) => b.line));

    return {
      totalBuses: companyBuses.length,
      totalLines: uniqueLines.size,
      electricCount,
      acCount,
      lowFloorCount,
      activeAlerts: companyAlerts.filter((a) => a.active).length,
      communityReports: companyCommunity.length,
    };
  }, [buses, alerts, communityBuses, selectedCompany]);

  const companyColor = COMPANY_COLORS[selectedCompany] || "#6366f1";

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text">Dashboard B2B</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Vista ejecutiva por empresa STM. Cuando la empresa tenga acceso
          directo, solo verá sus propios datos.
        </p>
      </div>

      {/* Info card */}
      <div className="mb-6 rounded-2xl border border-info/30 bg-info/5 p-4">
        <div className="flex items-start gap-3">
          <span className="text-xl">ℹ️</span>
          <div>
            <p className="text-sm font-semibold text-info">
              Preview del dashboard que venderíamos a las empresas STM
            </p>
            <p className="mt-1 text-xs text-text-secondary">
              Modelo futuro: CUTCSA / COETC / COME / UCOT tienen acceso solo a
              sus propios datos, con pricing mensual. Por ahora, vos ves a
              todas desde Neodimio.
            </p>
          </div>
        </div>
      </div>

      {/* Company switcher */}
      <div className="mb-6 flex gap-2 flex-wrap">
        {COMPANIES.map((company) => {
          const isActive = selectedCompany === company;
          const color = COMPANY_COLORS[company];
          return (
            <button
              key={company}
              onClick={() => setSelectedCompany(company)}
              className={`rounded-xl border-2 px-4 py-2 text-sm font-semibold transition-all ${
                isActive
                  ? "border-transparent text-white shadow-md"
                  : "border-border bg-bg-card text-text-secondary hover:border-border-focus"
              }`}
              style={{
                backgroundColor: isActive ? color : undefined,
              }}
            >
              {company}
            </button>
          );
        })}
      </div>

      {/* Hero card */}
      <div
        className="mb-6 rounded-2xl p-6 text-white shadow-lg"
        style={{
          background: `linear-gradient(135deg, ${companyColor} 0%, ${companyColor}dd 100%)`,
        }}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm opacity-80">Empresa</p>
            <h2 className="mt-1 text-4xl font-bold">{selectedCompany}</h2>
            <p className="mt-2 text-sm opacity-90">
              {stats.totalLines} línea{stats.totalLines !== 1 ? "s" : ""} ·{" "}
              {stats.totalBuses} buses en vivo
            </p>
          </div>
          <div className="text-right">
            <p className="text-5xl font-bold">{stats.totalBuses}</p>
            <p className="text-xs opacity-80 uppercase tracking-wider">
              Flota activa
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-bg-card p-4 shadow-sm">
          <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
            Eléctricos
          </p>
          <p className="mt-1 text-3xl font-bold text-success">
            {stats.electricCount}
          </p>
          <p className="mt-0.5 text-xs text-text-muted">
            {stats.totalBuses > 0
              ? `${((stats.electricCount / stats.totalBuses) * 100).toFixed(0)}% de la flota`
              : "—"}
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-bg-card p-4 shadow-sm">
          <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
            Con AC
          </p>
          <p className="mt-1 text-3xl font-bold text-info">{stats.acCount}</p>
          <p className="mt-0.5 text-xs text-text-muted">
            {stats.totalBuses > 0
              ? `${((stats.acCount / stats.totalBuses) * 100).toFixed(0)}% de la flota`
              : "—"}
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-bg-card p-4 shadow-sm">
          <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
            Accesibles
          </p>
          <p className="mt-1 text-3xl font-bold text-text">
            {stats.lowFloorCount}
          </p>
          <p className="mt-0.5 text-xs text-text-muted">
            {stats.totalBuses > 0
              ? `${((stats.lowFloorCount / stats.totalBuses) * 100).toFixed(0)}% de la flota`
              : "—"}
          </p>
        </div>
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-border bg-bg-card p-4 shadow-sm">
          <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
            Alertas activas
          </p>
          <p
            className={`mt-1 text-3xl font-bold ${stats.activeAlerts > 0 ? "text-warning" : "text-text"}`}
          >
            {stats.activeAlerts}
          </p>
          <p className="mt-0.5 text-xs text-text-muted">
            que afectan a {selectedCompany}
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-bg-card p-4 shadow-sm">
          <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
            Reportes comunidad
          </p>
          <p className="mt-1 text-3xl font-bold text-primary">
            {stats.communityReports}
          </p>
          <p className="mt-0.5 text-xs text-text-muted">
            usuarios compartiendo en vivo
          </p>
        </div>
      </div>

      {/* Roadmap card */}
      <div className="rounded-2xl border border-border bg-bg-card p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-text">
          Roadmap de funciones B2B
        </h2>
        <ul className="space-y-2 text-sm">
          <li className="flex items-start gap-2">
            <span className="mt-0.5 text-text-muted">○</span>
            <span className="text-text-secondary">
              Login multi-tenant con roles por empresa
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5 text-text-muted">○</span>
            <span className="text-text-secondary">
              Mapa filtrado a buses de la empresa
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5 text-text-muted">○</span>
            <span className="text-text-secondary">
              Análisis de velocidad promedio por línea
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5 text-text-muted">○</span>
            <span className="text-text-secondary">
              Histórico de incidentes y desvíos
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5 text-text-muted">○</span>
            <span className="text-text-secondary">
              Exportaciones a CSV/PDF para reportes regulatorios
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5 text-text-muted">○</span>
            <span className="text-text-secondary">
              Alertas automáticas cuando un bus sale de su recorrido
            </span>
          </li>
        </ul>
      </div>
    </div>
  );
}
