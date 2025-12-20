# Relazio - Plugin SDK

> Official SDK for building external plugins for Relazio

[![Status](https://img.shields.io/badge/Status-In%20Development-yellow.svg)](https://github.com/relazio/plugin-sdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

**Platform**: Relazio (dal latino *relatio* - relazione, rapporto)  
**Platform Version**: 2.0.0  
**SDK Status**: 📋 Documentation Phase  
**Target Release**: Q1 2026

---

## 📋 Overview

Questo repository contiene la documentazione e, in futuro, il codice sorgente dell'SDK ufficiale per creare plugin esterni per **Relazio**.

### Platform Features Implemented ✅

Il sistema plugin esterni della piattaforma è **PRODUCTION READY** (Dicembre 2025):

- ✅ Manifest validation (HTTPS, TLS, Zod)
- ✅ Installation flow completo
- ✅ Webhook system con HMAC-SHA256
- ✅ Job queue con 7 stati
- ✅ Rate limiting (30/min, 500/hour, 2000/day)
- ✅ Timeout enforcement (30 min max)
- ✅ Security completa
- ✅ E2E testing (44 test, 91% pass)

### SDK Packages Status

- ✅ `@relazio/plugin-sdk` - NPM package (TypeScript/JavaScript) - **COMPLETO** ⭐
  - ✅ Core plugin system
  - ✅ Sync & async transforms  
  - ✅ HMAC signature utilities
  - ✅ Job progress tracking
  - ✅ Express server integration
  - ✅ **Multi-tenant support** (NEW!)
- [ ] `relazio-plugin-sdk` - PyPI package (Python) - Q1 2026
- [ ] CLI tool per scaffold plugin - Q1 2026
- [ ] Mock platform per testing locale - Q2 2026
- ✅ Repository esempi plugin - **4 esempi disponibili**

---

## 📚 Documentazione

Tutta la documentazione è disponibile nella cartella `docs/`:

### Per Utenti

- **[EXTERNAL_PLUGINS_README.md](docs/EXTERNAL_PLUGINS_README.md)** - Quick start guide per installare e usare plugin esterni

### Per Sviluppatori

- **[QUICKSTART.md](QUICKSTART.md)** - ⭐ Quick start per creare plugin (3 righe di codice!)
- **[SDK.md](docs/SDK.md)** - ⭐ SDK API reference completa (TypeScript/Python)
- **[MULTI_TENANT.md](docs/MULTI_TENANT.md)** - Guida multi-tenancy (architettura standard)
- **[CONFIGURATION.md](docs/CONFIGURATION.md)** - Guida configurazione (string, number, boolean, select)
- **[EXTERNAL_PLUGINS.md](docs/EXTERNAL_PLUGINS.md)** - Architettura sistema plugin esterni
- **[EXTERNAL_PLUGINS_FLOW.md](docs/EXTERNAL_PLUGINS_FLOW.md)** - Flussi dettagliati step-by-step
- **[IMPLEMENTATION_EXTERNAL_PLUGINS.md](docs/IMPLEMENTATION_EXTERNAL_PLUGINS.md)** - Piano implementazione (reference)

### Reference

- **[EXTERNAL_PLUGINS_COMPLETE.md](docs/EXTERNAL_PLUGINS_COMPLETE.md)** - Riepilogo completo dell'implementazione platform
- **[PLUGIN_SYSTEM.md](docs/PLUGIN_SYSTEM.md)** - Plugin built-in (reference)

---

## 🚀 Quick Start

### Installazione

```bash
npm install @relazio/plugin-sdk
```

### Esempio Minimo

```typescript
import { RelazioPlugin } from '@relazio/plugin-sdk';

const plugin = new RelazioPlugin({
  id: 'my-plugin',
  name: 'My Plugin',
  version: '1.0.0',
  author: 'Your Name',
  description: 'What it does',
  category: 'network'
});

// Registra transform
plugin.transform({
  id: 'my-transform',
  name: 'My Transform',
  description: 'Transforms data',
  inputType: 'domain',
  outputTypes: ['ip'],
  
  handler: async (input, config) => {
    // input.organizationId contiene l'ID dell'organizzazione
    console.log(`Processing for org: ${input.organizationId}`);
    
    return {
      entities: [
        {
          type: 'ip',
          value: '8.8.8.8',
          label: 'Google DNS'
        }
      ],
      edges: []
    };
  }
});

// Avvia server multi-tenant
plugin.start({ 
  port: 3000,
  multiTenant: true  // ← Gestisce automaticamente tutto!
});
```

**🎉 Il plugin gestisce automaticamente:**
- ✅ Endpoint `/register` per nuove organizzazioni
- ✅ Generazione automatica webhook secrets
- ✅ Gestione separata per ogni organization
- ✅ Zero configurazione manuale necessaria!

### Esempi Completi

Vedi la cartella `examples/` per esempi funzionanti:
- **Email Parser** - Transform sincrona semplice
- **DNS Toolkit** - Multiple transforms sincrone
- **Multi-Tenant Plugin** - Transform asincrona con multi-organization

---

## 🎯 Roadmap

### Phase 1: Documentation ✅ (Completata - Dicembre 2025)
- [x] Architecture design
- [x] SDK API design
- [x] Flow documentation
- [x] Security requirements
- [x] Platform implementation

### Phase 2: TypeScript SDK ✅ (Completata - Dicembre 2025)
- [x] Core SDK implementation
- [x] Manifest generator
- [x] HMAC signing utilities
- [x] Webhook handler
- [x] Job progress tracking
- [x] Testing utilities
- [x] Esempi funzionanti
- [ ] NPM package publication (Q1 2026)
- [ ] CLI tool (Q1 2026)

### Phase 3: Python SDK (Q1 2026)
- [ ] Core SDK implementation
- [ ] Manifest generator
- [ ] HMAC signing utilities
- [ ] Webhook handler (Flask/FastAPI)
- [ ] Job progress tracking
- [ ] Testing utilities
- [ ] CLI tool
- [ ] PyPI package publication

### Phase 4: Developer Experience (Q2 2026)
- [ ] Developer portal
- [ ] Plugin examples repository
- [ ] Video tutorials
- [ ] Plugin templates (starter kits)
- [ ] Testing playground
- [ ] Plugin marketplace submission

---

## 🔐 Security Requirements

### Mandatory (Enforced by Platform)

- ✅ **HTTPS**: All endpoints must use HTTPS (HTTP rejected)
- ✅ **TLS Valid**: Valid SSL certificate required
- ✅ **HMAC Signature**: All webhooks must be signed with HMAC-SHA256
- ✅ **Rate Limiting**: 30 req/min, 500 req/hour, 2000 req/day
- ✅ **Timeouts**: 30s sync, 5s async response, 30 min job max

### SDK Handles

- HMAC signature generation
- Webhook endpoint setup
- Job progress tracking
- Error handling
- Timeout awareness

---

## 📦 Package Structure (Future)

```
@relazio/plugin-sdk/
├── src/
│   ├── core/
│   │   ├── plugin.ts          # Main Plugin class
│   │   ├── manifest.ts        # Manifest generator
│   │   └── types.ts           # TypeScript types
│   ├── server/
│   │   ├── express.ts         # Express integration
│   │   └── fastify.ts         # Fastify integration
│   ├── security/
│   │   └── hmac.ts            # HMAC utilities
│   ├── jobs/
│   │   └── progress.ts        # Job progress tracking
│   └── testing/
│       └── mock-platform.ts   # Mock platform for tests
├── examples/
│   ├── dns-plugin/
│   ├── ip-lookup/
│   └── shodan-integration/
└── docs/
    └── (all documentation files)
```

---

## 🤝 Contributing

Il progetto è attualmente in fase di sviluppo. I contributi saranno benvenuti a partire da Q1 2026.

---

## 📄 License

MIT License - see LICENSE file for details.

---

## 🔗 Links

- **Platform Repository**: [github.com/relazio/relazio](https://github.com/relazio/relazio)
- **Documentation**: [docs/](docs/)
- **Website**: Coming soon
- **Discord**: Coming soon

---

**Status**: 📋 Documentation Complete, Implementation Q1 2026  
**Platform**: ✅ Production Ready (Dicembre 2025)  
**SDK**: 🚧 In Development (Q1 2026)


