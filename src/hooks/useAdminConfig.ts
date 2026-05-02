"use client";

import { useEffect, useState } from "react";
import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { AdminConfig } from "@/lib/extended-types";
import { logActivity } from "@/lib/audit";

const COLLECTION = "config";

/**
 * Listener real-time de la colección `config/*`. Devuelve los docs como
 * `AdminConfig[]` con sus valores actuales para que la UI pueda mostrar
 * el estado de cada killswitch / umbral global.
 */
export function useAdminConfig() {
  const [items, setItems] = useState<AdminConfig[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, COLLECTION),
      (snap) => {
        const parsed = snap.docs.map(
          (d) => ({ id: d.id, ...d.data() }) as AdminConfig
        );
        setItems(parsed);
        setLoading(false);
      },
      (err) => {
        console.error("config listener error:", err);
        setLoading(false);
      }
    );
    return unsubscribe;
  }, []);

  return { items, loading };
}

/**
 * Setea el valor de un config doc. Si el doc no existe, se crea.
 * Logguea en `activity_events` + `audit_log` para que el cambio quede
 * registrado con quién y cuándo.
 */
export async function setAdminConfig(
  id: string,
  value: boolean | number | string,
  userEmail: string,
  description?: string
) {
  await setDoc(
    doc(db, COLLECTION, id),
    {
      value,
      description: description ?? null,
      updatedAt: serverTimestamp(),
      updatedBy: userEmail,
    },
    { merge: true }
  );
  await logActivity({
    kind: "config.updated",
    actor: userEmail,
    target: `config:${id}`,
    summary: `Cambió config "${id}" a ${JSON.stringify(value)}`,
    metadata: { value, configId: id },
  });
}
