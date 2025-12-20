# 📚 Documentazione Relazio Plugin SDK

Indice completo della documentazione.

## 🚀 Quick Start

**Per iniziare subito:**
- **[QUICKSTART.md](../QUICKSTART.md)** - Guida rapida per creare il primo plugin

## 📖 Guide Principali

### Per Sviluppatori Plugin

| Guida | Descrizione | Livello |
|-------|-------------|---------|
| **[SDK.md](SDK.md)** | API reference completa dell'SDK | ⭐ Essenziale |
| **[CONFIGURATION.md](CONFIGURATION.md)** | Sistema di configurazione (string, number, boolean, select) | 🆕 Importante |
| **[MULTI_TENANT.md](MULTI_TENANT.md)** | Gestire multiple organizations | 🆕 Per deploy pubblici |

### Per Comprendere il Sistema

| Documento | Descrizione |
|-----------|-------------|
| **[EXTERNAL_PLUGINS.md](EXTERNAL_PLUGINS.md)** | Architettura completa sistema plugin |
| **[EXTERNAL_PLUGINS_FLOW.md](EXTERNAL_PLUGINS_FLOW.md)** | Flussi dettagliati step-by-step |
| **[EXTERNAL_PLUGINS_README.md](EXTERNAL_PLUGINS_README.md)** | Guida utente per installare plugin |

### Reference

| Documento | Descrizione |
|-----------|-------------|
| **[EXTERNAL_PLUGINS_COMPLETE.md](EXTERNAL_PLUGINS_COMPLETE.md)** | Riepilogo implementazione piattaforma |
| **[PLUGIN_SYSTEM.md](PLUGIN_SYSTEM.md)** | Sistema plugin built-in (reference) |
| **[IMPLEMENTATION_EXTERNAL_PLUGINS.md](IMPLEMENTATION_EXTERNAL_PLUGINS.md)** | Piano implementazione |

---

## 📋 Guida per Argomento

### Creare un Plugin

1. **[QUICKSTART.md](../QUICKSTART.md)** - Setup iniziale
2. **[SDK.md](SDK.md)** - API e metodi disponibili
3. **[Esempi](../examples/)** - Plugin funzionanti

### Configurazione

1. **[CONFIGURATION.md](CONFIGURATION.md)** - Tutti i tipi di campo
2. **[SDK.md#configure](SDK.md#pluginconfigureschema)** - API reference

### Multi-Tenancy

1. **[MULTI_TENANT.md](MULTI_TENANT.md)** - Guida completa
2. **[Esempio Multi-Tenant](../examples/multi-tenant-plugin/)** - Codice funzionante

### Transform Asincrone

1. **[SDK.md#async-transform](SDK.md#pluginasynctransformconfig)** - API
2. **[Esempio Async](../examples/async-subdomain-scanner/)** - Codice funzionante
3. **[EXTERNAL_PLUGINS_FLOW.md](EXTERNAL_PLUGINS_FLOW.md)** - Flusso webhook

### Deploy

1. **[SDK.md#deployment](SDK.md#deployment)** - Checklist produzione
2. **[MULTI_TENANT.md#deploy](MULTI_TENANT.md#deployment-vercel-multi-tenant)** - Deploy Vercel

---

## 🎯 Percorsi Consigliati

### Principiante

1. Leggi [QUICKSTART.md](../QUICKSTART.md)
2. Prova esempio [email-parser](../examples/email-parser/)
3. Leggi [CONFIGURATION.md](CONFIGURATION.md)
4. Crea il tuo primo plugin

### Intermedio

1. Studia [SDK.md](SDK.md) completo
2. Prova esempio [dns-toolkit](../examples/dns-toolkit/)
3. Impara async con [async-subdomain-scanner](../examples/async-subdomain-scanner/)
4. Leggi [EXTERNAL_PLUGINS_FLOW.md](EXTERNAL_PLUGINS_FLOW.md)

### Avanzato

1. Leggi [MULTI_TENANT.md](MULTI_TENANT.md)
2. Implementa custom SecretProvider
3. Studia [EXTERNAL_PLUGINS.md](EXTERNAL_PLUGINS.md)
4. Deploy plugin pubblico su Vercel

---

## 🆕 Novità

### Dicembre 2025

- ✅ **SDK TypeScript completo** implementato
- ✅ **Multi-tenancy nativo** con SecretProvider
- ✅ **4 tipi di configurazione** (string, number, boolean, select)
- ✅ **4 esempi funzionanti** (sync, multi-transform, async, multi-tenant)
- ✅ **Documentazione completa** in italiano
- ✅ **12 test** passati
- ✅ **Build TypeScript** funzionante

---

## 🔗 Link Utili

- **Repository**: [github.com/relazio/plugin-sdk](https://github.com/relazio/plugin-sdk)
- **Esempi**: [examples/](../examples/)
- **Issues**: [github.com/relazio/plugin-sdk/issues](https://github.com/relazio/plugin-sdk/issues)

---

## 📞 Supporto

- **GitHub Discussions**: Per domande generali
- **GitHub Issues**: Per bug e feature request
- **Email**: [Contatta il team](mailto:support@relazio.com)

---

**Ultima modifica**: Dicembre 2025


