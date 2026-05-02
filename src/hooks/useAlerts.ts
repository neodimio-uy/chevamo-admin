"use client";

import { useEffect, useState } from "react";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  Timestamp,
  getDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { TransitAlert } from "@/lib/types";
import { logActivity, logAudit } from "@/lib/audit";

const ALERTS_COLLECTION = "alerts";

export type AlertInput = Omit<
  TransitAlert,
  "id" | "createdAt" | "updatedAt" | "pushSent" | "sentAt"
>;

export function useAlerts() {
  const [alerts, setAlerts] = useState<TransitAlert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, ALERTS_COLLECTION),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as TransitAlert[];
      setAlerts(items);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  return { alerts, loading };
}

export function useAlert(id: string) {
  const [alert, setAlert] = useState<TransitAlert | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    const unsubscribe = onSnapshot(
      doc(db, ALERTS_COLLECTION, id),
      (snapshot) => {
        if (snapshot.exists()) {
          setAlert({ id: snapshot.id, ...snapshot.data() } as TransitAlert);
        } else {
          setAlert(null);
        }
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [id]);

  return { alert, loading };
}

export async function createAlert(data: AlertInput) {
  const now = Timestamp.now();
  const ref = await addDoc(collection(db, ALERTS_COLLECTION), {
    ...data,
    pushSent: false,
    sentAt: null,
    createdAt: now,
    updatedAt: now,
  });
  // Activity + audit log (non-blocking)
  logActivity({
    kind: "alert.created",
    actor: data.createdBy,
    target: `alert:${ref.id}`,
    summary: `Creó alerta "${data.title}"${data.severity === "critical" ? " (crítica)" : ""}`,
    metadata: {
      severity: data.severity,
      type: data.type,
      affectedLines: data.affectedLines.join(",") || "sistema",
    },
  });
  logAudit({
    actor: data.createdBy,
    action: "alerts.create",
    resource: `alert:${ref.id}`,
    after: data,
  });
  return ref;
}

export async function updateAlert(id: string, data: AlertInput) {
  const before = await getDoc(doc(db, ALERTS_COLLECTION, id));
  await updateDoc(doc(db, ALERTS_COLLECTION, id), {
    ...data,
    updatedAt: Timestamp.now(),
  });
  logActivity({
    kind: "alert.updated",
    actor: data.createdBy,
    target: `alert:${id}`,
    summary: `Editó alerta "${data.title}"`,
  });
  logAudit({
    actor: data.createdBy,
    action: "alerts.update",
    resource: `alert:${id}`,
    before: before.data() ?? null,
    after: data,
  });
}

export async function toggleAlert(id: string, actorEmail?: string) {
  const snapshot = await getDoc(doc(db, ALERTS_COLLECTION, id));
  if (!snapshot.exists()) return;
  const current = snapshot.data() as TransitAlert;
  await updateDoc(doc(db, ALERTS_COLLECTION, id), {
    active: !current.active,
    updatedAt: Timestamp.now(),
  });
  const actor = actorEmail || current.createdBy || "system";
  logActivity({
    kind: current.active ? "alert.deactivated" : "alert.updated",
    actor,
    target: `alert:${id}`,
    summary: current.active
      ? `Desactivó alerta "${current.title}"`
      : `Reactivó alerta "${current.title}"`,
  });
}

export async function deleteAlert(id: string, actorEmail?: string) {
  const snapshot = await getDoc(doc(db, ALERTS_COLLECTION, id));
  const current = snapshot.data() as TransitAlert | undefined;
  await deleteDoc(doc(db, ALERTS_COLLECTION, id));
  const actor = actorEmail || current?.createdBy || "system";
  logActivity({
    kind: "alert.deleted",
    actor,
    target: `alert:${id}`,
    summary: `Eliminó alerta${current ? ` "${current.title}"` : ""}`,
  });
  logAudit({
    actor,
    action: "alerts.delete",
    resource: `alert:${id}`,
    before: current ?? null,
  });
}
