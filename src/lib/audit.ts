import {
  addDoc,
  collection,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "./firebase";

/**
 * Helper para registrar acciones admin en `audit_log`.
 * Llamar desde cualquier write de Firestore desde el dashboard.
 *
 * También opcionalmente registra como activity event para el feed.
 */
export async function logAudit(params: {
  actor: string;
  action: string;
  resource: string;
  before?: unknown;
  after?: unknown;
}): Promise<void> {
  try {
    await addDoc(collection(db, "audit_log"), {
      actor: params.actor,
      action: params.action,
      resource: params.resource,
      before: params.before ?? null,
      after: params.after ?? null,
      userAgent:
        typeof navigator !== "undefined" ? navigator.userAgent : null,
      createdAt: serverTimestamp(),
    });
  } catch (e) {
    console.warn("Audit log failed (non-blocking):", e);
  }
}

/**
 * Registra un evento en el activity feed visible para todos los admins.
 * Usar para acciones que el equipo deba enterarse en tiempo real.
 */
export async function logActivity(params: {
  kind: string;
  actor: string;
  target: string;
  summary: string;
  metadata?: Record<string, string | number | boolean | null>;
}): Promise<void> {
  try {
    await addDoc(collection(db, "activity_events"), {
      kind: params.kind,
      actor: params.actor,
      target: params.target,
      summary: params.summary,
      metadata: params.metadata ?? {},
      createdAt: Timestamp.now(),
    });
  } catch (e) {
    console.warn("Activity log failed (non-blocking):", e);
  }
}
