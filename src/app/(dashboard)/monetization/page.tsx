"use client";

export default function MonetizationPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text">Monetización</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Recargas de saldo STM procesadas, comisiones y conciliación bancaria.
        </p>
      </div>

      {/* Placeholder info */}
      <div className="mb-6 rounded-2xl border border-info/30 bg-info/5 p-4">
        <div className="flex items-start gap-3">
          <span className="text-xl">💰</span>
          <div>
            <p className="text-sm font-semibold text-info">
              Recargas no implementadas todavía
            </p>
            <p className="mt-1 text-xs text-text-secondary">
              Este dashboard se popula cuando Vamo integre el flujo de recarga
              STM (Fase 3+ del plan de monetización). Modelo actual: 0.75% + IVA
              de comisión por recarga vía transferencia.
            </p>
          </div>
        </div>
      </div>

      {/* KPIs (mock/zero) */}
      <div className="mb-6 grid gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-border bg-bg-card p-4 shadow-sm">
          <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
            Recargas hoy
          </p>
          <p className="mt-1 text-3xl font-bold text-text-muted">—</p>
          <p className="mt-0.5 text-xs text-text-muted">UYU procesados</p>
        </div>
        <div className="rounded-2xl border border-border bg-bg-card p-4 shadow-sm">
          <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
            Comisiones mes
          </p>
          <p className="mt-1 text-3xl font-bold text-text-muted">—</p>
          <p className="mt-0.5 text-xs text-text-muted">UYU netos</p>
        </div>
        <div className="rounded-2xl border border-border bg-bg-card p-4 shadow-sm">
          <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
            Usuarios únicos
          </p>
          <p className="mt-1 text-3xl font-bold text-text-muted">—</p>
          <p className="mt-0.5 text-xs text-text-muted">que recargaron</p>
        </div>
        <div className="rounded-2xl border border-border bg-bg-card p-4 shadow-sm">
          <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
            Ticket promedio
          </p>
          <p className="mt-1 text-3xl font-bold text-text-muted">—</p>
          <p className="mt-0.5 text-xs text-text-muted">UYU</p>
        </div>
      </div>

      {/* Model */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-bg-card p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-text">
            Modelo de negocio
          </h2>
          <div className="space-y-3 text-sm">
            <div>
              <p className="font-medium text-text">Core gratis</p>
              <p className="text-xs text-text-secondary">
                Todas las funciones de la app son y serán gratis. Sin freemium.
              </p>
            </div>
            <div>
              <p className="font-medium text-text">Recarga vía transferencia</p>
              <p className="text-xs text-text-secondary">
                0.75% + IVA de comisión por recarga. Trámite se inicia en la app,
                se completa en el banco del usuario.
              </p>
            </div>
            <div>
              <p className="font-medium text-text">Sin ads, sin subsidios</p>
              <p className="text-xs text-text-secondary">
                La app no muestra publicidad ni acepta retainers de empresas STM.
              </p>
            </div>
            <div>
              <p className="font-medium text-text">B2B dashboards</p>
              <p className="text-xs text-text-secondary">
                Venta futura de dashboards custom a CUTCSA/COETC/COME/UCOT como
                revenue complementario.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-bg-card p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-text">Roadmap</h2>
          <ul className="space-y-2 text-sm">
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-text-muted">○</span>
              <span className="text-text-secondary">
                Integración con STM para obtener saldo y historial (requiere
                convenio IMM/AGESIC)
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-text-muted">○</span>
              <span className="text-text-secondary">
                Flujo de recarga in-app (ID Uruguay + transferencia bancaria)
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-text-muted">○</span>
              <span className="text-text-secondary">
                Webhook bancario → acreditación automática del saldo
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-text-muted">○</span>
              <span className="text-text-secondary">
                Conciliación automática de comisiones
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-text-muted">○</span>
              <span className="text-text-secondary">
                Notificaciones push de saldo bajo (usuarios opt-in)
              </span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
