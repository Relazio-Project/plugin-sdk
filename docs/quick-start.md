# Quick Start Guide

This guide demonstrates how to create Relazio plugins using the SDK.

## Installation

```bash
npm install @relazio/plugin-sdk
```

## Core Concepts

The SDK provides two types of transforms:

- **Synchronous Transforms**: Return results immediately (< 30 seconds)
- **Asynchronous Transforms**: Handle long-running operations (minutes to hours) with progress tracking

## Example 1: Synchronous Transform

Synchronous transforms process requests and return results immediately.

```typescript
import { RelazioPlugin, createEntity, ResultBuilder } from '@relazio/plugin-sdk';

const plugin = new RelazioPlugin({
  id: 'domain-analyzer',
  name: 'Domain Analyzer',
  version: '1.0.0',
  author: 'Your Name',
  description: 'Analyzes domains and returns related entities',
  category: 'network',
});

plugin.transform({
  id: 'analyze-domain',
  name: 'Analyze Domain',
  inputType: 'domain',
  outputTypes: ['ip', 'location', 'organization'],
  
  handler: async (input) => {
    const domain = input.entity.value;
    
    // Your analysis logic
    const ip = await resolveDNS(domain);
    const location = await getGeoLocation(ip);
    const organization = await getISPInfo(ip);
    
    // Create entities using createEntity()
    const ipEntity = createEntity('ip', ip, {
      metadata: { resolvedFrom: domain }
    });
    
    const locationEntity = createEntity('location', location.city, {
      metadata: {
        latitude: location.lat,
        longitude: location.lon,
        country: location.country
      }
    });
    
    const orgEntity = createEntity('organization', organization.name, {
      metadata: { asn: organization.asn }
    });
    
    // Build result with automatic edge creation
    return new ResultBuilder(input)
      .addEntity(ipEntity, 'resolves to')
      .addEntity(locationEntity, 'located in')
      .addEntity(orgEntity, 'hosted by')
      .setMessage('Analysis completed')
      .build();
  }
});

await plugin.start({ port: 3000 });
```

**Use Cases**: API calls, DNS lookups, data parsing, quick analysis

**Complete Example**: See `examples/simple-sync-example/`

## Example 2: Asynchronous Transform

Asynchronous transforms handle long-running operations with progress tracking and webhook callbacks.

```typescript
import { RelazioPlugin, createEntity, ResultBuilder } from '@relazio/plugin-sdk';

const plugin = new RelazioPlugin({
  id: 'subdomain-scanner',
  name: 'Subdomain Scanner',
  version: '1.0.0',
  author: 'Your Name',
  description: 'Scans for subdomains',
  category: 'network',
});

// Required for async transforms
plugin.setWebhookSecret(process.env.WEBHOOK_SECRET || 'dev-secret');

plugin.asyncTransform({
  id: 'scan-subdomains',
  name: 'Scan Subdomains',
  inputType: 'domain',
  outputTypes: ['domain'],
  
  handler: async (input, config, job) => {
    const domain = input.entity.value;
    
    // Update progress during execution
    await job.updateProgress(0, 'Starting scan');
    
    const results = [];
    for (let i = 0; i < totalScans; i++) {
      const subdomain = await scanForSubdomain(domain, i);
      if (subdomain) results.push(subdomain);
      
      // Update progress
      const progress = ((i + 1) / totalScans) * 100;
      await job.updateProgress(progress, `Found ${results.length} subdomains`);
    }
    
    // Create entities for results
    const subdomainEntities = results.map(sub =>
      createEntity('domain', sub, {
        metadata: { discoveredFrom: domain }
      })
    );
    
    // Build and return result
    return new ResultBuilder(input)
      .addEntities(subdomainEntities, 'subdomain')
      .setMessage(`Scan completed: ${results.length} subdomains found`)
      .build();
  }
});

await plugin.start({ port: 3000 });
```

**Use Cases**: Port scanning, subdomain enumeration, batch processing, crawling

**Complete Example**: See `examples/async-subdomain-scanner/`

## Core SDK Functions

### createEntity()

Creates an entity with automatic ID generation. Works with any entity type.

```typescript
createEntity(type: EntityType, value: string, options?: {
  id?: string;
  label?: string;
  metadata?: Record<string, any>;
})
```

**Examples**:

```typescript
createEntity('ip', '8.8.8.8')
createEntity('domain', 'example.com')
createEntity('location', 'New York, NY', {
  metadata: { latitude: 40.7, longitude: -74.0 }
})
createEntity('note', 'Analysis Results', {
  label: '## Results\n\nAnalysis completed successfully',
  metadata: { format: 'markdown' }
})
```

### ResultBuilder

Constructs transform results with automatic edge generation.

```typescript
const result = new ResultBuilder(input);

// Add entity with automatic edge
result.addEntity(entity, 'edge label', {
  relationship: 'relationship_type'
});

// Add multiple entities with the same edge type
result.addEntities(entities, 'edge label');

// Add message and metadata
result
  .setMessage('Operation completed')
  .addMetadata('executionTime', Date.now());

// Build final result
return result.build();
```

### createEdge()

Creates edges manually when needed.

```typescript
createEdge(sourceId, targetId, label, options?)
```

**Example**:

```typescript
createEdge(
  'source-entity-id',
  'target-entity-id',
  'related to',
  { relationship: 'custom_relationship' }
)
```

## Supported Entity Types

```typescript
'email' | 'domain' | 'ip' | 'person' | 'username' | 'phone' 
| 'organization' | 'hash' | 'credential' | 'social' | 'document' 
| 'note' | 'image' | 'video' | 'location' | 'wallet' 
| 'transaction' | 'exchange' | 'url' | 'maps' | 'custom'
```

The SDK is type-agnostic and works with any entity type, including future additions.

## Testing Your Plugin

```bash
curl -X POST http://localhost:3000/transforms/your-transform-id \
  -H "Content-Type: application/json" \
  -d '{
    "transformId": "your-transform-id",
    "input": {
      "entity": {
        "id": "test-1",
        "type": "domain",
        "value": "example.com"
      }
    },
    "callbackUrl": "https://your-webhook-url.com"
  }'
```

## Best Practices

### Synchronous Transforms

- Keep execution time under 30 seconds
- Use for quick operations (DNS lookups, API calls, parsing)
- Return results directly in the response

### Asynchronous Transforms

- Use for operations taking longer than 30 seconds
- Always set a webhook secret using `setWebhookSecret()`
- Update progress regularly using `job.updateProgress()`
- Handle errors gracefully

### Entity Creation

- Use `createEntity()` for all entity creation (scalable approach)
- Include meaningful metadata
- Use descriptive labels for better visualization
- Leverage markdown format for note entities

### Edge Creation

- Use `ResultBuilder.addEntity()` for automatic edge creation
- Provide clear, descriptive edge labels
- Use `relationship` field to categorize edge types

## Next Steps

1. **Try the examples**: `cd examples/simple-sync-example && npm install && npm start`
2. **Read the builders guide**: [builders-guide.md](./builders-guide.md)
3. **Understand the response format**: [response-format.md](./response-format.md)
4. **Explore examples**: [examples.md](./examples.md)

## Additional Resources

- [Main README](../README.md)
- [Builders Guide](./builders-guide.md)
- [Response Format Specification](./response-format.md)
- [Examples Documentation](./examples.md)
- [Changelog](../CHANGELOG.md)

