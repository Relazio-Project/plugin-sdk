# Configuration Guide

Guida completa alla configurazione dei plugin Relazio.

## 📋 Overview

Il sistema di configurazione permette di definire **settings personalizzabili** per ogni organization che installa il plugin.

### Caratteristiche

- ✅ **Per-Organization**: Ogni organization ha configurazione separata
- ✅ **4 Tipi di campo**: string, number, boolean, select
- ✅ **Validazione automatica**: Min/max, required, default values
- ✅ **Secrets sicuri**: Campi mascherati in UI
- ✅ **UI automatica**: Form generato automaticamente dalla piattaforma

---

## 🎯 Tipi di Campo

### 1. String

Per testo generico: API keys, endpoints, token, nomi, etc.

```typescript
plugin.configure({
  apiKey: {
    type: 'string',
    label: 'API Key',
    description: 'Your service API key',
    required: true,
    secret: true  // ← Mascherato come ••••••
  },
  
  customEndpoint: {
    type: 'string',
    label: 'Custom Endpoint',
    description: 'Optional custom API endpoint URL',
    required: false,
    default: 'https://api.default.com'
  },
  
  username: {
    type: 'string',
    label: 'Username',
    required: true
  }
});
```

**Properties:**
- `secret: true` → Valore mascherato in UI (per passwords, tokens)
- `default` → Valore precompilato
- `required` → Campo obbligatorio

---

### 2. Number

Per valori numerici: limiti, timeout, soglie, contatori.

```typescript
plugin.configure({
  maxResults: {
    type: 'number',
    label: 'Max Results',
    description: 'Maximum results to return',
    default: 50,
    min: 1,
    max: 1000
  },
  
  timeout: {
    type: 'number',
    label: 'Timeout (seconds)',
    description: 'Request timeout in seconds',
    default: 30,
    min: 5,
    max: 300
  },
  
  rateLimit: {
    type: 'number',
    label: 'Rate Limit',
    description: 'Requests per minute',
    default: 60
  }
});
```

**Properties:**
- `min` → Valore minimo accettato
- `max` → Valore massimo accettato
- `default` → Valore di default

**UI Rendering:**
```
Max Results: [50        ] (1-1000)
             ───────────
             Input con validazione
```

---

### 3. Boolean

Per feature flags e opzioni on/off.

```typescript
plugin.configure({
  enableCaching: {
    type: 'boolean',
    label: 'Enable Caching',
    description: 'Cache results for faster response',
    default: true
  },
  
  verboseLogging: {
    type: 'boolean',
    label: 'Verbose Logging',
    description: 'Enable detailed logging',
    default: false
  },
  
  includeMetadata: {
    type: 'boolean',
    label: 'Include Metadata',
    description: 'Include detailed metadata in results',
    default: false
  }
});
```

**Properties:**
- `default` → true o false

**UI Rendering:**
```
☑ Enable Caching
☐ Verbose Logging
```

---

### 4. Select

Per scelte multiple predefinite.

```typescript
plugin.configure({
  region: {
    type: 'select',
    label: 'API Region',
    description: 'Choose your preferred region',
    required: true,
    options: [
      { label: 'US East', value: 'us-east' },
      { label: 'US West', value: 'us-west' },
      { label: 'EU West', value: 'eu-west' },
      { label: 'Asia Pacific', value: 'ap-south' }
    ]
  },
  
  priority: {
    type: 'select',
    label: 'Priority Level',
    description: 'Processing priority',
    options: [
      { label: 'Low', value: 'low' },
      { label: 'Normal', value: 'normal' },
      { label: 'High', value: 'high' }
    ],
    default: 'normal'
  },
  
  outputFormat: {
    type: 'select',
    label: 'Output Format',
    options: [
      { label: 'JSON', value: 'json' },
      { label: 'XML', value: 'xml' },
      { label: 'CSV', value: 'csv' }
    ]
  }
});
```

**Properties:**
- `options` → Array di {label, value} (obbligatorio)
- `default` → Valore selezionato di default
- `required` → Se deve selezionare un valore

**UI Rendering:**
```
Region:
┌─────────────────────────────┐
│ US East                  ▼  │  ← Dropdown
└─────────────────────────────┘
```

---

## 🔧 Accesso alla Configurazione

### Nel Handler Transform

