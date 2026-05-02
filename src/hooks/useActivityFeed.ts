"use client";

import { useEffect, useState } from "react";
import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { ActivityEvent } from "@/lib/extended-types";

export function useActivityFeed(maxItems = 50) {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, "activity_events"),
      orderBy("createdAt", "desc"),
      limit(maxItems)
    );
    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        const items = snap.docs.map(
          (d) => ({ id: d.id, ...d.data() }) as ActivityEvent
        );
        setEvents(items);
        setLoading(false);
      },
      (err) => {
        console.error("activity_events listener error:", err);
        setLoading(false);
      }
    );
    return unsubscribe;
  }, [maxItems]);

  return { events, loading };
}
