import { ParanodPlugin } from '../src';

/**
 * Esempio 4: Plugin Multi-Tenant
 * Plugin che serve multiple workspaces con gestione automatica delle installazioni
 */

const plugin = new ParanodPlugin({
  id: 'multi-tenant-plugin',
  name: 'Multi-Tenant Plugin',
  version: '1.0.0',
  author: 'PARANOD Team',
  description: 'Plugin that serves multiple workspaces',
  category: 'network',
  icon: 'IconCloud',
});

// Configurazione per workspace (ogni workspace avrà la sua API key)
plugin.configure({
  apiKey: {
    type: 'string',
    label: 'API Key',
    description: 'Your workspace API key',
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

// Transform sincrona - ogni workspace usa la propria config
plugin.transform({
  id: 'lookup-ip',
  name: 'Lookup IP',
  description: 'Looks up IP information',
  inputType: 'ip',
  outputTypes: ['note', 'location'],

  handler: async (input, config) => {
    const ip = input.entity.value;
    const orgId = input.workspaceId;
    const apiKey = config.apiKey;

    console.log(`[Transform] Processing IP ${ip} for workspace: ${orgId}`);
    console.log(`[Transform] Using API key: ${apiKey?.substring(0, 10)}...`);

    // Simula chiamata API con API key dell'workspace
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
            workspaceId: orgId,
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
      message: `Lookup complete for ${ip} (workspace: ${orgId})`,
    };
  },
});

// Transform asincrona - webhook secret corretto per ogni workspace
plugin.asyncTransform({
  id: 'deep-scan',
  name: 'Deep IP Scan',
  description: 'Performs deep analysis (async)',
  inputType: 'ip',
  outputTypes: ['note', 'domain'],

  handler: async (input, config, job) => {
    const ip = input.entity.value;
    const orgId = input.workspaceId;

    console.log(`[Async Transform] Starting scan for ${ip} (workspace: ${orgId})`);

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
            workspaceId: orgId,
            scanDate: new Date().toISOString(),
          },
        },
      ],
      edges: [],
      message: `Scan complete for workspace: ${orgId}`,
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
  console.log('   POST /register     - Register new workspace');
  console.log('   POST /unregister   - Unregister workspace');
  console.log('   GET  /stats        - Get installation statistics');
  console.log('   GET  /manifest.json - Plugin manifest');
  console.log('   GET  /health       - Health check');
  console.log('\n🧪 Test Installation Flow:');
  console.log('   # 1. Register an workspace');
  console.log('   curl -X POST http://localhost:3003/register \\');
  console.log('     -H "Content-Type: application/json" \\');
  console.log('     -d \'{"workspaceId":"workspace-test","workspaceName":"Test Org","platformUrl":"https://paranod.io"}\'');
  console.log('\n   # 2. Use a transform (with workspace header)');
  console.log('   curl -X POST http://localhost:3003/lookup-ip \\');
  console.log('     -H "Content-Type: application/json" \\');
  console.log('     -H "X-Workspace-Id: workspace-test" \\');
  console.log('     -d \'{"transformId":"lookup-ip","input":{"entity":{"id":"1","type":"ip","value":"8.8.8.8"},"config":{"apiKey":"test-key-123"}}}\'');
  console.log('\n   # 3. Check stats');
  console.log('   curl http://localhost:3003/stats');
}

export default plugin;

// Configurazione per workspace (ogni workspace avrà la sua API key)
plugin.configure({
  apiKey: {
    type: 'string',
    label: 'API Key',
    description: 'Your workspace API key',
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

// Transform sincrona - ogni workspace usa la propria config
plugin.transform({
  id: 'lookup-ip',
  name: 'Lookup IP',
  description: 'Looks up IP information',
  inputType: 'ip',
  outputTypes: ['note', 'location'],

  handler: async (input, config) => {
    const ip = input.entity.value;
    const orgId = input.workspaceId;
    const apiKey = config.apiKey;

    console.log(`[Transform] Processing IP ${ip} for workspace: ${orgId}`);
    console.log(`[Transform] Using API key: ${apiKey?.substring(0, 10)}...`);

    // Simula chiamata API con API key dell'workspace
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
            workspaceId: orgId,
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
      message: `Lookup complete for ${ip} (workspace: ${orgId})`,
    };
  },
});

// Transform asincrona - webhook secret corretto per ogni workspace
plugin.asyncTransform({
  id: 'deep-scan',
  name: 'Deep IP Scan',
  description: 'Performs deep analysis (async)',
  inputType: 'ip',
  outputTypes: ['note', 'domain'],

  handler: async (input, config, job) => {
    const ip = input.entity.value;
    const orgId = input.workspaceId;

    console.log(`[Async Transform] Starting scan for ${ip} (workspace: ${orgId})`);

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
            workspaceId: orgId,
            scanDate: new Date().toISOString(),
          },
        },
      ],
      edges: [],
      message: `Scan complete for workspace: ${orgId}`,
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
  console.log('   POST /register     - Register new workspace');
  console.log('   POST /unregister   - Unregister workspace');
  console.log('   GET  /stats        - Get installation statistics');
  console.log('   GET  /manifest.json - Plugin manifest');
  console.log('   GET  /health       - Health check');
  console.log('\n🧪 Test Installation Flow:');
  console.log('   # 1. Register an workspace');
  console.log('   curl -X POST http://localhost:3003/register \\');
  console.log('     -H "Content-Type: application/json" \\');
  console.log('     -d \'{"workspaceId":"workspace-test","workspaceName":"Test Org","platformUrl":"https://paranod.io"}\'');
  console.log('\n   # 2. Use a transform (with workspace header)');
  console.log('   curl -X POST http://localhost:3003/lookup-ip \\');
  console.log('     -H "Content-Type: application/json" \\');
  console.log('     -H "X-Workspace-Id: workspace-test" \\');
  console.log('     -d \'{"transformId":"lookup-ip","input":{"entity":{"id":"1","type":"ip","value":"8.8.8.8"},"config":{"apiKey":"test-key-123"}}}\'');
  console.log('\n   # 3. Check stats');
  console.log('   curl http://localhost:3003/stats');
}

export default plugin;


