"use client";

import { useState } from "react";
import { useAdminConfig, setAdminConfig } from "@/hooks/useAdminConfig";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/components/Toast";
import { KILLSWITCH_DEFINITIONS } from "@/lib/extended-types";

/**
 * Página de Settings: control de killswitches globales (config/*) +
 * referencia a Firebase Remote Config para feature gates.
 *
 * Killswitches viven en Firestore `config/{id}` con `value: boolean`.
 * Las Cloud Functions y las rules consultan en runtime — un cambio se
 * propaga al instante sin redeploy.
 *
 * Para feature flags más amplios (community / chat_ia / etc en general)
 * usar Firebase Remote Config en la consola directa: link al final.
 */
export default function SettingsPage() {
  const { items, loading } = useAdminConfig();
  const { user } = useAuth();
  const { toast } = useToast();
  const [pendingId, setPendingId] = useState<string | null>(null);

  const valueOf = (id: string): boolean => {
    const found = items.find((i) => i.id === id);
    if (found && typeof found.value === "boolean") return found.value;
    return false; // default conservador para killswitches
  };

  const onToggle = async (id: string, description: string) => {
    if (!user?.email) {
      toast("Sesión expirada", "error");
      return;
    }
    const current = valueOf(id);
    const next = !current;
    setPendingId(id);
    try {
      await setAdminConfig(id, next, user.email, description);
      toast(
        next ? `🔴 ${id} ACTIVADO` : `✅ ${id} desactivado`,
        next ? "warning" : "success"
      );
    } catch (e) {
      toast(e instanceof Error ? e.message : "Error", "error");
    } finally {
      setPendingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-text">Settings</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Killswitches globales que afectan a toda la app en tiempo real, sin
          redeploy. Usar con cuidado — los cambios impactan a todos los
          usuarios al instante.
        </p>
      </header>

      {/* ━━━ Killswitches críticos ━━━ */}
      <section className="rounded-2xl border border-border bg-bg-card overflow-hidden">
        <div className="border-b border-border bg-bg-subtle px-5 py-3">
          <h2 className="text-sm font-bold text-text">
            🚨 Killswitches críticos (config/*)
          </h2>
          <p className="mt-1 text-xs text-text-secondary">
            Apagar un feature globalmente cuando hay incidente. Cambia el
            comportamiento en backend (rules + Cloud Functions) y en cliente
            inmediatamente.
          </p>
        </div>
        <div className="divide-y divide-border">
          {KILLSWITCH_DEFINITIONS.map((def) => {
            const enabled = valueOf(def.id);
            const isPending = pendingId === def.id;
            const sevColor = {
              low: "text-text-secondary",
              medium: "text-warning",
              high: "text-orange-500",
              critical: "text-danger",
            }[def.severity];
            return (
              <div
                key={def.id}
                className="flex items-start justify-between gap-4 px-5 py-4"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-text">
                      {def.label}
                    </span>
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider ${sevColor}`}
                    >
                      {def.severity}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-text-secondary leading-relaxed">
                    {def.description}
                  </p>
                  <p className="mt-1 font-mono text-[10px] text-text-muted">
                    config/{def.id}
                  </p>
                </div>
                <button
                  onClick={() => onToggle(def.id, def.description)}
                  disabled={isPending}
                  className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors ${
                    enabled ? "bg-danger" : "bg-bg-subtle border border-border"
                  } ${isPending ? "opacity-50" : ""}`}
                  aria-label={enabled ? "Desactivar killswitch" : "Activar killswitch"}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                      enabled ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* ━━━ Remote Config (Firebase Console) ━━━ */}
      <section className="rounded-2xl border border-border bg-bg-card overflow-hidden">
        <div className="border-b border-border bg-bg-subtle px-5 py-3">
          <h2 className="text-sm font-bold text-text">
            🎛️ Feature Flags (Firebase Remote Config)
          </h2>
          <p className="mt-1 text-xs text-text-secondary">
            Toggles de features que la app iOS consulta al arranque y al volver
            de background. Editar desde la consola oficial de Firebase —
            soporta condiciones por país / versión / segmento.
          </p>
        </div>
        <div className="px-5 py-4 space-y-3">
          <a
            href="https://console.firebase.google.com/project/vamo-dbad6/config"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 transition-colors"
          >
            Abrir Firebase Console →
          </a>
          <p className="text-xs text-text-muted">
            12 parámetros activos: <code className="text-[11px]">community_enabled</code>,
            {" "}<code className="text-[11px]">chat_ia_enabled</code>,
            {" "}<code className="text-[11px]">briefing_enabled</code>,
            {" "}<code className="text-[11px]">weather_enabled</code>,
            {" "}<code className="text-[11px]">live_activities_enabled</code>,
            {" "}<code className="text-[11px]">push_alerts_enabled</code>,
            {" "}<code className="text-[11px]">guest_mode_enabled</code>,
            {" "}<code className="text-[11px]">sharing_enabled</code>,
            {" "}<code className="text-[11px]">alarms_enabled</code>,
            {" "}<code className="text-[11px]">stm_account_enabled</code>,
            {" "}<code className="text-[11px]">multi_region_enabled</code>,
            {" "}<code className="text-[11px]">android_promo_enabled</code>.
          </p>
        </div>
      </section>

      {/* ━━━ Otros configs custom ━━━ */}
      {!loading && items.filter((i) => !KILLSWITCH_DEFINITIONS.find((k) => k.id === i.id)).length > 0 && (
        <section className="rounded-2xl border border-border bg-bg-card overflow-hidden">
          <div className="border-b border-border bg-bg-subtle px-5 py-3">
            <h2 className="text-sm font-bold text-text">
              Otros configs en Firestore
            </h2>
            <p className="mt-1 text-xs text-text-secondary">
              Documentos en config/* que no son killswitches conocidos.
            </p>
          </div>
          <div className="divide-y divide-border">
            {items
              .filter((i) => !KILLSWITCH_DEFINITIONS.find((k) => k.id === i.id))
              .map((item) => (
                <div key={item.id} className="flex items-center justify-between px-5 py-3 gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-xs text-text">{item.id}</p>
                    {item.description && (
                      <p className="mt-1 text-xs text-text-muted line-clamp-2">{item.description}</p>
                    )}
                  </div>
                  <code className="text-xs text-text-secondary truncate max-w-[40%]">
                    {JSON.stringify(item.value)}
                  </code>
                </div>
              ))}
          </div>
        </section>
      )}
    </div>
  );
}
