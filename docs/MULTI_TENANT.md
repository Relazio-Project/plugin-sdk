# Sistema Multi-Tenant nell'SDK Relazio

## 📋 Panoramica

L'SDK Relazio supporta nativamente il **multi-tenant**, permettendo a un singolo plugin di servire **multiple organizzazioni** contemporaneamente, ognuna con il proprio webhook secret univoco.

---

## 🎯 Perché Multi-Tenant?

### ❌ Senza Multi-Tenant (Problematico)
```
Plugin → Un solo secret → Una sola org
```
- Ogni organizzazione dovrebbe hostare il proprio plugin
- Impossibile creare plugin pubblici/condivisi
- Costi elevati di infrastruttura

### ✅ Con Multi-Tenant (Corretto)
```
Plugin → Registry → Secret per org-1
                  → Secret per org-2
                  → Secret per org-N
```
- Un solo plugin serve N organizzazioni
- Plugin pubblici installabili da chiunque
- Zero configurazione manuale

---

## 🚀 Come Funziona

### 1. Flow di Installazione

```
User → Inserisce URL manifest in Relazio
Relazio → GET /manifest.json
Relazio → POST /register {organizationId, platformUrl}
Plugin → Genera secret univoco per org
Plugin → Salva: orgId → secret
Plugin → Restituisce {webhookSecret}
Relazio → Salva secret nel DB
✅ Plugin installato!
```

### 2. Flow di Esecuzione Transform

```
User → Esegue transform in Relazio
Relazio → POST /transform {input, callbackUrl, organizationId}
         → Header: X-Organization-Id: org-123
Plugin → Identifica org dal header
Plugin → Esegue transform
Plugin → (async) Invia webhook con secret dell'org
Relazio → Verifica signature con secret dell'org
✅ Risultati visualizzati!
```

---

## 💻 Implementazione

### Quick Start (3 righe!)

```typescript
import { RelazioPlugin } from '@relazio/plugin-sdk';

const plugin = new RelazioPlugin({
  id: 'my-plugin',
  name: 'My Plugin',
  version: '1.0.0',
  author: 'Your Name',
  description: 'My awesome plugin',
  category: 'network',
});

// ⭐ Abilita multi-tenant (in-memory)
plugin.start({
  port: 3000,
  multiTenant: true, // ← Questo è tutto!
});
```

### Con Storage Persistente (Produzione)

```typescript
import { RelazioPlugin, InstallationStorage, Installation } from '@relazio/plugin-sdk';
import Redis from 'ioredis';

// Custom storage con Redis
class RedisStorage implements InstallationStorage {
  private redis: Redis;

  constructor() {
    this.redis = new Redis(process.env.REDIS_URL);
  }

  async get(organizationId: string): Promise<Installation | null> {
    const data = await this.redis.get(`plugin:install:${organizationId}`);
    return data ? JSON.parse(data) : null;
  }

  async set(organizationId: string, installation: Installation): Promise<void> {
    await this.redis.set(
      `plugin:install:${organizationId}`,
      JSON.stringify(installation)
    );
  }

  async delete(organizationId: string): Promise<boolean> {
    const result = await this.redis.del(`plugin:install:${organizationId}`);
    return result > 0;
  }

  async getAll(): Promise<Installation[]> {
    const keys = await this.redis.keys('plugin:install:*');
    const values = await Promise.all(
      keys.map((k) => this.redis.get(k))
    );
    return values
      .filter((v) => v !== null)
      .map((v) => JSON.parse(v!));
  }
}

// Usa storage custom
const registry = new InstallationRegistry(
  'my-plugin',
  '1.0.0',
  new RedisStorage()
);

plugin.enableMultiTenant(registry);
```

---

## 🔌 Endpoint Automatici

Quando abiliti `multiTenant: true`, l'SDK espone automaticamente:

### POST /register
**Richiesta**:
```json
{
  "organizationId": "org-abc-123",
  "organizationName": "ACME Corp",
  "platformUrl": "https://relazio.io",
  "platformVersion": "2.0.0"
}
```

