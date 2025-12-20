import { RelazioPlugin } from '../src';

/**
 * Esempio 1: Plugin Email Parser
 * Transform sincrona che estrae il dominio da un indirizzo email
 */

const plugin = new RelazioPlugin({
  id: 'email-parser',
  name: 'Email Parser',
  version: '1.0.0',
  author: 'Relazio Team',
  description: 'Parses email addresses and extracts domain information',
  category: 'identity',
  icon: 'IconMail',
});

// Transform: Estrai dominio da email
plugin.transform({
  id: 'extract-domain',
  name: 'Extract Domain',
  description: 'Extracts domain from email address',
  inputType: 'email',
  outputTypes: ['domain'],
  
  handler: async (input) => {
    const email = input.entity.value;
    
    // Valida formato email
    if (!email.includes('@')) {
      throw new Error('Invalid email format');
    }
    
    const domain = email.split('@')[1];
    
    return {
      success: true,
      entities: [
        {
          type: 'domain',
          value: domain,
          label: domain,
          metadata: {
            source: 'email-parser',
            extractedFrom: email,
          },
        },
      ],
      edges: [
        {
          sourceId: input.entity.id,
          targetId: 'auto',
          label: 'domain of',
          relationship: 'belongs_to',
        },
      ],
      message: `Extracted domain: ${domain}`,
    };
  },
});

// Avvia server
if (require.main === module) {
  plugin.start({
    port: 3000,
    host: '0.0.0.0',
  });
}

export default plugin;

