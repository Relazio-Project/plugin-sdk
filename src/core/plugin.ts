import type {
  PluginConfig,
  ConfigSchema,
  TransformConfig,
  AsyncTransformConfig,
  StartOptions,
  ManifestOptions,
  PluginManifest,
  TransformInput,
  TransformResult,
} from './types';
import { ManifestGenerator } from './manifest';
import { JobQueue, type WebhookSecretProvider, InMemorySecretProvider } from '../jobs/progress';
import type { Server } from '../server/express';

/**
 * Classe principale per creare plugin Relazio
 */
export class RelazioPlugin {
  private config: PluginConfig;
  private manifestGenerator: ManifestGenerator;
  private transforms = new Map<string, TransformConfig>();
  private asyncTransforms = new Map<string, AsyncTransformConfig>();
  private configSchema?: ConfigSchema;
  private jobQueue?: JobQueue;
  private server?: Server;
  private webhookSecret?: string;
  private multiTenant = false;
  private secretProvider?: WebhookSecretProvider;

  constructor(config: PluginConfig) {
    this.config = config;
    this.manifestGenerator = new ManifestGenerator(config);
  }

  /**
   * Definisci schema di configurazione
   */
  configure(schema: ConfigSchema): void {
    this.configSchema = schema;
    this.manifestGenerator.setConfigSchema(schema);
  }

  /**
   * Registra una transform sincrona
   */
  transform(config: TransformConfig): void {
    if (this.transforms.has(config.id) || this.asyncTransforms.has(config.id)) {
      throw new Error(`Transform ${config.id} already registered`);
    }

    this.transforms.set(config.id, config);
    this.manifestGenerator.addTransform(config);
  }

  /**
   * Registra una transform asincrona
   */
  asyncTransform(config: AsyncTransformConfig): void {
    if (this.transforms.has(config.id) || this.asyncTransforms.has(config.id)) {
      throw new Error(`Transform ${config.id} already registered`);
    }

    this.asyncTransforms.set(config.id, config);
    this.manifestGenerator.addTransform(config);

    // Inizializza job queue se non esiste
    if (!this.jobQueue) {
      if (this.multiTenant && this.secretProvider) {
        this.jobQueue = new JobQueue(this.secretProvider);
      } else if (this.webhookSecret) {
        this.jobQueue = new JobQueue(this.webhookSecret);
      }
    }
  }

  /**
   * Imposta webhook secret (single-tenant mode)
   */
  setWebhookSecret(secret: string): void {
    if (this.multiTenant) {
      throw new Error('Cannot set single webhook secret in multi-tenant mode');
    }
    
    this.webhookSecret = secret;
    
    if (this.asyncTransforms.size > 0 && !this.jobQueue) {
      this.jobQueue = new JobQueue(secret);
    }
  }

  /**
   * Abilita multi-tenancy con secret provider
   */
  enableMultiTenant(secretProvider: WebhookSecretProvider): void {
    this.multiTenant = true;
    this.secretProvider = secretProvider;
    
    if (this.asyncTransforms.size > 0 && !this.jobQueue) {
      this.jobQueue = new JobQueue(secretProvider);
    }
  }

  /**
   * Abilita multi-tenancy con gestione automatica in-memory
   * Utile per development/testing
   */
  enableMultiTenantInMemory(): InMemorySecretProvider {
    const provider = new InMemorySecretProvider();
    this.enableMultiTenant(provider);
    return provider;
  }

  /**
   * Genera manifest JSON
   */
  generateManifest(options: ManifestOptions): PluginManifest {
    return this.manifestGenerator.generate(options);
  }

  /**
   * Esegui una transform (usato internamente)
   */
  async executeTransform(
    transformId: string,
    input: TransformInput
  ): Promise<TransformResult> {
    const transform = this.transforms.get(transformId);
    
    if (!transform) {
      throw new Error(`Transform ${transformId} not found`);
    }

    return await transform.handler(input, input.config || {});
  }

