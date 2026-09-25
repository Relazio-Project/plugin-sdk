# PARANOD Plugin SDK

Official SDK for building external plugins for the PARANOD OSINT platform.

Security update: registration now requires ADDON_REGISTRATION_TOKEN (at least 32 characters); set ADDON_PUBLIC_URL to the reachable addon origin. Use /manifest.json?token=TOKEN when installing. Transform/unregister requests require the per-workspace Bearer secret. Webhooks include the signed platformJobId. Upgrade the platform and addon together. Production platform URLs must use HTTPS; default storage and jobs remain in-memory and need a persistent backend for reliable restarts.

[![npm version](https://img.shields.io/npm/v/@paranod/plugin-sdk.svg)](https://www.npmjs.com/package/@paranod/plugin-sdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

## Overview

The PARANOD Plugin SDK provides a complete framework for building secure, scalable external plugins that extend the PARANOD platform's capabilities with minimal boilerplate.

## Features

- **Multi-Tenant Support**: Automatic workspace management with isolated configurations
- **Sync & Async Transforms**: Support for both immediate and long-running operations
- **Automatic Endpoints**: Built-in `/register`, `/unregister`, and `/manifest.json` endpoints
- **Security**: HMAC-SHA256 signature generation and validation
- **Job Management**: Progress tracking and webhook notifications for async operations
- **TypeScript**: Full type safety and IntelliSense support
- **Typed Entity Creation**: `createEntity()` accepts the SDK `EntityType` union
- **Automatic ID Generation**: Deterministic ID generation for entities and edges
- **Result Builder**: Fluent API for constructing complex transform results
- **Automatic Validation**: Format validation according to PARANOD specifications

## Installation

```bash
npm install @paranod/plugin-sdk
```

## Quick Start

```typescript
import {
  ParanodPlugin,
  createEntity,
  ResultBuilder,
} from "@paranod/plugin-sdk";

const plugin = new ParanodPlugin({
  id: "my-plugin",
  name: "My Plugin",
  version: "1.0.0",
  author: "Your Name",
  description: "Plugin description",
  category: "network",
});

plugin.transform({
  id: "my-transform",
  name: "My Transform",
  description: "Transforms data",
  inputType: "domain",
  outputTypes: ["ip"],

  async handler(input) {
    // Create entity using universal createEntity()
    const ip = createEntity("ip", "8.8.8.8", {
      label: "Google DNS",
      metadata: { country: "US" },
    });

    // Build result with automatic edge creation
    return new ResultBuilder(input)
      .addEntity(ip, "resolves to", {
        relationship: "dns_resolution",
      })
      .setMessage("DNS resolved successfully")
      .build();
  },
});

await plugin.start({
  port: 3000,
  multiTenant: true,
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

The SDK provides one typed builder for every supported entity type:

### Universal Entity Creation

```typescript
import { createEntity } from "@paranod/plugin-sdk";

const ip = createEntity("ip", "8.8.8.8", {
  label: "Google DNS",
  metadata: { country: "US", isp: "Google LLC" },
});

const domain = createEntity("domain", "example.com");

const location = createEntity("location", "New York, NY", {
  metadata: { latitude: 40.7, longitude: -74.0 },
});

// Use the explicit custom type for values without a dedicated EntityType.
const customEntity = createEntity("custom", "value", {
  metadata: { originalType: "future-entity-type" },
});

// ID automatically generated: "ip-c909e98d"
console.log(ip.id);
```

**Advantages**:

- One API for all supported entity types
- Explicit `custom` fallback for unsupported types
- Type-safe with TypeScript
- Deterministic ID generation

### Result Builder

Build complex results easily:

```typescript
import { ResultBuilder, createEntity } from "@paranod/plugin-sdk";

handler: async (input) => {
  const location = createEntity("location", "Mountain View, CA", {
    metadata: { latitude: 37.386, longitude: -122.084 },
  });

  const org = createEntity("organization", "Google LLC", {
    metadata: { asn: "AS15169" },
  });

  // Edges created automatically!
  return new ResultBuilder(input)
    .addEntity(location, "located in", {
      relationship: "geolocation",
    })
    .addEntity(org, "assigned by", {
      relationship: "isp_assignment",
    })
    .setMessage("IP analyzed successfully")
    .build();
};
```

### Supported Entity Types

The canonical list is exported as `EntityType` from the package and defined in
[`src/core/types.ts`](./src/core/types.ts). Use `custom` plus metadata when no
dedicated type exists.

## Multi-Tenant Architecture

The SDK automatically handles workspace registration and management:

1. Platform requests `/register` with workspace details
2. SDK generates unique webhook secret
3. SDK stores workspace configuration
4. Platform receives webhook secret
5. Plugin processes requests with workspace isolation

## Security

All plugins must implement the following security requirements:

- **HTTPS**: Production endpoints must use HTTPS
- **HMAC Signatures**: All webhooks are signed with HMAC-SHA256
- **Rate Limiting**: Enforced by the platform (30 req/min, 500 req/hour)
- **Timeouts**: 30s for sync transforms, 30 minutes maximum for async jobs

## API Reference

### Core Classes

#### ParanodPlugin

Main plugin class that manages transforms and server lifecycle.

```typescript
const plugin = new ParanodPlugin(config: PluginConfig)
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

- [npm Package](https://www.npmjs.com/package/@paranod/plugin-sdk)
- [GitHub Repository](https://github.com/paranod/plugin-sdk)
- [Issue Tracker](https://github.com/paranod/plugin-sdk/issues)
- [Documentation](./docs/)
