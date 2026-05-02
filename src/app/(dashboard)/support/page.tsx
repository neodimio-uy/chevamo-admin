"use client";

import { useMemo, useState } from "react";
import {
  useSupportTickets,
  updateTicketStatus,
  updateTicketPriority,
  replyToTicket,
} from "@/hooks/useSupportTickets";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/components/Toast";
import type {
  SupportTicket,
  TicketStatus,
  TicketPriority,
} from "@/lib/extended-types";

const STATUS_LABELS: Record<TicketStatus, string> = {
  open: "Abierto",
  pending: "Pendiente de usuario",
  resolved: "Resuelto",
  closed: "Cerrado",
};

const STATUS_STYLES: Record<TicketStatus, string> = {
  open: "bg-info/10 text-info border-info/30",
  pending: "bg-warning/10 text-warning border-warning/30",
  resolved: "bg-success/10 text-success border-success/30",
  closed: "bg-bg text-text-muted border-border",
};

const PRIORITY_LABELS: Record<TicketPriority, string> = {
  low: "Baja",
  medium: "Media",
  high: "Alta",
  urgent: "Urgente",
};

const PRIORITY_STYLES: Record<TicketPriority, string> = {
  low: "text-text-muted",
  medium: "text-info",
  high: "text-warning",
  urgent: "text-danger",
};

