import type { Timestamp } from "firebase/firestore";

// ─── Activity Feed ───
export type ActivityKind =
  | "alert.created"
  | "alert.updated"
  | "alert.deactivated"
  | "alert.deleted"
  | "stop.modified"
  | "stop.suspended"
  | "stop.relocated"
  | "stop.restored"
  | "community.report.deleted"
  | "support.ticket.created"
  | "support.ticket.replied"
  | "feature.flag.toggled"
  | "system.event";

export interface ActivityEvent {
  id: string;
  kind: ActivityKind;
  actor: string; // email del admin o "system"
  target: string; // ej: "alert:abc123" | "stop:1234"
  summary: string; // texto leíble: "Creó alerta 'Paro de CUTCSA'"
  metadata?: Record<string, string | number | boolean | null>;
  createdAt: Timestamp;
}

// ─── Audit Log ───
export interface AuditLogEntry {
  id: string;
  actor: string;
  action: string; // ej: "alerts.create"
  resource: string; // ej: "alert:abc123"
  before: unknown | null;
  after: unknown | null;
  ip?: string | null;
  userAgent?: string | null;
  createdAt: Timestamp;
}

// ─── Feature Flags ───
export interface FeatureFlag {
  id: string; // ej: "community", "chat_ia", "briefing"
  enabled: boolean;
  description: string;
  rolloutPercentage?: number; // 0-100, opcional
  audience?: "all" | "ios" | "android" | "beta"; // opcional
  updatedAt: Timestamp;
  updatedBy: string;
}

// ─── Support Tickets ───
export type TicketStatus = "open" | "pending" | "resolved" | "closed";
export type TicketPriority = "low" | "medium" | "high" | "urgent";

export interface SupportTicket {
  id: string;
  userId: string | null;
  userEmail: string | null;
  userName: string | null;
  device: {
    platform: "ios" | "android" | "web" | "unknown";
    appVersion?: string;
    osVersion?: string;
  };
  subject: string;
  body: string;
  status: TicketStatus;
  priority: TicketPriority;
  assignedTo: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  replies: TicketReply[];
  /// URLs públicas de capturas que el usuario adjuntó al crear el ticket.
  /// Subidas por iOS a Firebase Storage en `support_attachments/{ticketId}/`.
  /// Hasta 3 imágenes JPEG. `null` o array vacío = sin adjuntos.
  attachmentURLs?: string[] | null;
}

export interface TicketReply {
  by: string; // email
  message: string;
  at: Timestamp;
  internal: boolean; // true = nota interna no visible al usuario
}

// ─── Alert Templates ───
export interface AlertTemplate {
  id: string;
  name: string; // "Paro CUTCSA", "Obras en Bulevar"
  icon?: string; // emoji
  title: string;
  body: string;
  type: string; // AlertType
  severity: string; // AlertSeverity
  affectedLines: string[];
  sendPushDefault: boolean;
  usageCount: number;
  lastUsedAt?: Timestamp | null;
  createdAt: Timestamp;
  createdBy: string;
}

// ─── Presence ───
export interface AdminPresence {
  uid: string;
  email: string;
  displayName: string;
  currentPath: string;
  lastSeenAt: Timestamp;
}

// ─── Briefing ───
export interface Briefing {
  id: string;
  generatedAt: Timestamp;
  generatedBy: string;
  summary: string; // texto generado por IA
  metrics: {
    busesActive: number;
    alertsActive: number;
    communityReports: number;
    stopsModified: number;
    suspendedStops: number;
  };
  highlights: string[];
}

// ─── Admin Config (config/* killswitches y umbrales globales) ───
//
// Documentos en `config/{key}` con un campo `value` (boolean | number | string).
// Las app cliente y las Cloud Functions los consultan en runtime —
// `community.killSwitch=true` apaga reportes globalmente sin redeploy.
//
// A diferencia de Firebase Remote Config (que es client-side gating),
// estos viven en Firestore y los pueden leer las rules y triggers backend
// para enforcement server-side estricto.
export interface AdminConfig {
  id: string;
  value: boolean | number | string;
  description?: string;
  updatedAt?: Timestamp;
  updatedBy?: string;
}

/// Lista canónica de killswitches que el dashboard expone en `/settings`.
/// Si agregamos uno nuevo, sumarlo acá para que aparezca en la UI con
/// descripción human-friendly.
export const KILLSWITCH_DEFINITIONS: Array<{
  id: string;
  label: string;
  description: string;
  defaultValue: boolean;
  severity: "low" | "medium" | "high" | "critical";
}> = [
  {
    id: "community.killSwitch",
    label: "Apagar reportes comunitarios",
    description: "Bloquea creación de community_buses globalmente. Útil ante ataque de spam masivo.",
    defaultValue: false,
    severity: "high",
  },
  {
    id: "chat_ia.killSwitch",
    label: "Apagar chat IA",
    description: "Bloquea queries al endpoint de Gemini. Útil si el modelo da respuestas problemáticas o hay overrun de tokens.",
    defaultValue: false,
    severity: "medium",
  },
  {
    id: "sharing.killSwitch",
    label: "Apagar compartir viajes",
    description: "Bloquea creación de shared_trips. Útil si hay abuso del feature o problemas de privacidad.",
    defaultValue: false,
    severity: "medium",
  },
  {
    id: "support.killSwitch",
    label: "Apagar tickets de soporte",
    description: "Bloquea creación de tickets nuevos. Solo en casos extremos — suele ser mejor mantener canal abierto.",
    defaultValue: false,
    severity: "high",
  },
  {
    id: "system.readOnlyMode",
    label: "Modo emergencia (lectura solo)",
    description: "Toda la app en read-only: no se permite reportar, compartir, crear tickets ni alertas. Solo consulta.",
    defaultValue: false,
    severity: "critical",
  },
  {
    id: "guest.killSwitch",
    label: "Bloquear modo invitado",
    description: "Fuerza login real al entrar. Útil ante ataques de cuentas anónimas masivas.",
    defaultValue: false,
    severity: "medium",
  },
];

