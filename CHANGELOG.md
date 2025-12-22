# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2025-12-22

### Added
- **Universal Entity Builder**: Complete builder system for creating entities and edges
  - `createEntity()` - Universal, scalable function for creating any entity type (present or future)
  - `EntityBuilder` - Fluent builder for advanced entity construction
  - `createEdge()` - Edge creation function with validation
  - `EdgeBuilder` - Fluent builder for complex edges
- **Automatic ID Generation**: Deterministic ID generation system
  - `generateEntityId()` - MD5 hash-based deterministic entity IDs
  - `generateEdgeId()` - Deterministic edge IDs
  - `generateRandomId()` - Random IDs for temporary entities
  - `normalizeValue()` - Value normalization for ID consistency
- **ResultBuilder**: Fluent builder for transform results
  - `.addEntity()` - Add entity with automatic edge creation
  - `.addEntities()` - Add multiple entities of the same type
  - `.addEntityOnly()` - Add entity without edge
  - `.setMessage()` - Set success message
  - `.addMetadata()` - Add metadata to result
- **Helper Functions**: Utility functions for common cases
  - `emptyResult()` - Empty result with optional message
  - `errorResult()` - Error result
  - `singleEntityResult()` - Single entity result
  - `multiEntityResult()` - Multiple entity result
- **Validation Utilities**: Automatic format validation
  - `validateEntities()` - Validate entity array
  - `validateEdges()` - Validate edge array
  - `validateTransformResult()` - Validate complete result
- **Documentation**: Complete documentation and examples
  - Quick Start Guide
  - Builders Guide
  - Response Format Specification
  - New comprehensive example: `simple-sync-example`
  - Updated async example: `async-subdomain-scanner`

### Changed
- **BREAKING**: `OSINTEntity` now requires mandatory `id` field
- **BREAKING**: `OSINTEdge` now requires mandatory `id` field
- **BREAKING**: Removed support for `targetId: 'auto'` in edges
- **Scalability Improvement**: Removed type-specific helpers in favor of universal `createEntity()`
  - Advantage: No SDK updates needed for new entity types
  - Advantage: Supports custom entity types without code changes
  - Advantage: Consistent, predictable API
- Updated all entity types to align with Relazio external format
- Added new entity types: `username`, `credential`, `social`, `document`, `image`, `video`, `wallet`, `transaction`, `exchange`, `maps`
- `TransformInput.entity` is now of type `OSINTEntity` (includes ID)
- Updated examples to use scalable approach
- Reorganized documentation to `docs/` folder
- All documentation rewritten in formal English

### Removed
- Type-specific helper functions (`createIP`, `createDomain`, etc.) - replaced with universal `createEntity()`
- Migration guide (not needed for initial release)

### Fixed
- Automatic format validation for responses
- Guaranteed unique IDs for all entities and edges
- Consistent field naming (only `metadata`, not `properties`)

## [0.1.1] - 2025-12-20

### Changed
- Simplified documentation
- Translated documentation to English
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
- Working examples (email-parser, dns-toolkit, async-subdomain-scanner, multi-tenant-plugin)

### Security
- HMAC-SHA256 webhook signatures
- Organization isolation
- Unique webhook secrets per organization
- TLS certificate validation
