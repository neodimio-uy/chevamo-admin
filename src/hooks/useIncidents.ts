"use client";

import { useEffect, useState } from "react";
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Incident, IncidentKind, IncidentSeverity, IncidentStatus } from "@/lib/extended-types";
import { logActivity, logAudit } from "@/lib/audit";

const COLLECTION = "incidents";

export function useIncidents() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, COLLECTION), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Incident);
        setIncidents(items);
        setLoading(false);
      },
      (err) => {
        console.error("incidents listener error:", err);
        setLoading(false);
      }
    );
    return unsubscribe;
  }, []);

  return { incidents, loading };
}

export async function createIncident(
  data: Omit<Incident, "id" | "createdAt" | "updatedAt" | "resolvedAt" | "createdBy">,
  adminEmail: string
): Promise<string> {
  const ref = await addDoc(collection(db, COLLECTION), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    resolvedAt: null,
    createdBy: adminEmail,
  });
  await logActivity({
    kind: "incident.created",
    actor: adminEmail,
    target: `incident:${ref.id}`,
    summary: `Creó incidente "${data.title}"`,
    metadata: { kind: data.kind, severity: data.severity },
  });
  await logAudit({
    actor: adminEmail,
    action: "incident.created",
    resource: `incident:${ref.id}`,
    after: { ...data },
  });
  return ref.id;
}

export async function updateIncidentStatus(
  id: string,
  status: IncidentStatus,
  adminEmail: string
) {
  const patch: Record<string, unknown> = {
    status,
    updatedAt: serverTimestamp(),
  };
  if (status === "resolved") patch.resolvedAt = serverTimestamp();
  await setDoc(doc(db, COLLECTION, id), patch, { merge: true });
  await logActivity({
    kind: "incident.status_changed",
    actor: adminEmail,
    target: `incident:${id}`,
    summary: `Incidente ${id} → ${status}`,
    metadata: { status },
  });
}

export async function updateIncident(
  id: string,
  patch: Partial<Omit<Incident, "id" | "createdAt" | "createdBy">>,
  adminEmail: string
) {
  await setDoc(
    doc(db, COLLECTION, id),
    { ...patch, updatedAt: serverTimestamp() },
    { merge: true }
  );
  await logActivity({
    kind: "incident.updated",
    actor: adminEmail,
    target: `incident:${id}`,
    summary: `Editó incidente ${id}`,
    metadata: { fields: Object.keys(patch).join(",") },
  });
}

export const SEVERITY_LABELS: Record<IncidentSeverity, string> = {
  low: "Baja",
  medium: "Media",
  high: "Alta",
  critical: "Crítica",
};

export const SEVERITY_COLORS: Record<IncidentSeverity, string> = {
  low: "bg-bg-subtle text-text-secondary",
  medium: "bg-warning/10 text-warning",
  high: "bg-orange-500/10 text-orange-500",
  critical: "bg-danger/10 text-danger",
};

export const KIND_OPTIONS: IncidentKind[] = [
  "strike", "accident", "congestion", "detour", "breakdown", "weather", "other",
];
