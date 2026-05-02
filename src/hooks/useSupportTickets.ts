"use client";

import { useEffect, useState } from "react";
import {
  collection,
  doc,
  onSnapshot,
  query,
  orderBy,
  updateDoc,
  arrayUnion,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type {
  SupportTicket,
  TicketStatus,
  TicketPriority,
} from "@/lib/extended-types";

const COLLECTION = "support_tickets";

export function useSupportTickets() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, COLLECTION),
      orderBy("createdAt", "desc")
    );
    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        const items = snap.docs.map(
          (d) => ({ id: d.id, ...d.data() }) as SupportTicket
        );
        setTickets(items);
        setLoading(false);
      },
      (err) => {
        console.error("support_tickets listener error:", err);
        setLoading(false);
      }
    );
    return unsubscribe;
  }, []);

  return { tickets, loading };
}

export async function updateTicketStatus(
  id: string,
  status: TicketStatus,
  userEmail: string
) {
  return updateDoc(doc(db, COLLECTION, id), {
    status,
    updatedAt: Timestamp.now(),
    assignedTo: userEmail,
  });
}

export async function updateTicketPriority(
  id: string,
  priority: TicketPriority
) {
  return updateDoc(doc(db, COLLECTION, id), {
    priority,
    updatedAt: Timestamp.now(),
  });
}

export async function replyToTicket(
  id: string,
  message: string,
  userEmail: string,
  internal = false
) {
  return updateDoc(doc(db, COLLECTION, id), {
    replies: arrayUnion({
      by: userEmail,
      message,
      at: Timestamp.now(),
      internal,
    }),
    status: internal ? undefined : "pending",
    updatedAt: Timestamp.now(),
  });
}
