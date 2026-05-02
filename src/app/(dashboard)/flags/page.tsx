"use client";

import { useState } from "react";
import {
  useFeatureFlags,
  upsertFeatureFlag,
  toggleFeatureFlag,
} from "@/hooks/useFeatureFlags";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/components/Toast";
import type { FeatureFlag } from "@/lib/extended-types";

/**
 * Feature flags conocidos. Cuando se agrega un flag nuevo en una app,
 * se lista acá para que aparezca aunque no esté aún en Firestore.
 */
const KNOWN_FLAGS: Array<{
  id: string;
  description: string;
  defaultEnabled: boolean;
}> = [
  {
    id: "community",
    description:
      "Sistema de reportes comunitarios (compartir viaje en vivo). Kill switch global.",
    defaultEnabled: true,
  },
  {
    id: "chat_ia",
    description: "Chat IA con Gemini en la app.",
    defaultEnabled: true,
  },
  {
    id: "briefing",
    description: "Briefing matutino con IA.",
    defaultEnabled: true,
  },
  {
    id: "alarms",
    description: "Alarmas vinculadas al transporte.",
    defaultEnabled: true,
  },
  {
    id: "weather",
    description: "Integración con Google Weather en ETA context.",
    defaultEnabled: true,
  },
  {
    id: "live_activities",
    description: "Live Activities iOS durante viaje.",
    defaultEnabled: true,
  },
  {
    id: "push_alerts",
    description: "Push notifications de alertas via FCM.",
    defaultEnabled: true,
  },
  {
    id: "guest_mode",
    description: "Modo invitado (sin cuenta).",
    defaultEnabled: true,
  },
  {
    id: "multi_region",
    description: "Soporte multi-región (más ciudades).",
    defaultEnabled: false,
  },
];

export default function FlagsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { flags, loading } = useFeatureFlags();

  const flagsMap = new Map(flags.map((f) => [f.id, f]));

  const allFlags = KNOWN_FLAGS.map((known) => {
    const existing = flagsMap.get(known.id);
    return {
      id: known.id,
      description: known.description,
      enabled: existing?.enabled ?? known.defaultEnabled,
      updatedAt: existing?.updatedAt ?? null,
      updatedBy: existing?.updatedBy ?? null,
      isDefault: !existing,
    };
  });

  // Agregar flags que existen en Firestore pero no están en KNOWN_FLAGS
  for (const flag of flags) {
    if (!KNOWN_FLAGS.find((k) => k.id === flag.id)) {
      allFlags.push({
        id: flag.id,
        description: flag.description || "(sin descripción)",
        enabled: flag.enabled,
        updatedAt: flag.updatedAt ?? null,
        updatedBy: flag.updatedBy ?? null,
        isDefault: false,
      });
    }
  }

  const handleToggle = async (flagId: string, currentEnabled: boolean) => {
    if (!user?.email) return;
    try {
      const existing = flagsMap.get(flagId);
      const known = KNOWN_FLAGS.find((k) => k.id === flagId);
      if (existing) {
        await toggleFeatureFlag(existing, user.email);
      } else {
        await upsertFeatureFlag(
          flagId,
          {
            enabled: !currentEnabled,
            description: known?.description || "",
          } as Omit<FeatureFlag, "id" | "updatedAt" | "updatedBy">,
          user.email
        );
      }
      toast(
        `${flagId}: ${!currentEnabled ? "habilitado" : "deshabilitado"}`,
        "success"
      );
    } catch (e) {
      toast(e instanceof Error ? e.message : "Error", "error");
    }
  };

  const [newFlagId, setNewFlagId] = useState("");
  const [newFlagDesc, setNewFlagDesc] = useState("");

  const handleCreate = async () => {
    if (!user?.email || !newFlagId.trim()) return;
    try {
      await upsertFeatureFlag(
        newFlagId.trim().toLowerCase().replace(/\s+/g, "_"),
        {
          enabled: false,
          description: newFlagDesc.trim() || "(sin descripción)",
        } as Omit<FeatureFlag, "id" | "updatedAt" | "updatedBy">,
        user.email
      );
      toast("Flag creada", "success");
      setNewFlagId("");
      setNewFlagDesc("");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Error", "error");
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text">Feature Flags</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Kill switches remotos para activar o desactivar features sin deploy.
          Las apps consultan estos valores al iniciar.
        </p>
      </div>

      {/* Warning card */}
      <div className="mb-6 rounded-2xl border border-warning/30 bg-warning/5 p-4">
        <div className="flex items-start gap-3">
          <span className="text-2xl">⚠️</span>
          <div>
            <p className="text-sm font-semibold text-warning">
              Acción crítica
            </p>
            <p className="mt-0.5 text-xs text-text-secondary">
              Deshabilitar una flag afecta a TODOS los usuarios de forma inmediata.
              Usar con cuidado para kill switches de emergencia.
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : (
        <div className="space-y-2 mb-8">
          {allFlags.map((flag) => {
            const updated = flag.updatedAt?.toDate?.();
            return (
              <div
                key={flag.id}
                className="rounded-2xl border border-border bg-bg-card p-4 shadow-sm"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <code className="font-mono text-sm font-semibold text-text">
                        {flag.id}
                      </code>
                      {flag.isDefault && (
                        <span className="rounded-full bg-text-muted/10 px-2 py-0.5 text-[10px] font-medium text-text-muted">
                          Default
                        </span>
                      )}
                      {flag.enabled ? (
                        <span className="rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-semibold text-success">
                          ON
                        </span>
                      ) : (
                        <span className="rounded-full bg-danger/10 px-2 py-0.5 text-[10px] font-semibold text-danger">
                          OFF
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-text-secondary">
                      {flag.description}
                    </p>
                    {updated && (
                      <p className="mt-1 text-xs text-text-muted">
                        Actualizado {updated.toLocaleString("es-UY")}
                        {flag.updatedBy && ` por ${flag.updatedBy}`}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => handleToggle(flag.id, flag.enabled)}
                    className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                      flag.enabled ? "bg-success" : "bg-border"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                        flag.enabled ? "translate-x-5" : ""
                      }`}
                    />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Crear flag custom */}
      <div className="rounded-2xl border border-border bg-bg-card p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-text mb-3">
          Crear flag personalizada
        </h2>
        <div className="grid gap-3 sm:grid-cols-[1fr_2fr]">
          <input
            type="text"
            value={newFlagId}
            onChange={(e) => setNewFlagId(e.target.value)}
            placeholder="ej: nueva_feature"
            className="rounded-xl border border-border bg-bg-input px-3 py-2 text-sm font-mono text-text placeholder:text-text-muted focus:border-border-focus"
          />
          <input
            type="text"
            value={newFlagDesc}
            onChange={(e) => setNewFlagDesc(e.target.value)}
            placeholder="Descripción breve"
            className="rounded-xl border border-border bg-bg-input px-3 py-2 text-sm text-text placeholder:text-text-muted focus:border-border-focus"
          />
        </div>
        <button
          onClick={handleCreate}
          disabled={!newFlagId.trim()}
          className="mt-3 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-50"
        >
          Crear
        </button>
      </div>
    </div>
  );
}
