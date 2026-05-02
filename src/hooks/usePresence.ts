"use client";

import { useEffect, useState } from "react";
import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  deleteDoc,
  Timestamp,
  query,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth";
import { usePathname } from "next/navigation";
import type { AdminPresence } from "@/lib/extended-types";

const COLLECTION = "admin_presence";
const HEARTBEAT_MS = 30_000; // 30s
const STALE_MS = 90_000; // 90s (si no hay heartbeat en 90s, se considera offline)

/**
 * Sistema de presencia entre admins. Cada admin guarda su documento en
 * `admin_presence/{uid}` con heartbeat cada 30s y el path actual.
 * Otros admins leen la lista filtrada por lastSeenAt reciente.
 */
export function useAdminPresence() {
  const { user, isAdmin } = useAuth();
  const pathname = usePathname();
  const [others, setOthers] = useState<AdminPresence[]>([]);

  // Publicar mi presencia con heartbeat
  useEffect(() => {
    if (!user || !isAdmin) return;
    const myUid = user.uid;
    const myDoc = doc(db, COLLECTION, myUid);

    const publish = async () => {
      try {
        await setDoc(myDoc, {
          uid: myUid,
          email: user.email ?? "",
          displayName: user.displayName ?? user.email?.split("@")[0] ?? "",
          currentPath: pathname,
          lastSeenAt: Timestamp.now(),
        });
      } catch (e) {
        console.warn("presence publish failed:", e);
      }
    };

    publish();
    const interval = setInterval(publish, HEARTBEAT_MS);

    // Cleanup al desmontar: remover el doc
    const handleBeforeUnload = () => {
      // Best effort — deleteDoc puede no completar durante unload
      deleteDoc(myDoc).catch(() => {});
    };
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      clearInterval(interval);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      deleteDoc(myDoc).catch(() => {});
    };
  }, [user, isAdmin, pathname]);

  // Escuchar presencia de otros admins
  useEffect(() => {
    if (!user || !isAdmin) return;
    const cutoff = Timestamp.fromMillis(Date.now() - STALE_MS);
    const q = query(
      collection(db, COLLECTION),
      where("lastSeenAt", ">", cutoff)
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const items = snap.docs
          .map((d) => d.data() as AdminPresence)
          .filter((p) => p.uid !== user.uid);
        setOthers(items);
      },
      (err) => console.warn("presence listener error:", err.message)
    );
    return unsub;
  }, [user, isAdmin]);

  return { others };
}