// ─── Users (users/{uid}) ───
//
// Documento por usuario con metadata operativa: tier, status, strikes, etc.
// Se crea/actualiza desde iOS cada vez que el user abre la app (similar a
// DeviceIdentity). El dashboard lee/escribe esta colección para gestionar.
//
// Distinto de Firebase Auth User (que tiene email/displayName) — acá vive
// la "operativa de la app": ¿está baneado? ¿qué tier tiene? ¿cuántos strikes?

export type UserTier = "anonymous" | "basic" | "verified" | "premium" | "admin";

export interface UserDoc {
  uid: string;
  email?: string | null;
  displayName?: string | null;
  createdAt?: Timestamp;
  lastSeenAt?: Timestamp;
  tier: UserTier;
  /// Si está baneado, no puede crear reportes / tickets / shares.
  banned: boolean;
  banReason?: string | null;
  bannedAt?: Timestamp | null;
  bannedBy?: string | null; // email del admin
  /// Conteo de strikes (3 → ban automático cuando esté la regla activa).
  strikes: number;
  /// Notas internas del admin (no visibles al user).
  adminNotes?: string | null;
  device?: {
    platform: "ios" | "android" | "web" | "unknown";
    appVersion?: string;
    osVersion?: string;
  };
  /// Stats agregadas (denormalizadas para UI rápida del dashboard).
  stats?: {
    communityReports?: number;
    sharedTrips?: number;
    supportTickets?: number;
  };
}

// ─── Incidents (incidents/{id}) ───
//
// Eventos operativos: paro, accidente, congestión, desvío, falla técnica.
// Vinculan líneas/paradas afectadas y opcionalmente disparan una alerta
// push automática. La diferencia con `alerts/*` es que un incidente tiene
// duración estimada, severidad operativa y puede generar varias alertas.

export type IncidentKind = "strike" | "accident" | "congestion" | "detour" | "breakdown" | "weather" | "other";
export type IncidentSeverity = "low" | "medium" | "high" | "critical";
export type IncidentStatus = "active" | "monitoring" | "resolved";

export interface Incident {
  id: string;
  kind: IncidentKind;
  severity: IncidentSeverity;
  status: IncidentStatus;
  title: string;
  description: string;
  /// Líneas afectadas (códigos: "192", "CA1"). Vacío = sistema-wide.
  affectedLines: string[];
  /// stopIds afectados (paradas suspendidas/reubicadas por el incidente).
  affectedStops: number[];
  /// Tiempo estimado de resolución en minutos. Null = indeterminado.
  estimatedResolutionMin: number | null;
  /// Si se generó una alerta push asociada, el ID del doc en alerts/.
  linkedAlertId?: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  resolvedAt?: Timestamp | null;
  createdBy: string;
}

export const INCIDENT_KIND_LABELS: Record<IncidentKind, string> = {
  strike: "Paro",
  accident: "Accidente",
  congestion: "Congestión",
  detour: "Desvío",
  breakdown: "Falla técnica",
  weather: "Clima",
  other: "Otro",
};

// ─── Bus Overrides (bus_overrides/{busId}) ───
//
// Cuando el feed STM reporta un bus en posición/estado erróneo, el admin
// puede crear un override para corregirlo o marcarlo fuera de servicio.
// La app iOS lee esta colección + merge con el feed oficial.

export interface BusOverride {
  id: string; // bus_id del feed STM
  outOfService: boolean;
  /// Si está reasignado, el admin puede ajustar línea o destino visible.
  overrideLine?: string | null;
  overrideDestination?: string | null;
  /// Override de coordenadas si el feed reporta posición errónea.
  overrideLat?: number | null;
  overrideLng?: number | null;
  reason?: string | null;
  /// Hasta cuándo aplica el override. Después se ignora.
  expiresAt?: Timestamp | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
}

// ─── Custom Stops (custom_stops/{id}) ───
//
// Paradas que el feed STM no incluye pero existen en la realidad. El admin
// las crea manualmente. iOS las lee y mergea con las del feed.
//
// Para v1.0: id auto-generado por Firestore, no colisiona con stopIds del
// STM (que son numéricos). Para distinguirlos en iOS, guardamos `id` como
// `"custom-${randomId}"` y los hacemos negativos al cast a Int.

export interface CustomStop {
  id: string;
  street1: string;
  street2?: string | null;
  lat: number;
  lng: number;
  /// Códigos de líneas que sirven esta parada (ej: ["192", "CA1"]).
  lines: string[];
  note?: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
}

// ─── Line Overrides (line_overrides/{lineCode}) ───
//
// Control admin sobre líneas: suspender línea entera (no aparece en la
// app), marcar variantes custom (desvíos temporales). iOS lee esto y filtra
// el catálogo del STM antes de mostrar al user.

export interface LineOverride {
  /// Código de la línea ("192", "CA1", etc).
  id: string;
  suspended: boolean;
  note?: string | null;
  suspendedAt?: Timestamp | null;
  suspendedBy?: string | null;
  updatedAt: Timestamp;
}
