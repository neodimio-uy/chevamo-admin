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
import type { LineOverride } from "@/lib/extended-types";
import { logActivity, logAudit } from "@/lib/audit";

const COLLECTION = "line_overrides";

export function useLineOverrides() {
  const [overrides, setOverrides] = useState<Record<string, LineOverride>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, COLLECTION),
      (snap) => {
        const map: Record<string, LineOverride> = {};
        snap.docs.forEach((d) => {
          map[d.id] = { id: d.id, ...d.data() } as LineOverride;
        });
        setOverrides(map);
        setLoading(false);
      },
      (err) => {
        console.error("line_overrides listener error:", err);
        setLoading(false);
      }
    );
    return unsubscribe;
  }, []);

  return { overrides, loading };
}

export async function suspendLine(
  lineCode: string,
  note: string | null,
  adminEmail: string
) {
  await setDoc(
    doc(db, COLLECTION, lineCode),
    {
      id: lineCode,
      suspended: true,
      note,
      suspendedAt: serverTimestamp(),
      suspendedBy: adminEmail,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
  await logActivity({
    kind: "line.suspended",
    actor: adminEmail,
    target: `line:${lineCode}`,
    summary: `Suspendió línea ${lineCode}${note ? ": " + note : ""}`,
    metadata: { lineCode },
  });
  await logAudit({
    actor: adminEmail,
    action: "line.suspended",
    resource: `line:${lineCode}`,
    after: { suspended: true, note },
  });
}

export async function unsuspendLine(lineCode: string, adminEmail: string) {
  await deleteDoc(doc(db, COLLECTION, lineCode));
  await logActivity({
    kind: "line.unsuspended",
    actor: adminEmail,
    target: `line:${lineCode}`,
    summary: `Reactivó línea ${lineCode}`,
    metadata: { lineCode },
  });
  await logAudit({
    actor: adminEmail,
    action: "line.unsuspended",
    resource: `line:${lineCode}`,
  });
}
