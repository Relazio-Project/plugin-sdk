# Relazio Plugin SDK

Official SDK for building external plugins for the Relazio OSINT platform.

[![npm version](https://img.shields.io/npm/v/@relazio/plugin-sdk.svg)](https://www.npmjs.com/package/@relazio/plugin-sdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

## Overview

The Relazio Plugin SDK provides a complete framework for building secure, scalable external plugins that extend the Relazio platform's capabilities with minimal boilerplate.

## Features

- **Multi-Tenant Support**: Automatic organization management with isolated configurations
- **Sync & Async Transforms**: Support for both immediate and long-running operations
- **Automatic Endpoints**: Built-in `/register`, `/unregister`, and `/manifest.json` endpoints
- **Security**: HMAC-SHA256 signature generation and validation
- **Job Management**: Progress tracking and webhook notifications for async operations
- **TypeScript**: Full type safety and IntelliSense support
- **Scalable Entity Creation**: Universal `createEntity()` function works with any entity type
- **Automatic ID Generation**: Deterministic ID generation for entities and edges
- **Result Builder**: Fluent API for constructing complex transform results
- **Automatic Validation**: Format validation according to Relazio specifications

## Installation

```bash
npm install @relazio/plugin-sdk
```

## Quick Start

```typescript
import { RelazioPlugin, createEntity, ResultBuilder } from '@relazio/plugin-sdk';

const plugin = new RelazioPlugin({
  id: 'my-plugin',
  name: 'My Plugin',
  version: '1.0.0',
  author: 'Your Name',
  description: 'Plugin description',
  category: 'network'
});

plugin.transform({
  id: 'my-transform',
  name: 'My Transform',
  description: 'Transforms data',
  inputType: 'domain',
  outputTypes: ['ip'],
  
  async handler(input) {
    // Create entity using universal createEntity()
    const ip = createEntity('ip', '8.8.8.8', {
      label: 'Google DNS',
      metadata: { country: 'US' }
    });
    
    // Build result with automatic edge creation
    return new ResultBuilder(input)
      .addEntity(ip, 'resolves to', {
        relationship: 'dns_resolution'
      })
      .setMessage('DNS resolved successfully')
      .build();
  }
});

await plugin.start({ 
  port: 3000,
  multiTenant: true
});
```

## Documentation

- **[Quick Start Guide](./docs/quick-start.md)** - Get started in 5 minutes with sync and async examples
- **[Builders Guide](./docs/builders-guide.md)** - Complete guide to builders and utilities
- **[Response Format Specification](./docs/response-format.md)** - Required response format
- **[Examples Documentation](./docs/examples.md)** - Complete working examples
  - [simple-sync-example](./examples/simple-sync-example/) - Synchronous transform example
  - [async-subdomain-scanner](./examples/async-subdomain-scanner/) - Asynchronous transform example
- [Changelog](./CHANGELOG.md) - Version history

## Entity & Edge Builders

The SDK uses a dynamic, scalable approach that works with any entity type:

### Universal Entity Creation

```typescript
import { createEntity } from '@relazio/plugin-sdk';

// Works with ANY type - even future types!
const ip = createEntity('ip', '8.8.8.8', {
  label: 'Google DNS',
  metadata: { country: 'US', isp: 'Google LLC' }
});

const domain = createEntity('domain', 'example.com');

const location = createEntity('location', 'New York, NY', {
  metadata: { latitude: 40.7, longitude: -74.0 }
});

// Works with custom types too!
const customEntity = createEntity('future-entity-type', 'value', {
  metadata: { /* ... */ }
});

// ID automatically generated: "ip-c909e98d"
console.log(ip.id);
```

**Advantages**:
- No SDK updates needed for new entity types
- Works with custom entity types
- Type-safe with TypeScript
- Deterministic ID generation

### Result Builder

Build complex results easily:

```typescript
import { ResultBuilder, createEntity } from '@relazio/plugin-sdk';

handler: async (input) => {
  const location = createEntity('location', 'Mountain View, CA', {
    metadata: { latitude: 37.386, longitude: -122.084 }
  });
  
  const org = createEntity('organization', 'Google LLC', {
    metadata: { asn: 'AS15169' }
  });
  
  // Edges created automatically!
  return new ResultBuilder(input)
    .addEntity(location, 'located in', {
      relationship: 'geolocation'
    })
    .addEntity(org, 'assigned by', {
      relationship: 'isp_assignment'
    })
    .setMessage('IP analyzed successfully')
    .build();
}
```

### Supported Entity Types

```typescript
type EntityType = 
  | 'email' | 'domain' | 'ip' | 'person' | 'username' 
  | 'phone' | 'organization' | 'hash' | 'credential'
  | 'social' | 'document' | 'note' | 'image' | 'video'
  | 'location' | 'wallet' | 'transaction' | 'exchange'
  | 'url' | 'maps' | 'custom';
```

## Multi-Tenant Architecture

The SDK automatically handles organization registration and management:

1. Platform requests `/register` with organization details
2. SDK generates unique webhook secret
3. SDK stores organization configuration
4. Platform receives webhook secret
5. Plugin processes requests with organization isolation

## Security

All plugins must implement the following security requirements:

- **HTTPS**: Production endpoints must use HTTPS
- **HMAC Signatures**: All webhooks are signed with HMAC-SHA256
- **Rate Limiting**: Enforced by the platform (30 req/min, 500 req/hour)
- **Timeouts**: 30s for sync transforms, 30 minutes maximum for async jobs

## API Reference

### Core Classes

#### RelazioPlugin

Main plugin class that manages transforms and server lifecycle.

```typescript
const plugin = new RelazioPlugin(config: PluginConfig)
```

#### Transform Registration

```typescript
// Synchronous transform
plugin.transform({
  id: string,
  name: string,
  description: string,
  inputType: EntityType,
  outputTypes: EntityType[],
  handler: async (input, config) => TransformResult
})

// Asynchronous transform
plugin.asyncTransform({
  id: string,
  name: string,
  description: string,
  inputType: EntityType,
  outputTypes: EntityType[],
  handler: async (input, config, job) => TransformResult
})
```

#### Server Management

```typescript
await plugin.start({ 
  port: number,
  host?: string,
  multiTenant?: boolean,
  https?: { key: string, cert: string }
})

await plugin.stop()
```

## Requirements

- Node.js >= 18.0.0
- TypeScript >= 5.0.0 (for development)

## Examples

### Synchronous Transform

```bash
cd examples/simple-sync-example
npm install
npm start
```

### Asynchronous Transform

```bash
cd examples/async-subdomain-scanner
npm install
npm start
```

## License

MIT License - see [LICENSE](./LICENSE) file for details.

## Links

- [npm Package](https://www.npmjs.com/package/@relazio/plugin-sdk)
- [GitHub Repository](https://github.com/relazio/plugin-sdk)
- [Issue Tracker](https://github.com/relazio/plugin-sdk/issues)
- [Documentation](./docs/)
