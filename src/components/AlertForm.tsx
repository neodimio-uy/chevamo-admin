"use client";

import { useState } from "react";
import type {
  AlertType,
  AlertSeverity,
  TransitAlert,
} from "@/lib/types";
import {
  ALERT_TYPE_LABELS,
  ALERT_SEVERITY_LABELS,
} from "@/lib/types";
import type { AlertInput } from "@/hooks/useAlerts";
import { Timestamp } from "firebase/firestore";
import AlertPreview from "./AlertPreview";

interface AlertFormProps {
  initial?: TransitAlert;
  onSubmit: (data: AlertInput) => Promise<void>;
  userEmail: string;
  submitLabel: string;
}

const ALERT_TYPES: AlertType[] = [
  "incident",
  "detour",
  "disruption",
  "strike",
  "info",
];

const SEVERITIES: AlertSeverity[] = ["info", "warning", "critical"];

export default function AlertForm({
  initial,
  onSubmit,
  userEmail,
  submitLabel,
}: AlertFormProps) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [body, setBody] = useState(initial?.body ?? "");
  const [type, setType] = useState<AlertType>(initial?.type ?? "info");
  const [severity, setSeverity] = useState<AlertSeverity>(
    initial?.severity ?? "info"
  );
  const [linesInput, setLinesInput] = useState(
    initial?.affectedLines.join(", ") ?? ""
  );
  const [active, setActive] = useState(initial?.active ?? true);
  const [sendPush, setSendPush] = useState(initial?.sendPush ?? true);
  const [expiresIn, setExpiresIn] = useState("");
  const [scheduledFor, setScheduledFor] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setSubmitting(true);
    try {
      const affectedLines = linesInput
        .split(",")
        .map((l) => l.trim())
        .filter(Boolean);

      let expiresAt: Timestamp | null = initial?.expiresAt ?? null;
      if (!initial && expiresIn) {
        const hours = parseInt(expiresIn, 10);
        if (!isNaN(hours) && hours > 0) {
          expiresAt = Timestamp.fromDate(
            new Date(Date.now() + hours * 60 * 60 * 1000)
          );
        }
      }

      const scheduledForTs: Timestamp | null =
        !initial && scheduledFor
          ? Timestamp.fromDate(new Date(scheduledFor))
          : initial?.scheduledFor ?? null;

      await onSubmit({
        title: title.trim(),
        body: body.trim(),
        type,
        severity,
        affectedLines,
        active,
        sendPush,
        expiresAt,
        scheduledFor: scheduledForTs,
        createdBy: initial?.createdBy ?? userEmail,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const pushAlreadySent = initial?.pushSent === true;

  const parsedLines = linesInput
    .split(",")
    .map((l) => l.trim())
    .filter(Boolean);

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Título */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-text">
          Título
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Paro de CUTCSA"
          required
          className="w-full rounded-xl border border-border bg-bg-input px-4 py-2.5 text-sm text-text placeholder:text-text-muted focus:border-border-focus focus:ring-1 focus:ring-border-focus"
        />
      </div>

      {/* Cuerpo */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-text">
          Descripción
        </label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Detalle de la alerta..."
          rows={4}
          className="w-full rounded-xl border border-border bg-bg-input px-4 py-2.5 text-sm text-text placeholder:text-text-muted focus:border-border-focus focus:ring-1 focus:ring-border-focus resize-none"
        />
      </div>

      {/* Tipo y Severidad */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-text">
            Tipo
          </label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as AlertType)}
            className="w-full rounded-xl border border-border bg-bg-input px-4 py-2.5 text-sm text-text focus:border-border-focus focus:ring-1 focus:ring-border-focus"
          >
            {ALERT_TYPES.map((t) => (
              <option key={t} value={t}>
                {ALERT_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-text">
            Severidad
          </label>
          <div className="flex gap-2">
            {SEVERITIES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSeverity(s)}
                className={`flex-1 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors ${
                  severity === s
                    ? s === "critical"
                      ? "border-danger bg-danger/10 text-danger"
                      : s === "warning"
                        ? "border-warning bg-warning/10 text-warning"
                        : "border-info bg-info/10 text-info"
                    : "border-border text-text-secondary hover:border-border-focus"
                }`}
              >
                {ALERT_SEVERITY_LABELS[s]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Líneas afectadas */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-text">
          Líneas afectadas
        </label>
        <input
          type="text"
          value={linesInput}
          onChange={(e) => setLinesInput(e.target.value)}
          placeholder="124, D10, 180 (vacío = todas)"
          className="w-full rounded-xl border border-border bg-bg-input px-4 py-2.5 text-sm text-text placeholder:text-text-muted focus:border-border-focus focus:ring-1 focus:ring-border-focus"
        />
        <p className="mt-1 text-xs text-text-muted">
          Separar con comas. Vacío = alerta del sistema completo, llega a todos.
        </p>
      </div>

      {/* Push toggle */}
      <div className="rounded-xl border border-border bg-bg p-4">
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={() => setSendPush(!sendPush)}
            className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors ${
              sendPush ? "bg-primary" : "bg-border"
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                sendPush ? "translate-x-5" : ""
              }`}
            />
          </button>
          <div className="flex-1">
            <p className="text-sm font-medium text-text">
              Enviar push notification
            </p>
            <p className="mt-0.5 text-xs text-text-secondary">
              {sendPush
                ? linesInput.trim()
                  ? `Los usuarios suscritos a las líneas afectadas recibirán una notificación push.`
                  : `Todos los usuarios de la app recibirán una notificación push.`
                : "Solo aparecerá como banner in-app cuando el usuario abra la app."}
            </p>
            {pushAlreadySent && (
              <p className="mt-2 text-xs font-medium text-success">
                ✓ Push ya enviado. Cambios a la alerta NO reenvían push automáticamente.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Scheduling + Expiración (solo en creación) */}
      {!initial && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-text">
              Programar publicación
            </label>
            <input
              type="datetime-local"
              value={scheduledFor}
              onChange={(e) => setScheduledFor(e.target.value)}
              className="w-full rounded-xl border border-border bg-bg-input px-4 py-2.5 text-sm text-text focus:border-border-focus focus:ring-1 focus:ring-border-focus"
            />
            <p className="mt-1 text-xs text-text-muted">
              Vacío = se activa ahora
            </p>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-text">
              Expiración automática
            </label>
            <select
              value={expiresIn}
              onChange={(e) => setExpiresIn(e.target.value)}
              className="w-full rounded-xl border border-border bg-bg-input px-4 py-2.5 text-sm text-text focus:border-border-focus focus:ring-1 focus:ring-border-focus"
            >
              <option value="">Sin expiración</option>
              <option value="1">1 hora</option>
              <option value="2">2 horas</option>
              <option value="4">4 horas</option>
              <option value="8">8 horas</option>
              <option value="12">12 horas</option>
              <option value="24">24 horas</option>
              <option value="48">48 horas</option>
            </select>
          </div>
        </div>
      )}

      {/* Estado activo (solo en edición) */}
      {initial && (
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setActive(!active)}
            className={`relative h-6 w-11 rounded-full transition-colors ${
              active ? "bg-success" : "bg-border"
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                active ? "translate-x-5" : ""
              }`}
            />
          </button>
          <span className="text-sm font-medium text-text">
            {active ? "Activa — visible en la app" : "Inactiva — oculta"}
          </span>
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={submitting || !title.trim()}
        className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-primary-hover disabled:opacity-50"
      >
        {submitting ? "Guardando..." : submitLabel}
      </button>
    </form>

    {/* Preview */}
    <aside className="hidden lg:block">
      <div className="sticky top-4">
        <AlertPreview
          title={title}
          body={body}
          severity={severity}
          type={type}
          affectedLines={parsedLines}
        />
      </div>
    </aside>
    </div>
  );
}
