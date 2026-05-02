# TODOs para Ignacio — Dashboard Vamo

Todo lo que tenés que hacer vos para cerrar el ciclo completo. Ordenado por prioridad.

---

## 🔥 CRÍTICO — para que el loop de alertas funcione end-to-end

### 1. Habilitar Gemini API para el Briefing IA

El Cloud Function `adminBriefing` está deployado pero sin la key, cae al template determinístico. Para activar Gemini real:

```bash
# Obtener API key en https://aistudio.google.com/apikey
firebase functions:secrets:set GEMINI_API_KEY
# Pegar la key cuando pida

# Redeployar la function para que tome el secret
cd /Users/ignacio/mvd-proxy
firebase deploy --only functions:adminBriefing
```

Después, en Cloud Functions console verificá que el secret esté linkeado.

Alternativa: usar Vertex AI directamente (ya lo usa la app iOS). Para eso hay que modificar el Cloud Function para usar `@google-cloud/vertexai` en vez de `@google/genai`. Te dejo esto para después.

---

### 2. Integrar TransitAlert en la app iOS

Abrí `/Users/ignacio/Developer/Vamo/TRANSIT_ALERT_INTEGRATION.md` (ya está creado) y pegá los 4 bloques de código:

1. **Nuevo archivo** `Vamo/Models/TransitAlert.swift` (~40 líneas)
2. **En `DataStore.swift`**: agregar `activeAlerts` + `startAlertsListener()` (~30 líneas)
3. **Nuevo archivo** `Vamo/Views/AlertBanner.swift` (~60 líneas)
4. **En `HomeView.swift`**: agregar el banner arriba del ZStack (~10 líneas)

Total: ~140 líneas, 1-2 horas de trabajo.

**Test end-to-end:**
1. Dashboard → crear alerta con severity=critical, sendPush=ON
2. El trigger `onAlertWrite` se dispara (ya deployado)
3. FCM llega al iPhone (PushNotificationManager ya integrado)
4. Abrir la app → aparece el banner arriba del mapa
5. Dashboard → desactivar la alerta → banner desaparece

---

### 3. Integrar FCM + TransitAlert en Android

Snippets en el mismo archivo (`TRANSIT_ALERT_INTEGRATION.md` sección Android).

**Pre-requisitos antes de esto:**
- [ ] SHA-1 debug agregado en Firebase Console (bloqueante para Google Sign-In también)
- [ ] FCM service registrado en `AndroidManifest.xml`
- [ ] Suscripción a topics al obtener token

**Commits pendientes en Android** — recordá commitear el working directory antes de agregar esto. Hay ~60 archivos sin commitear desde el snapshot del 2026-04-20.

---

## 📅 IMPORTANTE — para el launch v1.0 (11 may 2026)

### 4. Custom domain `dashboard.vamo.com.uy`

