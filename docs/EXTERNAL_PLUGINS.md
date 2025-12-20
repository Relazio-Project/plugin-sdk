# Sistema Plugin Esterni - Architettura

> Sistema completo per plugin esterni/community - **PRODUCTION READY** ✅

**Status**: 🎉 PRODUCTION READY  
**Data completamento**: Dicembre 19, 2025  
**Versione**: 1.0.0

---

## 📋 Indice

1. [Panoramica](#panoramica)
2. [Architettura Generale](#architettura-generale)
3. [Manifest JSON](#manifest-json)
4. [Stati Transform Asincrone](#stati-transform-asincrone)
5. [Webhook System](#webhook-system)
6. [Lato Piattaforma](#lato-piattaforma)
7. [Lato Server Plugin](#lato-server-plugin)
8. [SDK per Sviluppatori](#sdk-per-sviluppatori)
9. [Flussi Operativi](#flussi-operativi)
10. [Security & Rate Limiting](#security--rate-limiting)

---

## 📖 Panoramica

### Obiettivo

Permettere a **sviluppatori esterni** di creare e hostare plugin OSINT che possono essere:
- **Aggiunti** alla piattaforma tramite manifest JSON
- **Eseguiti** su server esterni (non sulla piattaforma)
- **Utilizzati** dalle organization che li installano
- **Gestiti** in modo sicuro anche con transform lunghe/asincrone

### Differenze Built-in vs Esterni

| Aspetto | Plugin Built-in | Plugin Esterni (Custom) | Plugin Store (Futuro) |
|---------|----------------|------------------------|----------------------|
| **Hosting** | Piattaforma | Server esterno | Server esterno |
| **Esecuzione** | Sincrona (max 30s) | Asincrona | Asincrona |
| **Installazione** | Pre-installato | Manifest URL | Community Store UI |
| **Visibilità** | Globale | Solo organization | Pubblico |
| **Verifica** | - | - | Review team |
| **Configurazione** | DB organization | DB organization | DB organization |

### Tipi di Plugin Esterni

**1. Plugin Custom/Privati** (Implementazione immediata)
- Aggiunti manualmente da organization via URL manifest
- Visibili solo all'organization che li ha installati
- Nessuna verifica/review del team
- Responsabilità del developer/organization

**2. Plugin Community Store** (Futuro)
- Pubblicati nel marketplace pubblico
- Verificati dal team della piattaforma
- Visibili a tutti, installabili con un click
- Rating, recensioni, statistiche

---

## 🏗️ Architettura Generale

### Componenti Principali

```
┌──────────────────────────────────────────────────────────────┐
│                    OSINT Platform                            │
│                                                              │
│  ┌─────────────┐      ┌──────────────┐    ┌──────────────┐ │
│  │   Plugin    │──────│  Transform   │────│   Webhook    │ │
│  │  Registry   │      │   Executor   │    │   Handler    │ │
│  └─────────────┘      └──────────────┘    └──────────────┘ │
│         │                     │                    │        │
│         │                     │                    │        │
└─────────┼─────────────────────┼────────────────────┼────────┘
          │                     │                    │
          │ 1. Install          │ 2. Execute         │ 4. Status Update
          │ Manifest            │ Transform          │ (Webhook)
          │                     │                    │
          ▼                     ▼                    ▲
    ┌──────────────────────────────────────────────┐│
    │         External Plugin Server               ││
    │                                              ││
    │  ┌────────────┐    ┌──────────────────┐    ││
    │  │  Manifest  │    │  Transform API   │────┘│
    │  │   (JSON)   │    │   (Endpoints)    │     │
    │  └────────────┘    └──────────────────┘     │
    │                                              │
    │  ┌──────────────────────────────────────┐   │
    │  │     Job Queue (Background Tasks)     │   │
    │  └──────────────────────────────────────┘   │
    └──────────────────────────────────────────────┘
         3. Async Processing
```

### Flusso End-to-End

1. **Installation**: Organization aggiunge plugin via URL manifest
2. **Validation**: Piattaforma scarica e valida manifest
3. **Execution**: User esegue transform → POST al server plugin
4. **Processing**: Server plugin processa (async se necessario)
5. **Callback**: Server plugin notifica la piattaforma via webhook
6. **Update**: UI aggiorna grafo con i risultati

---

## 📄 Manifest JSON

### Struttura Completa

```json
{
  "manifestVersion": "1.0",
  "plugin": {
    "id": "my-plugin-id",
    "name": "My OSINT Plugin",
    "description": "Detailed description of what the plugin does",
    "version": "1.2.3",
    "author": "Developer Name",
    "authorUrl": "https://github.com/developer",
    "homepage": "https://myplugin.com",
    "documentation": "https://myplugin.com/docs",
    "license": "MIT",
    
    "icon": "IconShield",
    "logoUrl": "https://cdn.myplugin.com/logo.png",
    "category": "network",
    
    "capabilities": {
      "inputTypes": ["domain", "ip"],
      "outputTypes": ["note", "organization", "location"],
      "estimatedTime": "seconds",
      "supportsAsync": true
    },
    
    "configuration": {
      "required": true,
      "schema": {
        "apiKey": {
          "type": "string",
          "label": "API Key",
          "description": "Your API key from service.com",
          "required": true,
          "secret": true
        },
        "maxResults": {
          "type": "number",
          "label": "Max Results",
          "description": "Maximum results to return",
          "default": 10,
          "min": 1,
          "max": 100
        }
      }
    },
    
    "transforms": [
      {
        "id": "search-domain",
        "name": "Search Domain",
        "description": "Searches for domain information",
        "inputType": "domain",
        "outputTypes": ["note", "organization"],
        "endpoint": "https://api.myplugin.com/v1/search-domain",
        "method": "POST",
        "async": true
      }
    ],
    
    "metadata": {
      "tags": ["network", "domain", "intelligence"],
      "minimumPlatformVersion": "2.0.0"
    }
  }
}
```

### Campi Obbligatori

**Metadata Plugin:**
- `manifestVersion`, `plugin.id`, `plugin.name`, `plugin.version`, `plugin.author`
- `plugin.category`
- `plugin.capabilities.inputTypes`, `plugin.capabilities.outputTypes`

**Transforms:**
- `plugin.transforms[]` (almeno 1 transform)
- `plugin.transforms[].id`, `plugin.transforms[].name`, `plugin.transforms[].inputType`
- `plugin.transforms[].endpoint`, `plugin.transforms[].method`
- `plugin.transforms[].async` (opzionale, default: false)

**Metadata:**
- `plugin.metadata.minimumPlatformVersion`

### Regole Imposte dalla Piattaforma

**HTTPS Obbligatorio:**
- ✅ Tutti gli endpoint devono usare HTTPS
- ✅ La piattaforma rifiuta installazioni con endpoint HTTP
- ✅ Certificato TLS valido richiesto
- ✅ Implementato in `ManifestValidator.verifyTLS()`

**HMAC Signature Obbligatorio:**
- ✅ Tutti i webhook devono essere firmati con HMAC-SHA256
- ✅ La piattaforma scarta webhook senza signature valida
- ✅ Secret condiviso durante l'installazione
- ✅ Implementato in `src/lib/security/hmac.ts`

**Rate Limiting:**
- ✅ 30 richieste/minuto per plugin custom
- ✅ 500 richieste/ora
- ✅ 2000 richieste/giorno
- ✅ Implementato in `src/lib/middleware/rate-limit.ts`

**Timeout Management:**
- ✅ Transform sync: 30s massimo
- ✅ Transform async: 5s per risposta iniziale
- ✅ Job completion: 30 min massimo (custom plugins)
- ✅ Auto-mark as TIMEOUT
- ✅ Implementato in `src/lib/jobs/timeout-handler.ts`

**Non Configurabile dai Developer:**
- Verifiche di sicurezza (HTTPS, signature) sono obbligatorie
- Campi `verified`, `featured` gestiti solo dalla piattaforma
- Rate limiting definito dalla piattaforma

### Note Importanti

**Webhook URL**: ✅ Non va dichiarato nel manifest. La piattaforma fornisce dinamicamente il `callbackUrl` in ogni richiesta di transform. Il plugin deve semplicemente usare quell'URL per inviare status updates. Implementato in `ExternalPluginExecutor.executeTransform()`.

**Campo `async`**: ✅ Se una transform ha `"async": true`, la piattaforma si aspetta:
- Risposta immediata con `{async: true, jobId: "..."}`
- Status updates via webhook al `callbackUrl` fornito
- Implementato con 7 stati job: PENDING → SUBMITTED → PROCESSING → COMPLETED/FAILED/TIMEOUT/CANCELLED

**Tags**: Usati solo per categorizzazione e ricerca. Per i plugin custom/privati sono opzionali (visibili solo all'organization). Diventeranno importanti per il Community Store futuro.

**Timeout**: ✅ NON vanno specificati nel manifest. La piattaforma gestisce automaticamente i timeout:
- Transform async: 5s per risposta iniziale, 30 min per completamento job
- Transform sync: 30s massimo (oltre dovrebbe essere async)
- Implementato con cron job che verifica job stuck

---

## 🔄 Stati Transform Asincrone

### Ciclo di Vita Transform

```
┌──────────┐
│ PENDING  │  Transform appena creata, non ancora inviata
└────┬─────┘
     │ POST to plugin server
     ▼
┌──────────┐
│SUBMITTED │  Richiesta inviata al server plugin
└────┬─────┘
     │ Server accepts job
     ▼
┌──────────┐
│PROCESSING│  Server sta elaborando (può durare minuti/ore)
└────┬─────┘
     │ Webhook notification
     ▼
┌──────────┐     ┌─────────┐
│COMPLETED │  OR │ FAILED  │
└──────────┘     └─────────┘
```

### Stati Definiti

| Stato | Descrizione | UI Display |
|-------|-------------|------------|
| `pending` | Transform in coda, non ancora eseguita | Spinner grigio |
| `submitted` | Richiesta inviata al plugin server | Spinner blu |
| `processing` | Server sta elaborando | Spinner animato + progress |
| `completed` | Transform completata con successo | ✅ + risultati |
| `failed` | Transform fallita | ❌ + errore |
| `timeout` | Timeout scaduto senza risposta | ⏱️ + timeout |
| `cancelled` | Utente ha annullato | 🚫 |

### Database Schema (TransformJob)

```typescript
// ✅ Implementato in prisma/schema.prisma
interface TransformJob {
  id: string;                    // UUID
  graphId: string;               // Grafo di appartenenza
  organizationId: string;        // Organization owner
  
  pluginId: string;              // Plugin che esegue (riferimento a OrgExternalPlugin)
  transformId: string;           // Transform specifica
  
  status: TransformStatus;       // Stato corrente (7 stati)
  
  input: {                       // Input della transform
    entity: OSINTEntity;
    config: Record<string, any>;
  };
  
  result?: TransformResult;      // Risultati (quando completed)
  error?: string;                // Errore (quando failed)
  
  startedAt: Date;
  submittedAt?: Date;            // Quando inviato al plugin
  completedAt?: Date;
  
  externalJobId?: string;        // ID job sul server plugin (per tracking)
  webhookUrl: string;            // URL webhook per callback
  
  progress?: number;             // 0-100 (opzionale)
  progressMessage?: string;      // Messaggio UI (es. "Scanning ports...")
}

// ✅ 7 Stati Job implementati
enum JobStatus {
  PENDING = 'PENDING',       // Creato, non ancora inviato
  SUBMITTED = 'SUBMITTED',   // Inviato al plugin server
  PROCESSING = 'PROCESSING', // In elaborazione
  COMPLETED = 'COMPLETED',   // Completato con successo
  FAILED = 'FAILED',         // Fallito con errore
  TIMEOUT = 'TIMEOUT',       // Timeout scaduto (30 min)
  CANCELLED = 'CANCELLED'    // Cancellato da user
}
```

---

## 🔔 Webhook System

### Funzionamento

1. **Platform → Plugin**: La piattaforma invia un `callbackUrl` unico nella richiesta di transform
2. **Plugin → Platform**: Il plugin usa quel `callbackUrl` per inviare status updates
3. **Platform**: Riceve il webhook, aggiorna il database e notifica l'UI (WebSocket/SSE)

> **Nota**: Il webhook URL non è configurato nel manifest, ma fornito dinamicamente dalla piattaforma in ogni richiesta. Il plugin riceve il `callbackUrl` nel body della richiesta POST.

### Webhook URL Format

```
https://platform.osint.com/api/webhooks/transforms/{jobId}?token={secret}
```

- `jobId`: ID univoco del job
- `token`: Token segreto per autenticazione (HMAC signature)

### Payload Plugin → Platform

```typescript
POST /api/webhooks/transforms/{jobId}
Content-Type: application/json
X-Plugin-Signature: sha256=...

{
  "jobId": "job-123-abc",
  "status": "processing" | "completed" | "failed",
  "progress": 45,                    // 0-100 (opzionale)
  "message": "Processing data...",   // Messaggio UI
  
  // Solo se status = completed
  "result": {
    "success": true,
    "entities": [...],
    "edges": [...],
    "metadata": {...}
  },
  
  // Solo se status = failed
  "error": "Error message",
  
  "timestamp": "2025-12-19T10:30:00Z"
}
```

### Sicurezza Webhook

**HMAC Signature** per verificare autenticità:

```typescript
// Plugin calcola signature
const payload = JSON.stringify(body);
const signature = crypto
  .createHmac('sha256', SECRET_KEY)
  .update(payload)
  .digest('hex');

headers['X-Plugin-Signature'] = `sha256=${signature}`;
```

**Platform verifica** prima di processare il webhook.

---

## 🖥️ Lato Piattaforma

### Cosa Ha Implementato la Piattaforma ✅

#### 1. Plugin Installation Flow (Custom/Private)

```typescript
// ✅ API: POST /api/plugins/install
// File: src/app/api/plugins/install/route.ts
{
  "manifestUrl": "https://cdn.myplugin.com/manifest.json",
  "organizationId": "org-123"
}

Steps implementati:
1. ✅ Download manifest from URL
2. ✅ Validate JSON schema (Zod in ManifestValidator)
3. ✅ Verify HTTPS endpoints (obbligatorio)
4. ✅ Check TLS certificate validity
5. ✅ Check platform compatibility (minimumPlatformVersion)
6. ✅ Check for duplicates
7. ✅ Generate HMAC secret for plugin (crypto.randomBytes)
8. ✅ Store in DB (OrgExternalPlugin table) con enabled=true
9. ✅ Return success/error + webhook secret

Response:
{
  "success": true,
  "plugin": {
    "id": "plugin-db-id",
    "pluginId": "my-plugin",
    "name": "My Plugin",
    "version": "1.0.0",
    "installedAt": "2025-12-19T..."
  },
  "webhookSecret": "generated-secret-key"  // ⭐ Mostrato UNA VOLTA
}
```

**File implementati:**
- `src/app/api/plugins/install/route.ts` - Installation endpoint
- `src/app/api/plugins/route.ts` - List plugins (GET)
- `src/app/api/plugins/[pluginId]/route.ts` - Get/Update/Delete plugin
- `src/lib/validators/manifest-validator.ts` - Validation logic

#### 2. Transform Executor (Async) ✅

```typescript
// ✅ Implementato in: src/features/plugins/external-executor.ts
async function executeExternalTransform(
  pluginId: string,
  transformId: string,
  input: TransformInput
): Promise<TransformJob> {
  
  // 1. ✅ Crea job nel DB
  const job = await db.transformJob.create({
    status: 'PENDING',
    pluginId,
    transformId,
    input,
    webhookUrl: generateWebhookUrl()
  });
  
  // 2. ✅ Chiama endpoint plugin con callbackUrl
  const response = await fetch(plugin.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Organization-Id': orgId
    },
    body: JSON.stringify({
      transformId,
      input,
      callbackUrl: job.webhookUrl  // ⭐ URL per status updates
    }),
    signal: AbortSignal.timeout(transform.async ? 5000 : 30000)
  });
  
  // 3. ✅ Aggiorna stato
  if (response.ok) {
    const data = await response.json();
    
    if (data.async) {
      // Transform asincrona
      await db.transformJob.update({
        where: { id: job.id },
        data: {
          status: 'SUBMITTED',
          submittedAt: new Date(),
          externalJobId: data.jobId
        }
      });
    } else {
      // Transform sincrona (risultati immediati)
      await db.transformJob.update({
        where: { id: job.id },
        data: {
          status: 'COMPLETED',
          result: data.result,
          completedAt: new Date()
        }
      });
    }
  }
  
  return job;
}
```

**File implementato:** `src/features/plugins/external-executor.ts`

#### 3. Webhook Handler ✅

```typescript
// ✅ API: POST /api/webhooks/transforms/:jobId
// File: src/app/api/webhooks/transforms/[jobId]/route.ts
export async function POST(
  request: Request,
  { params }: { params: { jobId: string } }
) {
  // 1. ✅ Verifica signature
  const signatureHeader = request.headers.get('X-Plugin-Signature');
  const signature = HMACVerifier.extractSignature(signatureHeader);
  
  if (!signature) {
    return Response.json({ error: 'Missing or invalid signature' }, { status: 401 });
  }
  
  // 2. ✅ Trova job
  const job = await db.transformJob.findUnique({
    where: { id: params.jobId },
    include: { plugin: true }
  });
  
  if (!job) {
    return Response.json({ error: 'Job not found' }, { status: 404 });
  }
  
  // 3. ✅ Verify signature with plugin secret (timing-safe)
  const rawBody = await request.text();
  const isValid = HMACVerifier.verifySignature(
    rawBody,
    signature,
    job.plugin.webhookSecret
  );
  
  if (!isValid) {
    console.error('Invalid webhook signature for job:', job.id);
    return Response.json({ error: 'Invalid signature' }, { status: 401 });
  }
  
  // 4. ✅ Parse and validate payload
  const body = JSON.parse(rawBody);
  const { status, progress, progressMessage, result, error } = body;
  
  if (!status || !['processing', 'completed', 'failed'].includes(status)) {
    return Response.json({ error: 'Invalid status' }, { status: 400 });
  }
  
  // 5. ✅ Update job in database
  const updateData: any = {
    status: status.toUpperCase() as JobStatus,
    updatedAt: new Date()
  };
  
  if (progress !== undefined) {
    updateData.progress = Math.min(100, Math.max(0, progress));
  }
  
  if (progressMessage) {
    updateData.progressMessage = progressMessage;
  }
  
  if (status === 'completed') {
    updateData.result = JSON.stringify(result);
    updateData.completedAt = new Date();
  }
  
  if (status === 'failed') {
    updateData.error = error || 'Unknown error';
    updateData.completedAt = new Date();
  }
  
  await db.transformJob.update({
    where: { id: job.id },
    data: updateData
  });
  
  // 6. TODO: Notify UI via WebSocket/SSE (polling funziona per ora)
  
  return Response.json({ success: true });
}
```

**File implementati:**
- `src/app/api/webhooks/transforms/[jobId]/route.ts` - Webhook handler
- `src/lib/security/hmac.ts` - HMAC verification con timing-safe comparison

#### 4. UI Real-time Updates

**Implementato:**
- ✅ Job polling tramite `GET /api/jobs/[jobId]`
- ✅ Hook React: `use-external-plugins.ts` con SWR
- ✅ UI components: `install-external-plugin-dialog.tsx`

**Futuro:**
- ❌ WebSocket/SSE per notifiche real-time (polling funziona per ora)

```typescript
// ✅ Client side polling (implementato)
// File: src/features/graph/components/graph-view-page.tsx
useEffect(() => {
  if (!jobId) return;
  
  const interval = setInterval(async () => {
    const response = await fetch(`/api/jobs/${jobId}`);
    const job = await response.json();
    
    if (job.status === 'COMPLETED') {
      // Aggiungi entità al grafo
      addEntitiesToGraph(JSON.parse(job.result).entities);
      clearInterval(interval);
    } else if (job.status === 'FAILED' || job.status === 'TIMEOUT') {
      // Mostra errore
      toast.error(job.error || 'Transform failed');
      clearInterval(interval);
    }
    // Se PROCESSING, continua polling
  }, 2000); // Poll ogni 2s
  
  return () => clearInterval(interval);
}, [jobId]);
```

**File implementati:**
- `src/app/api/jobs/[jobId]/route.ts` - Get job status
- `src/app/api/jobs/active/route.ts` - List active jobs
- `src/app/api/jobs/[jobId]/cancel/route.ts` - Cancel job

---

## 🔌 Lato Server Plugin

### Cosa Deve Implementare lo Sviluppatore

#### 1. Manifest Endpoint (Statico)

```
GET https://cdn.myplugin.com/manifest.json

Returns: Manifest JSON completo
```

#### 2. Transform Endpoint

```typescript
POST /v1/search-domain
Content-Type: application/json
X-Organization-Id: org-123

Request Body:
{
  "transformId": "search-domain",
  "input": {
    "entity": {
      "type": "domain",
      "value": "example.com"
    },
    "config": {
      "apiKey": "...",
      "maxResults": 10
    }
  },
  // ⭐ URL webhook fornito dalla piattaforma
  "callbackUrl": "https://platform.osint.com/api/webhooks/transforms/job-xyz?token=secret"
}

Response (Async):
{
  "async": true,
  "jobId": "plugin-job-456",
  "estimatedTime": 300,  // seconds
  "message": "Job queued for processing"
}

Response (Sync):
{
  "async": false,
  "result": {
    "success": true,
    "entities": [...],
    "edges": [...],
    "message": "Found 5 results"
  }
}
```

#### 3. Background Worker

```typescript
// Pseudo-code
async function processJob(job) {
  try {
    // Invia status = processing
    await sendWebhook(job.callbackUrl, {
      status: 'processing',
      progress: 0
    });
    
    // Esegui la transform (può durare minuti/ore)
    const result = await performOSINTAnalysis(job.input);
    
    // Aggiorna progress (opzionale)
    await sendWebhook(job.callbackUrl, {
      status: 'processing',
      progress: 50
    });
    
    // Completa
    await sendWebhook(job.callbackUrl, {
      status: 'completed',
      result: {
        success: true,
        entities: result.entities,
        edges: result.edges
      }
    });
    
  } catch (error) {
    // Errore
    await sendWebhook(job.callbackUrl, {
      status: 'failed',
      error: error.message
    });
  }
}
```

#### 4. Webhook Sender con HMAC

```typescript
async function sendWebhook(url: string, payload: any) {
  const body = JSON.stringify(payload);
  
  // Calcola signature
  const signature = crypto
    .createHmac('sha256', SECRET_KEY)
    .update(body)
    .digest('hex');
  
  await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Plugin-Signature': `sha256=${signature}`
    },
    body
  });
}
```

---

## 🛠️ SDK per Sviluppatori

### Obiettivo SDK

Fornire un **toolkit completo** per sviluppatori che vogliono creare plugin esterni, semplificando:
- Validazione manifest
- Gestione webhook
- Firma HMAC
- Testing locale

### Linguaggi Supportati

- **TypeScript/Node.js** (priorità)
- **Python** (futuro)

### Esempio SDK Usage (Node.js)

```typescript
import { OSINTPluginSDK } from '@osint-platform/plugin-sdk';

const plugin = new OSINTPluginSDK({
  id: 'my-plugin',
  version: '1.0.0',
  webhookSecret: process.env.WEBHOOK_SECRET
});

// Definisci transform
plugin.registerTransform({
  id: 'search-domain',
  name: 'Search Domain',
  inputType: 'domain',
  outputTypes: ['note', 'organization'],
  
  // Handler sincrono
  handler: async (input, config) => {
    const results = await doSomething(input.entity.value, config);
    
    return {
      entities: results.entities,
      edges: results.edges
    };
  }
});

// Transform asincrona
plugin.registerAsyncTransform({
  id: 'deep-scan',
  name: 'Deep Scan',
  inputType: 'domain',
  outputTypes: ['ip', 'note'],
  
  handler: async (input, config, job) => {
    // Invia progress updates
    await job.updateProgress(25, 'Scanning ports...');
    
    const ports = await scanPorts(input.entity.value);
    
    await job.updateProgress(50, 'Analyzing results...');
    
    const analysis = await analyze(ports);
    
    await job.updateProgress(100, 'Completed');
    
    return {
      entities: analysis.entities,
      edges: analysis.edges
    };
  }
});

// Genera manifest
const manifest = plugin.generateManifest({
  name: 'My OSINT Plugin',
  description: 'Does something cool',
  author: 'Developer',
  endpoint: 'https://api.myplugin.com'
});

// Avvia server
plugin.listen(3000);
```

### Features SDK

- ✅ **Manifest Generator**: Genera manifest JSON valido
- ✅ **Validation**: Valida input/output types
- ✅ **Webhook Handler**: Gestisce automaticamente callback
- ✅ **HMAC Signing**: Firma automatica webhook
- ✅ **Testing Tools**: Mock platform per test locali
- ✅ **Job Queue**: Integrazione con Bull/BullMQ per async jobs
- ✅ **Error Handling**: Gestione errori standardizzata
- ✅ **Logging**: Logging strutturato

---

## 🌊 Flussi Operativi

### Flusso 1: Installation Plugin

```
User                Platform              Plugin Server
  │                     │                        │
  │  1. Add Plugin      │                        │
  │  (manifest URL)     │                        │
  ├────────────────────>│                        │
  │                     │  2. Download Manifest  │
  │                     ├───────────────────────>│
  │                     │<───────────────────────┤
  │                     │  3. Validate           │
  │                     │     - Schema           │
  │                     │     - Security         │
  │                     │     - Compatibility    │
  │                     │                        │
  │                     │  4. Store in DB        │
  │                     │     (OrgPlugin)        │
  │                     │                        │
  │  5. Success         │                        │
  │<────────────────────┤                        │
  │                     │                        │
```

### Flusso 2: Transform Sincrona

```
User        Platform        Plugin Server
  │             │                  │
  │  Execute    │                  │
  ├────────────>│  POST /transform │
  │             ├─────────────────>│
  │             │                  │ Process
  │             │                  │ (< 30s)
  │             │<─────────────────┤
  │             │  {result}        │
  │  Results    │                  │
  │<────────────┤                  │
  │             │                  │
```

### Flusso 3: Transform Asincrona

```
User        Platform              Plugin Server        Worker Queue
  │             │                        │                   │
  │  Execute    │                        │                   │
  ├────────────>│  POST /transform       │                   │
  │             │  + webhookUrl          │                   │
  │             ├───────────────────────>│                   │
  │             │                        │  Queue Job        │
  │             │                        ├──────────────────>│
  │             │  {async: true,         │                   │
  │             │   jobId: "xyz"}        │                   │
  │             │<───────────────────────┤                   │
  │  Pending    │                        │                   │
  │<────────────┤                        │                   │
  │             │                        │                   │
  │             │                        │   Processing      │
  │             │   Webhook: processing  │<──────────────────┤
  │             │<───────────────────────┤                   │
  │ Processing  │                        │                   │
  │<────────────┤                        │                   │
  │   (50%)     │                        │                   │
  │             │                        │   Completed       │
  │             │   Webhook: completed   │<──────────────────┤
  │             │<───────────────────────┤                   │
  │  Results    │                        │                   │
  │<────────────┤                        │                   │
  │             │                        │                   │
```

---

## 🔐 Security & Rate Limiting

### Security (Regole Obbligatorie)

#### 1. HTTPS Obbligatorio

**Regola imposta dalla piattaforma:**
```typescript
// Validazione all'installazione
if (!endpoint.startsWith('https://')) {
  throw new Error('HTTPS is required. HTTP endpoints are not allowed.');
}

// Verifica certificato TLS valido
const isValidCert = await verifyTLSCertificate(endpoint);
if (!isValidCert) {
  throw new Error('Invalid or expired TLS certificate.');
}
```

**Non negoziabile**: Tutti i plugin esterni devono usare HTTPS. Nessuna eccezione.

#### 2. HMAC Signature Obbligatorio

**Regola imposta dalla piattaforma:**
- Ogni webhook DEVE essere firmato con HMAC-SHA256
- Secret generato dalla piattaforma durante installazione
- Header `X-Plugin-Signature: sha256={hash}`

```typescript
// Piattaforma verifica ogni webhook
const signature = request.headers.get('X-Plugin-Signature');
if (!signature) {
  return Response.json({ error: 'Missing signature' }, { status: 401 });
}

const isValid = verifyHMACSignature(body, signature, plugin.secret);
if (!isValid) {
  return Response.json({ error: 'Invalid signature' }, { status: 401 });
}
```

**Non negoziabile**: Tutti i webhook devono essere firmati. Webhook senza signature vengono scartati.

#### 3. Timeout Gestiti dalla Piattaforma

**Timeout HTTP (risposta iniziale):**
```typescript
const TIMEOUTS = {
  initialResponse: {
    async: 5000,   // 5s - transform async deve solo accettare job
    sync: 30000    // 30s - transform sync deve completare
  }
};
```

**Timeout Job Asincroni:**
```typescript
const JOB_TIMEOUTS = {
  custom: 1800000,      // 30 minuti (plugin custom)
  store: 7200000,       // 2 ore (plugin store verified)
  official: 14400000    // 4 ore (plugin official)
};
```

**Regola**: I timeout **non sono configurabili** nel manifest. La piattaforma li determina automaticamente in base al tipo di plugin e transform.

#### 4. Plugin Custom vs Store

**Plugin Custom/Privati** (ora):
- Nessuna verifica del team
- Responsabilità dell'organization
- Warning UI: "Plugin non verificato - usa a tuo rischio"
- Rate limiting standard

**Plugin Community Store** (futuro):
- Review obbligatoria del team
- Badge "Verified" ✓ se approvato
- Badge "Official" ⭐ se sviluppato dal team
- Rate limiting più generosi
- Featured placement possibile

### Rate Limiting (Definito dalla Piattaforma)

#### Lato Platform → Plugin

```typescript
// Max richieste per organization per plugin
const LIMITS = {
  custom: {
    // Plugin custom/privati (installati via URL)
    requestsPerMinute: 30,
    requestsPerHour: 500,
    requestsPerDay: 2000
  },
  store_verified: {
    // Plugin Community Store verificati (futuro)
    requestsPerMinute: 100,
    requestsPerHour: 2000,
    requestsPerDay: 20000
  },
  official: {
    // Plugin ufficiali della piattaforma
    requestsPerMinute: 500,
    requestsPerHour: 10000,
    requestsPerDay: 100000
  }
};
```

#### Lato Plugin → Platform (Webhook)

- Max 100 webhook calls per job
- Timeout: 5 secondi per webhook call
- Retry automatico: 3 tentativi con backoff

### Timeout Management (Gestito dalla Piattaforma)

```typescript
const TIMEOUTS = {
  // Timeout risposta HTTP iniziale Platform → Plugin
  initialResponse: {
    async: 5000,   // 5s - deve solo accettare il job
    sync: 30000    // 30s - deve completare la transform
  },
  
  // Timeout totale per job async
  jobCompletion: {
    custom: 1800000,      // 30 minuti (plugin custom)
    store: 7200000,       // 2 ore (plugin store verified)
    official: 14400000    // 4 ore (plugin official)
  },
  
  // Timeout webhook calls Plugin → Platform
  webhook: 5000  // 5s per chiamata webhook
};
```

**Comportamento in caso di timeout:**

**Timeout HTTP Iniziale:**
- Se transform non risponde entro il timeout → Error immediato
- Transform async deve rispondere entro 5s con `{async: true, jobId: "..."}`
- Transform sync deve completare entro 30s con risultati

**Timeout Job Asincrono:**
- Se job supera il timeout → Stato `timeout`
- Piattaforma può inviare webhook al plugin per cancellare il job (opzionale)
- Notifica utente con messaggio di timeout

**Nota**: I timeout sono definiti dalla piattaforma e **non configurabili** dai developer nel manifest.

---

## 📊 Monitoring & Analytics

### Metriche da Tracciare

**Per Plugin:**
- Numero installazioni
- Numero execution totali
- Success rate (%)
- Tempo medio execution
- Errori (count + types)

**Per Organization:**
- Plugin installati
- Transform execute
- Quota usage
- Costi (se applicabile)

### Dashboard Plugin Developer

Gli sviluppatori dovrebbero avere accesso a:
- Statistiche utilizzo del loro plugin
- Error logs
- Performance metrics
- Feedback users

---

## 🎯 Implementazione Roadmap

### ✅ Phase 1: MVP (Completata - Dicembre 2025)
- [x] Design architettura (questo documento)
- [x] Database schema (TransformJob, OrgExternalPlugin)
- [x] Manifest validation API
- [x] Plugin installation flow
- [x] Webhook handler
- [x] Basic SDK documentation (TypeScript)

### ✅ Phase 2: Async & Real-time (Completata - Dicembre 2025)
- [x] Job queue system
- [x] Progress tracking
- [x] Timeout handling
- [ ] WebSocket/SSE per UI updates (polling funziona, WS futuro)

### ✅ Phase 3: Security & Scale (Completata - Dicembre 2025)
- [x] HMAC verification
- [x] Rate limiting implementation
- [x] Monitoring dashboard (job tracking)
- [x] E2E testing (44 test)

### 🎯 Phase 4: Community (Q1-Q2 2026)
- [ ] SDK npm/PyPI packages
- [ ] Community Store UI
- [ ] Plugin discovery & search
- [ ] Reviews & ratings
- [ ] Developer portal

---

**Last Updated**: Dicembre 2025  
**Version**: 1.0.0  
**Status**: 🎉 Production Ready

