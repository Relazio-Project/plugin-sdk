# Quick Start Guide - Relazio Plugin SDK

## Installazione

```bash
npm install @relazio/plugin-sdk
```

## 🎯 Flow di Installazione (Automatico)

**Quando un utente installa il tuo plugin in Relazio:**

1. ✅ Utente incolla l'URL del manifest (es: `https://yourplugin.com/manifest.json`)
2. ✅ Relazio scarica e valida il manifest
3. ✅ Relazio chiama automaticamente `POST /register` sul tuo plugin
4. ✅ Il tuo plugin genera un webhook secret univoco per quella organization
5. ✅ Relazio salva il secret (l'utente NON lo vede mai)
6. ✅ Plugin installato! Pronto all'uso!

**💡 L'utente NON deve configurare nulla! Tutto automatico!**

---

## Creare il Primo Plugin

### 1. Setup Base

```typescript
import { RelazioPlugin } from '@relazio/plugin-sdk';

const plugin = new RelazioPlugin({
  id: 'my-first-plugin',
  name: 'My First Plugin',
  version: '1.0.0',
  author: 'Your Name',
  description: 'My first Relazio plugin',
  category: 'network', // network | identity | social | financial | security | other
});
```

### 2. Aggiungi Transform Sincrona

Per operazioni veloci (<30s):

```typescript
plugin.transform({
  id: 'extract-info',
  name: 'Extract Information',
  description: 'Extracts information from input',
  inputType: 'domain', // tipo entità input
  outputTypes: ['ip', 'note'], // tipi entità output
  
  handler: async (input, config) => {
    // Logica della transform
    const domain = input.entity.value;
    
    return {
      entities: [
        {
          type: 'ip',
          value: '93.184.216.34',
          label: 'IP Address'
        },
        {
          type: 'note',
          value: `Analysis for ${domain}`,
          label: 'Analysis Result'
        }
      ],
      edges: [
        {
          sourceId: input.entity.id,
          targetId: 'auto', // auto-genera ID
          label: 'resolves to',
          relationship: 'resolves_to'
        }
      ]
    };
  }
});
```

### 3. Avvia Server

```typescript
plugin.start({
  port: 3000,
  host: '0.0.0.0',
  multiTenant: true  // ← Abilita gestione automatica multi-organization
});
```

**Ottieni automaticamente:**
- ✅ Endpoint `/register` - Registrazione automatica organizzazioni
- ✅ Endpoint `/unregister` - Rimozione organizzazioni
- ✅ Endpoint `/stats` - Statistiche installazioni
- ✅ Gestione automatica webhook secrets per ogni organization
- ✅ Zero configurazione manuale

### 4. Test

```bash
# Health check
curl http://localhost:3000/health

# Manifest
curl http://localhost:3000/manifest.json

# Simula registrazione di un'organizzazione (come fa Relazio)
curl -X POST http://localhost:3000/register \
  -H "Content-Type: application/json" \
  -d '{
    "organizationId": "org-test-123",
    "organizationName": "Test Organization",
    "platformUrl": "https://relazio.io",
    "platformVersion": "2.0.0"
  }'

# Output: {"webhookSecret":"whs_abc123...","pluginId":"my-first-plugin",...}

# Esegui transform (con header organization)
curl -X POST http://localhost:3000/extract-info \
  -H "Content-Type: application/json" \
  -H "X-Organization-Id: org-test-123" \
  -d '{
    "transformId": "extract-info",
    "input": {
      "entity": {
        "id": "test-1",
        "type": "domain",
        "value": "example.com"
      }
    }
  }'

# Statistiche
curl http://localhost:3000/stats
```

## Transform Asincrone

Per operazioni lunghe (minuti/ore):

```typescript
plugin.asyncTransform({
  id: 'long-scan',
  name: 'Long Scan',
  description: 'Performs a long-running scan',
  inputType: 'domain',
  outputTypes: ['domain', 'note'],
  
  handler: async (input, config, job) => {
    // input.organizationId identifica l'organization
    console.log(`Scanning for org: ${input.organizationId}`);
    
    // Aggiorna progresso
    await job.updateProgress(0, 'Starting scan...');
    
    // Operazione lunga
    await performScan(input.entity.value);
    
    await job.updateProgress(50, 'Processing results...');
    
    // Altro lavoro...
    
    await job.updateProgress(100, 'Complete');
    
    return {
      entities: [...],
      edges: [...]
    };
  }
});
```

**Il webhook secret corretto viene automaticamente utilizzato per ogni organization.**

## Configurazione Utente

Se il plugin richiede API keys o settings:

```typescript
plugin.configure({
  // String fields
  apiKey: {
    type: 'string',
    label: 'API Key',
    description: 'Your API key',
    required: true,
    secret: true // mascherato in UI
  },
  
  customEndpoint: {
    type: 'string',
    label: 'Custom Endpoint',
    default: 'https://api.default.com'
  },
  
  // Number fields
  maxResults: {
    type: 'number',
    label: 'Max Results',
    description: 'Maximum results to return',
    default: 10,
    min: 1,
    max: 100
  },
  
  timeout: {
    type: 'number',
    label: 'Timeout (seconds)',
    default: 30,
    min: 5,
    max: 300
  },
  
  // Boolean fields
  enableCaching: {
    type: 'boolean',
    label: 'Enable Caching',
    default: true
  },
  
  verboseLogging: {
    type: 'boolean',
    label: 'Verbose Logging',
    default: false
  },
  
  // Select fields
  region: {
    type: 'select',
    label: 'Region',
    options: [
      { label: 'US East', value: 'us-east' },
      { label: 'EU West', value: 'eu-west' }
    ]
  },
  
  priority: {
    type: 'select',
    label: 'Priority',
    options: [
      { label: 'Low', value: 'low' },
      { label: 'Normal', value: 'normal' },
      { label: 'High', value: 'high' }
    ],
    default: 'normal'
  }
});
```

**Ogni organization avrà la propria configurazione separata!**

Accesso alla configurazione:

```typescript
plugin.transform({
  // ...
  handler: async (input, config) => {
    // String
    const apiKey = config.apiKey;
    const endpoint = config.customEndpoint;
    
    // Number
    const maxResults = config.maxResults || 10;
    const timeout = config.timeout;
    
    // Boolean
    const caching = config.enableCaching;
    const verbose = config.verboseLogging;
    
    // Select
    const region = config.region;
    const priority = config.priority;
    
    // Usa la configurazione
    console.log(`Processing for org: ${input.organizationId}`);
    const url = `${endpoint}/${region}/lookup`;
    // ...
  }
});
```

**📖 Guida completa:** [docs/CONFIGURATION.md](docs/CONFIGURATION.md)

## Tipi Entità Disponibili

- `domain` - Domini (example.com)
- `ip` - Indirizzi IP (8.8.8.8)
- `email` - Email (user@example.com)
- `phone` - Numeri telefono
- `person` - Persone
- `organization` - Organizzazioni
- `location` - Località
- `note` - Note/testo
- `url` - URL
- `hash` - Hash (MD5, SHA256, etc.)
- `custom` - Tipo custom

## Deployment

### Development

```bash
npm run dev
```

### Production

```bash
npm run build
npm start
```

### Docker

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

### Requisiti Produzione

✅ **HTTPS obbligatorio** - La piattaforma richiede HTTPS  
✅ **Certificato TLS valido** - Certificato SSL valido  
✅ **Storage persistente** - Redis/PostgreSQL per produzione (non in-memory)  
✅ **Rate limiting** - Gestito dalla piattaforma

**Storage per Produzione:**
```typescript
import { InstallationRegistry } from '@relazio/plugin-sdk';

// Usa Redis o Database in produzione
const registry = new InstallationRegistry(
  'my-plugin',
  '1.0.0',
  new RedisStorage()  // Vedi docs/MULTI_TENANT.md
);

plugin.enableMultiTenant(registry);
plugin.start({ port: 3000 });
```

## Risorse

- 📚 [SDK Documentation](docs/SDK.md)
- 🏗️ [Architecture](docs/EXTERNAL_PLUGINS.md)
- 🔄 [Flow Details](docs/EXTERNAL_PLUGINS_FLOW.md)
- 💡 [Examples](examples/)

## Supporto

- GitHub Issues: [relazio/plugin-sdk](https://github.com/relazio/plugin-sdk)
- Documentation: [docs/](docs/)

