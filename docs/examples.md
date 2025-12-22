# Examples Documentation

This document provides an overview of the example plugins included in the SDK.

## Primary Examples

### 1. simple-sync-example - Synchronous Transform

**Location**: `examples/simple-sync-example/`

A clear, well-documented example of a synchronous transform that demonstrates core SDK features.

**Features**:
- Synchronous transform (response < 30 seconds)
- Creates multiple entity types (IP, Location, Organization, Note)
- Uses `createEntity()` for scalable entity creation
- Demonstrates `ResultBuilder` with automatic edge creation
- Includes Markdown-formatted notes
- Rich metadata structure

**Running**:
```bash
cd examples/simple-sync-example
npm install
npm start
```

**Testing**:
```bash
curl -X POST http://localhost:3000/transforms/analyze-domain \
  -H "Content-Type: application/json" \
  -d '{
    "transformId": "analyze-domain",
    "input": {
      "entity": {
        "id": "test-1",
        "type": "domain",
        "value": "google.com"
      }
    },
    "callbackUrl": "https://webhook.site/..."
  }'
```

### 2. async-subdomain-scanner - Asynchronous Transform

**Location**: `examples/async-subdomain-scanner/`

Demonstrates asynchronous transform handling with progress tracking and webhook callbacks.

**Features**:
- Asynchronous transform (long-running operations)
- Real-time progress tracking (0% to 100%)
- Automatic webhook callbacks on completion
- Multiple result handling
- Scalable entity creation
- Summary notes in Markdown

**Running**:
```bash
cd examples/async-subdomain-scanner
npm install
npm start
```

**Testing**:
```bash
curl -X POST http://localhost:3002/transforms/scan-subdomains \
  -H "Content-Type: application/json" \
  -d '{
    "transformId": "scan-subdomains",
    "input": {
      "entity": {
        "id": "test-1",
        "type": "domain",
        "value": "example.com"
      }
    },
    "callbackUrl": "https://webhook.site/your-unique-url"
  }'
```

## Additional Examples

### 3. email-parser - Basic Email Parsing

**Location**: `examples/email-parser/`

Simple plugin that extracts domain from email addresses.

**Features**:
- Basic synchronous transform
- Simple entity creation
- Single result handling

**Running**:
```bash
cd examples/email-parser
npm install
npm start
```

### 4. dns-toolkit - Multiple Transforms

**Location**: `examples/dns-toolkit/`

Plugin with multiple synchronous transforms for DNS analysis (A, MX, NS records).

**Features**:
- Multiple transforms in one plugin
- DNS resolution examples
- Array handling with `addEntities()`

**Running**:
```bash
cd examples/dns-toolkit
npm install
npm start
```

### 5. ip-lookup-complete - Comprehensive Example

**Location**: `examples/ip-lookup-complete/`

Advanced example showing all SDK capabilities.

**Features**:
- Complex entity creation
- EntityBuilder usage
- Advanced metadata structures
- Optional configuration support

**Running**:
```bash
cd examples/ip-lookup-complete
npm install
npm start
```

### 6. multi-tenant-plugin - Multi-Tenancy Support

**Location**: `examples/multi-tenant-plugin/`

Demonstrates multi-tenant architecture with organization isolation.

**Features**:
- Multi-tenant support
- Registration/unregistration endpoints
- Organization isolation
- Per-organization webhook secrets

**Running**:
```bash
cd examples/multi-tenant-plugin
npm install
npm start
```

## Example Selection Guide

| Use Case | Example |
|----------|---------|
| Getting started with sync transforms | `simple-sync-example` |
| Implementing long-running operations | `async-subdomain-scanner` |
| Understanding DNS patterns | `dns-toolkit` |
| Basic email parsing | `email-parser` |
| Advanced features exploration | `ip-lookup-complete` |
| Multi-organization support | `multi-tenant-plugin` |

## Common Patterns

### Creating Entities

All examples use the scalable `createEntity()` approach:

```typescript
const entity = createEntity('type', 'value', {
  metadata: { /* ... */ }
});
```

### Building Results

Examples demonstrate `ResultBuilder` for automatic edge creation:

```typescript
return new ResultBuilder(input)
  .addEntity(entity, 'edge label')
  .setMessage('Success')
  .build();
```

### Progress Tracking (Async)

Async examples show progress updates:

```typescript
await job.updateProgress(50, 'Processing...');
```

## Development Workflow

### Standard Development Setup

```bash
# In SDK root
npm run build

# In any example
cd examples/example-name
npm install
npm start
```

### Testing Workflow

1. Start the example plugin
2. Use curl or a tool like Postman to send test requests
3. For async examples, use webhook.site to receive callbacks
4. Monitor console output for logs and errors

## Creating Custom Plugins

Use the examples as templates for your own plugins:

1. Copy an example directory
2. Modify `package.json` (id, name, description)
3. Implement your transform logic
4. Update dependencies as needed
5. Test thoroughly before deployment

## Additional Resources

- [Quick Start Guide](./quick-start.md)
- [Builders Guide](./builders-guide.md)
- [Response Format Specification](./response-format.md)
- [Main README](../README.md)

