import express, { Express, Request, Response, NextFunction } from 'express';
import type { Server as HttpServer } from 'http';
import type { Server as HttpsServer } from 'https';
import https from 'https';
import http from 'http';
import { timingSafeEqual } from 'crypto';
import fs from 'fs';
import type { ParanodPlugin } from '../core/plugin';
import type { StartOptions, TransformRequest, TransformResponse } from '../core/types';

/**
 * Server Express per il plugin
 */
export class ExpressServer {
  private app: Express;
  private server?: HttpServer | HttpsServer;
  private plugin: ParanodPlugin;
  private options: StartOptions;

  constructor(plugin: ParanodPlugin, options: StartOptions) {
    this.plugin = plugin;
    this.options = options;
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
  }

  /**
   * Setup middleware
   */
  private setupMiddleware(): void {
    this.app.disable('x-powered-by');
    // Body parser
    this.app.use(express.json({ limit: '1mb' }));
    
    // CORS
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Content-Type, X-Workspace-Id, Authorization');
      
      if (req.method === 'OPTIONS') {
        res.sendStatus(200);
      } else {
        next();
      }
    });

    // Request logging
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
      next();
    });

    // Error handling
    this.app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
      console.error('Error:', err);
      res.status(500).json({
        error: 'Internal server error',
        message: err.message,
      });
    });
  }

  /**
   * Setup routes
   */
  private matchesSecret(provided: unknown, expected: string | null | undefined): boolean {
    if (typeof provided !== 'string' || !expected || expected.length < 32) return false;
    const a = Buffer.from(provided);
    const b = Buffer.from(expected);
    return a.length === b.length && timingSafeEqual(a, b);
  }

  private authorizeBootstrap(req: Request, res: Response): boolean {
    const provided = req.headers.authorization?.replace(/^Bearer /, '') || req.query.token;
    if (this.matchesSecret(provided, this.options.registrationToken || process.env.ADDON_REGISTRATION_TOKEN)) return true;
    res.status(401).json({ error: 'Valid registration token required' });
    return false;
  }

  private async authorizeWorkspace(req: Request, res: Response): Promise<boolean> {
    if (!this.plugin.isMultiTenant()) return this.authorizeBootstrap(req, res);
    const workspaceId = req.headers['x-workspace-id'];
    const secret = typeof workspaceId === 'string'
      ? await this.plugin.getRegistry()?.getWebhookSecret(workspaceId) : null;
    const authorization = req.headers.authorization;
    if (authorization?.startsWith('Bearer ') && this.matchesSecret(authorization.slice(7), secret)) return true;
    res.status(401).json({ error: 'Valid workspace credentials required' });
    return false;
  }

  private setupRoutes(): void {
    // Health check
    this.app.get('/health', (req: Request, res: Response) => {
      const config = this.plugin.getConfig();
      res.json({
        status: 'ok',
        plugin: config.id,
        version: config.version,
        uptime: process.uptime(),
        transforms: {
          sync: this.plugin.getTransforms().length,
          async: this.plugin.getAsyncTransforms().length,
        },
      });
    });

    // Registration endpoint (multi-tenant)
    if (this.options.multiTenant) {
      this.app.post('/register', async (req: Request, res: Response) => {
        if (!this.authorizeBootstrap(req, res)) return;
        try {
          const registry = this.plugin.getRegistry();
          if (!registry) {
            res.status(501).json({ error: 'Multi-tenant not enabled' });
            return;
          }

          const result = await registry.register(req.body);
          res.json(result);
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          console.error('Registration error:', error);
          res.status(500).json({ error: 'Registration failed', message });
        }
      });

      // Unregister endpoint
      this.app.post('/unregister', async (req: Request, res: Response) => {
        try {
          if (!(await this.authorizeWorkspace(req, res))) return;
          const registry = this.plugin.getRegistry();
          if (!registry) {
            res.status(501).json({ error: 'Multi-tenant not enabled' });
            return;
          }

          const { workspaceId } = req.body;
          if (!workspaceId || workspaceId !== req.headers['x-workspace-id']) {
            res.status(400).json({ error: 'Workspace mismatch' });
            return;
          }

          const success = await registry.unregister(workspaceId);
          res.json({ success, message: success ? 'Unregistered successfully' : 'Workspace not found' });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          console.error('Unregister error:', error);
          res.status(500).json({ error: 'Unregister failed', message });
        }
      });

      // Stats endpoint (admin)
      this.app.get('/stats', async (req: Request, res: Response) => {
        if (!this.authorizeBootstrap(req, res)) return;
        try {
          const registry = this.plugin.getRegistry();
          if (!registry) {
            res.status(501).json({ error: 'Multi-tenant not enabled' });
            return;
          }

          const stats = await registry.getStats();
          res.json(stats);
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          res.status(500).json({ error: message });
        }
      });
    }

    // Manifest endpoint
    this.app.get('/manifest.json', (req: Request, res: Response) => {
      try {
        const endpoint = this.getBaseUrl();
        const manifest = this.plugin.generateManifest({ endpoint });
        res.json(manifest);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        res.status(500).json({ error: message });
      }
    });

    // Transform endpoints
    const allTransforms = this.plugin.getAllTransforms();
    for (const transform of allTransforms) {
      this.app.post(`/${transform.id}`, async (req: Request, res: Response) => {
        try {
          await this.handleTransform(transform.id, req, res);
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          console.error(`Transform ${transform.id} error:`, error);
          res.status(500).json({
            error: 'Transform execution failed',
            message,
          });
        }
      });
    }

    // 404 handler
    this.app.use((req: Request, res: Response) => {
      res.status(404).json({
        error: 'Not found',
        path: req.path,
      });
    });
  }

  /**
   * Handler per transform
   */
  private async handleTransform(
    transformId: string,
    req: Request,
    res: Response
  ): Promise<void> {
    if (!(await this.authorizeWorkspace(req, res))) return;
    const body = req.body as TransformRequest;

    if (!body.input) {
      res.status(400).json({ error: 'Missing input' });
      return;
    }

    // Estrai workspace ID dall'header (per multi-tenancy)
    const workspaceId = req.headers['x-workspace-id'] as string | undefined;
    
    // Se il plugin è multi-tenant, workspaceId è obbligatorio
    if (this.plugin.isMultiTenant() && !workspaceId) {
      res.status(400).json({ error: 'Missing X-Workspace-Id header for multi-tenant plugin' });
      return;
    }

    // Aggiungi workspaceId all'input
    if (workspaceId) {
      body.input.workspaceId = workspaceId;
    }

    const isAsync = this.plugin.isAsyncTransform(transformId);

    if (isAsync) {
      // Transform asincrona
      if (!body.callbackUrl) {
        res.status(400).json({ error: 'Missing callbackUrl for async transform' });
        return;
      }

      const installation = workspaceId ? await this.plugin.getRegistry()?.getInstallation(workspaceId) : null;
      const platformUrl = installation?.platformUrl || process.env.ADDON_PLATFORM_URL;
      try {
        if (!platformUrl) throw new Error('Missing trusted platform URL');
        const platform = new URL(platformUrl);
        const callback = new URL(body.callbackUrl);
        const prefix = platform.pathname.replace(/\/$/, '') + '/api/webhooks/transforms/';
        if (callback.origin !== platform.origin || callback.username || callback.password || callback.search || callback.hash ||
            !callback.pathname.startsWith(prefix) || !/^[a-zA-Z0-9_-]+$/.test(callback.pathname.slice(prefix.length))) {
          throw new Error('Untrusted callback URL');
        }
      } catch {
        res.status(400).json({ error: 'Callback must target the registered platform webhook' });
        return;
      }

      const result = await this.plugin.executeAsyncTransform(
        transformId,
        body.input,
        body.callbackUrl,
        workspaceId
      );

      const response: TransformResponse = {
        async: true,
        jobId: result.jobId,
        estimatedTime: result.estimatedTime,
        message: 'Job queued for processing',
      };

      res.json(response);
    } else {
      // Transform sincrona
      const result = await this.plugin.executeTransform(transformId, body.input);

      const response: TransformResponse = {
        async: false,
        result,
      };

      res.json(response);
    }
  }

  /**
   * Ottieni base URL del server
   */
  private getBaseUrl(): string {
    if (this.options.publicUrl || process.env.ADDON_PUBLIC_URL) {
      return (this.options.publicUrl || process.env.ADDON_PUBLIC_URL)!.replace(/\/$/, '');
    }
    const protocol = this.options.https ? 'https' : 'http';
    const host = this.options.host || 'localhost';
    const port = this.options.port;
    return `${protocol}://${host}:${port}`;
  }

  /**
   * Avvia il server
   */
  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        if (this.options.https) {
          // HTTPS server
          const httpsOptions = {
            key: fs.readFileSync(this.options.https.key),
            cert: fs.readFileSync(this.options.https.cert),
          };
          this.server = https.createServer(httpsOptions, this.app);
        } else {
          // HTTP server
          this.server = http.createServer(this.app);
        }

        this.server.listen(this.options.port, this.options.host || '0.0.0.0', () => {
          console.log(`🚀 Server listening on ${this.getBaseUrl()}`);
          resolve();
        });

        this.server.on('error', (error) => {
          console.error('Server error:', error);
          reject(error);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Ferma il server
   */
  async stop(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.server) {
        resolve();
        return;
      }

      this.server.close((err) => {
        if (err) {
          reject(err);
        } else {
          console.log('✅ Server stopped');
          resolve();
        }
      });
    });
  }

  /**
   * Ottieni Express app (per customizzazione)
   */
  getApp(): Express {
    return this.app;
  }
}

export type Server = ExpressServer;
