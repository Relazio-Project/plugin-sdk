/**
 * Relazio Plugin SDK
 * SDK ufficiale per creare plugin esterni per Relazio
 */

// Core exports
export { RelazioPlugin, OSINTPlugin } from './core/plugin';
export { ManifestGenerator } from './core/manifest';

// Types
export type {
  EntityType,
  PluginCategory,
  JobStatus,
  OSINTEntity,
  OSINTEdge,
  TransformInput,
  TransformResult,
  PluginConfig,
  ConfigField,
  ConfigSchema,
  TransformConfig,
  AsyncTransformConfig,
  TransformHandler,
  AsyncTransformHandler,
  JobContext,
  StartOptions,
  ManifestOptions,
  PluginManifest,
  WebhookPayload,
  TransformRequest,
  SyncTransformResponse,
  AsyncTransformResponse,
  TransformResponse,
} from './core/types';

// Security
export { HMACUtils, verifyWebhookSignature } from './security/hmac';

// Jobs
export { JobProgressTracker, JobQueue, InMemorySecretProvider } from './jobs/progress';
export type { WebhookSecretProvider } from './jobs/progress';

// Server
export { ExpressServer } from './server/express';
export type { Server } from './server/express';

