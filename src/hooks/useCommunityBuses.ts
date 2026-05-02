"use client";

import { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  doc,
  deleteDoc,
  Timestamp,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export interface CommunityBus {
  id: string;
  userId: string;
  line: string;
  lineVariantId?: number;
  company: string;
  origin?: string | null;
  destination?: string | null;
  lat: number;
  lng: number;
  speed: number;
  updatedAt: Timestamp;
  startedAt: Timestamp;
}

export function useCommunityBuses() {
  const [buses, setBuses] = useState<CommunityBus[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cutoff = Timestamp.fromMillis(Date.now() - 3 * 60 * 1000); // 3 min
    const q = query(
      collection(db, "community_buses"),
      where("updatedAt", ">", cutoff),
      orderBy("updatedAt", "desc")
    );

    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        const items = snap.docs.map(
          (d) => ({ id: d.id, ...d.data() }) as CommunityBus
        );
        setBuses(items);
        setLoading(false);
      },
      (err) => {
        console.error("community_buses listener error:", err);
        setLoading(false);
      }
    );
    return unsubscribe;
  }, []);

  return { buses, loading };
}

export async function deleteCommunityBus(id: string) {
  return deleteDoc(doc(db, "community_buses", id));
}