Pasos (en [Firebase Console Hosting](https://console.firebase.google.com/project/vamo-dbad6/hosting/sites)):

1. Click **"Add custom domain"**
2. Ingresar `dashboard.vamo.com.uy`
3. Firebase te da 2 A records (o 1 TXT + 2 A)
4. **Pre-requisito:** tener `vamo.com.uy` registrado con acceso al DNS
   - Si no lo tenés registrado → [nic.com.uy](https://nic.com.uy) (Uruguay)
   - Alternativa mientras tanto: `dashboard.neodimio.com.uy` (ya controlás el DNS)
5. Agregar los registros en tu panel DNS
6. Esperar propagación (5min – 24h)
7. Firebase auto-provisiona certificado SSL

**Después** agregar `dashboard.vamo.com.uy` a los Authorized Domains en Firebase Auth (sino el login con Google falla).

### 5. Revisar Firestore rules deployadas

Ya están deployadas pero conviene que las leas y confirmes que coinciden con tu política. Especialmente:
- `alerts`: cualquier auth lee, solo admin escribe ✅
- `feature_flags`: lectura pública (porque las apps las consumen) ✅
- `support_tickets`: usuarios crean desde la app, admin lee/responde ✅
- Catch-all al final deniega todo lo no explícito ✅

Revisar en `/Users/ignacio/mvd-proxy/firestore.rules`.

### 6. Feature flags: crear las iniciales en el dashboard

El dashboard muestra 9 flags conocidas en `/flags` pero sin documento en Firestore usan default. Creá los documentos para que queden grabados (útil para audit):
- `community: true`
- `chat_ia: true`
- `briefing: true`
- `alarms: true`
- etc.

Podés tocar el toggle de cada una (aunque ya esté en ON) para que quede guardada.

### 7. Adoptar las plantillas de alerta default

En `/templates`, tocar **"Adoptar 6 plantillas default"** — te crea las plantillas base (Paro CUTCSA, Desvío, Incidente, etc.) para que las tengas listas cuando pase algo.

---

## 🧪 TESTING — para validar antes del launch

### 8. Probar el flujo completo de alertas

1. Crear alerta de prueba con:
   - Título: "TEST: Desvío línea 124"
   - Severity: warning
   - Affected lines: `124`
   - Send push: ON
2. Verificar en [Cloud Functions logs](https://console.firebase.google.com/project/vamo-dbad6/functions/logs?functionFilter=onAlertWrite) que `onAlertWrite` se disparó y envió FCM
3. En Firestore, verificar que `pushSent: true` y `sentAt` tiene timestamp
4. Desactivar la alerta
5. Verificar que `pushSent` sigue en true (no se reenvía)

### 9. Verificar Firestore indexes

Al usar query con `where + orderBy`, Firestore puede pedir un índice compuesto. Si ves un error en la consola tipo "The query requires an index", andá al link que te da Firestore y creá el índice. Los que pueden pedirse:
- `alerts where active==true orderBy createdAt desc`
- `activity_events orderBy createdAt desc`

Suele crearse solo el primero la vez que se usa. Ya debería estar.

### 10. Probar Chat + Community + Plan en la app

Son features ya implementadas en iOS. Verificar que siguen funcionando después de los cambios que vayas agregando.

---

## 🎨 OPCIONAL — mejoras que el dashboard YA ofrece pero aún no usaste

### 11. Command Palette (`⌘K`)
Probarlo. Es la forma más rápida de moverte en el dashboard. Escribí cualquier nombre de parada o línea y te lleva directo.

### 12. Keyboard shortcuts
Tocá `?` en cualquier lado → cheatsheet completo. En particular:
- `G+H` → home, `G+A` → alerts, `G+M` → map
- `N` → nueva alerta
- `⌘K` → command palette

### 13. User presence
Si abrís el dashboard en dos pestañas con cuentas distintas (o dos miembros del equipo), vas a ver el indicador de quién más está conectado en el status bar.

### 14. Dark mode
Toggle del solecito/luna en el status bar. Persiste en localStorage.

---

## 🔜 FUTURO — cuando tenga sentido abordarlo

### 15. Cloud Function para activar alertas programadas
Hoy el dashboard deja programar `scheduledFor`, pero la alerta se crea con `active: true` y las apps la mostrarían inmediatamente. Para que respete la programación:

**Opción A (cliente):** iOS/Android filtran por `scheduledFor <= now`. Simple pero depende de que el cliente esté al día.

**Opción B (servidor):** Cloud Function scheduled que corre cada minuto y activa alertas cuyo `scheduledFor <= now`. Más robusto.

Te dejo stub de la función:
```javascript
exports.activateScheduledAlerts = onSchedule(
  { schedule: "every 1 minutes", region: "us-central1" },
  async () => {
    const now = admin.firestore.Timestamp.now();
    const snap = await db.collection("alerts")
      .where("scheduledFor", "<=", now)
      .where("active", "==", false)
      .get();
    const batch = db.batch();
    snap.docs.forEach(doc => {
      batch.update(doc.ref, {
        active: true,
        scheduledFor: null,
        updatedAt: now
      });
    });
    await batch.commit();
  }
);
```

### 16. Instrumentar analytics en las apps
Para que `/experiments` y las métricas históricas en general sean útiles, las apps necesitan reportar eventos. Recomendado: Firebase Analytics (ya habilitado) + eventos custom por cada acción importante.

### 17. Google Maps API key para Android
Bloqueante para que `/map` de Android funcione. Pasos:
1. Google Cloud Console → APIs & Services → Credentials
2. Restringir la key por package `uy.com.vamo` + SHA-1 debug
3. Agregar al `local.properties` de Android

### 18. Soporte tickets: endpoint en el backend
Hoy las apps pueden escribir a `support_tickets/{id}` directo (ya con reglas que validan). Pero sería más limpio tener un endpoint `POST /support/ticket` que valide más cosas y notifique al dashboard.

### 19. Backup automático de Firestore
Configurar exports diarios a Cloud Storage. Una hora de setup.

### 20. Monitoreo / alerts de backend
Cloud Functions puede enviar alert si:
- Error rate > X%
- Latencia p95 > Y ms
- Quota aproximándose al límite

Hoy no hay nada configurado.

---

## Resumen: lo urgente en una línea

1. `firebase functions:secrets:set GEMINI_API_KEY` → redeployar `adminBriefing`
2. Pegar snippets en iOS → test end-to-end de alertas
3. Configurar `dashboard.vamo.com.uy` en Firebase Hosting
4. Commitear Android working dir
5. Adoptar templates default en `/templates`

El resto es roadmap post-launch.
