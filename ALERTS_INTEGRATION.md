# Integración de alertas — iOS / Android / Dashboard

Documento de referencia para que las apps móviles implementen el consumo de la
colección Firestore `alerts` que el dashboard escribe.

## Estructura del documento

```
alerts/{alertId}:
  title: string
  body: string
  type: "incident" | "detour" | "disruption" | "strike" | "info"
  severity: "info" | "warning" | "critical"
  affectedLines: string[]          # vacío = sistema-wide
  active: boolean                  # mostrar banner in-app
  sendPush: boolean                # admin quiso enviar push
  pushSent: boolean                # Cloud Function ya lo envió
  sentAt: Timestamp | null
  createdAt: Timestamp
  updatedAt: Timestamp
  expiresAt: Timestamp | null
  createdBy: string                # email del admin
```

La definición TypeScript completa está en
[src/lib/types.ts](src/lib/types.ts).

## Flujo end-to-end

```
┌─────────────┐     ┌──────────────┐     ┌──────────────────┐
│  Dashboard  │────▶│  Firestore   │────▶│ Cloud Function   │
│             │     │  alerts/{id} │     │ onCreate/onUpdate│
└─────────────┘     └──────┬───────┘     └────────┬─────────┘
                           │                      │
                           │                      ▼
                           │             ┌────────────────┐
                           │             │   FCM topics   │
                           │             │  "alerts"      │
                           │             │  "line_XXX"    │
                           │             └────────┬───────┘
                           │                      │
                     ┌─────▼──────┐      ┌───────▼────────┐
                     │ Snapshot   │      │ Push recibido  │
                     │ listener   │      │ en device      │
                     └─────┬──────┘      └───────┬────────┘
                           │                     │
                     ┌─────▼──────┐      ┌──────▼────────┐
                     │ Banner     │      │ Inbox + notif │
                     │ in-app     │      │ del sistema   │
                     └────────────┘      └───────────────┘
```

## Implementación iOS (pendiente)

### 1. Modelo `TransitAlert.swift`

```swift
import Foundation
import FirebaseFirestore

struct TransitAlert: Codable, Identifiable, Hashable {
    @DocumentID var id: String?
    let title: String
    let body: String
    let type: AlertType
    let severity: AlertSeverity
    let affectedLines: [String]
    let active: Bool
    let sendPush: Bool
    let pushSent: Bool
    let sentAt: Timestamp?
    let createdAt: Timestamp
    let updatedAt: Timestamp
    let expiresAt: Timestamp?
    let createdBy: String

    enum AlertType: String, Codable {
        case incident, detour, disruption, strike, info
    }

    enum AlertSeverity: String, Codable {
        case info, warning, critical
    }
}
```

### 2. Listener en `DataStore.swift`

```swift
@Published var activeAlerts: [TransitAlert] = []
private var alertsListener: ListenerRegistration?

func startAlertsListener() {
    alertsListener = Firestore.firestore()
        .collection("alerts")
        .whereField("active", isEqualTo: true)
        .order(by: "createdAt", descending: true)
        .addSnapshotListener { [weak self] snapshot, _ in
            guard let docs = snapshot?.documents else { return }
            let alerts = docs.compactMap { try? $0.data(as: TransitAlert.self) }
            Task { @MainActor in
                self?.activeAlerts = alerts.filter { alert in
                    guard let expires = alert.expiresAt?.dateValue() else { return true }
                    return expires > Date()
                }
            }
        }
}
```

### 3. Banner en `HomeView.swift`

Mostrar el banner arriba del mapa cuando `store.activeAlerts.first` esté
presente. Colores por severidad:
- critical → rojo (`Color.red`)
- warning → amarillo
- info → azul

El Inbox ya captura automáticamente las push via `PushNotificationManager`.

## Implementación Android (pendiente)

### 1. Modelo `TransitAlert.kt`

