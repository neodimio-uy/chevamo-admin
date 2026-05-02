"use client";

import { useEffect, useState } from "react";
import {
  collection,
  limit as fbLimit,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

const COLLECTION = "push_events";

export interface PushEvent {
  id: string;
  type: string; // support_new_ticket, support_user_reply, support_admin_reply, etc.
  ticketId?: string;
  recipientUid?: string;
  mechanisms?: string[]; // ["activity_event", "fcm_topic"]
  status: "sent" | "partial" | "error" | "skipped_no_token";
  successCount?: number;
  failureCount?: number;
  error?: string | null;
  sentAt?: Timestamp;
}

export function usePushEvents(limit = 100) {
  const [events, setEvents] = useState<PushEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, COLLECTION),
      orderBy("sentAt", "desc"),
      fbLimit(limit)
    );
    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as PushEvent);
        setEvents(items);
        setLoading(false);
      },
      (err) => {
        console.error("push_events listener error:", err);
        setLoading(false);
      }
    );
    return unsubscribe;
  }, [limit]);

  return { events, loading };
}
