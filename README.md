# Relazio Plugin SDK

Official TypeScript SDK for external Relazio addons.

[![npm version](https://img.shields.io/npm/v/@relazio/plugin-sdk.svg)](https://www.npmjs.com/package/@relazio/plugin-sdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)

## Security Contract

SDK 0.3 implements the platform addon protocol:

- personalized manifest and registration tokens;
- HMAC-SHA256 signed transform and unregister requests;
- timestamp and nonce replay protection;
- isolated webhook secrets per workspace;
- callback origin validation;
- idempotent webhook event IDs;
- bounded request bodies and transform results;
- encrypted persistent storage for single-instance deployments.

Do not expose transform routes through an adapter that bypasses the SDK server.

## Install

```bash
npm install @relazio/plugin-sdk
```

Node.js 18 or newer is required.

## Minimal Addon

```typescript
import {
  EncryptedFileStorage,
  InstallationRegistry,
  RelazioPlugin,
  ResultBuilder,
  createEntity
} from '@relazio/plugin-sdk';

const pluginId = 'domain-lookup';
const pluginVersion = '1.0.0';

const plugin = new RelazioPlugin({
  id: pluginId,
  name: 'Domain Lookup',
  version: pluginVersion,
  author: 'Your Company',
  description: 'Resolves domains to IP addresses',
  category: 'network'
});

plugin.transform({
  id: 'resolve-domain',
  name: 'Resolve Domain',
  description: 'Returns the resolved IP address',
  inputType: 'domain',
  outputTypes: ['ip'],
  async handler(input) {
    const ip = createEntity('ip', '203.0.113.10');
    return new ResultBuilder(input)
      .addEntity(ip, 'resolves to', { relationship: 'resolves_to' })
      .build();
  }
});

const storage = new EncryptedFileStorage(
  process.env.ADDON_STORAGE_PATH || './data/installations.enc',
  process.env.ADDON_STORAGE_ENCRYPTION_KEY!
);
plugin.enableMultiTenant(
  new InstallationRegistry(pluginId, pluginVersion, storage)
);

await plugin.start({
  port: 3001,
  host: '0.0.0.0',
  publicUrl: process.env.PUBLIC_URL,
  multiTenant: true,
  installationToken: process.env.ADDON_INSTALL_TOKEN,
  adminToken: process.env.ADDON_ADMIN_TOKEN
});
```

Both `ADDON_INSTALL_TOKEN` and `ADDON_STORAGE_ENCRYPTION_KEY` should be
independent random values of at least 32 characters. Production `PUBLIC_URL`
should be an HTTPS origin.

## Storage Modes

### Single Instance

`EncryptedFileStorage` uses AES-256-GCM, file permissions `0600`, and atomic
replacement. Keep its file on a persistent volume and back up the encryption
key separately.

### Multiple Replicas

Implement `InstallationStorage` using a shared transactional database. Also
provide `requestReplayStore` to `start()` using Redis or a database operation
that atomically inserts a nonce until its expiry:

```typescript
await plugin.start({
  port: 3001,
  multiTenant: true,
  installationToken: process.env.ADDON_INSTALL_TOKEN,
  requestReplayStore: {
    async consume(key, expiresAt) {
      // Return true only when this process wins an atomic insert.
      return redisSetNonceAtomically(key, expiresAt);
    }
  }
});
```

Without `requestReplayStore`, replay protection is local to one process.

### Development Only

Automatic memory storage must be explicitly enabled:

```typescript
await plugin.start({
  port: 3001,
  multiTenant: true,
  installationToken: 'development-token-at-least-32-chars',
  allowInMemoryStorage: true
});
```

Memory storage loses workspace secrets on every restart and must not be used
for production.

## Async Transforms

```typescript
plugin.asyncTransform({
  id: 'deep-scan',
  name: 'Deep Scan',
  description: 'Runs a longer analysis',
  inputType: 'domain',
  outputTypes: ['domain'],
  async handler(input, _config, job) {
    await job.updateProgress(25, 'Starting');
    const result = new ResultBuilder(input)
      .addEntity(createEntity('domain', `api.${input.entity.value}`))
      .build();
    await job.updateProgress(90, 'Finalizing');
    return result;
  }
});
```

The SDK signs webhook events, assigns a unique `eventId`, and retries delivery.
The platform deduplicates those events.

## HTTP Routes

| Route | Protection |
| --- | --- |
| `GET /health` | Public, minimal operational metadata |
| `GET /manifest.json` | Personalized install token |
| `POST /register` | Bearer install token |
| `POST /unregister` | Signed workspace request |
| `POST /<transformId>` | Signed workspace request |
| `GET /stats` | Admin bearer token, otherwise returns 404 |

## Publication Checks

```bash
npm run build
npm test -- --run
npm audit
npm pack --dry-run
```

The full reference deployment is maintained in
[`relazio-plugin-example`](https://github.com/rstlgu/relazio-plugin-example).

## License

MIT
