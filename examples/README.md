# Examples

This directory contains complete example plugins demonstrating SDK functionality.

## Primary Examples

### Synchronous Transform - simple-sync-example

The best starting point for learning the SDK.

**Location**: `simple-sync-example/`

**Features**:
- Synchronous transform (< 30 seconds)
- Creates multiple entity types (IP, Location, Organization, Note)
- Demonstrates `createEntity()` scalable approach
- Uses `ResultBuilder` with automatic edge creation
- Includes Markdown-formatted notes

```bash
cd simple-sync-example
npm install
npm start
```

### Asynchronous Transform - async-subdomain-scanner

Complete example of async transform with progress tracking.

**Location**: `async-subdomain-scanner/`

**Features**:
- Asynchronous transform (long-running operations)
- Real-time progress tracking
- Webhook callbacks
- Multiple result handling
- Scalable entity creation

```bash
cd async-subdomain-scanner
npm install
npm start
```

## Additional Examples

### 3. email-parser

Basic email domain extraction.

```bash
cd email-parser && npm install && npm start
```

### 4. dns-toolkit

Multiple DNS-related transforms (A, MX, NS records).

```bash
cd dns-toolkit && npm install && npm start
```

### 5. ip-lookup-complete

Comprehensive example with all SDK features.

```bash
cd ip-lookup-complete && npm install && npm start
```

### 6. multi-tenant-plugin

Multi-organization support with registration endpoints.

```bash
cd multi-tenant-plugin && npm install && npm start
```

## Example Selection Guide

| Use Case | Example |
|----------|---------|
| **Getting started (sync)** | **simple-sync-example** |
| **Long-running operations (async)** | **async-subdomain-scanner** |
| DNS analysis patterns | dns-toolkit |
| Basic email parsing | email-parser |
| Advanced SDK features | ip-lookup-complete |
| Multi-organization support | multi-tenant-plugin |

## Common Patterns

All examples use the scalable `createEntity()` approach:

```typescript
// Works with any type - even future types
createEntity('ip', '8.8.8.8')
createEntity('domain', 'example.com')
createEntity('custom-type', 'value')
```

And `ResultBuilder` for automatic edge creation:

```typescript
return new ResultBuilder(input)
  .addEntity(entity, 'edge label')
  .setMessage('Success')
  .build();
```

## Development Setup

```bash
# In SDK root
npm run build

# In any example
cd examples/example-name
npm install
npm start
```

## Creating Custom Plugins

Use the examples as templates:

1. Copy an example directory
2. Update `package.json`
3. Implement your transform logic
4. Test thoroughly
5. Deploy

## Additional Resources

- [Quick Start Guide](../docs/quick-start.md)
- [Builders Guide](../docs/builders-guide.md)
- [Response Format](../docs/response-format.md)
- [Examples Documentation](../docs/examples.md)
