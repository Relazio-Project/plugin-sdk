# Multi-Tenancy Guide

## 🏢 Plugin Multi-Tenant

Un plugin **multi-tenant** può servire **multiple organizations** contemporaneamente, ognuna con:
- ✅ Webhook secret separato
- ✅ Configurazione separata (API keys, settings)
- ✅ Isolamento dei dati

### 🆚 Single-Tenant vs Multi-Tenant

#### Single-Tenant (Default)
```typescript
const plugin = new RelazioPlugin({ /* ... */ });

// UN webhook secret per tutti
plugin.setWebhookSecret('fixed-secret');

// ❌ NON funziona per plugin pubblici su Vercel
```

#### Multi-Tenant (Production)
```typescript
const plugin = new RelazioPlugin({ /* ... */ });

// Secret provider gestisce multiple organizations
plugin.enableMultiTenant(secretProvider);

// ✅ Funziona per plugin pubblici su Vercel
```

---

## 🚀 Quick Start Multi-Tenant

### Opzione 1: Auto (In-Memory)

Per sviluppo/testing rapido:

```typescript
const plugin = new RelazioPlugin({ /* ... */ });

// Abilita multi-tenancy con provider in-memory
const secrets = plugin.enableMultiTenantInMemory();

// Registra organizations
secrets.setSecret('org-123', 'webhook-secret-123');
secrets.setSecret('org-456', 'webhook-secret-456');

plugin.start({ port: 3000, multiTenant: true });
```

### Opzione 2: Custom Provider (Production)

Con database persistente:

```typescript
import { RelazioPlugin, WebhookSecretProvider } from '@relazio/plugin-sdk';
import { db } from './database';

class DatabaseSecretProvider implements WebhookSecretProvider {
  async getSecret(organizationId: string): Promise<string | null> {
    const org = await db.organizations.findOne({ id: organizationId });
    return org?.webhookSecret || null;
  }
}

const plugin = new RelazioPlugin({ /* ... */ });
plugin.enableMultiTenant(new DatabaseSecretProvider());
```

---

## 📋 Implementazione Completa

### 1. Setup Plugin

```typescript
import { RelazioPlugin, WebhookSecretProvider } from '@relazio/plugin-sdk';

// Secret provider personalizzato
class MySecretProvider implements WebhookSecretProvider {
  private secrets = new Map<string, string>();

  async getSecret(organizationId: string): Promise<string | null> {
    // In produzione: query a database
    return this.secrets.get(organizationId) || null;
  }

  // Helper per registrare nuove organizations
  registerOrg(orgId: string, secret: string): void {
    this.secrets.set(orgId, secret);
  }
}

const secretProvider = new MySecretProvider();
const plugin = new RelazioPlugin({
  id: 'my-plugin',
  name: 'My Plugin',
  version: '1.0.0',
  author: 'Me',
  description: 'Multi-tenant plugin',
  category: 'network'
});

plugin.enableMultiTenant(secretProvider);
```

### 2. Configurazione per Organization

```typescript
// Ogni organization ha la propria configurazione
plugin.configure({
  apiKey: {
    type: 'string',
    label: 'API Key',
    description: 'Your API key',
    required: true,
    secret: true
  }
});
```

### 3. Transform con Organization ID

```typescript
plugin.transform({
  id: 'lookup',
  name: 'Lookup',
  description: 'Looks up data',
  inputType: 'domain',
  outputTypes: ['ip'],
  
  handler: async (input, config) => {
    // Organization ID disponibile nell'input
    const orgId = input.organizationId;
    
    // Config è specifica per questa organization
    const apiKey = config.apiKey;
    
    console.log(`Processing for org: ${orgId}`);
    console.log(`Using API key: ${apiKey}`);
    
    // Processa usando config dell'organization
    return { entities: [], edges: [] };
  }
});
```

### 4. Transform Async Multi-Tenant

```typescript
plugin.asyncTransform({
  id: 'deep-scan',
  name: 'Deep Scan',
  description: 'Long scan',
  inputType: 'domain',
  outputTypes: ['ip'],
  
  handler: async (input, config, job) => {
    const orgId = input.organizationId;
    
    // Il job usa automaticamente il webhook secret corretto per questa org
    await job.updateProgress(50, `Scanning for ${orgId}...`);
    
    return { entities: [], edges: [] };
  }
});
```

---

## 🔐 Registrazione Organizations

### Endpoint di Registrazione (Opzionale)

Puoi esporre un endpoint per registrare organizations:

```typescript
import express from 'express';

const app = express();

// Endpoint per registrare nuove organizations
app.post('/register', async (req, res) => {
  const { organizationId, webhookSecret } = req.body;
  
  // Valida richiesta (es. token admin, etc.)
  if (!isAuthorized(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  // Registra organization
  await secretProvider.registerOrg(organizationId, webhookSecret);
  
  res.json({ success: true });
});
```