```typescript
plugin.transform({
  id: 'my-transform',
  name: 'My Transform',
  description: 'Does something',
  inputType: 'domain',
  outputTypes: ['ip'],
  
  handler: async (input, config) => {
    // config contiene tutti i valori configurati dall'organization
    
    // String fields
    const apiKey = config.apiKey;
    const endpoint = config.customEndpoint;
    
    // Number fields
    const maxResults = config.maxResults;
    const timeout = config.timeout;
    
    // Boolean fields
    const cachingEnabled = config.enableCaching;
    const verboseMode = config.verboseLogging;
    
    // Select fields
    const region = config.region;
    const priority = config.priority;
    
    // Usa la configurazione
    console.log(`Processing with config:`, {
      endpoint,
      region,
      maxResults,
      cachingEnabled
    });
    
    const url = `${endpoint}/${region}/lookup`;
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'X-Priority': priority
      },
      signal: AbortSignal.timeout(timeout * 1000)
    });
    
    // ...
  }
});
```

### Valori di Default

Se un campo ha `default` e l'utente non lo configura:

```typescript
// Schema
maxResults: {
  type: 'number',
  default: 50
}

// Nel handler
const maxResults = config.maxResults || 50; // Fallback manuale
// oppure
const maxResults = config.maxResults; // Già 50 se non configurato
```

---

## 🏢 Multi-Tenancy

Ogni organization ha **configurazione completamente separata**.

### Esempio

```typescript
// Organization A installa plugin e configura:
{
  "apiKey": "key-alpha-123",
  "region": "us-east",
  "maxResults": 100,
  "enableCaching": true
}

// Organization B installa plugin e configura:
{
  "apiKey": "key-beta-456",
  "region": "eu-west",
  "maxResults": 25,
  "enableCaching": false
}

// Organization C installa plugin e configura:
{
  "apiKey": "key-gamma-789",
  "region": "ap-south",
  "maxResults": 500,
  "enableCaching": true
}
```

**Quando Organization A esegue transform:**
```typescript
handler: async (input, config) => {
  console.log(config.apiKey);      // "key-alpha-123"
  console.log(config.region);      // "us-east"
  console.log(config.maxResults);  // 100
}
```

**Quando Organization B esegue transform:**
```typescript
handler: async (input, config) => {
  console.log(config.apiKey);      // "key-beta-456"
  console.log(config.region);      // "eu-west"
  console.log(config.maxResults);  // 25
}
```

**Completamente isolate!**

---

## 📊 Esempio Completo

