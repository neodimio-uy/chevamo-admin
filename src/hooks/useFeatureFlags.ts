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
import type { FeatureFlag } from "@/lib/extended-types";
import { logActivity } from "@/lib/audit";

const COLLECTION = "feature_flags";

export function useFeatureFlags() {
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, COLLECTION),
      (snap) => {
        const items = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }) as FeatureFlag)
          .sort((a, b) => a.id.localeCompare(b.id));
        setFlags(items);
        setLoading(false);
      },
      (err) => {
        console.error("feature_flags listener error:", err);
        setLoading(false);
      }
    );
    return unsubscribe;
  }, []);

  return { flags, loading };
}

export async function upsertFeatureFlag(
  id: string,
  data: Omit<FeatureFlag, "id" | "updatedAt" | "updatedBy">,
  userEmail: string
) {
  return setDoc(doc(db, COLLECTION, id), {
    ...data,
    updatedAt: serverTimestamp(),
    updatedBy: userEmail,
  });
}

export async function toggleFeatureFlag(
  flag: FeatureFlag,
  userEmail: string
) {
  await setDoc(
    doc(db, COLLECTION, flag.id),
    {
      enabled: !flag.enabled,
      updatedAt: serverTimestamp(),
      updatedBy: userEmail,
    },
    { merge: true }
  );
  logActivity({
    kind: "feature.flag.toggled",
    actor: userEmail,
    target: `flag:${flag.id}`,
    summary: `${!flag.enabled ? "Habilitó" : "Deshabilitó"} flag "${flag.id}"`,
    metadata: { enabled: !flag.enabled },
  });
}
