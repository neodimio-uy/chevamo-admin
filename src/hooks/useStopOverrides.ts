"use client";

import { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  doc,
  setDoc,
  deleteDoc,
  Timestamp,
  getDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { StopOverride } from "@/lib/types";
import { logActivity, logAudit } from "@/lib/audit";

const COLLECTION = "stop_overrides";

export function useStopOverrides() {
  const [overrides, setOverrides] = useState<Record<string, StopOverride>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, COLLECTION), (snap) => {
      const map: Record<string, StopOverride> = {};
      for (const d of snap.docs) {
        map[d.id] = d.data() as StopOverride;
      }
      setOverrides(map);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  return { overrides, loading };
}

export function useStopOverride(stopId: string | number) {
  const [override, setOverride] = useState<StopOverride | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!stopId) {
      setLoading(false);
      return;
    }
    const unsubscribe = onSnapshot(
      doc(db, COLLECTION, String(stopId)),
      (snap) => {
        setOverride(snap.exists() ? (snap.data() as StopOverride) : null);
        setLoading(false);
      }
    );
    return unsubscribe;
  }, [stopId]);

  return { override, loading };
}

export async function saveStopOverride(
  stopId: string | number,
  data: Omit<StopOverride, "updatedAt" | "updatedBy">,
  userEmail: string
) {
  const docRef = doc(db, COLLECTION, String(stopId));
  const before = await getDoc(docRef);
  await setDoc(docRef, {
    ...data,
    updatedAt: Timestamp.now(),
    updatedBy: userEmail,
  });
  // Activity log
  let kind = "stop.modified";
  let summary = `Modificó parada #${stopId}`;
  if (data.suspended) {
    kind = "stop.suspended";
    summary = `Suspendió parada #${stopId}`;
  } else if (data.tempLocation) {
    kind = "stop.relocated";
    summary = `Reubicó parada #${stopId}`;
  }
  logActivity({
    kind,
    actor: userEmail,
    target: `stop:${stopId}`,
    summary,
    metadata: {
      suspended: data.suspended,
      hasNote: !!data.note,
      linesEdited: data.lines !== null,
      relocated: !!data.tempLocation,
    },
  });
  logAudit({
    actor: userEmail,
    action: "stops.override",
    resource: `stop:${stopId}`,
    before: before.data() ?? null,
    after: data,
  });
}

export async function clearStopOverride(stopId: string | number) {
  const docRef = doc(db, COLLECTION, String(stopId));
  const before = await getDoc(docRef);
  await deleteDoc(docRef);
  const actor = (before.data() as StopOverride | undefined)?.updatedBy || "system";
  logActivity({
    kind: "stop.restored",
    actor,
    target: `stop:${stopId}`,
    summary: `Restauró parada #${stopId} a default`,
  });
  logAudit({
    actor,
    action: "stops.clear_override",
    resource: `stop:${stopId}`,
    before: before.data() ?? null,
  });
}

export async function getStopOverrideOnce(stopId: string | number) {
  const snap = await getDoc(doc(db, COLLECTION, String(stopId)));
  return snap.exists() ? (snap.data() as StopOverride) : null;
}
