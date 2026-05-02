"use client";

import { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  doc,
  addDoc,
  deleteDoc,
  updateDoc,
  Timestamp,
  increment,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { AlertTemplate } from "@/lib/extended-types";

const COLLECTION = "alert_templates";

export function useAlertTemplates() {
  const [templates, setTemplates] = useState<AlertTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, COLLECTION), orderBy("usageCount", "desc"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const items = snap.docs.map(
          (d) => ({ id: d.id, ...d.data() }) as AlertTemplate
        );
        setTemplates(items);
        setLoading(false);
      },
      () => setLoading(false)
    );
    return unsub;
  }, []);

  return { templates, loading };
}

export async function createAlertTemplate(
  data: Omit<
    AlertTemplate,
    "id" | "createdAt" | "usageCount" | "lastUsedAt"
  >
) {
  return addDoc(collection(db, COLLECTION), {
    ...data,
    usageCount: 0,
    lastUsedAt: null,
    createdAt: Timestamp.now(),
  });
}

export async function deleteAlertTemplate(id: string) {
  return deleteDoc(doc(db, COLLECTION, id));
}

export async function trackTemplateUsage(id: string) {
  return updateDoc(doc(db, COLLECTION, id), {
    usageCount: increment(1),
    lastUsedAt: Timestamp.now(),
  });
}

/**
 * Templates default — si no hay ninguno en Firestore, se muestran estos.
 * El admin puede "adoptarlos" y editarlos.
 */
export const DEFAULT_TEMPLATES: Omit<
  AlertTemplate,
  "id" | "createdAt" | "createdBy" | "usageCount" | "lastUsedAt"
>[] = [
  {
    name: "Paro general CUTCSA",
    icon: "strike",
    title: "Paro de CUTCSA",
    body: "Los buses de CUTCSA no circulan por paro sindical. Esperamos info sobre reanudación.",
    type: "strike",
    severity: "critical",
    affectedLines: [],
    sendPushDefault: true,
  },
  {
    name: "Paro parcial",
    icon: "strike",
    title: "Servicio parcial",
    body: "Hay paro parcial del transporte. Algunas líneas pueden no funcionar o hacerlo con frecuencia reducida.",
    type: "strike",
    severity: "warning",
    affectedLines: [],
    sendPushDefault: true,
  },
  {
    name: "Desvío por obra",
    icon: "detour",
    title: "Desvío por obra",
    body: "Los buses están desviados por obras en la zona. El recorrido normal se retoma al finalizar los trabajos.",
    type: "detour",
    severity: "warning",
    affectedLines: [],
    sendPushDefault: true,
  },
  {
    name: "Incidente de tránsito",
    icon: "incident",
    title: "Incidente en el corredor",
    body: "Hay un incidente afectando el tránsito. Puede haber demoras en las líneas de la zona.",
    type: "incident",
    severity: "warning",
    affectedLines: [],
    sendPushDefault: true,
  },
  {
    name: "Evento especial",
    icon: "event",
    title: "Evento especial",
    body: "Por un evento, los recorridos pueden estar modificados. Verificá antes de salir.",
    type: "detour",
    severity: "info",
    affectedLines: [],
    sendPushDefault: false,
  },
  {
    name: "Mantenimiento del sistema",
    icon: "maintenance",
    title: "Mantenimiento programado",
    body: "Hay mantenimiento del sistema. Los datos en vivo pueden estar retrasados.",
    type: "info",
    severity: "info",
    affectedLines: [],
    sendPushDefault: false,
  },
];
