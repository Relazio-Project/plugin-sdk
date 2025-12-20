# OSINT Platform - Plugin SDK

> Official SDK for building external plugins for OSINT Platform

[![npm version](https://badge.fury.io/js/%40osint-platform%2Fplugin-sdk.svg)](https://www.npmjs.com/package/@osint-platform/plugin-sdk)
[![PyPI version](https://badge.fury.io/py/osint-platform-sdk.svg)](https://pypi.org/project/osint-platform-sdk/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Build powerful OSINT plugins in minutes. This SDK handles all the complexity of authentication, webhooks, async jobs, and platform integration.

---

## 📋 Table of Contents

1. [Features](#features)
2. [Installation](#installation)
3. [Quick Start](#quick-start)
4. [API Reference](#api-reference)
5. [Examples](#examples)
6. [Deployment](#deployment)
7. [Testing](#testing)

---

## ✨ Features

### What the SDK Does for You

- ✅ **Automatic Server Setup** - Express/FastAPI server preconfigured
- ✅ **HTTPS/TLS Support** - Built-in SSL certificate handling
- ✅ **HMAC Authentication** - Automatic webhook signing
- ✅ **Async Job Queue** - Background processing with Bull/Celery
- ✅ **Manifest Generation** - Auto-generate valid manifest.json
- ✅ **Type Safety** - Full TypeScript/Python types
- ✅ **Error Handling** - Standardized error responses
- ✅ **Logging** - Structured logging out of the box
- ✅ **Testing Tools** - Mock platform for local development
- ✅ **Hot Reload** - Development mode with auto-restart

### What You Focus On

- 🎯 Your transform logic
- 🎯 Data extraction/analysis
- 🎯 API integrations

**Everything else is handled automatically.**

---

## 📦 Installation

### Node.js / TypeScript

```bash
npm install @osint-platform/plugin-sdk
# or
yarn add @osint-platform/plugin-sdk
# or
pnpm add @osint-platform/plugin-sdk
```

**Requirements:** Node.js 18+ or 20+

### Python

```bash
pip install osint-platform-sdk
# or
poetry add osint-platform-sdk
```

**Requirements:** Python 3.9+

---

## 🚀 Quick Start

### TypeScript Example

```typescript
import { OSINTPlugin } from '@osint-platform/plugin-sdk';

// Create plugin instance
const plugin = new OSINTPlugin({
  id: 'my-osint-plugin',
  name: 'My OSINT Plugin',
  version: '1.0.0',
  author: 'Your Name',
  description: 'Does something cool',
  category: 'network'
});

// Register a simple transform (synchronous)
plugin.transform({
  id: 'lookup-domain',
  name: 'Lookup Domain',
  description: 'Looks up domain information',
  inputType: 'domain',
  outputTypes: ['note', 'organization'],
  
  handler: async (input, config) => {
    // Your logic here
    const data = await fetchDomainInfo(input.entity.value, config.apiKey);
    
    return {
      entities: [
        {
          type: 'note',
          value: `Domain info: ${data.info}`,
          label: 'Domain Analysis'
        }
      ],
      edges: []
    };
  }
});

// Start server
plugin.start({
  port: 3000,
  host: '0.0.0.0'
});

console.log('🚀 Plugin server running on port 3000');
```

### Python Example

```python
from osint_platform_sdk import OSINTPlugin

# Create plugin instance
plugin = OSINTPlugin(
    id='my-osint-plugin',
    name='My OSINT Plugin',
    version='1.0.0',
    author='Your Name',
    description='Does something cool',
    category='network'
)

# Register a simple transform (synchronous)
@plugin.transform(
    id='lookup-domain',
    name='Lookup Domain',
    description='Looks up domain information',
    input_type='domain',
    output_types=['note', 'organization']
)
async def lookup_domain(input, config):
    # Your logic here
    data = await fetch_domain_info(input.entity.value, config.api_key)
    
    return {
        'entities': [
            {
                'type': 'note',
                'value': f'Domain info: {data.info}',
                'label': 'Domain Analysis'
            }
        ],
        'edges': []
    }

# Start server
if __name__ == '__main__':
    plugin.start(port=3000, host='0.0.0.0')
    print('🚀 Plugin server running on port 3000')
```

### Run It

```bash
# TypeScript
npm run dev

# Python
python main.py
```

**That's it!** The SDK handles:
- Server setup
- Endpoint routing
- Manifest generation
- Webhook authentication
- Error handling

---

## 📚 API Reference

### TypeScript API

#### `new OSINTPlugin(options)`

Creates a new plugin instance.

```typescript
const plugin = new OSINTPlugin({
  id: string;              // Unique plugin ID (kebab-case)
  name: string;            // Display name
  version: string;         // Semver version
  author: string;          // Your name
  description: string;     // What it does
  category: PluginCategory; // 'network' | 'identity' | 'social' | etc.
  
  // Optional
  icon?: string;           // Tabler icon name
  logoUrl?: string;        // URL to logo image
  homepage?: string;       // Plugin website
  documentation?: string;  // Docs URL
  license?: string;        // 'MIT' | 'Apache-2.0' | etc.
});
```

#### `plugin.transform(config)`

Register a **synchronous** transform (completes in <30s).

```typescript
plugin.transform({
  id: string;              // Transform ID (unique within plugin)
  name: string;            // Display name
  description: string;     // What it does
  inputType: EntityType;   // 'domain' | 'ip' | 'email' | etc.
  outputTypes: EntityType[]; // Array of possible outputs
  
  handler: async (input, config) => {
    // input.entity: { type, value, metadata }
    // config: User's configuration (API keys, etc.)
    
    return {
      entities: OSINTEntity[];  // New entities to add
      edges: OSINTEdge[];       // Connections between entities
      metadata?: object;        // Optional extra data
    };
  }
});
```

#### `plugin.asyncTransform(config)`

Register an **asynchronous** transform (can take minutes/hours).

```typescript
plugin.asyncTransform({
  id: string;
  name: string;
  description: string;
  inputType: EntityType;
  outputTypes: EntityType[];
  
  handler: async (input, config, job) => {
    // job.updateProgress(percent, message)
    // job.cancel() if needed
    
    await job.updateProgress(25, 'Starting scan...');
    const data = await longRunningOperation();
    
    await job.updateProgress(75, 'Processing results...');
    const results = await processData(data);
    
    await job.updateProgress(100, 'Complete');
    
    return {
      entities: [...],
      edges: [...]
    };
  }
});
```

#### `plugin.configure(schema)`

Define configuration fields (API keys, settings).

**Ogni organization avrà la propria configurazione separata.**

**Tipi di campo supportati:**

```typescript
plugin.configure({
  // TYPE: string - Testo generico
  apiKey: {
    type: 'string',
    label: 'API Key',
    description: 'Your service API key',
    required: true,
    secret: true  // Will be masked in UI (••••••)
  },
  
  customEndpoint: {
    type: 'string',
    label: 'Custom Endpoint',
    description: 'Optional custom API endpoint',
    required: false,
    default: 'https://api.default.com'
  },
  
  // TYPE: number - Valori numerici con limiti
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
    description: 'Request timeout',
    default: 30,
    min: 5,
    max: 300
  },
  
  // TYPE: boolean - Flags on/off
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
  
  // TYPE: select - Scelte multiple
  region: {
    type: 'select',
    label: 'Region',
    description: 'API region',
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
```

**Accesso alla configurazione nel handler:**

```typescript
plugin.transform({
  id: 'my-transform',
  name: 'My Transform',
  // ...
  handler: async (input, config) => {
    // Ogni organization ha la propria config
    const orgId = input.organizationId;
    
    // Accedi ai valori configurati
    const apiKey = config.apiKey;              // string
    const endpoint = config.customEndpoint;    // string
    const maxResults = config.maxResults;      // number
    const timeout = config.timeout;            // number
    const caching = config.enableCaching;      // boolean
    const verbose = config.verboseLogging;     // boolean
    const region = config.region;              // string (selected value)
    const priority = config.priority;          // string (selected value)
    
    // Usa la configurazione
    const url = `${endpoint}/${region}/lookup`;
    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(timeout * 1000)
    });
    
    // ...
  }
});
```

**Campo properties:**

| Property | Type | Description |
|----------|------|-------------|
| `type` | `'string' \| 'number' \| 'boolean' \| 'select'` | Tipo del campo (obbligatorio) |
| `label` | `string` | Etichetta mostrata in UI (obbligatorio) |
| `description` | `string` | Testo di aiuto sotto il campo (opzionale) |
| `required` | `boolean` | Se il campo è obbligatorio (default: false) |
| `secret` | `boolean` | Se mascherare il valore in UI (solo string) |
| `default` | `any` | Valore di default (opzionale) |
| `min` | `number` | Valore minimo (solo number) |
| `max` | `number` | Valore massimo (solo number) |
| `options` | `Array<{label: string, value: string}>` | Opzioni disponibili (solo select, obbligatorio) |

#### `plugin.start(options)`

Start the plugin server.

```typescript
await plugin.start({
  port: number;           // Port to listen on
  host?: string;          // Host to bind (default: '0.0.0.0')
  https?: {              // Optional HTTPS config
    key: string;         // Path to SSL key
    cert: string;        // Path to SSL cert
  }
});
```

#### `plugin.generateManifest(options)`

Generate manifest.json for platform installation.

```typescript
const manifest = plugin.generateManifest({
  endpoint: 'https://api.myplugin.com',  // Your public endpoint
  tags?: string[];                        // Optional tags
  minimumPlatformVersion?: string;        // e.g., '2.0.0'
});

// Save to file
fs.writeFileSync('manifest.json', JSON.stringify(manifest, null, 2));
```

---

### Python API

#### `OSINTPlugin()`

Creates a new plugin instance.

```python
plugin = OSINTPlugin(
    id='my-plugin',
    name='My Plugin',
    version='1.0.0',
    author='Your Name',
    description='What it does',
    category='network',
    
    # Optional
    icon='IconShield',
    logo_url='https://...',
    homepage='https://...',
    documentation='https://...',
    license='MIT'
)
```

#### `@plugin.transform()`

Decorator for **synchronous** transforms.

```python
@plugin.transform(
    id='my-transform',
    name='My Transform',
    description='What it does',
    input_type='domain',
    output_types=['note', 'organization']
)
async def my_transform(input, config):
    # input.entity: EntityInput
    # config: dict
    
    return {
        'entities': [...],
        'edges': [...]
    }
```

#### `@plugin.async_transform()`

Decorator for **asynchronous** transforms.

```python
@plugin.async_transform(
    id='deep-scan',
    name='Deep Scan',
    description='Long running scan',
    input_type='domain',
    output_types=['ip', 'note']
)
async def deep_scan(input, config, job):
    await job.update_progress(25, 'Starting...')
    
    data = await long_operation()
    
    await job.update_progress(75, 'Processing...')
    
    return {
        'entities': [...],
        'edges': [...]
    }
```

#### `plugin.configure()`

Define configuration schema.

```python
plugin.configure({
    'api_key': {
        'type': 'string',
        'label': 'API Key',
        'required': True,
        'secret': True
    },
    'max_results': {
        'type': 'number',
        'label': 'Max Results',
        'default': 10,
        'min': 1,
        'max': 100
    }
})
```

#### `plugin.start()`

Start the plugin server.

```python
if __name__ == '__main__':
    plugin.start(
        port=3000,
        host='0.0.0.0',
        ssl_keyfile='key.pem',   # Optional
        ssl_certfile='cert.pem'  # Optional
    )
```

#### `plugin.generate_manifest()`

Generate manifest.json.

```python
manifest = plugin.generate_manifest(
    endpoint='https://api.myplugin.com',
    tags=['network', 'security'],
    minimum_platform_version='2.0.0'
)

with open('manifest.json', 'w') as f:
    json.dump(manifest, f, indent=2)
```

---

## 💡 Examples

### Example 1: Simple Synchronous Transform

**Goal:** Extract domain from email address.

```typescript
import { OSINTPlugin } from '@osint-platform/plugin-sdk';

const plugin = new OSINTPlugin({
  id: 'email-parser',
  name: 'Email Parser',
  version: '1.0.0',
  author: 'OSINT Dev',
  description: 'Parses email addresses',
  category: 'identity'
});

plugin.transform({
  id: 'extract-domain',
  name: 'Extract Domain',
  description: 'Extracts domain from email',
  inputType: 'email',
  outputTypes: ['domain'],
  
  handler: async (input) => {
    const email = input.entity.value;
    const domain = email.split('@')[1];
    
    if (!domain) {
      throw new Error('Invalid email format');
    }
    
    return {
      entities: [{
        type: 'domain',
        value: domain,
        label: domain,
        metadata: { source: 'email-parser' }
      }],
      edges: [{
        sourceId: input.entity.id,
        targetId: 'auto',  // SDK generates ID
        label: 'domain of',
        relationship: 'belongs_to'
      }]
    };
  }
});

plugin.start({ port: 3000 });
```

### Example 2: Async Transform with Progress

**Goal:** Scan domain for subdomains (takes minutes).

```typescript
plugin.asyncTransform({
  id: 'subdomain-scan',
  name: 'Subdomain Scan',
  description: 'Finds subdomains via certificate transparency',
  inputType: 'domain',
  outputTypes: ['domain'],
  
  handler: async (input, config, job) => {
    const domain = input.entity.value;
    
    await job.updateProgress(0, 'Querying certificate logs...');
    
    const certs = await queryCertificateTransparency(domain);
    
    await job.updateProgress(50, `Found ${certs.length} certificates`);
    
    const subdomains = extractSubdomains(certs);
    
    await job.updateProgress(75, 'Deduplicating...');
    
    const unique = [...new Set(subdomains)];
    
    await job.updateProgress(100, `Found ${unique.length} subdomains`);
    
    return {
      entities: unique.map(sub => ({
        type: 'domain',
        value: sub,
        label: sub
      })),
      edges: unique.map(sub => ({
        sourceId: input.entity.id,
        targetId: 'auto',
        label: 'subdomain',
        relationship: 'related_to'
      }))
    };
  }
});
```

### Example 3: Plugin with Configuration

**Goal:** API-based lookup requiring API key.

```typescript
const plugin = new OSINTPlugin({
  id: 'shodan-lookup',
  name: 'Shodan Lookup',
  version: '1.0.0',
  author: 'Security Team',
  description: 'Searches Shodan for IP/domain',
  category: 'network'
});

// Define configuration
plugin.configure({
  apiKey: {
    type: 'string',
    label: 'Shodan API Key',
    description: 'Get your API key from shodan.io',
    required: true,
    secret: true
  }
});

plugin.transform({
  id: 'search-ip',
  name: 'Search IP',
  description: 'Looks up IP in Shodan',
  inputType: 'ip',
  outputTypes: ['note', 'organization'],
  
  handler: async (input, config) => {
    if (!config.apiKey) {
      throw new Error('API key is required');
    }
    
    const ip = input.entity.value;
    const data = await fetch(`https://api.shodan.io/shodan/host/${ip}?key=${config.apiKey}`);
    const result = await data.json();
    
    return {
      entities: [
        {
          type: 'note',
          value: `ISP: ${result.isp}\nOS: ${result.os || 'Unknown'}\nPorts: ${result.ports.join(', ')}`,
          label: 'Shodan Info'
        },
        {
          type: 'organization',
          value: result.org,
          label: result.org
        }
      ],
      edges: [
        {
          sourceId: input.entity.id,
          targetId: 'auto',
          label: 'hosted by',
          relationship: 'associated_with'
        }
      ]
    };
  }
});

plugin.start({ port: 3000 });
```

### Example 4: Multi-Transform Plugin

```typescript
const plugin = new OSINTPlugin({
  id: 'dns-toolkit',
  name: 'DNS Toolkit',
  version: '1.0.0',
  author: 'DNS Team',
  description: 'Complete DNS analysis suite',
  category: 'network'
});

// Transform 1: A Records
plugin.transform({
  id: 'resolve-a',
  name: 'Resolve A Records',
  description: 'Gets IPv4 addresses',
  inputType: 'domain',
  outputTypes: ['ip'],
  handler: async (input) => {
    const ips = await dns.resolve4(input.entity.value);
    return {
      entities: ips.map(ip => ({ type: 'ip', value: ip, label: ip })),
      edges: ips.map(ip => ({
        sourceId: input.entity.id,
        targetId: 'auto',
        label: 'resolves to',
        relationship: 'resolves_to'
      }))
    };
  }
});

// Transform 2: MX Records
plugin.transform({
  id: 'resolve-mx',
  name: 'Get MX Records',
  description: 'Gets mail servers',
  inputType: 'domain',
  outputTypes: ['domain'],
  handler: async (input) => {
    const mxRecords = await dns.resolveMx(input.entity.value);
    return {
      entities: mxRecords.map(mx => ({
        type: 'domain',
        value: mx.exchange,
        label: `${mx.exchange} (priority: ${mx.priority})`
      })),
      edges: mxRecords.map(mx => ({
        sourceId: input.entity.id,
        targetId: 'auto',
        label: 'mail server',
        relationship: 'uses_mailserver'
      }))
    };
  }
});

// Transform 3: NS Records
plugin.transform({
  id: 'resolve-ns',
  name: 'Get Nameservers',
  description: 'Gets authoritative nameservers',
  inputType: 'domain',
  outputTypes: ['domain'],
  handler: async (input) => {
    const ns = await dns.resolveNs(input.entity.value);
    return {
      entities: ns.map(server => ({ type: 'domain', value: server, label: server })),
      edges: ns.map(server => ({
        sourceId: input.entity.id,
        targetId: 'auto',
        label: 'nameserver',
        relationship: 'uses_nameserver'
      }))
    };
  }
});

plugin.start({ port: 3000 });
```

---

## 🚀 Deployment

### Production Checklist

- [ ] HTTPS enabled (required by platform)
- [ ] Environment variables for secrets
- [ ] Logging configured
- [ ] Error monitoring (Sentry, etc.)
- [ ] Health check endpoint
- [ ] Rate limiting (if calling external APIs)
- [ ] Graceful shutdown handling

### Docker Deployment

**Dockerfile (Node.js):**

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3000

CMD ["node", "dist/index.js"]
```

**docker-compose.yml:**

```yaml
version: '3.8'

services:
  plugin:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PLUGIN_SECRET=${PLUGIN_SECRET}
    restart: unless-stopped
```

### Environment Variables

```bash
# Required
PLUGIN_SECRET=your-webhook-secret-from-platform

# Optional
PORT=3000
HOST=0.0.0.0
NODE_ENV=production
LOG_LEVEL=info

# Your API keys (if needed)
SHODAN_API_KEY=xxx
VIRUSTOTAL_API_KEY=xxx
```

### Reverse Proxy (Nginx)

```nginx
server {
    listen 443 ssl http2;
    server_name api.myplugin.com;

    ssl_certificate /etc/ssl/certs/fullchain.pem;
    ssl_certificate_key /etc/ssl/private/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Health Check

The SDK automatically provides a health endpoint:

```bash
GET /health

Response:
{
  "status": "ok",
  "plugin": "my-plugin",
  "version": "1.0.0",
  "uptime": 3600
}
```

---

## 🧪 Testing

### Local Testing

The SDK includes a **mock platform** for local development:

```typescript
import { OSINTPlugin, MockPlatform } from '@osint-platform/plugin-sdk';

const plugin = new OSINTPlugin({...});
// ... register transforms

// Start mock platform
const mock = new MockPlatform();
await mock.start();

// Test transform
const result = await mock.executeTransform('my-plugin', 'my-transform', {
  entity: {
    type: 'domain',
    value: 'example.com'
  }
});

console.log('Result:', result);
```

### Unit Tests

```typescript
import { describe, it, expect } from 'vitest';
import { createTestPlugin } from '@osint-platform/plugin-sdk/testing';

describe('Email Parser', () => {
  const plugin = createTestPlugin({...});
  
  it('extracts domain from email', async () => {
    const result = await plugin.test('extract-domain', {
      entity: {
        type: 'email',
        value: 'user@example.com'
      }
    });
    
    expect(result.entities).toHaveLength(1);
    expect(result.entities[0].value).toBe('example.com');
  });
});
```

### Integration Tests

```bash
# Start plugin in test mode
npm run test:integration

# SDK starts server and runs tests
# Includes:
# - Manifest validation
# - Webhook signature verification
# - Error handling
# - Timeout behavior
```

---

## 📖 Advanced Features

### Custom Logging

```typescript
import { OSINTPlugin, Logger } from '@osint-platform/plugin-sdk';

const logger = new Logger({
  level: 'debug',
  format: 'json',
  destination: './logs/plugin.log'
});

const plugin = new OSINTPlugin({
  id: 'my-plugin',
  logger  // Use custom logger
});

// In your handlers
plugin.transform({
  handler: async (input, config) => {
    logger.info('Processing domain', { domain: input.entity.value });
    
    try {
      const result = await process(input);
      logger.debug('Result', { result });
      return result;
    } catch (error) {
      logger.error('Failed', { error });
      throw error;
    }
  }
});
```

### Rate Limiting

```typescript
import { OSINTPlugin, RateLimiter } from '@osint-platform/plugin-sdk';

const limiter = new RateLimiter({
  maxRequests: 100,
  windowMs: 60000  // 100 requests per minute
});

plugin.use(limiter);  // Apply to all transforms
```

### Caching

```typescript
import { OSINTPlugin, Cache } from '@osint-platform/plugin-sdk';

const cache = new Cache({
  ttl: 3600,  // 1 hour
  storage: 'redis',
  redis: {
    host: 'localhost',
    port: 6379
  }
});

plugin.transform({
  handler: async (input, config) => {
    const cacheKey = `domain:${input.entity.value}`;
    
    // Check cache
    const cached = await cache.get(cacheKey);
    if (cached) return cached;
    
    // Fetch and cache
    const result = await fetchData(input.entity.value);
    await cache.set(cacheKey, result);
    
    return result;
  }
});
```

### Metrics & Monitoring

```typescript
import { OSINTPlugin, Metrics } from '@osint-platform/plugin-sdk';

const metrics = new Metrics({
  provider: 'prometheus',
  port: 9090
});

plugin.use(metrics);  // Auto-track:
// - Transform execution count
// - Success/failure rate
// - Execution time
// - Queue length (for async)
```

---

## 🤝 Support

- **Documentation**: https://docs.osint-platform.com/sdk
- **GitHub Issues**: https://github.com/osint-platform/plugin-sdk/issues
- **Discord**: https://discord.gg/osint-platform
- **Email**: sdk@osint-platform.com

---

## 📄 License

MIT License - see LICENSE file for details.

---

## 🌟 Examples Repository

Full working examples: https://github.com/osint-platform/plugin-examples

- Email parser
- DNS toolkit
- Subdomain scanner
- Shodan integration
- VirusTotal integration
- Blockchain explorer
- Social media analyzer
- And more...

---

**Built with ❤️ by the OSINT Platform team**