function timeAgo(date: Date): string {
  const secs = Math.floor((Date.now() - date.getTime()) / 1000);
  if (secs < 60) return `hace ${secs}s`;
  const min = Math.floor(secs / 60);
  if (min < 60) return `hace ${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `hace ${hr}h`;
  return `hace ${Math.floor(hr / 24)}d`;
}

export default function SupportPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { tickets, loading } = useSupportTickets();
  const [selected, setSelected] = useState<SupportTicket | null>(null);
  const [reply, setReply] = useState("");
  const [replyInternal, setReplyInternal] = useState(false);
  const [filter, setFilter] = useState<TicketStatus | "all">("all");

  const filtered = useMemo(() => {
    if (filter === "all") return tickets;
    return tickets.filter((t) => t.status === filter);
  }, [tickets, filter]);

  const counts = useMemo(() => {
    const c = { open: 0, pending: 0, resolved: 0, closed: 0 };
    for (const t of tickets) c[t.status]++;
    return c;
  }, [tickets]);

  const handleReply = async () => {
    if (!selected || !user?.email || !reply.trim()) return;
    try {
      await replyToTicket(selected.id, reply.trim(), user.email, replyInternal);
      toast("Respuesta enviada", "success");
      setReply("");
      setReplyInternal(false);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Error", "error");
    }
  };

  const handleStatus = async (status: TicketStatus) => {
    if (!selected || !user?.email) return;
    try {
      await updateTicketStatus(selected.id, status, user.email);
      toast(`Ticket marcado como ${STATUS_LABELS[status].toLowerCase()}`, "success");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Error", "error");
    }
  };

  const handlePriority = async (priority: TicketPriority) => {
    if (!selected) return;
    try {
      await updateTicketPriority(selected.id, priority);
      toast("Prioridad actualizada", "success");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Error", "error");
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text">Centro de Soporte</h1>
        <p className="mt-1 text-sm text-text-secondary">
          {loading
            ? "Cargando tickets..."
            : `${tickets.length} ticket${tickets.length !== 1 ? "s" : ""} totales · ${counts.open} abiertos`}
        </p>
      </div>

      {/* Filters */}
      <div className="mb-4 flex gap-2 flex-wrap">
        {(["all", "open", "pending", "resolved", "closed"] as const).map(
          (f) => {
            const count =
              f === "all" ? tickets.length : counts[f as TicketStatus];
            const isActive = filter === f;
            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-xl border px-3 py-1.5 text-xs font-medium transition-colors ${
                  isActive
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-text-secondary hover:border-border-focus"
                }`}
              >
                {f === "all" ? "Todos" : STATUS_LABELS[f as TicketStatus]} (
                {count})
              </button>
            );
          }
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_1.5fr]">
        {/* Lista de tickets */}
        <div className="overflow-hidden rounded-2xl border border-border bg-bg-card shadow-sm">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-success/10">
                <svg
                  className="h-6 w-6 text-success"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z"
                  />
                </svg>
              </div>
              <p className="text-sm text-text-secondary">
                {filter === "all"
                  ? "Sin tickets. Cuando los usuarios reporten, aparecen acá."
                  : `Sin tickets ${STATUS_LABELS[filter as TicketStatus].toLowerCase()}`}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border max-h-[calc(100vh-250px)] overflow-y-auto">
              {filtered.map((ticket) => {
                const isSelected = selected?.id === ticket.id;
                const updated = ticket.updatedAt?.toDate?.();
                return (
                  <button
                    key={ticket.id}
                    onClick={() => setSelected(ticket)}
                    className={`w-full text-left px-4 py-3 transition-colors ${
                      isSelected
                        ? "bg-primary-light/30"
                        : "hover:bg-bg"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className="truncate text-sm font-semibold text-text">
                        {ticket.subject}
                      </p>
                      <span
                        className={`shrink-0 rounded-md border px-1.5 py-0.5 text-[10px] font-medium ${STATUS_STYLES[ticket.status]}`}
                      >
                        {STATUS_LABELS[ticket.status]}
                      </span>
                    </div>
                    <p className="mb-1 truncate text-xs text-text-secondary">
                      {ticket.userName || ticket.userEmail || "Usuario anónimo"} ·{" "}
                      {ticket.device.platform}
                      {ticket.priority !== "medium" && (
                        <span
                          className={`ml-2 font-medium ${PRIORITY_STYLES[ticket.priority]}`}
                        >
                          · {PRIORITY_LABELS[ticket.priority]}
                        </span>
                      )}
                    </p>
                    <p className="truncate text-xs text-text-muted">
                      {updated ? timeAgo(updated) : "—"} ·{" "}
                      {ticket.replies?.length ?? 0} respuesta
                      {(ticket.replies?.length ?? 0) !== 1 ? "s" : ""}
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Detalle */}
        <div>
          {!selected ? (
            <div className="rounded-2xl border border-dashed border-border bg-bg-card p-12 text-center">
              <h3 className="text-base font-semibold text-text">
                Seleccioná un ticket
              </h3>
              <p className="mt-1 text-sm text-text-secondary">
                El detalle y las respuestas aparecen acá.
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-border bg-bg-card shadow-sm">
              {/* Header del ticket */}
              <div className="border-b border-border p-5">
                <h2 className="text-lg font-bold text-text mb-2">
                  {selected.subject}
                </h2>
                <div className="flex items-center gap-2 flex-wrap text-xs text-text-muted mb-3">
                  <span>
                    {selected.userName ||
                      selected.userEmail ||
                      "Usuario anónimo"}
                  </span>
                  <span>·</span>
                  <span className="font-mono">
                    {selected.device.platform}
                    {selected.device.appVersion && ` v${selected.device.appVersion}`}
                  </span>
                  {selected.device.osVersion && (
                    <>
                      <span>·</span>
                      <span className="font-mono">
                        {selected.device.osVersion}
                      </span>
                    </>
                  )}
                </div>
                <div className="flex gap-2 flex-wrap">
                  <select
                    value={selected.status}
                    onChange={(e) =>
                      handleStatus(e.target.value as TicketStatus)
                    }
                    className="rounded-lg border border-border bg-bg-input px-3 py-1 text-xs font-medium text-text focus:border-border-focus"
                  >
                    {(Object.keys(STATUS_LABELS) as TicketStatus[]).map((s) => (
                      <option key={s} value={s}>
                        {STATUS_LABELS[s]}
                      </option>
                    ))}
                  </select>
                  <select
                    value={selected.priority}
                    onChange={(e) =>
                      handlePriority(e.target.value as TicketPriority)
                    }
                    className="rounded-lg border border-border bg-bg-input px-3 py-1 text-xs font-medium text-text focus:border-border-focus"
                  >
                    {(Object.keys(PRIORITY_LABELS) as TicketPriority[]).map(
                      (p) => (
                        <option key={p} value={p}>
                          Prioridad: {PRIORITY_LABELS[p]}
                        </option>
                      )
                    )}
                  </select>
                </div>
              </div>

              {/* Mensaje original + replies */}
              <div className="p-5 space-y-3 max-h-[50vh] overflow-y-auto">
                <div className="rounded-xl border border-border bg-bg p-3">
                  <p className="mb-1 text-xs font-semibold text-text-secondary">
                    {selected.userName || selected.userEmail || "Usuario"}
                  </p>
                  <p className="whitespace-pre-wrap text-sm text-text">
                    {selected.body}
                  </p>
                  {selected.attachmentURLs && selected.attachmentURLs.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {selected.attachmentURLs.map((url, idx) => (
                        <a
                          key={idx}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block overflow-hidden rounded-lg border border-border hover:border-primary transition-colors"
                          title={`Captura ${idx + 1} (clic para ver completa)`}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={url}
                            alt={`Captura adjunta ${idx + 1}`}
                            className="h-24 w-24 object-cover"
                            loading="lazy"
                          />
                        </a>
                      ))}
                    </div>
                  )}
                </div>
                {selected.replies?.map((r, i) => {
                  const isAdmin = r.by !== selected.userEmail;
                  return (
                    <div
                      key={i}
                      className={`rounded-xl border p-3 ${
                        r.internal
                          ? "border-warning/30 bg-warning/5"
                          : isAdmin
                            ? "border-primary/30 bg-primary/5 ml-6"
                            : "border-border bg-bg"
                      }`}
                    >
                      <p className="mb-1 text-xs font-semibold text-text-secondary">
                        {r.internal && "📝 Nota interna · "}
                        {isAdmin ? `👤 ${r.by.split("@")[0]}` : r.by}
                      </p>
                      <p className="whitespace-pre-wrap text-sm text-text">
                        {r.message}
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* Reply box */}
              <div className="border-t border-border p-4">
                <textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  placeholder={
                    replyInternal
                      ? "Nota interna (no visible al usuario)..."
                      : "Respuesta al usuario..."
                  }
                  rows={3}
                  className="w-full rounded-xl border border-border bg-bg-input px-3 py-2 text-sm text-text placeholder:text-text-muted focus:border-border-focus focus:ring-1 focus:ring-border-focus resize-none"
                />
                <div className="mt-2 flex items-center justify-between">
                  <label className="flex items-center gap-2 text-xs text-text-secondary">
                    <input
                      type="checkbox"
                      checked={replyInternal}
                      onChange={(e) => setReplyInternal(e.target.checked)}
                      className="rounded"
                    />
                    Nota interna (no se envía al usuario)
                  </label>
                  <button
                    onClick={handleReply}
                    disabled={!reply.trim()}
                    className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-50"
                  >
                    Enviar
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
