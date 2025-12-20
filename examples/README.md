# Plugin Examples

This directory contains working examples of Relazio plugins demonstrating various use cases and SDK features.

## Available Examples

### 1. Email Parser (Sync Transform)

**Directory**: `email-parser/`  
**Port**: 3000

Simple plugin with a synchronous transform that extracts domain from email addresses.

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

### 2. DNS Toolkit (Multi-Transform)

**Directory**: `dns-toolkit/`  
**Port**: 3001

Plugin with multiple synchronous transforms for DNS analysis (A, MX, NS records).

```bash
cd dns-toolkit
npm install
npm run dev
```

**Test**:
```bash
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
```

### 3. Async Subdomain Scanner

**Directory**: `async-subdomain-scanner/`  
**Port**: 3002

Demonstrates asynchronous transforms with job progress tracking. Legacy example using manual webhook secret configuration.

```bash
cd async-subdomain-scanner
WEBHOOK_SECRET=dev-secret-key npm run dev
```

### 4. Multi-Tenant Plugin (Recommended)

**Directory**: `multi-tenant-plugin/`  
**Port**: 3003

Production-ready plugin serving multiple organizations with isolated configurations and automatic webhook secret management.

```bash
cd multi-tenant-plugin
npm install
npm run dev
```

**Installation in Relazio**:
1. Navigate to Dashboard → Plugins → Custom
2. Click "Add External Plugin"
3. Enter manifest URL: `http://localhost:3003/manifest.json`
4. Click "Install"

The plugin automatically:
- Registers the organization
- Generates unique webhook secret
- Manages per-organization configuration
- No manual setup required

## Testing

Each plugin exposes standard endpoints:

### Health Check
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

### Manifest
```bash
curl http://localhost:3000/manifest.json
```

## Installation Flow

When installing a plugin in Relazio:

```
1. Relazio → GET http://plugin:3000/manifest.json
2. Relazio → POST http://plugin:3000/register
            {
              "organizationId": "org-123",
              "organizationName": "My Organization",
              "platformUrl": "https://relazio.io"
            }
3. Plugin  → Generates secret: whs_abc123...
4. Plugin  → Stores: org-123 → whs_abc123...
5. Plugin  → Returns: {webhookSecret: "whs_abc123..."}
6. Relazio → Saves secret in database
```

## Notes

- Examples use local SDK reference for development
- Production plugins should install `@relazio/plugin-sdk` from npm
- Always use `multiTenant: true` for production deployments
- HTTPS is required for all production endpoints
- Multi-tenant example uses in-memory storage (use Redis/database in production)

## Resources

- [SDK Documentation](../README.md)
- [npm Package](https://www.npmjs.com/package/@relazio/plugin-sdk)
