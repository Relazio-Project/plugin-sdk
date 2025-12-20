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

### 3. Async Subdomain Scanner
**Directory**: `async-subdomain-scanner/`  
**Porta**: 3002

Esempio legacy con transform asincrona. Usa `multi-tenant-plugin/` per l'approccio moderno.

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

### 4. Multi-Tenant Plugin
**Directory**: `multi-tenant-plugin/`  
**Porta**: 3003

Plugin che serve **multiple organizations** con webhook secrets e configurazioni separate.

```bash
cd multi-tenant-plugin
npm install
npm run dev
```

**Come installarlo in Relazio:**
1. Vai su Dashboard → Plugins → Custom
2. Click "Add External Plugin"
3. Incolla: `http://localhost:3003/manifest.json`
4. ✅ FATTO! Il plugin si registra automaticamente

**Test Manuale**:
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

## Installazione in Relazio

1. **Avvia il plugin**:
   ```bash
   cd multi-tenant-plugin
   npm install
   npm run dev
   ```

2. **In Relazio**:
   - Dashboard → Plugins → Tab "Custom"
   - Click "Add External Plugin"
   - Incolla URL: `http://localhost:3003/manifest.json`
   - Click "Install"
   
3. **✅ FATTO!** 
   - Il plugin riceve automaticamente la richiesta `/register`
   - Genera il webhook secret
   - Lo restituisce a Relazio
   - Nessuna configurazione manuale necessaria

### Cosa Succede Dietro le Quinte

```
Relazio → GET http://localhost:3003/manifest.json
Relazio → POST http://localhost:3003/register
          {
            "organizationId": "org-123",
            "organizationName": "My Org",
            "platformUrl": "https://relazio.io"
          }
Plugin  → Genera secret: whs_abc123...
Plugin  → Salva: org-123 → whs_abc123...
Plugin  → Risponde: {webhookSecret: "whs_abc123..."}
Relazio → Salva secret nel DB
✅ Plugin installato e pronto!
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
- Usa sempre `multiTenant: true` per plugin production-ready
- Tutti gli endpoint DEVONO usare HTTPS in produzione
- L'esempio multi-tenant usa in-memory storage (ok per dev, usa Redis/DB in produzione)

## Risorse

- 📖 [Quick Start Guide](../QUICKSTART.md) - Crea il tuo primo plugin
- 🏢 [Multi-Tenant Guide](../docs/MULTI_TENANT.md) - Guida completa multi-tenancy
- 📚 [SDK Documentation](../docs/SDK.md) - API reference completa

