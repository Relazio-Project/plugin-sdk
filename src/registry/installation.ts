import crypto from 'crypto';
import type { WebhookSecretProvider } from '../jobs/progress';

/**
 * Installazione di un'organizzazione
 */
export interface Installation {
  organizationId: string;
  organizationName?: string;
  webhookSecret: string;
  platformUrl: string;
  platformVersion?: string;
  installedAt: Date;
  lastUsed?: Date;
}

/**
 * Request per registrare un'installazione
 */
export interface RegistrationRequest {
  organizationId: string;
  organizationName?: string;
  platformUrl: string;
  platformVersion?: string;
}

/**
 * Response della registrazione
 */
export interface RegistrationResponse {
  webhookSecret: string;
  pluginId: string;
  pluginVersion: string;
  message: string;
}

/**
 * Storage interface per le installazioni
 */
export interface InstallationStorage {
  get(organizationId: string): Promise<Installation | null>;
  set(organizationId: string, installation: Installation): Promise<void>;
  delete(organizationId: string): Promise<boolean>;
  getAll(): Promise<Installation[]>;
}

/**
 * In-memory storage (default)
 * Per produzione usare Redis, Database, etc.
 */
export class MemoryStorage implements InstallationStorage {
  private storage = new Map<string, Installation>();

  async get(organizationId: string): Promise<Installation | null> {
    return this.storage.get(organizationId) || null;
  }

  async set(organizationId: string, installation: Installation): Promise<void> {
    this.storage.set(organizationId, installation);
  }

  async delete(organizationId: string): Promise<boolean> {
    return this.storage.delete(organizationId);
  }

  async getAll(): Promise<Installation[]> {
    return Array.from(this.storage.values());
  }
}

/**
 * Registry per gestire installazioni multi-tenant
 */
export class InstallationRegistry implements WebhookSecretProvider {
  private storage: InstallationStorage;
  private pluginId: string;
  private pluginVersion: string;

  constructor(pluginId: string, pluginVersion: string, storage?: InstallationStorage) {
    this.pluginId = pluginId;
    this.pluginVersion = pluginVersion;
    this.storage = storage || new MemoryStorage();
  }

  /**
   * Implementazione WebhookSecretProvider
   * Richiesto dalla JobQueue per supporto multi-tenant
   */
  async getSecret(organizationId: string): Promise<string | null> {
    return this.getSecretSync(organizationId);
  }

  /**
   * Versione sincrona per backward compatibility
   */
  getSecretSync(organizationId: string): string | null {
    // Per MemoryStorage possiamo fare una chiamata sincrona
    const installation = (this.storage as any).storage?.get(organizationId);
    return installation?.webhookSecret || null;
  }

  /**
   * Registra una nuova installazione
   */
  async register(req: RegistrationRequest): Promise<RegistrationResponse> {
    const { organizationId, organizationName, platformUrl, platformVersion } = req;

    console.log(`[REGISTRY] Registration request from org: ${organizationId}`);

    // Verifica se già registrato
    const existing = await this.storage.get(organizationId);
    if (existing) {
      console.log(`[REGISTRY] Organization ${organizationId} already registered`);
      return {
        webhookSecret: existing.webhookSecret,
        pluginId: this.pluginId,
        pluginVersion: this.pluginVersion,
        message: 'Organization already registered',
      };
    }

    // Genera webhook secret univoco
    const webhookSecret = this.generateSecret();

    // Crea installazione
    const installation: Installation = {
      organizationId,
      organizationName,
      webhookSecret,
      platformUrl,
      platformVersion,
      installedAt: new Date(),
    };

    // Salva
    await this.storage.set(organizationId, installation);

    console.log(`[REGISTRY] Successfully registered org ${organizationId}`);

    return {
      webhookSecret,
      pluginId: this.pluginId,
      pluginVersion: this.pluginVersion,
      message: 'Organization registered successfully',
    };
  }

  /**
   * Ottieni webhook secret per un'organizzazione
   */
  async getWebhookSecret(organizationId: string): Promise<string | null> {
    const installation = await this.storage.get(organizationId);
    return installation?.webhookSecret || null;
  }

  /**
   * Aggiorna timestamp ultimo uso
   */
  async updateLastUsed(organizationId: string): Promise<void> {
    const installation = await this.storage.get(organizationId);
    if (installation) {
      installation.lastUsed = new Date();
      await this.storage.set(organizationId, installation);
    }
  }

  /**
   * Rimuovi un'installazione
   */
  async unregister(organizationId: string): Promise<boolean> {
    const deleted = await this.storage.delete(organizationId);
    if (deleted) {
      console.log(`[REGISTRY] Organization ${organizationId} unregistered`);
    }
    return deleted;
  }

  /**
   * Ottieni tutte le installazioni
   */
  async getAllInstallations(): Promise<Installation[]> {
    return this.storage.getAll();
  }

  /**
   * Ottieni statistiche
   */
  async getStats(): Promise<{
    totalInstallations: number;
    activeInstallations: number; // usati negli ultimi 30 giorni
  }> {
    const all = await this.storage.getAll();
    const now = Date.now();
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

    const active = all.filter((inst) => {
      const lastUsed = inst.lastUsed?.getTime() || inst.installedAt.getTime();
      return lastUsed > thirtyDaysAgo;
    });

    return {
      totalInstallations: all.length,
      activeInstallations: active.length,
    };
  }

  /**
   * Genera secret sicuro
   */
  private generateSecret(): string {
    return `whs_${crypto.randomBytes(32).toString('hex')}`;
  }
}

