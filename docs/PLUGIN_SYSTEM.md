# OSINT Platform - Plugin System

## 📋 Indice
1. [Panoramica](#panoramica)
2. [Architettura](#architettura)
3. [Entity Types](#entity-types)
4. [Plugin Implementati](#plugin-implementati)
5. [Creare un Plugin](#creare-un-plugin)
6. [API Reference](#api-reference)
7. [Best Practices](#best-practices)

---

## 📖 Panoramica

Il sistema plugin permette di estendere le capacità della piattaforma attraverso **transform** che convertono entità in altre entità.

**Concetti:**
- **Entity**: Nodo nel grafo (email, IP, dominio, ecc.)
- **Transform**: Funzione input → output entities
- **Plugin**: Contenitore di transform correlate
- **Edge**: Connessione tra entità con relazione

---

## 🏗️ Architettura

### Flusso Esecuzione

```
UI (click "+") → getTransformsForEntityType() → User selects transform
  ↓
executeTransform() → POST /api/transforms/{plugin}
  ↓
Plugin Executor → TransformResult (entities + edges)
  ↓
UI aggiorna grafo
```

### Componenti

- **Registry** (`src/features/plugins/registry.ts`) - Catalogo plugin e transform
- **Executor** (`src/features/plugins/executor.ts`) - Esecuzione e mapping API
- **Builtin** (`src/features/plugins/builtin/`) - Implementazioni plugin
- **API Routes** (`src/app/api/transforms/`) - Endpoint HTTP

---

## 🎨 Entity Types

Il sistema supporta una **gerarchia a 3 livelli**:

```
Category (UI grouping)
  ├─ Subcategory (optional)
  │   └─ Entity Type
  └─ Entity Type (no subcategory)
```

### Types Disponibili (27)

**Identity:** `email`, `person`, `username`, `phone`, `organization`

**Network:** `domain`, `ip`, `url`, `dns_record`

**Social:** `social`, `instagram_user`, `telegram_user`, `telegram_channel`, `telegram_group`, `facebook_user`, `facebook_group`

**Content:** `document`, `note`, `image`, `video`

**Location:** `location`, `maps`

**Blockchain:** `wallet`, `transaction`, `exchange`

**Technical:** `hash`, `credential`

**AI:** `ai_insight`

**Other:** `group`, `custom`

### Wildcards

Il sistema supporta pattern matching per input types:

- **Specifico:** `instagram_user`
- **Categoria:** `social:*` (tutti i social)
- **Piattaforma:** `telegram:*` (tutti i telegram)
- **Tutti:** `all`

---

## 🔌 Plugin Implementati

Attualmente sono implementati **13 plugin built-in**:

### Network (5 plugin)
1. **DNS Lookup** - Risolve record DNS (A, MX, NS, TXT)
2. **IP Geolocation** - Geolocalizzazione IP e ASN lookup
3. **URL Parser** - Estrae dominio e risolve IP da URL
4. **WHOIS Lookup** - Info registrazione domini (RDAP)
5. **Subdomain Finder** - Enumera sottodomini (Certificate Transparency)

### Blockchain (1 plugin)
6. **Blockchain.com** - Analisi wallet Bitcoin e transazioni

### AI (1 plugin)
7. **AI Analysis** - Analisi entità con OpenAI (richiede API key)

### Media (2 plugin)
8. **Image Analysis** - EXIF, reverse search, OCR, hash
9. **Video Analysis** - Metadata, thumbnails, related content

### Identity (1 plugin)
10. **Email Parser** - Estrae dominio e valida formato

### Location (1 plugin)
11. **Location Intelligence** - Geocoding, reverse geocoding, mappa

### Documents (1 plugin)
12. **Note Analysis** - Estrae entità da testo (email, IP, phone, ecc.)

### Social (1 plugin)
13. **Social Media** - Analisi profili social (Instagram, Telegram, Facebook)

---

## 🛠️ Creare un Plugin

### 4 Step per Creare un Built-in Plugin

**1. Executor** (`src/features/plugins/builtin/my-plugin.ts`)

```typescript
import type { TransformInput, TransformResult, PluginExecutor } from '../types';

async function myTransform(input: TransformInput): Promise<TransformResult> {
  const { entity, config } = input;
  
  try {
    // Transform logic
    return {
      success: true,
      entities: [/* nuove entità */],
      edges: [/* nuove connessioni */],
      message: 'Success'
    };
  } catch (error) {
    return { success: false, entities: [], edges: [], error: error.message };
  }
}

export const myPluginExecutor: PluginExecutor = {
  async execute(transformId, input) {
    if (transformId === 'my-transform') return myTransform(input);
    return { success: false, entities: [], edges: [], error: 'Unknown transform' };
  }
};
```

**2. Registry** (`src/features/plugins/registry.ts`)

```typescript
export const myPlugin: PluginDefinition = {
  id: 'my-plugin',
  name: 'My Plugin',
  description: 'Description',
  version: '1.0.0',
  author: 'Your Name',
  icon: 'IconStar',
  category: 'osint',
  type: 'builtin-js',
  runtime: 'nextjs',
  inputTypes: ['email'],
  outputTypes: ['domain'],
  transforms: [{
    id: 'my-transform',
    name: 'My Transform',
    description: 'What it does',
    inputType: 'email',
    outputTypes: ['domain']
  }],
  estimatedTime: 'seconds',
  enabled: true
};

// Aggiungi al registry
export const pluginRegistry = new Map([
  /* ... */,
  [myPlugin.id, myPlugin]
]);
```

**3. API Route** (`src/app/api/transforms/my-plugin/route.ts`)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { myPluginExecutor } from '@/features/plugins/builtin/my-plugin';

export async function POST(request: NextRequest) {
  const { transformId, input } = await request.json();
  const result = await myPluginExecutor.execute(transformId, input);
  return NextResponse.json({ success: result.success, data: result, status: 'completed' });
}
```

**4. Endpoint Mapping** (`src/features/plugins/executor.ts`)

```typescript
const pluginEndpoints: Record<string, string> = {
  /* ... */,
  'my-plugin': '/api/transforms/my-plugin'
};
```

---

## 📡 API Reference

### Request

```typescript
POST /api/transforms/{plugin-id}
Content-Type: application/json

{
  "transformId": "transform-id",
  "input": {
    "entity": {
      "id": "node-123",
      "type": "email",
      "value": "user@example.com",
      "metadata": {}
    },
    "config": { "apiKey": "..." }
  }
}
```

### Response Success

```typescript
{
  "success": true,
  "data": {
    "success": true,
    "entities": [{ id, type, value, label, metadata, timestamp }],
    "edges": [{ id, sourceId, targetId, label, relationship }],
    "message": "Success message",
    "executionTime": 234
  },
  "status": "completed"
}
```

### Response Error

```typescript
{
  "success": false,
  "error": "Error message",
  "status": "failed"
}
```

---

## 🎯 Best Practices

### Naming

- **Plugin ID**: `kebab-case` (es. `dns-lookup`)
- **Transform ID**: `plugin-action` (es. `dns-resolve-a`)
- **Entity/Edge ID**: Auto-generati con timestamp e random

### Input/Output Types

- Usa tipi specifici quando possibile (`instagram_user` vs `social`)
- Usa wildcards per plugin generici (`social:*`, `telegram:*`)
- Documenta chiaramente i tipi supportati

### Error Handling

```typescript
try {
  // Logic
  return { success: true, entities, edges, message: 'OK' };
} catch (error) {
  return { success: false, entities: [], edges: [], error: error.message };
}
```

### Metadata

Arricchisci le entità con metadata utili:

```typescript
{
  metadata: {
    source: 'plugin-name',
    sourceUrl: 'https://...',
    verified: true,
    confidence: 0.95,
    foundAt: new Date().toISOString()
  }
}
```

### Relationships

Usa relationship types semantici:

- `resolves_to` - Domain → IP
- `belongs_to` - Email → Domain
- `owns` - Person → Organization
- `associated_with` - Generic association
- `located_at` - Entity → Location
- `extracted_from` - Data extraction
- `connected_wallet` - Blockchain connections

### Performance

- Limita risultati (max 50 entità per transform)
- Usa timeout appropriati (30s default)
- Implementa caching quando possibile
- Fornisci messaggi di errore chiari

---

## 📊 Plugin Categories

| Category | Descrizione | Esempi |
|----------|-------------|--------|
| `network` | Network analysis | DNS, IP, Subdomain, WHOIS |
| `identity` | Identity verification | Email, Phone, Username |
| `media` | Media analysis | Image EXIF, Video metadata |
| `location` | Geolocation | IP geolocation, Geocoding |
| `blockchain` | Crypto analysis | Wallet tracking, Transaction |
| `ai` | AI-powered | Entity extraction, Analysis |
| `osint` | General OSINT | WHOIS, Public records |
| `social` | Social media | Profile lookup |
| `documents` | Document analysis | Text extraction |
| `other` | Miscellaneous | Custom tools |

---

**Last Updated**: Dicembre 2025  
**Version**: 2.0.0
