/**
 * Tipi core per Relazio Plugin SDK
 */

export type EntityType =
  | 'domain'
  | 'ip'
  | 'email'
  | 'phone'
  | 'person'
  | 'organization'
  | 'location'
  | 'note'
  | 'url'
  | 'hash'
  | 'custom';

export type PluginCategory =
  | 'network'
  | 'identity'
  | 'social'
  | 'financial'
  | 'security'
  | 'other';

export type JobStatus =
  | 'pending'
  | 'submitted'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'timeout'
  | 'cancelled';

/**
 * Entità OSINT
 */
export interface OSINTEntity {
  type: EntityType;
  value: string;
  label?: string;
  metadata?: Record<string, any>;
}

/**
 * Arco/connessione tra entità
 */
export interface OSINTEdge {
  sourceId: string;
  targetId: string | 'auto'; // 'auto' per generazione automatica ID
  label: string;
  relationship: string;
  metadata?: Record<string, any>;
}

/**
 * Input per una transform
 */
export interface TransformInput {
  entity: OSINTEntity & { id: string };
  config?: Record<string, any>;
  organizationId?: string; // ID organization per multi-tenancy
}

/**
 * Risultato di una transform
 */
export interface TransformResult {
  success?: boolean;
  entities: OSINTEntity[];
  edges: OSINTEdge[];
  metadata?: Record<string, any>;
  message?: string;
}

/**
 * Configurazione del plugin
 */
export interface PluginConfig {
  id: string;
  name: string;
  version: string;
  author: string;
  description: string;
  category: PluginCategory;
  icon?: string;
  logoUrl?: string;
  homepage?: string;
  documentation?: string;
  license?: string;
}

/**
 * Schema di configurazione utente
 */
export interface ConfigField {
  type: 'string' | 'number' | 'boolean' | 'select';
  label: string;
  description?: string;
  required?: boolean;
  secret?: boolean;
  default?: any;
  min?: number;
  max?: number;
  options?: Array<{ label: string; value: string }>;
}

export interface ConfigSchema {
  [key: string]: ConfigField;
}

/**
 * Configurazione di una transform
 */
export interface TransformConfig {
  id: string;
  name: string;
  description: string;
  inputType: EntityType;
  outputTypes: EntityType[];
  handler: TransformHandler;
}

/**
 * Configurazione di una transform asincrona
 */
export interface AsyncTransformConfig {
  id: string;
  name: string;
  description: string;
  inputType: EntityType;
  outputTypes: EntityType[];
  handler: AsyncTransformHandler;
}

/**
 * Handler per transform sincrona
 */
export type TransformHandler = (
  input: TransformInput,
  config: Record<string, any>
) => Promise<TransformResult>;

/**
 * Handler per transform asincrona
 */
export type AsyncTransformHandler = (
  input: TransformInput,
  config: Record<string, any>,
  job: JobContext
) => Promise<TransformResult>;

/**
 * Contesto del job per transform asincrone
 */
export interface JobContext {
  jobId: string;
  updateProgress: (progress: number, message?: string) => Promise<void>;
  cancel: () => Promise<void>;
}

/**
 * Opzioni per avviare il server
 */
export interface StartOptions {
  port: number;
  host?: string;
  https?: {
    key: string;
    cert: string;
  };
  multiTenant?: boolean; // ⭐ Nuova opzione
}

/**
 * Opzioni per generare il manifest
 */
export interface ManifestOptions {
  endpoint: string;
  tags?: string[];
  minimumPlatformVersion?: string;
}

/**
 * Manifest JSON completo
 */
export interface PluginManifest {
  manifestVersion: string;
  plugin: {
    id: string;
    name: string;
    description: string;
    version: string;
    author: string;
    authorUrl?: string;
    homepage?: string;
    documentation?: string;
    license?: string;
    icon?: string;
    logoUrl?: string;
    category: PluginCategory;
    capabilities: {
      inputTypes: EntityType[];
      outputTypes: EntityType[];
      estimatedTime: string;
      supportsAsync: boolean;
    };
    configuration?: {
      required: boolean;
      schema: ConfigSchema;
    };
    transforms: Array<{
      id: string;
      name: string;
      description: string;
      inputType: EntityType;
      outputTypes: EntityType[];
      endpoint: string;
      method: string;
      async: boolean;
    }>;
    metadata: {
      tags: string[];
      minimumPlatformVersion: string;
    };
  };
}

/**
 * Webhook payload dal plugin alla piattaforma
 */
export interface WebhookPayload {
  jobId: string;
  status: 'processing' | 'completed' | 'failed';
  progress?: number;
  progressMessage?: string;
  result?: TransformResult;
  error?: string;
  timestamp: string;
}

/**
 * Request body per transform
 */
export interface TransformRequest {
  transformId: string;
  input: TransformInput;
  callbackUrl: string;
  organizationId?: string; // ⭐ ID organization
}

/**
 * Response per transform sincrona
 */
export interface SyncTransformResponse {
  async: false;
  result: TransformResult;
}

/**
 * Response per transform asincrona
 */
export interface AsyncTransformResponse {
  async: true;
  jobId: string;
  estimatedTime?: number;
  message?: string;
}

export type TransformResponse = SyncTransformResponse | AsyncTransformResponse;
