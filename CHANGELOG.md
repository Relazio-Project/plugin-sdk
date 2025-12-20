# Changelog

Tutte le modifiche significative al progetto saranno documentate in questo file.

Il formato è basato su [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
e questo progetto aderisce al [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Implementazione iniziale SDK TypeScript
- Classe `RelazioPlugin` per creare plugin
- Sistema di transform sincrone e asincrone
- Generatore manifest JSON
- HMAC signature utilities per webhook security
- Server Express integration con routing automatico
- Job progress tracking per async transforms
- **Sistema Multi-Tenant** (approccio standard)
  - `InstallationRegistry` per gestione organizzazioni
  - Endpoint `/register` automatico
  - Endpoint `/unregister` automatico
  - Endpoint `/stats` per statistiche
  - Storage interface (`InstallationStorage`) estendibile
  - `MemoryStorage` per development/testing
  - Supporto Redis/PostgreSQL/Database custom
  - Gestione automatica webhook secrets per organization
- Esempi funzionanti:
  - Email Parser (sync)
  - DNS Toolkit (multi-transform sync)
  - Multi-Tenant Plugin (async + multi-org)
- Documentazione completa in `docs/`:
  - `MULTI_TENANT.md` - Guida completa multi-tenancy
  - `CONFIGURATION.md` - Configurazione plugin
  - `QUICKSTART.md` - Quick start
  - `SDK.md` - API reference
  - `EXTERNAL_PLUGINS_FLOW.md` - Flow dettagliati
- Health check endpoint automatico
- Manifest endpoint automatico
- TypeScript types completi

## [0.1.0] - 2025-12-20

### Added
- Initial release (documentation phase)
- Project structure
- Package configuration
- TypeScript setup

