import { Timestamp } from "firebase/firestore";

/**
 * ══════════════════════════════════════════════════════════════════════
 *  ESTRUCTURA CANÓNICA DE `alerts` — fuente de verdad compartida
 * ══════════════════════════════════════════════════════════════════════
 *
 * Esta colección Firestore es consumida por tres clientes:
 *   1. Dashboard web (este proyecto) — escribe
 *   2. App iOS (/Users/ignacio/Developer/Vamo) — lee vía snapshot listener
 *   3. App Android (/Users/ignacio/Developer/Vamo-Android) — lee vía snapshot listener
 *
 * FLUJO END-TO-END:
 *
 *   Dashboard → Firestore `alerts/{id}` (create/update)
 *        │
 *        ├──> Cloud Function trigger detecta cambio
 *        │         │
 *        │         └──> Si sendPush==true && active==true && !pushSent:
 *        │                 - Sin affectedLines → FCM topic "alerts"
 *        │                 - Con affectedLines → FCM topics "line_XXX" por cada línea
 *        │                 - Setea pushSent: true, sentAt: now
 *        │
 *        └──> Snapshot listener en iOS/Android
 *                 └──> Muestra banner in-app cuando active==true
 *
 *   FCM push → App receiver:
 *      - iOS: PushNotificationManager registra en InboxStore
 *      - Android: (pendiente implementar) — mismo patrón
 *
 * TOPICS FCM (ya usados por iOS):
 *   - "all" — suscripción automática al obtener token
 *   - "alerts" — suscripción manual vía subscribeToAlerts()
 *   - "line_XXX" — suscripción por línea favorita
 */

// ─── Alertas ───

export type AlertType =
  | "incident"    // Accidente, rotura, problema operativo
  | "detour"      // Desvío de recorrido
  | "disruption"  // Interrupción de servicio
  | "strike"      // Paro sindical
  | "info";       // Informativo general

export type AlertSeverity = "info" | "warning" | "critical";

/**
 * Documento `alerts/{alertId}` — estructura canónica
 *
 * Todos los campos que no son opcionales son requeridos para que las apps
 * móviles puedan parsearlo sin defensive coding.
 */
export interface TransitAlert {
  // Identity
  id: string;

  // Content
  title: string;
  body: string;
  type: AlertType;
  severity: AlertSeverity;

  // Targeting
  /** Líneas afectadas. Vacío = alerta del sistema completo */
  affectedLines: string[];

  // Lifecycle
  /** La alerta se muestra en la app cuando active==true */
  active: boolean;

  // Push notifications
  /** El admin marcó "enviar push" al crear/editar */
  sendPush: boolean;
  /** Cloud Function lo setea true tras enviar el FCM. No tocar desde el dashboard */
  pushSent: boolean;
  /** Cuándo se envió el push (null si no se envió aún) */
  sentAt: Timestamp | null;

  // Scheduling
  /** null = se activa inmediatamente. Si != null, la alerta NO aparece como activa hasta esa fecha */
  scheduledFor: Timestamp | null;

  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
  /** null = sin expiración automática */
  expiresAt: Timestamp | null;
  /** Email del admin que creó la alerta */
  createdBy: string;
}

// ─── Datos de tránsito (read-only, del API) ───

export interface BusStop {
  id: number;
  street1: string | null;
  street2: string | null;
  location: {
    type: string;
    coordinates: [number, number]; // [lng, lat]
  };
}

export interface LineVariant {
  id: number;
  line: string;
  lineId: number;
  origin: string | null;
  destination: string | null;
  subline: string | null;
  special: boolean;
}

export interface Bus {
  id: string;
  line: string;
  company: string;
  destination: string | null;
  origin: string | null;
  speed: number | null;
  emissions: string | null;
  thermalConfort: string | null;
  access: string | null;
  location: {
    type: string;
    coordinates: [number, number];
  };
}

// ─── Stop overrides (fase 2) ───

export interface StopOverride {
  lines: string[] | null;
  suspended: boolean;
  tempLocation: { lat: number; lng: number } | null;
  note: string | null;
  updatedAt: Timestamp;
  updatedBy: string;
}

// ─── UI helpers ───

export const ALERT_TYPE_LABELS: Record<AlertType, string> = {
  incident: "Incidente",
  detour: "Desvío",
  disruption: "Interrupción",
  strike: "Paro",
  info: "Informativo",
};

export const ALERT_SEVERITY_LABELS: Record<AlertSeverity, string> = {
  info: "Informativo",
  warning: "Advertencia",
  critical: "Crítico",
};

export const COMPANIES = ["CUTCSA", "COETC", "COME", "UCOT"] as const;

export const COMPANY_COLORS: Record<string, string> = {
  CUTCSA: "#2563eb",
  COETC: "#dc2626",
  COME: "#16a34a",
  UCOT: "#eab308",
};
