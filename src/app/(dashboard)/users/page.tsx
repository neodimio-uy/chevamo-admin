"use client";

import { useMemo, useState } from "react";
import {
  useUsers,
  banUser,
  unbanUser,
  setUserTier,
  addStrike,
  clearStrikes,
  setAdminNotes,
} from "@/hooks/useUsers";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/components/Toast";
import type { UserDoc, UserTier } from "@/lib/extended-types";

const TIER_LABELS: Record<UserTier, string> = {
  anonymous: "Anónimo",
  basic: "Básico",
  verified: "Verificado",
  premium: "Premium",
  admin: "Admin",
};

const TIER_COLORS: Record<UserTier, string> = {
  anonymous: "bg-bg-subtle text-text-secondary",
  basic: "bg-blue-500/10 text-blue-500",
  verified: "bg-green-500/10 text-green-500",
  premium: "bg-purple-500/10 text-purple-500",
  admin: "bg-orange-500/10 text-orange-500",
};

export default function UsersPage() {
  const { users, loading } = useUsers(500);
  const { user: adminUser } = useAuth();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [selectedUid, setSelectedUid] = useState<string | null>(null);
  const [showBannedOnly, setShowBannedOnly] = useState(false);
  const [showStrikersOnly, setShowStrikersOnly] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      if (showBannedOnly && !u.banned) return false;
      if (showStrikersOnly && (!u.strikes || u.strikes === 0)) return false;
      if (!q) return true;
      return (
        u.uid.toLowerCase().includes(q) ||
        (u.email ?? "").toLowerCase().includes(q) ||
        (u.displayName ?? "").toLowerCase().includes(q)
      );
    });
  }, [users, search, showBannedOnly, showStrikersOnly]);

  const selected = useMemo(
    () => users.find((u) => u.uid === selectedUid) ?? null,
    [users, selectedUid]
  );

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text">Usuarios</h1>
          <p className="mt-1 text-sm text-text-secondary">
            {users.length} registrados (top 500 por última actividad).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Buscar por uid / email / nombre…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text w-72"
          />
          <label className="flex items-center gap-2 text-xs text-text-secondary cursor-pointer">
            <input
              type="checkbox"
              checked={showBannedOnly}
              onChange={(e) => setShowBannedOnly(e.target.checked)}
            />
            Solo baneados
          </label>
          <label className="flex items-center gap-2 text-xs text-text-secondary cursor-pointer">
            <input
              type="checkbox"
              checked={showStrikersOnly}
              onChange={(e) => setShowStrikersOnly(e.target.checked)}
            />
            Solo con strikes
          </label>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-4">
        {/* ━━━ Tabla de users ━━━ */}
        <section className="rounded-2xl border border-border bg-bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-bg-subtle text-text-secondary">
                <tr>
                  <th className="px-4 py-2 text-left text-xs uppercase tracking-wider font-semibold">User</th>
                  <th className="px-4 py-2 text-left text-xs uppercase tracking-wider font-semibold">Tier</th>
                  <th className="px-4 py-2 text-center text-xs uppercase tracking-wider font-semibold">Strikes</th>
                  <th className="px-4 py-2 text-center text-xs uppercase tracking-wider font-semibold">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading && (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-text-muted">Cargando…</td></tr>
                )}
                {!loading && filtered.length === 0 && (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-text-muted">Sin resultados.</td></tr>
                )}
                {filtered.map((u) => (
                  <tr
                    key={u.uid}
                    onClick={() => setSelectedUid(u.uid)}
                    className={`cursor-pointer hover:bg-bg-subtle ${selectedUid === u.uid ? "bg-bg-subtle" : ""}`}
                  >
                    <td className="px-4 py-2.5">
                      <div className="font-medium text-text truncate max-w-[260px]">
                        {u.displayName || u.email || "Anónimo"}
                      </div>
                      <div className="text-[11px] text-text-muted font-mono truncate max-w-[260px]">
                        {u.email || u.uid}
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${TIER_COLORS[u.tier ?? "anonymous"]}`}>
                        {TIER_LABELS[u.tier ?? "anonymous"]}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-center text-text">
                      {u.strikes && u.strikes > 0 ? (
                        <span className="rounded-full bg-warning/10 px-2 py-0.5 text-xs font-bold text-warning">
                          {u.strikes}
                        </span>
                      ) : (
                        <span className="text-text-muted">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      {u.banned ? (
                        <span className="rounded-full bg-danger/10 px-2 py-0.5 text-[10px] font-bold text-danger">
                          BANEADO
                        </span>
                      ) : (
                        <span className="text-xs text-green-500">activo</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ━━━ Panel de detalle ━━━ */}
        {selected ? (
          <UserDetailPanel
            user={selected}
            adminEmail={adminUser?.email ?? null}
            onAction={(msg, type) => toast(msg, type)}
            onClose={() => setSelectedUid(null)}
          />
        ) : (
          <section className="rounded-2xl border border-dashed border-border bg-bg-card p-8 text-center">
            <p className="text-sm text-text-muted">
              Seleccioná un user de la lista para ver detalle y acciones.
            </p>
          </section>
        )}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────

function UserDetailPanel({
  user,
  adminEmail,
  onAction,
  onClose,
}: {
  user: UserDoc;
  adminEmail: string | null;
  onAction: (msg: string, type?: "success" | "error" | "warning") => void;
  onClose: () => void;
}) {
  const [banReason, setBanReason] = useState("");
  const [strikeReason, setStrikeReason] = useState("");
  const [notes, setNotes] = useState(user.adminNotes ?? "");
  const [pending, setPending] = useState(false);

  const guard = (fn: () => Promise<void>) => async () => {
    if (!adminEmail) return onAction("Sesión expirada", "error");
    setPending(true);
    try {
      await fn();
    } catch (e) {
      onAction(e instanceof Error ? e.message : "Error", "error");
    } finally {
      setPending(false);
    }
  };

  const onBan = guard(async () => {
    if (!banReason.trim()) {
      onAction("Indicá razón del ban", "error");
      return;
    }
    await banUser(user.uid, banReason.trim(), adminEmail!);
    onAction("Usuario baneado", "warning");
    setBanReason("");
  });

  const onUnban = guard(async () => {
    await unbanUser(user.uid, adminEmail!);
    onAction("Usuario desbloqueado", "success");
  });

  const onTier = (tier: UserTier) =>
    guard(async () => {
      await setUserTier(user.uid, tier, adminEmail!);
      onAction(`Tier → ${tier}`, "success");
    });

  const onStrike = guard(async () => {
    if (!strikeReason.trim()) {
      onAction("Indicá razón del strike", "error");
      return;
    }
    await addStrike(user.uid, strikeReason.trim(), adminEmail!, user.strikes ?? 0);
    onAction(`Strike #${(user.strikes ?? 0) + 1} agregado`, "warning");
    setStrikeReason("");
  });

  const onClearStrikes = guard(async () => {
    await clearStrikes(user.uid, adminEmail!);
    onAction("Strikes limpiados", "success");
  });

  const onSaveNotes = guard(async () => {
    await setAdminNotes(user.uid, notes, adminEmail!);
    onAction("Notas guardadas", "success");
  });

  return (
    <section className="rounded-2xl border border-border bg-bg-card overflow-hidden">
      <header className="border-b border-border bg-bg-subtle px-4 py-3 flex items-center justify-between">
        <div className="min-w-0">
          <h2 className="text-sm font-bold text-text truncate">
            {user.displayName || user.email || "Anónimo"}
          </h2>
          <p className="text-[10px] text-text-muted font-mono truncate">{user.uid}</p>
        </div>
        <button onClick={onClose} className="text-text-muted hover:text-text text-xs">✕</button>
      </header>

      <div className="p-4 space-y-4 max-h-[calc(100vh-220px)] overflow-y-auto">
        {/* Estado actual */}
        {user.banned && (
          <div className="rounded-lg border border-danger/30 bg-danger/5 p-3">
            <p className="text-xs font-bold text-danger uppercase tracking-wider">⛔ Baneado</p>
            <p className="mt-1 text-xs text-text">{user.banReason || "(sin razón)"}</p>
            <p className="mt-1 text-[10px] text-text-muted">
              {user.bannedBy} · {user.bannedAt ? new Date(user.bannedAt.toMillis()).toLocaleString() : ""}
            </p>
          </div>
        )}

        {/* Tier */}
        <div>
          <p className="mb-2 text-xs font-semibold text-text-secondary uppercase tracking-wider">Tier</p>
          <div className="flex flex-wrap gap-1">
            {(["anonymous", "basic", "verified", "premium", "admin"] as UserTier[]).map((t) => (
              <button
                key={t}
                onClick={onTier(t)}
                disabled={pending || user.tier === t}
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  user.tier === t
                    ? "bg-primary text-white"
                    : "bg-bg-subtle text-text hover:bg-border"
                } disabled:opacity-50`}
              >
                {TIER_LABELS[t]}
              </button>
            ))}
          </div>
          {user.tier === "verified" && (
            <p className="mt-2 text-[11px] text-green-600">
              ✓ Verificado manualmente. Sus reportes pasan filtros automáticos.
            </p>
          )}
        </div>

        {/* Stats */}
        {user.stats && (
          <div className="grid grid-cols-3 gap-2">
            <Stat label="Reportes" value={user.stats.communityReports ?? 0} />
            <Stat label="Compartidos" value={user.stats.sharedTrips ?? 0} />
            <Stat label="Tickets" value={user.stats.supportTickets ?? 0} />
          </div>
        )}

        {/* Strikes */}
        <div>
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
              Strikes ({user.strikes ?? 0}/3)
            </p>
            {user.strikes && user.strikes > 0 && (
              <button onClick={onClearStrikes} disabled={pending} className="text-[11px] text-primary hover:underline">
                Limpiar todos
              </button>
            )}
          </div>
          <div className="mt-2 flex gap-2">
            <input
              type="text"
              placeholder="Razón del strike…"
              value={strikeReason}
              onChange={(e) => setStrikeReason(e.target.value)}
              className="flex-1 rounded-lg border border-border bg-bg px-2 py-1.5 text-xs text-text"
            />
            <button
              onClick={onStrike}
              disabled={pending || !strikeReason.trim()}
              className="rounded-lg bg-warning px-3 py-1.5 text-xs font-semibold text-white hover:bg-warning/90 disabled:opacity-50"
            >
              + Strike
            </button>
          </div>
        </div>

        {/* Ban / Unban */}
        <div className="rounded-lg border border-border p-3">
          {user.banned ? (
            <button
              onClick={onUnban}
              disabled={pending}
              className="w-full rounded-lg bg-green-500 py-2 text-sm font-semibold text-white hover:bg-green-600 disabled:opacity-50"
            >
              Desbloquear usuario
            </button>
          ) : (
            <div className="space-y-2">
              <textarea
                placeholder="Razón del ban (visible al user si decidimos mostrarlo)…"
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                rows={2}
                className="w-full rounded-lg border border-border bg-bg px-2 py-1.5 text-xs text-text"
              />
              <button
                onClick={onBan}
                disabled={pending || !banReason.trim()}
                className="w-full rounded-lg bg-danger py-2 text-sm font-semibold text-white hover:bg-danger/90 disabled:opacity-50"
              >
                Banear usuario
              </button>
            </div>
          )}
        </div>

        {/* Admin notes */}
        <div>
          <p className="mb-1 text-xs font-semibold text-text-secondary uppercase tracking-wider">
            Notas internas
          </p>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Solo visible para admins. Contexto, casos especiales, recordatorios."
            className="w-full rounded-lg border border-border bg-bg px-2 py-1.5 text-xs text-text"
          />
          <button
            onClick={onSaveNotes}
            disabled={pending}
            className="mt-1 rounded-lg bg-bg-subtle px-3 py-1 text-[11px] font-semibold text-text hover:bg-border"
          >
            Guardar notas
          </button>
        </div>

        {/* Device */}
        {user.device && (
          <div className="rounded-lg bg-bg-subtle p-2 text-[11px] text-text-muted font-mono">
            <p>{user.device.platform} · {user.device.appVersion ?? "-"} · OS {user.device.osVersion ?? "-"}</p>
          </div>
        )}
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-bg-subtle p-2 text-center">
      <p className="text-[10px] text-text-muted uppercase tracking-wider">{label}</p>
      <p className="mt-0.5 text-base font-bold text-text">{value}</p>
    </div>
  );
}
