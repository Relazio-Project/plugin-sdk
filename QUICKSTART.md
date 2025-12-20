# Quick Start Guide - Relazio Plugin SDK

## Installazione

```bash
npm install @relazio/plugin-sdk
```

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
  host: '0.0.0.0'
});
```

### 4. Test

```bash
# Health check
curl http://localhost:3000/health

# Manifest
curl http://localhost:3000/manifest.json

# Esegui transform
curl -X POST http://localhost:3000/extract-info \
  -H "Content-Type: application/json" \
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
```

## Transform Asincrone

Per operazioni lunghe (minuti/ore):

```typescript
// Imposta webhook secret
plugin.setWebhookSecret(process.env.WEBHOOK_SECRET);

plugin.asyncTransform({
  id: 'long-scan',
  name: 'Long Scan',
  description: 'Performs a long-running scan',
  inputType: 'domain',
  outputTypes: ['domain', 'note'],
  
  handler: async (input, config, job) => {
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
✅ **Webhook secret** - Per async transforms  
✅ **Certificato TLS valido**  
✅ **Rate limiting** - Gestito dalla piattaforma

## Risorse

- 📚 [SDK Documentation](docs/SDK.md)
- 🏗️ [Architecture](docs/EXTERNAL_PLUGINS.md)
- 🔄 [Flow Details](docs/EXTERNAL_PLUGINS_FLOW.md)
- 💡 [Examples](examples/)

## Supporto

- GitHub Issues: [relazio/plugin-sdk](https://github.com/relazio/plugin-sdk)
- Documentation: [docs/](docs/)

