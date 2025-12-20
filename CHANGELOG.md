# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.1] - 2025-12-20

### Changed
- Simplified documentation (README and examples)
- Translated all documentation to English
- Removed verbose documentation files
- Made documentation more formal and concise

### Fixed
- HTTP localhost support for development (manifest generator)

## [0.1.0] - 2025-12-20

### Added
- Initial public release
- Multi-tenant support with automatic organization management
- Synchronous and asynchronous transform handlers
- Built-in Express server with CORS and error handling
- Automatic `/register`, `/unregister`, `/manifest.json` endpoints
- HMAC-SHA256 signature utilities for webhook security
- Job progress tracking for async operations
- InstallationRegistry for organization management
- In-memory storage (development) and custom storage support (production)
- TypeScript support with full type definitions
- Four working examples (email-parser, dns-toolkit, async-subdomain-scanner, multi-tenant-plugin)

### Security
- HMAC-SHA256 webhook signatures
- Organization isolation
- Unique webhook secrets per organization
- TLS certificate validation
