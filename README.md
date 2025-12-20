# Relazio Plugin SDK

Official SDK for building external plugins for the Relazio OSINT platform.

[![npm version](https://img.shields.io/npm/v/@relazio/plugin-sdk.svg)](https://www.npmjs.com/package/@relazio/plugin-sdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

## Overview

The Relazio Plugin SDK enables developers to create external plugins that extend the Relazio platform's capabilities. The SDK provides a complete framework for building secure, multi-tenant plugins with minimal boilerplate code.

## Features

- **Multi-Tenant Support**: Automatic organization management with isolated configurations
- **Sync & Async Transforms**: Support for both immediate and long-running operations
- **Automatic Endpoints**: Built-in `/register`, `/unregister`, and `/manifest.json` endpoints
- **Security**: HMAC-SHA256 signature generation and validation
- **Job Management**: Progress tracking and webhook notifications for async operations
- **TypeScript**: Full type safety and IntelliSense support

## Installation

```bash
npm install @relazio/plugin-sdk
```

## Quick Start

```typescript
import { RelazioPlugin } from '@relazio/plugin-sdk';

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
  
  async handler(input, config) {
    return {
      entities: [{
        type: 'ip',
        value: '8.8.8.8',
        label: 'Google DNS'
      }],
      edges: []
    };
  }
});

await plugin.start({ 
  port: 3000,
  multiTenant: true
});
```

## Documentation

- [Examples](./examples/) - Working plugin examples
- [Changelog](./CHANGELOG.md) - Version history

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

## License

MIT License - see [LICENSE](./LICENSE) file for details.

## Links

- [npm Package](https://www.npmjs.com/package/@relazio/plugin-sdk)
- [GitHub Repository](https://github.com/relazio/plugin-sdk)
- [Issue Tracker](https://github.com/relazio/plugin-sdk/issues)
