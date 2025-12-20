import { RelazioPlugin } from '../src';
import dns from 'dns/promises';

/**
 * Esempio 2: DNS Toolkit
 * Plugin con multiple transforms sincrone per analisi DNS
 */

const plugin = new RelazioPlugin({
  id: 'dns-toolkit',
  name: 'DNS Toolkit',
  version: '1.0.0',
  author: 'Relazio Team',
  description: 'Complete DNS analysis toolkit with A, MX, NS records',
  category: 'network',
  icon: 'IconNetwork',
});

// Transform 1: A Records (IPv4)
plugin.transform({
  id: 'resolve-a',
  name: 'Resolve A Records',
  description: 'Gets IPv4 addresses for a domain',
  inputType: 'domain',
  outputTypes: ['ip'],
  
  handler: async (input) => {
    const domain = input.entity.value;
    
    try {
      const ips = await dns.resolve4(domain);
      
      return {
        success: true,
        entities: ips.map((ip) => ({
          type: 'ip' as const,
          value: ip,
          label: ip,
          metadata: {
            source: 'dns-toolkit',
            recordType: 'A',
          },
        })),
        edges: ips.map((ip) => ({
          sourceId: input.entity.id,
          targetId: 'auto',
          label: 'resolves to',
          relationship: 'resolves_to',
        })),
        message: `Found ${ips.length} A record(s)`,
      };
    } catch (error) {
      throw new Error(`DNS resolution failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },
});

// Transform 2: MX Records (Mail servers)
plugin.transform({
  id: 'resolve-mx',
  name: 'Get MX Records',
  description: 'Gets mail server information',
  inputType: 'domain',
  outputTypes: ['domain', 'note'],
  
  handler: async (input) => {
    const domain = input.entity.value;
    
    try {
      const mxRecords = await dns.resolveMx(domain);
      
      const entities = mxRecords.map((mx) => ({
        type: 'domain' as const,
        value: mx.exchange,
        label: `${mx.exchange} (priority: ${mx.priority})`,
        metadata: {
          source: 'dns-toolkit',
          recordType: 'MX',
          priority: mx.priority,
        },
      }));
      
      return {
        success: true,
        entities,
        edges: mxRecords.map((mx) => ({
          sourceId: input.entity.id,
          targetId: 'auto',
          label: 'mail server',
          relationship: 'uses_mailserver',
        })),
        message: `Found ${mxRecords.length} MX record(s)`,
      };
    } catch (error) {
      throw new Error(`MX lookup failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },
});

// Transform 3: NS Records (Nameservers)
plugin.transform({
  id: 'resolve-ns',
  name: 'Get Nameservers',
  description: 'Gets authoritative nameservers',
  inputType: 'domain',
  outputTypes: ['domain'],
  
  handler: async (input) => {
    const domain = input.entity.value;
    
    try {
      const nameservers = await dns.resolveNs(domain);
      
      return {
        success: true,
        entities: nameservers.map((ns) => ({
          type: 'domain' as const,
          value: ns,
          label: ns,
          metadata: {
            source: 'dns-toolkit',
            recordType: 'NS',
          },
        })),
        edges: nameservers.map((ns) => ({
          sourceId: input.entity.id,
          targetId: 'auto',
          label: 'nameserver',
          relationship: 'uses_nameserver',
        })),
        message: `Found ${nameservers.length} nameserver(s)`,
      };
    } catch (error) {
      throw new Error(`NS lookup failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },
});

// Avvia server
if (require.main === module) {
  plugin.start({
    port: 3001,
    host: '0.0.0.0',
  });
}

export default plugin;

