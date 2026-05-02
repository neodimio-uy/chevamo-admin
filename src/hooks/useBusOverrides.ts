"use client";

import { useEffect, useState } from "react";
import {
  collection,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  deleteDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { BusOverride } from "@/lib/extended-types";
import { logActivity, logAudit } from "@/lib/audit";

const COLLECTION = "bus_overrides";

export function useBusOverrides() {
  const [overrides, setOverrides] = useState<BusOverride[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, COLLECTION),
      (snap) => {
        const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as BusOverride);
        setOverrides(items);
        setLoading(false);
      },
      (err) => {
        console.error("bus_overrides listener error:", err);
        setLoading(false);
      }
    );
    return unsubscribe;
  }, []);

  return { overrides, loading };
}

export async function setBusOverride(
  busId: string,
  patch: Partial<Omit<BusOverride, "id" | "createdAt" | "updatedAt" | "createdBy">>,
  adminEmail: string
) {
  await setDoc(
    doc(db, COLLECTION, busId),
    {
      id: busId,
      ...patch,
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
      createdBy: adminEmail,
    },
    { merge: true }
  );
  await logActivity({
    kind: "bus_override.set",
    actor: adminEmail,
    target: `bus:${busId}`,
    summary: `Override en bus ${busId}: ${Object.keys(patch).join(", ")}`,
    metadata: { busId },
  });
  await logAudit({
    actor: adminEmail,
    action: "bus_override.set",
    resource: `bus:${busId}`,
    after: patch,
  });
}

export async function clearBusOverride(busId: string, adminEmail: string) {
  await deleteDoc(doc(db, COLLECTION, busId));
  await logActivity({
    kind: "bus_override.cleared",
    actor: adminEmail,
    target: `bus:${busId}`,
    summary: `Quitó override de bus ${busId}`,
    metadata: { busId },
  });
}
