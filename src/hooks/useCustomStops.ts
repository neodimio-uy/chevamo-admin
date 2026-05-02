"use client";

import { useEffect, useState } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { CustomStop } from "@/lib/extended-types";
import { logActivity, logAudit } from "@/lib/audit";

const COLLECTION = "custom_stops";

export function useCustomStops() {
  const [stops, setStops] = useState<CustomStop[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, COLLECTION),
      (snap) => {
        const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as CustomStop);
        setStops(items);
        setLoading(false);
      },
      (err) => {
        console.error("custom_stops listener error:", err);
        setLoading(false);
      }
    );
    return unsubscribe;
  }, []);

  return { stops, loading };
}

export async function createCustomStop(
  data: Omit<CustomStop, "id" | "createdAt" | "updatedAt" | "createdBy">,
  adminEmail: string
): Promise<string> {
  const ref = await addDoc(collection(db, COLLECTION), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    createdBy: adminEmail,
  });
  await logActivity({
    kind: "custom_stop.created",
    actor: adminEmail,
    target: `custom_stop:${ref.id}`,
    summary: `Creó parada custom "${data.street1}"`,
    metadata: { lat: data.lat, lng: data.lng },
  });
  await logAudit({
    actor: adminEmail,
    action: "custom_stop.created",
    resource: `custom_stop:${ref.id}`,
    after: data,
  });
  return ref.id;
}

export async function updateCustomStop(
  id: string,
  patch: Partial<Omit<CustomStop, "id" | "createdAt" | "createdBy">>,
  adminEmail: string
) {
  await setDoc(
    doc(db, COLLECTION, id),
    { ...patch, updatedAt: serverTimestamp() },
    { merge: true }
  );
  await logActivity({
    kind: "custom_stop.updated",
    actor: adminEmail,
    target: `custom_stop:${id}`,
    summary: `Editó parada custom ${id}`,
    metadata: { fields: Object.keys(patch).join(",") },
  });
}

export async function deleteCustomStop(id: string, adminEmail: string) {
  await deleteDoc(doc(db, COLLECTION, id));
  await logActivity({
    kind: "custom_stop.deleted",
    actor: adminEmail,
    target: `custom_stop:${id}`,
    summary: `Borró parada custom ${id}`,
  });
}
