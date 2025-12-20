import express, { Express, Request, Response, NextFunction } from 'express';
import type { Server as HttpServer } from 'http';
import type { Server as HttpsServer } from 'https';
import https from 'https';
import fs from 'fs';
import type { RelazioPlugin } from '../core/plugin';
import type { StartOptions, TransformRequest, TransformResponse } from '../core/types';

/**
 * Server Express per il plugin
 */
export class ExpressServer {
  private app: Express;
  private server?: HttpServer | HttpsServer;
  private plugin: RelazioPlugin;
  private options: StartOptions;

  constructor(plugin: RelazioPlugin, options: StartOptions) {
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
    // Body parser
    this.app.use(express.json({ limit: '10mb' }));
    
    // CORS
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Content-Type, X-Organization-Id');
      
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
          const registry = this.plugin.getRegistry();
          if (!registry) {
            res.status(501).json({ error: 'Multi-tenant not enabled' });
            return;
          }

          const { organizationId } = req.body;
          if (!organizationId) {
            res.status(400).json({ error: 'Missing organizationId' });
            return;
          }

          const success = await registry.unregister(organizationId);
          res.json({ success, message: success ? 'Unregistered successfully' : 'Organization not found' });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          console.error('Unregister error:', error);
          res.status(500).json({ error: 'Unregister failed', message });
        }
      });

      // Stats endpoint (admin)
      this.app.get('/stats', async (req: Request, res: Response) => {
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
    const body = req.body as TransformRequest;

    if (!body.input) {
      res.status(400).json({ error: 'Missing input' });
      return;
    }

    // Estrai organization ID dall'header (per multi-tenancy)
    const organizationId = req.headers['x-organization-id'] as string | undefined;
    
    // Se il plugin è multi-tenant, organizationId è obbligatorio
    if (this.plugin.isMultiTenant() && !organizationId) {
      res.status(400).json({ error: 'Missing X-Organization-Id header for multi-tenant plugin' });
      return;
    }

    // Aggiungi organizationId all'input
    if (organizationId) {
      body.input.organizationId = organizationId;
    }

    const isAsync = this.plugin.isAsyncTransform(transformId);

    if (isAsync) {
      // Transform asincrona
      if (!body.callbackUrl) {
        res.status(400).json({ error: 'Missing callbackUrl for async transform' });
        return;
      }

      const result = await this.plugin.executeAsyncTransform(
        transformId,
        body.input,
        body.callbackUrl,
        organizationId
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
          this.server = this.app.listen(this.options.port, this.options.host || '0.0.0.0');
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

