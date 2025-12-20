import { RelazioPlugin } from '../src';

/**
 * Esempio 4: Plugin Multi-Tenant
 * Plugin che serve multiple organizations con gestione automatica delle installazioni
 */

const plugin = new RelazioPlugin({
  id: 'multi-tenant-plugin',
  name: 'Multi-Tenant Plugin',
  version: '1.0.0',
  author: 'Relazio Team',
  description: 'Plugin that serves multiple organizations',
  category: 'network',
  icon: 'IconCloud',
});

// Configurazione per organization (ogni org avrà la sua API key)
plugin.configure({
  apiKey: {
    type: 'string',
    label: 'API Key',
    description: 'Your organization API key',
    required: true,
    secret: true,
  },
  maxResults: {
    type: 'number',
    label: 'Max Results',
    description: 'Maximum results per query',
    default: 10,
    min: 1,
    max: 100,
  },
});

// Transform sincrona - ogni org usa la propria config
plugin.transform({
  id: 'lookup-ip',
  name: 'Lookup IP',
  description: 'Looks up IP information',
  inputType: 'ip',
  outputTypes: ['note', 'location'],

  handler: async (input, config) => {
    const ip = input.entity.value;
    const orgId = input.organizationId;
    const apiKey = config.apiKey;

    console.log(`[Transform] Processing IP ${ip} for org: ${orgId}`);
    console.log(`[Transform] Using API key: ${apiKey?.substring(0, 10)}...`);

    // Simula chiamata API con API key dell'organization
    const mockResult = {
      country: 'US',
      city: 'Mountain View',
      isp: 'Google LLC',
    };

    return {
      success: true,
      entities: [
        {
          type: 'note',
          value: `IP: ${ip}\nCountry: ${mockResult.country}\nCity: ${mockResult.city}\nISP: ${mockResult.isp}`,
          label: 'IP Information',
          metadata: {
            source: 'multi-tenant-plugin',
            organizationId: orgId,
          },
        },
        {
          type: 'location',
          value: `${mockResult.city}, ${mockResult.country}`,
          label: mockResult.city,
        },
      ],
      edges: [
        {
          sourceId: input.entity.id,
          targetId: 'auto',
          label: 'located in',
          relationship: 'located_in',
        },
      ],
      message: `Lookup complete for ${ip} (org: ${orgId})`,
    };
  },
});

// Transform asincrona - webhook secret corretto per ogni org
plugin.asyncTransform({
  id: 'deep-scan',
  name: 'Deep IP Scan',
  description: 'Performs deep analysis (async)',
  inputType: 'ip',
  outputTypes: ['note', 'domain'],

  handler: async (input, config, job) => {
    const ip = input.entity.value;
    const orgId = input.organizationId;

    console.log(`[Async Transform] Starting scan for ${ip} (org: ${orgId})`);

    await job.updateProgress(0, 'Starting deep scan...');
    await new Promise((resolve) => setTimeout(resolve, 2000));

    await job.updateProgress(50, 'Analyzing...');
    await new Promise((resolve) => setTimeout(resolve, 2000));

    await job.updateProgress(100, 'Complete');

    return {
      success: true,
      entities: [
        {
          type: 'note',
          value: `Deep scan results for ${ip}`,
          label: 'Scan Results',
          metadata: {
            organizationId: orgId,
            scanDate: new Date().toISOString(),
          },
        },
      ],
      edges: [],
      message: `Scan complete for org: ${orgId}`,
    };
  },
});

// Avvia server in modalità multi-tenant
if (require.main === module) {
  // ⭐ SEMPLIFICATO! Basta una riga per abilitare multi-tenant
  plugin.start({
    port: 3003,
    host: '0.0.0.0',
    multiTenant: true, // ← Questo abilita automaticamente il sistema multi-tenant!
  });

  console.log('\n🎉 Multi-Tenant Plugin Started!');
  console.log('\n📋 Automatic Endpoints:');
  console.log('   POST /register     - Register new organization');
  console.log('   POST /unregister   - Unregister organization');
  console.log('   GET  /stats        - Get installation statistics');
  console.log('   GET  /manifest.json - Plugin manifest');
  console.log('   GET  /health       - Health check');
  console.log('\n🧪 Test Installation Flow:');
  console.log('   # 1. Register an organization');
  console.log('   curl -X POST http://localhost:3003/register \\');
  console.log('     -H "Content-Type: application/json" \\');
  console.log('     -d \'{"organizationId":"org-test","organizationName":"Test Org","platformUrl":"https://relazio.io"}\'');
  console.log('\n   # 2. Use a transform (with org header)');
  console.log('   curl -X POST http://localhost:3003/lookup-ip \\');
  console.log('     -H "Content-Type: application/json" \\');
  console.log('     -H "X-Organization-Id: org-test" \\');
  console.log('     -d \'{"transformId":"lookup-ip","input":{"entity":{"id":"1","type":"ip","value":"8.8.8.8"},"config":{"apiKey":"test-key-123"}}}\'');
  console.log('\n   # 3. Check stats');
  console.log('   curl http://localhost:3003/stats');
}