  /**
   * Esegui una transform asincrona (usato internamente)
   */
  async executeAsyncTransform(
    transformId: string,
    input: TransformInput,
    callbackUrl: string,
    organizationId?: string
  ): Promise<{ jobId: string; estimatedTime?: number }> {
    const transform = this.asyncTransforms.get(transformId);
    
    if (!transform) {
      throw new Error(`Async transform ${transformId} not found`);
    }

    if (!this.jobQueue) {
      throw new Error('Job queue not configured for async transforms');
    }

    // Genera job ID
    const jobId = `${this.config.id}-${transformId}-${Date.now()}`;
    
    // Crea job con supporto multi-tenant
    let job;
    if (this.multiTenant && organizationId) {
      job = await this.jobQueue.createJobForOrganization(jobId, callbackUrl, organizationId);
    } else {
      job = this.jobQueue.createJob(jobId, callbackUrl);
    }

    // Esegui transform in background
    setImmediate(async () => {
      try {
        const result = await transform.handler(input, input.config || {}, job);
        await job.complete(result);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        await job.fail(errorMessage);
      } finally {
        this.jobQueue?.removeJob(jobId);
      }
    });

    return { jobId };
  }

  /**
   * Avvia il server plugin
   */
  async start(options: StartOptions): Promise<void> {
    // Se multiTenant option è specificata, abilita multi-tenancy automaticamente
    if (options.multiTenant && !this.multiTenant) {
      this.enableMultiTenantInMemory();
      console.log('⚠️  Multi-tenant mode enabled with in-memory provider');
      console.log('    For production, use enableMultiTenant() with a persistent provider');
    }

    // Import dinamico per evitare dipendenze circolari
    const { ExpressServer } = await import('../server/express');
    
    this.server = new ExpressServer(this, options);
    await this.server.start();

    console.log(`✅ Plugin "${this.config.name}" running on port ${options.port}`);
    console.log(`   - Mode: ${this.multiTenant ? 'Multi-tenant' : 'Single-tenant'}`);
    console.log(`   - Transforms: ${this.transforms.size + this.asyncTransforms.size}`);
    console.log(`   - Sync: ${this.transforms.size}`);
    console.log(`   - Async: ${this.asyncTransforms.size}`);
  }

  /**
   * Ferma il server
   */
  async stop(): Promise<void> {
    if (this.server) {
      await this.server.stop();
    }
  }

  /**
   * Ottieni configurazione plugin
   */
  getConfig(): PluginConfig {
    return this.config;
  }

  /**
   * Ottieni lista transforms
   */
  getTransforms(): string[] {
    return Array.from(this.transforms.keys());
  }

  /**
   * Ottieni lista async transforms
   */
  getAsyncTransforms(): string[] {
    return Array.from(this.asyncTransforms.keys());
  }

  /**
   * Ottieni tutte le transforms
   */
  getAllTransforms(): Array<TransformConfig | AsyncTransformConfig> {
    return [
      ...Array.from(this.transforms.values()),
      ...Array.from(this.asyncTransforms.values()),
    ];
  }

  /**
   * Verifica se una transform esiste
   */
  hasTransform(transformId: string): boolean {
    return this.transforms.has(transformId) || this.asyncTransforms.has(transformId);
  }

  /**
   * Verifica se una transform è asincrona
   */
  isAsyncTransform(transformId: string): boolean {
    return this.asyncTransforms.has(transformId);
  }

  /**
   * Ottieni job queue (per monitoring)
   */
  getJobQueue(): JobQueue | undefined {
    return this.jobQueue;
  }

  /**
   * Verifica se è in modalità multi-tenant
   */
  isMultiTenant(): boolean {
    return this.multiTenant;
  }

  /**
   * Ottieni secret provider (solo multi-tenant)
   */
  getSecretProvider(): WebhookSecretProvider | undefined {
    return this.secretProvider;
  }
}

// Export alias per backwards compatibility
export { RelazioPlugin as OSINTPlugin };
