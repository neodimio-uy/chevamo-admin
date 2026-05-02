"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/components/Toast";
import { createAlert } from "@/hooks/useAlerts";
import { useAlertTemplates, trackTemplateUsage } from "@/hooks/useAlertTemplates";
import AlertForm from "@/components/AlertForm";
import type { TransitAlert } from "@/lib/types";
import { Timestamp } from "firebase/firestore";

function NewAlertContent() {
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const { templates } = useAlertTemplates();

  const [initialData, setInitialData] = useState<TransitAlert | null>(null);
  const [templateUsedId, setTemplateUsedId] = useState<string | null>(null);
  const [sourceLabel, setSourceLabel] = useState<string | null>(null);

  // Prefill desde template o anomalía
  useEffect(() => {
    const templateId = searchParams.get("template");
    const anomalyKind = searchParams.get("anomaly");
    const anomalyTarget = searchParams.get("target");
    const anomalyTitle = searchParams.get("title");

    if (templateId) {
      const t = templates.find((x) => x.id === templateId);
      if (t) {
        setInitialData({
          id: "",
          title: t.title,
          body: t.body,
          type: t.type as TransitAlert["type"],
          severity: t.severity as TransitAlert["severity"],
          affectedLines: t.affectedLines,
          active: true,
          sendPush: t.sendPushDefault,
          pushSent: false,
          sentAt: null,
          scheduledFor: null,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
          expiresAt: null,
          createdBy: user?.email ?? "",
        });
        setTemplateUsedId(templateId);
        setSourceLabel(`Plantilla: ${t.name}`);
      }
    } else if (anomalyKind) {
      const affectedLines: string[] = [];
      if (anomalyKind === "low-fleet" && anomalyTarget) {
        // target suele ser una empresa; no pre-llena líneas
      }
      setInitialData({
        id: "",
        title: anomalyTitle || "Incidente operativo detectado",
        body:
          anomalyKind === "low-fleet"
            ? `Detectamos que ${anomalyTarget || "una empresa"} está operando con pocos buses. Puede haber demoras.`
            : "Detectamos un incidente operativo en el sistema. Estamos investigando.",
        type: anomalyKind === "low-fleet" ? "disruption" : "incident",
        severity: anomalyKind === "no-buses" ? "critical" : "warning",
        affectedLines,
        active: true,
        sendPush: true,
        pushSent: false,
        sentAt: null,
        scheduledFor: null,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        expiresAt: null,
        createdBy: user?.email ?? "",
      } as TransitAlert);
      setSourceLabel(`Sugerencia automática · ${anomalyKind}`);
    }
  }, [searchParams, templates, user?.email]);

  return (
    <div>
      <div className="mb-8">
        <Link
          href="/alerts"
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
          Volver a alertas
        </Link>
        <h1 className="text-2xl font-bold text-text">Nueva alerta</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Los usuarios van a ver esta alerta en la app.
        </p>
        {sourceLabel && (
          <div className="mt-3 inline-flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary">
            <span>✨</span> {sourceLabel}
          </div>
        )}
      </div>

      {/* Sugerencias de templates (si no hay prefill) */}
      {!initialData && templates.length > 0 && (
        <div className="mb-6 rounded-2xl border border-border bg-bg-card p-4 shadow-sm">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-text-muted">
            Plantillas más usadas
          </p>
          <div className="flex flex-wrap gap-2">
            {templates.slice(0, 5).map((t) => (
              <Link
                key={t.id}
                href={`/alerts/new?template=${t.id}`}
                className="flex items-center gap-1.5 rounded-lg border border-border bg-bg px-3 py-1.5 text-xs font-medium text-text hover:border-primary hover:bg-primary-light"
              >
                <span>{t.icon || "📋"}</span>
                <span>{t.name}</span>
              </Link>
            ))}
            <Link
              href="/templates"
              className="rounded-lg px-3 py-1.5 text-xs font-medium text-text-muted hover:text-primary"
            >
              Ver todas →
            </Link>
          </div>
        </div>
      )}

      {/* Form */}
      <div className="rounded-2xl border border-border bg-bg-card p-6 shadow-sm">
        <AlertForm
          initial={initialData ?? undefined}
          userEmail={user?.email ?? ""}
          submitLabel="Crear alerta"
          onSubmit={async (data) => {
            await createAlert(data);
            if (templateUsedId) {
              trackTemplateUsage(templateUsedId).catch(() => {});
            }
            toast("Alerta creada correctamente", "success");
            router.push("/alerts");
          }}
        />
      </div>
    </div>
  );
}

export default function NewAlertPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      }
    >
      <NewAlertContent />
    </Suspense>
  );
}
