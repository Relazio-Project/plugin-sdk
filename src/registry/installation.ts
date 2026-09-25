import crypto from 'crypto';
import type { WebhookSecretProvider } from '../jobs/progress';

/**
 * Installazione di un'organizzazione
 */
export interface Installation {
  workspaceId: string;
  workspaceName?: string;
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
  workspaceId: string;
  workspaceName?: string;
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
  get(workspaceId: string): Promise<Installation | null>;
  set(workspaceId: string, installation: Installation): Promise<void>;
  delete(workspaceId: string): Promise<boolean>;
  getAll(): Promise<Installation[]>;
}

/**
 * In-memory storage (default)
 * Per produzione usare Redis, Database, etc.
 */
export class MemoryStorage implements InstallationStorage {
  private storage = new Map<string, Installation>();

  async get(workspaceId: string): Promise<Installation | null> {
    return this.storage.get(workspaceId) || null;
  }

  async set(workspaceId: string, installation: Installation): Promise<void> {
    this.storage.set(workspaceId, installation);
  }

  async delete(workspaceId: string): Promise<boolean> {
    return this.storage.delete(workspaceId);
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
  async getSecret(workspaceId: string): Promise<string | null> {
    return this.getWebhookSecret(workspaceId);
  }

  async getInstallation(workspaceId: string): Promise<Installation | null> {
    return this.storage.get(workspaceId);
  }

  /**
   * Versione sincrona per backward compatibility
   */
  getSecretSync(workspaceId: string): string | null {
    // Per MemoryStorage possiamo fare una chiamata sincrona
    const installation = (this.storage as any).storage?.get(workspaceId);
    return installation?.webhookSecret || null;
  }

  /**
   * Registra una nuova installazione
   */
  async register(req: RegistrationRequest): Promise<RegistrationResponse> {
    const { workspaceId, workspaceName, platformUrl, platformVersion } = req;

    if (typeof workspaceId !== 'string' || !/^[a-zA-Z0-9_-]{1,200}$/.test(workspaceId)) {
      throw new Error('Invalid workspaceId');
    }
    const platform = new URL(platformUrl);
    const local = process.env.NODE_ENV !== 'production' && ['localhost', '127.0.0.1', '[::1]'].includes(platform.hostname);
    if (platform.username || platform.password || platform.search || platform.hash ||
        (platform.protocol !== 'https:' && !(local && platform.protocol === 'http:'))) {
      throw new Error('platformUrl must be an HTTPS URL without credentials, query or fragment');
    }

    console.log(`[REGISTRY] Registration request from workspace: ${workspaceId}`);

    // Verifica se già registrato
    const existing = await this.storage.get(workspaceId);
    if (existing) {
      console.log(`[REGISTRY] Workspace ${workspaceId} already registered`);
      return {
        webhookSecret: existing.webhookSecret,
        pluginId: this.pluginId,
        pluginVersion: this.pluginVersion,
        message: 'Workspace already registered',
      };
    }

    // Genera webhook secret univoco
    const webhookSecret = this.generateSecret();

    // Crea installazione
    const installation: Installation = {
      workspaceId,
      workspaceName,
      webhookSecret,
      platformUrl,
      platformVersion,
      installedAt: new Date(),
    };

    // Salva
    await this.storage.set(workspaceId, installation);

    console.log(`[REGISTRY] Successfully registered workspace ${workspaceId}`);

    return {
      webhookSecret,
      pluginId: this.pluginId,
      pluginVersion: this.pluginVersion,
      message: 'Workspace registered successfully',
    };
  }

  /**
   * Ottieni webhook secret per un'organizzazione
   */
  async getWebhookSecret(workspaceId: string): Promise<string | null> {
    const installation = await this.storage.get(workspaceId);
    return installation?.webhookSecret || null;
  }

  /**
   * Aggiorna timestamp ultimo uso
   */
  async updateLastUsed(workspaceId: string): Promise<void> {
    const installation = await this.storage.get(workspaceId);
    if (installation) {
      installation.lastUsed = new Date();
      await this.storage.set(workspaceId, installation);
    }
  }

  /**
   * Rimuovi un'installazione
   */
  async unregister(workspaceId: string): Promise<boolean> {
    const deleted = await this.storage.delete(workspaceId);
    if (deleted) {
      console.log(`[REGISTRY] Workspace ${workspaceId} unregistered`);
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