export default plugin;

// Configurazione per organization (ogni org avrà la sua API key)
plugin.configure({
  apiKey: {
    type: 'string',
    label: 'API Key',
    description: 'Your organization API key',
    required: true,
    secret: true,
  },
  maxResults: {
    type: 'number',
    label: 'Max Results',
    description: 'Maximum results per query',
    default: 10,
    min: 1,
    max: 100,
  },
});

// Transform sincrona - ogni org usa la propria config
plugin.transform({
  id: 'lookup-ip',
  name: 'Lookup IP',
  description: 'Looks up IP information',
  inputType: 'ip',
  outputTypes: ['note', 'location'],

  handler: async (input, config) => {
    const ip = input.entity.value;
    const orgId = input.organizationId;
    const apiKey = config.apiKey;

    console.log(`[Transform] Processing IP ${ip} for org: ${orgId}`);
    console.log(`[Transform] Using API key: ${apiKey?.substring(0, 10)}...`);

    // Simula chiamata API con API key dell'organization
    const mockResult = {
      country: 'US',
      city: 'Mountain View',
      isp: 'Google LLC',
    };

    return {
      success: true,
      entities: [
        {
          type: 'note',
          value: `IP: ${ip}\nCountry: ${mockResult.country}\nCity: ${mockResult.city}\nISP: ${mockResult.isp}`,
          label: 'IP Information',
          metadata: {
            source: 'multi-tenant-plugin',
            organizationId: orgId,
          },
        },
        {
          type: 'location',
          value: `${mockResult.city}, ${mockResult.country}`,
          label: mockResult.city,
        },
      ],
      edges: [
        {
          sourceId: input.entity.id,
          targetId: 'auto',
          label: 'located in',
          relationship: 'located_in',
        },
      ],
      message: `Lookup complete for ${ip} (org: ${orgId})`,
    };
  },
});

// Transform asincrona - webhook secret corretto per ogni org
plugin.asyncTransform({
  id: 'deep-scan',
  name: 'Deep IP Scan',
  description: 'Performs deep analysis (async)',
  inputType: 'ip',
  outputTypes: ['note', 'domain'],

  handler: async (input, config, job) => {
    const ip = input.entity.value;
    const orgId = input.organizationId;

    console.log(`[Async Transform] Starting scan for ${ip} (org: ${orgId})`);

    await job.updateProgress(0, 'Starting deep scan...');
    await new Promise((resolve) => setTimeout(resolve, 2000));

    await job.updateProgress(50, 'Analyzing...');
    await new Promise((resolve) => setTimeout(resolve, 2000));

    await job.updateProgress(100, 'Complete');

    return {
      success: true,
      entities: [
        {
          type: 'note',
          value: `Deep scan results for ${ip}`,
          label: 'Scan Results',
          metadata: {
            organizationId: orgId,
            scanDate: new Date().toISOString(),
          },
        },
      ],
      edges: [],
      message: `Scan complete for org: ${orgId}`,
    };
  },
});

// Avvia server in modalità multi-tenant
if (require.main === module) {
  // ⭐ SEMPLIFICATO! Basta una riga per abilitare multi-tenant
  plugin.start({
    port: 3003,
    host: '0.0.0.0',
    multiTenant: true, // ← Questo abilita automaticamente il sistema multi-tenant!
  });

  console.log('\n🎉 Multi-Tenant Plugin Started!');
  console.log('\n📋 Automatic Endpoints:');
  console.log('   POST /register     - Register new organization');
  console.log('   POST /unregister   - Unregister organization');
  console.log('   GET  /stats        - Get installation statistics');
  console.log('   GET  /manifest.json - Plugin manifest');
  console.log('   GET  /health       - Health check');
  console.log('\n🧪 Test Installation Flow:');
  console.log('   # 1. Register an organization');
  console.log('   curl -X POST http://localhost:3003/register \\');
  console.log('     -H "Content-Type: application/json" \\');
  console.log('     -d \'{"organizationId":"org-test","organizationName":"Test Org","platformUrl":"https://relazio.io"}\'');
  console.log('\n   # 2. Use a transform (with org header)');
  console.log('   curl -X POST http://localhost:3003/lookup-ip \\');
  console.log('     -H "Content-Type: application/json" \\');
  console.log('     -H "X-Organization-Id: org-test" \\');
  console.log('     -d \'{"transformId":"lookup-ip","input":{"entity":{"id":"1","type":"ip","value":"8.8.8.8"},"config":{"apiKey":"test-key-123"}}}\'');
  console.log('\n   # 3. Check stats');
  console.log('   curl http://localhost:3003/stats');
}

export default plugin;

