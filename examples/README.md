# Examples

Questa cartella contiene esempi funzionanti di plugin Relazio.

## Esempi Disponibili

### 1. Email Parser (Sync)
**Directory**: `email-parser/`  
**Porta**: 3000

Plugin semplice con transform sincrona che estrae il dominio da un indirizzo email.

```bash
cd email-parser
npm install
npm run dev
```

**Test**:
```bash
curl -X POST http://localhost:3000/extract-domain \
  -H "Content-Type: application/json" \
  -d '{
    "transformId": "extract-domain",
    "input": {
      "entity": {
        "id": "test-1",
        "type": "email",
        "value": "user@example.com"
      }
    }
  }'
```

### 2. DNS Toolkit (Multi-Transform Sync)
**Directory**: `dns-toolkit/`  
**Porta**: 3001

Plugin con 3 transforms sincrone per analisi DNS (A, MX, NS records).

```bash
cd dns-toolkit
npm install
npm run dev
```

**Test**:
```bash
# A Records
curl -X POST http://localhost:3001/resolve-a \
  -H "Content-Type: application/json" \
  -d '{
    "transformId": "resolve-a",
    "input": {
      "entity": {
        "id": "test-2",
        "type": "domain",
        "value": "google.com"
      }
    }
  }'

# MX Records
curl -X POST http://localhost:3001/resolve-mx \
  -H "Content-Type: application/json" \
  -d '{
    "transformId": "resolve-mx",
    "input": {
      "entity": {
        "id": "test-3",
        "type": "domain",
        "value": "google.com"
      }
    }
  }'
```

### 3. Subdomain Scanner (Async)
**Directory**: `async-subdomain-scanner/`  
**Porta**: 3002

Plugin con transform asincrona che simula una scansione lunga con progress tracking.

```bash
cd async-subdomain-scanner
WEBHOOK_SECRET=dev-secret-key npm run dev
```

**Test**:
```bash
curl -X POST http://localhost:3002/scan-subdomains \
  -H "Content-Type: application/json" \
  -d '{
    "transformId": "scan-subdomains",
    "input": {
      "entity": {
        "id": "test-4",
        "type": "domain",
        "value": "example.com"
      }
    },
    "callbackUrl": "https://your-platform.com/api/webhooks/transforms/job-123"
  }'
```

### 4. Multi-Tenant Plugin ⭐ NEW
**Directory**: `multi-tenant-plugin/`  
**Porta**: 3003

Plugin che serve **multiple organizations** con webhook secrets e configurazioni separate.

```bash
cd multi-tenant-plugin
npm install
npm run dev
```

**Test**:
```bash
# Organization Alpha
curl -X POST http://localhost:3003/lookup-ip \
  -H "Content-Type: application/json" \
  -H "X-Organization-Id: org-alpha" \
  -d '{
    "transformId": "lookup-ip",
    "input": {
      "entity": {
        "id": "test-5",
        "type": "ip",
        "value": "8.8.8.8"
      },
      "config": {
        "apiKey": "org-alpha-key-123"
      }
    }
  }'

# Organization Beta (diversa config)
curl -X POST http://localhost:3003/lookup-ip \
  -H "Content-Type: application/json" \
  -H "X-Organization-Id: org-beta" \
  -d '{
    "transformId": "lookup-ip",
    "input": {
      "entity": {
        "id": "test-6",
        "type": "ip",
        "value": "1.1.1.1"
      },
      "config": {
        "apiKey": "org-beta-key-456"
      }
    }
  }'
```

## Manifest Generation

Ogni plugin espone automaticamente un endpoint `/manifest.json`:

```bash
# Email Parser manifest
curl http://localhost:3000/manifest.json

# DNS Toolkit manifest
curl http://localhost:3001/manifest.json

# Subdomain Scanner manifest
curl http://localhost:3002/manifest.json
```

## Health Check

Ogni plugin espone un endpoint di health check:

```bash
curl http://localhost:3000/health
```

Response:
```json
{
  "status": "ok",
  "plugin": "email-parser",
  "version": "1.0.0",
  "uptime": 123.45,
  "transforms": {
    "sync": 1,
    "async": 0
  }
}
```

## Note

- Gli esempi usano `file:../..` per referenziare l'SDK locale
- In produzione useresti `@relazio/plugin-sdk` da npm
- Il webhook secret per async transforms è richiesto
- Tutti gli endpoint DEVONO usare HTTPS in produzione