```typescript
import { RelazioPlugin } from '@relazio/plugin-sdk';

const plugin = new RelazioPlugin({
  id: 'advanced-api',
  name: 'Advanced API Plugin',
  version: '1.0.0',
  author: 'Your Team',
  description: 'Highly configurable API integration',
  category: 'network'
});

// Schema configurazione completo
plugin.configure({
  // Authentication
  apiKey: {
    type: 'string',
    label: 'API Key',
    description: 'Get your API key from https://service.com/keys',
    required: true,
    secret: true
  },
  
  // Endpoint customization
  customEndpoint: {
    type: 'string',
    label: 'Custom Endpoint',
    description: 'Use custom endpoint (leave empty for default)',
    required: false,
    default: 'https://api.service.com'
  },
  
  // Limits
  maxResults: {
    type: 'number',
    label: 'Max Results',
    description: 'Maximum results per request',
    default: 50,
    min: 1,
    max: 500
  },
  
  timeout: {
    type: 'number',
    label: 'Timeout',
    description: 'Request timeout in seconds',
    default: 30,
    min: 5,
    max: 120
  },
  
  retryAttempts: {
    type: 'number',
    label: 'Retry Attempts',
    description: 'Number of retries on failure',
    default: 3,
    min: 0,
    max: 10
  },
  
  // Features
  enableCaching: {
    type: 'boolean',
    label: 'Enable Caching',
    description: 'Cache results for 1 hour',
    default: true
  },
  
  includeMetadata: {
    type: 'boolean',
    label: 'Include Metadata',
    description: 'Include detailed metadata in results',
    default: false
  },
  
  verboseLogging: {
    type: 'boolean',
    label: 'Verbose Logging',
    description: 'Enable detailed logging',
    default: false
  },
  
  // Options
  region: {
    type: 'select',
    label: 'Region',
    description: 'API region for requests',
    required: true,
    options: [
      { label: 'North America', value: 'na' },
      { label: 'Europe', value: 'eu' },
      { label: 'Asia Pacific', value: 'ap' }
    ]
  },
  
  priority: {
    type: 'select',
    label: 'Priority',
    description: 'Processing priority',
    options: [
      { label: 'Low', value: 'low' },
      { label: 'Normal', value: 'normal' },
      { label: 'High', value: 'high' }
    ],
    default: 'normal'
  }
});

// Transform usa tutte le configurazioni
plugin.transform({
  id: 'lookup',
  name: 'API Lookup',
  description: 'Performs API lookup with custom config',
  inputType: 'domain',
  outputTypes: ['ip', 'note'],
  
  handler: async (input, config) => {
    const domain = input.entity.value;
    const orgId = input.organizationId;
    
    // Log con verbose mode
    if (config.verboseLogging) {
      console.log(`[${orgId}] Lookup ${domain}`, config);
    }
    
    // Costruisci URL con region
    const url = `${config.customEndpoint}/${config.region}/lookup/${domain}`;
    
    // Fetch con tutte le opzioni configurate
    let attempt = 0;
    let response;
    
    while (attempt <= config.retryAttempts) {
      try {
        response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${config.apiKey}`,
            'X-Priority': config.priority
          },
          signal: AbortSignal.timeout(config.timeout * 1000)
        });
        
        if (response.ok) break;
      } catch (error) {
        attempt++;
        if (attempt > config.retryAttempts) throw error;
        await new Promise(r => setTimeout(r, 1000 * attempt));
      }
    }
    
    let data = await response.json();
    
    // Applica maxResults
    data = data.slice(0, config.maxResults);
    
    // Metadata opzionale
    if (!config.includeMetadata) {
      data = data.map(item => ({ value: item.value }));
    }
    
    // Caching opzionale
    if (config.enableCaching) {
      // Salva in cache...
    }
    
    return {
      entities: data,
      edges: [],
      message: `Found ${data.length} results`
    };
  }
});
```

---

## 🎨 UI Generata Automaticamente

Dalla configurazione sopra, la piattaforma genera automaticamente questo form:

```
┌───────────────────────────────────────────────┐
│  Configure: Advanced API Plugin               │
├───────────────────────────────────────────────┤
│                                               │
│  API Key *                                    │
│  ┌─────────────────────────────────────────┐ │
│  │ ••••••••••••••••                        │ │
│  └─────────────────────────────────────────┘ │
│  Get your API key from https://service.com... │
│                                               │
│  Custom Endpoint                              │
│  ┌─────────────────────────────────────────┐ │
│  │ https://api.service.com                 │ │
│  └─────────────────────────────────────────┘ │
│  Use custom endpoint (leave empty for...)     │
│                                               │
│  Max Results: [50        ] (1-500)           │
│  Timeout: [30        ] (5-120)               │
│  Retry Attempts: [3         ] (0-10)         │
│                                               │
│  ☑ Enable Caching                            │
│  ☐ Include Metadata                          │
│  ☐ Verbose Logging                           │
│                                               │
│  Region *                                     │
│  ┌─────────────────────────────────────────┐ │
│  │ North America               ▼           │ │
│  └─────────────────────────────────────────┘ │
│                                               │
│  Priority                                     │
│  ┌─────────────────────────────────────────┐ │
│  │ Normal                      ▼           │ │
│  └─────────────────────────────────────────┘ │
│                                               │
│         [Cancel]  [Save Configuration]        │
└───────────────────────────────────────────────┘
```

---

## ✅ Best Practices

1. **Usa `secret: true`** per API keys, passwords, tokens
2. **Aggiungi `description`** chiare per aiutare gli utenti
3. **Imposta `default`** ragionevoli quando possibile
4. **Usa `min/max`** per validare numeri
5. **Marca `required`** solo campi veramente obbligatori
6. **Testa con config diverse** per diverse organizations
7. **Log organization ID** quando usi config per debugging

---

## 🔗 Risorse

- [SDK Documentation](SDK.md)
- [Multi-Tenant Guide](MULTI_TENANT.md)
- [Quick Start](../QUICKSTART.md)
- [Examples](../examples/)