```kotlin
package uy.com.vamo.data.models

import com.google.firebase.Timestamp
import com.google.firebase.firestore.DocumentId
import kotlinx.serialization.Serializable

data class TransitAlert(
    @DocumentId val id: String = "",
    val title: String = "",
    val body: String = "",
    val type: String = "info",           // incident | detour | disruption | strike | info
    val severity: String = "info",       // info | warning | critical
    val affectedLines: List<String> = emptyList(),
    val active: Boolean = false,
    val sendPush: Boolean = false,
    val pushSent: Boolean = false,
    val sentAt: Timestamp? = null,
    val createdAt: Timestamp = Timestamp.now(),
    val updatedAt: Timestamp = Timestamp.now(),
    val expiresAt: Timestamp? = null,
    val createdBy: String = ""
)
```

### 2. Repository con Flow

```kotlin
class AlertsRepository @Inject constructor(
    private val firestore: FirebaseFirestore
) {
    fun observeActiveAlerts(): Flow<List<TransitAlert>> = callbackFlow {
        val listener = firestore.collection("alerts")
            .whereEqualTo("active", true)
            .orderBy("createdAt", Query.Direction.DESCENDING)
            .addSnapshotListener { snapshot, error ->
                if (error != null) { close(error); return@addSnapshotListener }
                val alerts = snapshot?.toObjects(TransitAlert::class.java).orEmpty()
                val now = Timestamp.now()
                val active = alerts.filter {
                    it.expiresAt == null || it.expiresAt > now
                }
                trySend(active)
            }
        awaitClose { listener.remove() }
    }
}
```

### 3. FCM topics

Cuando se implemente FCM en Android, suscribir a:

```kotlin
FirebaseMessaging.getInstance().subscribeToTopic("all")
FirebaseMessaging.getInstance().subscribeToTopic("alerts")

// Por cada línea favorita:
favoriteLines.forEach { line ->
    FirebaseMessaging.getInstance().subscribeToTopic("line_$line")
}
```

## Cloud Function trigger (pendiente en functions/index.js)

```javascript
const { onDocumentWritten } = require("firebase-functions/v2/firestore");
const admin = require("firebase-admin");

exports.onAlertWrite = onDocumentWritten(
  { document: "alerts/{alertId}", region: "us-central1" },
  async (event) => {
    const after = event.data?.after?.data();
    if (!after) return; // deleted

    // Solo disparar si sendPush && active && !pushSent
    if (!after.sendPush || !after.active || after.pushSent) return;

    const messaging = admin.messaging();
    const notification = {
      title: after.title,
      body: after.body || "",
    };
    const data = {
      alertId: event.params.alertId,
      type: after.type,
      severity: after.severity,
    };

    try {
      if (!after.affectedLines || after.affectedLines.length === 0) {
        // Sistema-wide → topic "alerts"
        await messaging.send({
          topic: "alerts",
          notification,
          data,
          apns: { payload: { aps: { "interruption-level": severityToApns(after.severity) } } },
          android: { priority: severityToAndroid(after.severity) },
        });
      } else {
        // Por línea → topic "line_XXX" para cada una
        await Promise.all(
          after.affectedLines.map((line) =>
            messaging.send({
              topic: `line_${line}`,
              notification,
              data: { ...data, line },
              apns: { payload: { aps: { "interruption-level": severityToApns(after.severity) } } },
              android: { priority: severityToAndroid(after.severity) },
            })
          )
        );
      }

      // Marcar como enviado
      await event.data.after.ref.update({
        pushSent: true,
        sentAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    } catch (err) {
      console.error("Error enviando FCM para alerta", event.params.alertId, err);
    }
  }
);

function severityToApns(severity) {
  return severity === "critical" ? "time-sensitive" : "active";
}

function severityToAndroid(severity) {
  return severity === "critical" ? "high" : "normal";
}
```

## Topics FCM en uso

| Topic | Suscripción | Uso |
|-------|-------------|-----|
| `all` | Automática al registrar FCM token | Broadcast general a toda la base de usuarios |
| `alerts` | Manual vía `subscribeToAlerts()` | Alertas del sistema sin línea específica |
| `line_XXX` | Manual por cada línea favorita | Alertas targeted por línea |

iOS ya tiene esto implementado en `PushNotificationManager.swift`. Android
pendiente.
