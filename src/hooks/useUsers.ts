"use client";

import { useEffect, useState } from "react";
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  serverTimestamp,
  limit as fbLimit,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { UserDoc, UserTier } from "@/lib/extended-types";
import { logActivity, logAudit } from "@/lib/audit";

const COLLECTION = "users";

/**
 * Listener real-time de los users registrados (los que abrieron la app y
 * iOS hizo upsert). Limit 200 para no traer demasiado en una sentada;
 * para search/uid específico usar `useUser(uid)`.
 */
export function useUsers(limit = 200) {
  const [users, setUsers] = useState<UserDoc[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, COLLECTION),
      orderBy("lastSeenAt", "desc"),
      fbLimit(limit)
    );
    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        const parsed = snap.docs.map((d) => ({ ...d.data(), uid: d.id }) as UserDoc);
        setUsers(parsed);
        setLoading(false);
      },
      (err) => {
        console.error("users listener error:", err);
        setLoading(false);
      }
    );
    return unsubscribe;
  }, [limit]);

  return { users, loading };
}

/** Listener de un user específico por uid. */
export function useUser(uid: string | null) {
  const [user, setUser] = useState<UserDoc | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!uid) {
      setUser(null);
      return;
    }
    setLoading(true);
    const unsubscribe = onSnapshot(doc(db, COLLECTION, uid), (snap) => {
      if (snap.exists()) {
        setUser({ ...snap.data(), uid: snap.id } as UserDoc);
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, [uid]);

  return { user, loading };
}

// ─── Acciones admin ───

export async function banUser(
  uid: string,
  reason: string,
  adminEmail: string
) {
  await setDoc(
    doc(db, COLLECTION, uid),
    {
      banned: true,
      banReason: reason,
      bannedAt: serverTimestamp(),
      bannedBy: adminEmail,
    },
    { merge: true }
  );
  await logActivity({
    kind: "user.banned",
    actor: adminEmail,
    target: `user:${uid}`,
    summary: `Baneó user ${uid}: ${reason}`,
    metadata: { uid, reason },
  });
  await logAudit({
    actor: adminEmail,
    action: "user.banned",
    resource: `user:${uid}`,
    after: { banned: true, reason },
  });
}

export async function unbanUser(uid: string, adminEmail: string) {
  await setDoc(
    doc(db, COLLECTION, uid),
    {
      banned: false,
      banReason: null,
      bannedAt: null,
      bannedBy: null,
    },
    { merge: true }
  );
  await logActivity({
    kind: "user.unbanned",
    actor: adminEmail,
    target: `user:${uid}`,
    summary: `Desbloqueó user ${uid}`,
    metadata: { uid },
  });
  await logAudit({
    actor: adminEmail,
    action: "user.unbanned",
    resource: `user:${uid}`,
    after: { banned: false },
  });
}

export async function setUserTier(
  uid: string,
  tier: UserTier,
  adminEmail: string
) {
  await setDoc(
    doc(db, COLLECTION, uid),
    { tier },
    { merge: true }
  );
  await logActivity({
    kind: "user.tier_changed",
    actor: adminEmail,
    target: `user:${uid}`,
    summary: `Cambió tier de user ${uid} a ${tier}`,
    metadata: { uid, tier },
  });
  await logAudit({
    actor: adminEmail,
    action: "user.tier_changed",
    resource: `user:${uid}`,
    after: { tier },
  });
}

export async function addStrike(
  uid: string,
  reason: string,
  adminEmail: string,
  currentStrikes: number
) {
  const next = (currentStrikes ?? 0) + 1;
  await setDoc(
    doc(db, COLLECTION, uid),
    { strikes: next },
    { merge: true }
  );
  await logActivity({
    kind: "user.strike_added",
    actor: adminEmail,
    target: `user:${uid}`,
    summary: `Strike #${next} a user ${uid}: ${reason}`,
    metadata: { uid, strikes: next, reason },
  });
}

export async function clearStrikes(uid: string, adminEmail: string) {
  await setDoc(
    doc(db, COLLECTION, uid),
    { strikes: 0 },
    { merge: true }
  );
  await logActivity({
    kind: "user.strikes_cleared",
    actor: adminEmail,
    target: `user:${uid}`,
    summary: `Limpió strikes de user ${uid}`,
    metadata: { uid },
  });
}

export async function setAdminNotes(
  uid: string,
  notes: string,
  adminEmail: string
) {
  await setDoc(
    doc(db, COLLECTION, uid),
    { adminNotes: notes },
    { merge: true }
  );
  await logActivity({
    kind: "user.notes_updated",
    actor: adminEmail,
    target: `user:${uid}`,
    summary: `Actualizó notas de user ${uid}`,
    metadata: { uid },
  });
}
