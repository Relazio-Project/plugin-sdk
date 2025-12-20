import { RelazioPlugin } from '../src';

/**
 * Esempio 3: Async Transform
 * Plugin con transform asincrona che simula un'operazione lunga
 */

const plugin = new RelazioPlugin({
  id: 'subdomain-scanner',
  name: 'Subdomain Scanner',
  version: '1.0.0',
  author: 'Relazio Team',
  description: 'Scans for subdomains using certificate transparency logs (async)',
  category: 'network',
  icon: 'IconRadar',
});

// Configura webhook secret
plugin.setWebhookSecret(process.env.WEBHOOK_SECRET || 'dev-secret-key');

// Transform asincrona: Subdomain scan
plugin.asyncTransform({
  id: 'scan-subdomains',
  name: 'Scan Subdomains',
  description: 'Finds subdomains via certificate transparency (takes minutes)',
  inputType: 'domain',
  outputTypes: ['domain', 'note'],
  
  handler: async (input, config, job) => {
    const domain = input.entity.value;
    
    await job.updateProgress(0, 'Starting subdomain scan...');
    
    // Simula query a certificate transparency logs
    await new Promise((resolve) => setTimeout(resolve, 2000));
    await job.updateProgress(25, 'Querying certificate logs...');
    
    // Simula elaborazione certificati
    await new Promise((resolve) => setTimeout(resolve, 2000));
    await job.updateProgress(50, 'Processing certificates...');
    
    // Mock data - in produzione questi verrebbero da API reali
    const mockSubdomains = [
      `www.${domain}`,
      `mail.${domain}`,
      `api.${domain}`,
      `dev.${domain}`,
    ];
    
    await job.updateProgress(75, 'Deduplicating results...');
    await new Promise((resolve) => setTimeout(resolve, 1000));
    
    await job.updateProgress(100, `Found ${mockSubdomains.length} subdomains`);
    
    return {
      success: true,
      entities: [
        ...mockSubdomains.map((sub) => ({
          type: 'domain' as const,
          value: sub,
          label: sub,
          metadata: {
            source: 'subdomain-scanner',
            method: 'certificate-transparency',
          },
        })),
        {
          type: 'note' as const,
          value: `Scan completed. Found ${mockSubdomains.length} subdomains for ${domain}`,
          label: 'Scan Results',
          metadata: {
            totalFound: mockSubdomains.length,
            scanDate: new Date().toISOString(),
          },
        },
      ],
      edges: mockSubdomains.map((sub) => ({
        sourceId: input.entity.id,
        targetId: 'auto',
        label: 'subdomain',
        relationship: 'related_to',
      })),
      message: `Scan complete: ${mockSubdomains.length} subdomains found`,
    };
  },
});

// Avvia server
if (require.main === module) {
  plugin.start({
    port: 3002,
    host: '0.0.0.0',
  });
}

export default plugin;