### Flusso Installazione

```
1. User installa plugin in Relazio
   ↓
2. Relazio genera webhook secret unico
   ↓
3. Relazio mostra secret all'utente
   ↓
4. User (o admin) registra organization nel plugin:
   POST https://my-plugin.vercel.app/register
   {
     "organizationId": "org-123",
     "webhookSecret": "secret-from-relazio"
   }
   ↓
5. Plugin può ora processare richieste da quella organization
```

---

## 🧪 Testing Multi-Tenant

### Test con cURL

```bash
# Richiesta da org-alpha
curl -X POST http://localhost:3000/lookup \
  -H "Content-Type: application/json" \
  -H "X-Organization-Id: org-alpha" \
  -d '{
    "transformId": "lookup",
    "input": {
      "entity": {
        "id": "1",
        "type": "domain",
        "value": "example.com"
      },
      "config": {
        "apiKey": "org-alpha-key-123"
      }
    }
  }'

# Richiesta da org-beta (config diversa)
curl -X POST http://localhost:3000/lookup \
  -H "Content-Type: application/json" \
  -H "X-Organization-Id: org-beta" \
  -d '{
    "transformId": "lookup",
    "input": {
      "entity": {
        "id": "2",
        "type": "domain",
        "value": "example.com"
      },
      "config": {
        "apiKey": "org-beta-key-456"
      }
    }
  }'
```

---

## 💾 Secret Providers Esempi

### PostgreSQL Provider

```typescript
import { Pool } from 'pg';

class PostgresSecretProvider implements WebhookSecretProvider {
  private pool: Pool;

  constructor(connectionString: string) {
    this.pool = new Pool({ connectionString });
  }

  async getSecret(organizationId: string): Promise<string | null> {
    const result = await this.pool.query(
      'SELECT webhook_secret FROM organizations WHERE id = $1',
      [organizationId]
    );
    return result.rows[0]?.webhook_secret || null;
  }
}

// Usage
const provider = new PostgresSecretProvider(process.env.DATABASE_URL!);
plugin.enableMultiTenant(provider);
```

### Redis Provider

```typescript
import { createClient } from 'redis';

class RedisSecretProvider implements WebhookSecretProvider {
  private client;

  constructor() {
    this.client = createClient({ url: process.env.REDIS_URL });
    this.client.connect();
  }

  async getSecret(organizationId: string): Promise<string | null> {
    return await this.client.get(`org:${organizationId}:secret`);
  }
}

// Usage
const provider = new RedisSecretProvider();
plugin.enableMultiTenant(provider);
```

### File-based Provider (Simple)

```typescript
import fs from 'fs/promises';
import path from 'path';

class FileSecretProvider implements WebhookSecretProvider {
  private secretsPath: string;

  constructor(secretsPath: string) {
    this.secretsPath = secretsPath;
  }

  async getSecret(organizationId: string): Promise<string | null> {
    try {
      const data = await fs.readFile(this.secretsPath, 'utf-8');
      const secrets = JSON.parse(data);
      return secrets[organizationId] || null;
    } catch {
      return null;
    }
  }
}

// secrets.json:
// {
//   "org-123": "secret-123",
//   "org-456": "secret-456"
// }

const provider = new FileSecretProvider('./secrets.json');
plugin.enableMultiTenant(provider);
```

---

## 📊 Monitoring Multi-Tenant

```typescript
// Track usage per organization
const usage = new Map<string, number>();

plugin.transform({
  id: 'lookup',
  name: 'Lookup',
  // ...
  handler: async (input, config) => {
    const orgId = input.organizationId;
    
    // Incrementa contatore
    usage.set(orgId, (usage.get(orgId) || 0) + 1);
    
    console.log(`Total requests from ${orgId}: ${usage.get(orgId)}`);
    
    return { entities: [], edges: [] };
  }
});

// Endpoint per statistiche
app.get('/stats', (req, res) => {
  res.json({
    totalOrganizations: secretProvider.count(),
    usage: Object.fromEntries(usage)
  });
});
```

---

## ✅ Best Practices

1. **Usa provider persistente in produzione** (database, non in-memory)
2. **Valida organization ID** in ogni richiesta
3. **Isola dati tra organizations** (non condividere cache, etc.)
4. **Monitora usage per organization** (rate limiting, billing)
5. **Log organization ID** in ogni operazione
6. **Testa con multiple organizations** prima del deploy

---

## 🎯 Esempio Completo

Vedi: `examples/multi-tenant-plugin/index.ts`

```bash
cd examples/multi-tenant-plugin
npm install
npm run dev

# Test
curl -X POST http://localhost:3003/lookup-ip \
  -H "Content-Type: application/json" \
  -H "X-Organization-Id: org-alpha" \
  -d '...'
```