**Risposta**:
```json
{
  "webhookSecret": "whs_a1b2c3d4e5f6...",
  "pluginId": "my-plugin",
  "pluginVersion": "1.0.0",
  "message": "Organization registered successfully"
}
```

### POST /unregister
**Richiesta**:
```json
{
  "organizationId": "org-abc-123"
}
```

**Risposta**:
```json
{
  "success": true,
  "message": "Unregistered successfully"
}
```

### GET /stats
**Risposta**:
```json
{
  "totalInstallations": 42,
  "activeInstallations": 35
}
```

---

## 🔐 Sicurezza

### Generazione Secret

Ogni organizzazione riceve un secret univoco:

```typescript
// Formato: whs_<64 caratteri hex>
const secret = `whs_${crypto.randomBytes(32).toString('hex')}`;
// Esempio: whs_a1b2c3d4e5f6...
```

### Verifica HMAC

```typescript
// Il plugin firma i webhook con il secret dell'org
const signature = hmac.sign(payload, secretForOrg);

// Header: X-Plugin-Signature: sha256=abc123...
```

Relazio verifica usando il secret salvato per quell'org.

---

## 📊 Monitoring

### Statistiche Installazioni

```typescript
const registry = plugin.getRegistry();
const stats = await registry.getStats();

console.log(`Total installations: ${stats.totalInstallations}`);
console.log(`Active (last 30 days): ${stats.activeInstallations}`);
```

### Lista Installazioni

```typescript
const installations = await registry.getAllInstallations();

for (const inst of installations) {
  console.log(`Org: ${inst.organizationId}`);
  console.log(`Installed: ${inst.installedAt}`);
  console.log(`Last used: ${inst.lastUsed || 'Never'}`);
}
```

---

## 🧪 Testing

### Simulare Installazione

```typescript
import { InstallationRegistry } from '@relazio/plugin-sdk';

const registry = new InstallationRegistry('test-plugin', '1.0.0');

// Simula installazione
const result = await registry.register({
  organizationId: 'org-test-123',
  organizationName: 'Test Org',
  platformUrl: 'https://test.relazio.io',
});

console.log('Secret:', result.webhookSecret);

// Recupera secret
const secret = await registry.getWebhookSecret('org-test-123');
```

---


## ⚠️ Best Practices

### 1. **Usa Storage Persistente in Produzione**

```typescript
// ❌ NO (solo dev/test)
plugin.start({ multiTenant: true });

// ✅ SI (produzione)
const registry = new InstallationRegistry(
  pluginId,
  version,
  new RedisStorage() // o PostgreSQL, MongoDB, etc.
);
plugin.enableMultiTenant(registry);
```

### 2. **Traccia Last Used**

L'SDK aggiorna automaticamente `lastUsed` ad ogni transform:

```typescript
// Automatico!
await registry.updateLastUsed(organizationId);
```

### 3. **Cleanup Installazioni Inattive**

```typescript
// Cron job giornaliero
const installations = await registry.getAllInstallations();
const sixMonthsAgo = Date.now() - 180 * 24 * 60 * 60 * 1000;

for (const inst of installations) {
  const lastUsed = inst.lastUsed?.getTime() || inst.installedAt.getTime();
  
  if (lastUsed < sixMonthsAgo) {
    console.log(`Removing inactive org: ${inst.organizationId}`);
    await registry.unregister(inst.organizationId);
  }
}
```

---

## 🎯 Esempio Completo

Vedi [`examples/multi-tenant-plugin/`](../examples/multi-tenant-plugin/) per un esempio completo funzionante.

---

## 🔗 Link Utili

- [Quick Start](../QUICKSTART.md)
- [SDK Reference](SDK.md)
- [Plugin Architecture](EXTERNAL_PLUGINS.md)

---

**Multi-tenant = Plugin scalabili per tutta la community!** 🚀

