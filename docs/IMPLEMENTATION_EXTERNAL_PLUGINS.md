# Implementazione Plugin Esterni - Piano di Sviluppo

> Roadmap dettagliata per l'implementazione del supporto plugin custom/esterni

---

## 📋 Indice

1. [Overview](#overview)
2. [Phase 1: Database & Models](#phase-1-database--models)
3. [Phase 2: Manifest Validation](#phase-2-manifest-validation)
4. [Phase 3: Installation Flow](#phase-3-installation-flow)
5. [Phase 4: Webhook System](#phase-4-webhook-system)
6. [Phase 5: Job Queue & States](#phase-5-job-queue--states)
7. [Phase 6: UI Components](#phase-6-ui-components)
8. [Phase 7: Security & Testing](#phase-7-security--testing)

---

## 🎯 Overview

### Obiettivo

Permettere alle organization di installare **plugin custom esterni** tramite manifest JSON URL.

### Scope Fase 1 (MVP)

**Include:**
- ✅ Installazione plugin via URL manifest
- ✅ Validazione manifest JSON
- ✅ Esecuzione transform sincrone e asincrone
- ✅ Webhook callbacks per async transforms
- ✅ Job queue con stati
- ✅ UI per gestione plugin custom

**Esclude (futuro):**
- ❌ Community Store pubblico
- ❌ Plugin verification/approval process
- ❌ Rating & reviews
- ❌ Sandboxing avanzato

---

## Phase 1: Database & Models

### 1.1 Schema Prisma Updates

**File:** `prisma/schema.prisma`

```prisma
// Plugin esterno installato da organization
model OrgExternalPlugin {
  id        String   @id @default(cuid())
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Organization owner
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  // Plugin info (da manifest)
  pluginId          String  // ID univoco plugin
  manifestUrl       String  // URL manifest.json
  manifestVersion   String  // Versione manifest
  
  // Manifest cached (JSON serializzato)
  manifestData      String  @db.Text  // Intero manifest JSON
  
  // Status
  enabled           Boolean @default(true)
  installedAt       DateTime @default(now())
  
  // Security
  webhookSecret     String  // Secret per HMAC signature
  
  // Configuration (salvata da user)
  config            String? @db.Text  // JSON config values

  // Relations
  jobs              TransformJob[]

  @@unique([organizationId, pluginId])
  @@index([organizationId])
  @@index([pluginId])
}

// Job per transform async
model TransformJob {
  id        String   @id @default(cuid())
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Ownership
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  
  graphId   String
  graph     Graph @relation(fields: [graphId], references: [id], onDelete: Cascade)

  // Plugin info
  pluginId     String
  plugin       OrgExternalPlugin @relation(fields: [organizationId, pluginId], references: [organizationId, pluginId], onDelete: Cascade)
  
  transformId  String  // ID della transform specifica

  // Job state
  status       JobStatus @default(PENDING)
  
  // Input/Output
  inputEntity  String @db.Text  // JSON serializzato OSINTEntity
  config       String? @db.Text // JSON config per questa execution
  
  result       String? @db.Text // JSON TransformResult (quando completed)
  error        String? @db.Text // Error message (quando failed)
  
  // Metadata
  externalJobId   String?  // Job ID dal plugin server
  webhookUrl      String   // URL per callback
  
  progress        Int?     // 0-100
  progressMessage String?  // Messaggio stato
  
  // Timestamps
  startedAt    DateTime  @default(now())
  submittedAt  DateTime? // Quando inviato al plugin
  completedAt  DateTime? // Quando completato/fallito
  
  @@index([organizationId])
  @@index([graphId])
  @@index([status])
  @@index([pluginId])
}

enum JobStatus {
  PENDING      // Creato, non ancora inviato
  SUBMITTED    // Inviato al plugin server
  PROCESSING   // Plugin sta elaborando
  COMPLETED    // Completato con successo
  FAILED       // Fallito con errore
  TIMEOUT      // Timeout scaduto
  CANCELLED    // Cancellato da user
}

// Aggiorna Organization per relazioni
model Organization {
  // ... existing fields
  externalPlugins OrgExternalPlugin[]
  transformJobs   TransformJob[]
}

// Aggiorna Graph per relazioni
model Graph {
  // ... existing fields
  transformJobs TransformJob[]
}
```

### 1.2 Migration

```bash
# Crea migration
npx prisma migrate dev --name add_external_plugins

# Genera Prisma Client
npx prisma generate
```

### 1.3 Types TypeScript

**File:** `src/types/external-plugins.ts`

```typescript
import { Prisma } from '@prisma/client';

// Manifest JSON structure
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
    category: string;
    
    capabilities: {
      inputTypes: string[];
      outputTypes: string[];
      estimatedTime: 'instant' | 'seconds' | 'minutes';
      supportsAsync: boolean;
    };
    
    configuration?: {
      required: boolean;
      schema: Record<string, ConfigField>;
    };
    
    transforms: TransformDefinition[];
    
    metadata: {
      tags?: string[];
      minimumPlatformVersion: string;
    };
  };
}

export interface ConfigField {
  type: 'string' | 'number' | 'boolean' | 'select';
  label: string;
  description?: string;
  required?: boolean;
  secret?: boolean;
  default?: unknown;
  min?: number;
  max?: number;
  options?: Array<{ label: string; value: string }>;
}

export interface TransformDefinition {
  id: string;
  name: string;
  description: string;
  inputType: string;
  outputTypes: string[];
  endpoint: string;
  method: 'POST';
  async?: boolean;
}

// Job status
export type JobStatus = 
  | 'PENDING' 
  | 'SUBMITTED' 
  | 'PROCESSING' 
  | 'COMPLETED' 
  | 'FAILED' 
  | 'TIMEOUT' 
  | 'CANCELLED';

// Include types for queries
export type OrgExternalPluginWithJobs = Prisma.OrgExternalPluginGetPayload<{
  include: { jobs: true };
}>;

export type TransformJobWithPlugin = Prisma.TransformJobGetPayload<{
  include: { plugin: true };
}>;
```

---

## Phase 2: Manifest Validation

### 2.1 Manifest Validator

**File:** `src/lib/validators/manifest-validator.ts`

```typescript
import { z } from 'zod';
import semver from 'semver';
import type { PluginManifest } from '@/types/external-plugins';

const PLATFORM_VERSION = '2.0.0';

// Zod schema per validazione
const ConfigFieldSchema = z.object({
  type: z.enum(['string', 'number', 'boolean', 'select']),
  label: z.string(),
  description: z.string().optional(),
  required: z.boolean().optional(),
  secret: z.boolean().optional(),
  default: z.unknown().optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  options: z.array(z.object({
    label: z.string(),
    value: z.string()
  })).optional()
});

const TransformDefinitionSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  inputType: z.string(),
  outputTypes: z.array(z.string()),
  endpoint: z.string().url(),
  method: z.literal('POST'),
  async: z.boolean().optional()
});

const ManifestSchema = z.object({
  manifestVersion: z.string(),
  plugin: z.object({
    id: z.string().regex(/^[a-z0-9-]+$/),
    name: z.string().min(1).max(100),
    description: z.string().min(1).max(500),
    version: z.string().regex(/^\d+\.\d+\.\d+$/),
    author: z.string(),
    authorUrl: z.string().url().optional(),
    homepage: z.string().url().optional(),
    documentation: z.string().url().optional(),
    license: z.string().optional(),
    
    icon: z.string().optional(),
    logoUrl: z.string().url().optional(),
    category: z.string(),
    
    capabilities: z.object({
      inputTypes: z.array(z.string()).min(1),
      outputTypes: z.array(z.string()).min(1),
      estimatedTime: z.enum(['instant', 'seconds', 'minutes']),
      supportsAsync: z.boolean()
    }),
    
    configuration: z.object({
      required: z.boolean(),
      schema: z.record(ConfigFieldSchema)
    }).optional(),
    
    transforms: z.array(TransformDefinitionSchema).min(1),
    
    metadata: z.object({
      tags: z.array(z.string()).optional(),
      minimumPlatformVersion: z.string()
    })
  })
});

export class ManifestValidator {
  /**
   * Valida manifest JSON completo
   */
  static validate(manifest: unknown): {
    valid: boolean;
    manifest?: PluginManifest;
    errors?: string[];
  } {
    try {
      // Schema validation
      const parsed = ManifestSchema.parse(manifest);
      
      // Additional validations
      const errors: string[] = [];
      
      // Check platform version compatibility
      const minVersion = parsed.plugin.metadata.minimumPlatformVersion;
      if (!semver.gte(PLATFORM_VERSION, minVersion)) {
        errors.push(
          `Plugin requires platform v${minVersion} but current is v${PLATFORM_VERSION}`
        );
      }
      
      // Validate HTTPS endpoints
      for (const transform of parsed.plugin.transforms) {
        if (!transform.endpoint.startsWith('https://')) {
          errors.push(
            `Transform "${transform.id}" must use HTTPS endpoint. Found: ${transform.endpoint}`
          );
        }
      }
      
      // Validate unique transform IDs
      const transformIds = parsed.plugin.transforms.map(t => t.id);
      const duplicates = transformIds.filter((id, i) => transformIds.indexOf(id) !== i);
      if (duplicates.length > 0) {
        errors.push(`Duplicate transform IDs: ${duplicates.join(', ')}`);
      }
      
      if (errors.length > 0) {
        return { valid: false, errors };
      }
      
      return { valid: true, manifest: parsed as PluginManifest };
      
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          valid: false,
          errors: error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
        };
      }
      
      return {
        valid: false,
        errors: [error instanceof Error ? error.message : 'Invalid manifest']
      };
    }
  }
  
  /**
   * Scarica e valida manifest da URL
   */
  static async fetchAndValidate(manifestUrl: string): Promise<{
    valid: boolean;
    manifest?: PluginManifest;
    errors?: string[];
  }> {
    try {
      // Validate URL format
      new URL(manifestUrl);
      
      // Require HTTPS
      if (!manifestUrl.startsWith('https://')) {
        return {
          valid: false,
          errors: ['Manifest URL must use HTTPS']
        };
      }
      
      // Fetch manifest
      const response = await fetch(manifestUrl, {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(10000) // 10s timeout
      });
      
      if (!response.ok) {
        return {
          valid: false,
          errors: [`Failed to fetch manifest: ${response.status} ${response.statusText}`]
        };
      }
      
      const data = await response.json();
      
      // Validate
      return this.validate(data);
      
    } catch (error) {
      return {
        valid: false,
        errors: [error instanceof Error ? error.message : 'Failed to fetch manifest']
      };
    }
  }
  
  /**
   * Verifica certificato TLS dell'endpoint
   */
  static async verifyTLS(endpoint: string): Promise<boolean> {
    try {
      const url = new URL(endpoint);
      const response = await fetch(url.origin, {
        method: 'HEAD',
        signal: AbortSignal.timeout(5000)
      });
      return response.ok || response.status === 404; // Endpoint può non esistere ma TLS valido
    } catch {
      return false;
    }
  }
}
```

### 2.2 Tests

**File:** `src/lib/validators/__tests__/manifest-validator.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { ManifestValidator } from '../manifest-validator';

describe('ManifestValidator', () => {
  const validManifest = {
    manifestVersion: '1.0',
    plugin: {
      id: 'test-plugin',
      name: 'Test Plugin',
      description: 'A test plugin',
      version: '1.0.0',
      author: 'Test Author',
      category: 'network',
      capabilities: {
        inputTypes: ['domain'],
        outputTypes: ['ip'],
        estimatedTime: 'seconds',
        supportsAsync: false
      },
      transforms: [{
        id: 'test-transform',
        name: 'Test Transform',
        description: 'Test',
        inputType: 'domain',
        outputTypes: ['ip'],
        endpoint: 'https://api.test.com/transform',
        method: 'POST'
      }],
      metadata: {
        minimumPlatformVersion: '2.0.0'
      }
    }
  };
  
  it('validates a correct manifest', () => {
    const result = ManifestValidator.validate(validManifest);
    expect(result.valid).toBe(true);
    expect(result.manifest).toBeDefined();
  });
  
  it('rejects HTTP endpoints', () => {
    const manifest = {
      ...validManifest,
      plugin: {
        ...validManifest.plugin,
        transforms: [{
          ...validManifest.plugin.transforms[0],
          endpoint: 'http://api.test.com/transform'
        }]
      }
    };
    
    const result = ManifestValidator.validate(manifest);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain(expect.stringContaining('HTTPS'));
  });
  
  it('checks platform version compatibility', () => {
    const manifest = {
      ...validManifest,
      plugin: {
        ...validManifest.plugin,
        metadata: {
          minimumPlatformVersion: '3.0.0'
        }
      }
    };
    
    const result = ManifestValidator.validate(manifest);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain(expect.stringContaining('platform v3.0.0'));
  });
});
```

---

## Phase 3: Installation Flow

### 3.1 API Route - Install Plugin

**File:** `src/app/api/plugins/install/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
import { db } from '@/lib/db';
import { ManifestValidator } from '@/lib/validators/manifest-validator';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const { userId, orgId } = auth();
    
    if (!userId || !orgId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const body = await request.json();
    const { manifestUrl } = body;
    
    if (!manifestUrl || typeof manifestUrl !== 'string') {
      return NextResponse.json(
        { error: 'manifestUrl is required' },
        { status: 400 }
      );
    }
    
    // 1. Fetch and validate manifest
    const validation = await ManifestValidator.fetchAndValidate(manifestUrl);
    
    if (!validation.valid || !validation.manifest) {
      return NextResponse.json(
        { error: 'Invalid manifest', details: validation.errors },
        { status: 400 }
      );
    }
    
    const manifest = validation.manifest;
    
    // 2. Verify TLS certificates for all endpoints
    const endpoints = manifest.plugin.transforms.map(t => t.endpoint);
    const tlsChecks = await Promise.all(
      endpoints.map(ep => ManifestValidator.verifyTLS(ep))
    );
    
    if (tlsChecks.some(valid => !valid)) {
      return NextResponse.json(
        { error: 'One or more endpoints have invalid TLS certificates' },
        { status: 400 }
      );
    }
    
    // 3. Check if plugin already installed
    const existing = await db.orgExternalPlugin.findUnique({
      where: {
        organizationId_pluginId: {
          organizationId: orgId,
          pluginId: manifest.plugin.id
        }
      }
    });
    
    if (existing) {
      return NextResponse.json(
        { error: 'Plugin already installed. Use update endpoint to upgrade.' },
        { status: 409 }
      );
    }
    
    // 4. Generate webhook secret
    const webhookSecret = crypto.randomBytes(32).toString('hex');
    
    // 5. Save to database
    const plugin = await db.orgExternalPlugin.create({
      data: {
        organizationId: orgId,
        pluginId: manifest.plugin.id,
        manifestUrl,
        manifestVersion: manifest.manifestVersion,
        manifestData: JSON.stringify(manifest),
        webhookSecret,
        enabled: true
      }
    });
    
    return NextResponse.json({
      success: true,
      plugin: {
        id: plugin.id,
        pluginId: plugin.pluginId,
        name: manifest.plugin.name,
        version: manifest.plugin.version,
        installedAt: plugin.installedAt
      },
      webhookSecret  // Return secret ONCE for plugin to store
    });
    
  } catch (error) {
    console.error('Plugin installation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### 3.2 API Route - List Installed Plugins

**File:** `src/app/api/plugins/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { userId, orgId } = auth();
    
    if (!userId || !orgId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const plugins = await db.orgExternalPlugin.findMany({
      where: { organizationId: orgId },
      select: {
        id: true,
        pluginId: true,
        manifestData: true,
        enabled: true,
        installedAt: true,
        config: true
      },
      orderBy: { installedAt: 'desc' }
    });
    
    const formatted = plugins.map(p => {
      const manifest = JSON.parse(p.manifestData);
      return {
        id: p.id,
        pluginId: p.pluginId,
        name: manifest.plugin.name,
        description: manifest.plugin.description,
        version: manifest.plugin.version,
        author: manifest.plugin.author,
        category: manifest.plugin.category,
        enabled: p.enabled,
        installedAt: p.installedAt,
        hasConfig: !!p.config,
        requiresConfig: manifest.plugin.configuration?.required || false
      };
    });
    
    return NextResponse.json({ plugins: formatted });
    
  } catch (error) {
    console.error('List plugins error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### 3.3 API Route - Uninstall Plugin

**File:** `src/app/api/plugins/[pluginId]/uninstall/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
import { db } from '@/lib/db';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { pluginId: string } }
) {
  try {
    const { userId, orgId } = auth();
    
    if (!userId || !orgId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Delete plugin and all associated jobs (cascade)
    await db.orgExternalPlugin.delete({
      where: {
        organizationId_pluginId: {
          organizationId: orgId,
          pluginId: params.pluginId
        }
      }
    });
    
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error('Uninstall plugin error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

---

## Phase 4: Webhook System

### 4.1 HMAC Signature Verification

**File:** `src/lib/security/hmac.ts`

```typescript
import crypto from 'crypto';

export class HMACVerifier {
  /**
   * Genera signature HMAC-SHA256
   */
  static generateSignature(payload: string, secret: string): string {
    return crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
  }
  
  /**
   * Verifica signature HMAC
   */
  static verifySignature(
    payload: string,
    signature: string,
    secret: string
  ): boolean {
    const expected = this.generateSignature(payload, secret);
    
    // Constant-time comparison to prevent timing attacks
    try {
      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expected)
      );
    } catch {
      return false;
    }
  }
  
  /**
   * Estrae signature da header
   */
  static extractSignature(header: string | null): string | null {
    if (!header) return null;
    
    // Format: "sha256=<hash>"
    const match = header.match(/^sha256=([a-f0-9]{64})$/);
    return match ? match[1] : null;
  }
}
```

### 4.2 Webhook Handler API

**File:** `src/app/api/webhooks/transforms/[jobId]/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { HMACVerifier } from '@/lib/security/hmac';
import { JobStatus } from '@prisma/client';

export async function POST(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    // 1. Verifica signature HMAC
    const signatureHeader = request.headers.get('X-Plugin-Signature');
    const signature = HMACVerifier.extractSignature(signatureHeader);
    
    if (!signature) {
      return NextResponse.json(
        { error: 'Missing or invalid signature' },
        { status: 401 }
      );
    }
    
    // 2. Get job from DB
    const job = await db.transformJob.findUnique({
      where: { id: params.jobId },
      include: { plugin: true }
    });
    
    if (!job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }
    
    // 3. Verify signature with plugin secret
    const rawBody = await request.text();
    const isValid = HMACVerifier.verifySignature(
      rawBody,
      signature,
      job.plugin.webhookSecret
    );
    
    if (!isValid) {
      console.error('Invalid webhook signature for job:', job.id);
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }
    
    // 4. Parse and validate payload
    const body = JSON.parse(rawBody);
    const { status, progress, progressMessage, result, error } = body;
    
    if (!status || !['processing', 'completed', 'failed'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status' },
        { status: 400 }
      );
    }
    
    // 5. Update job in database
    const updateData: any = {
      status: status.toUpperCase() as JobStatus,
      updatedAt: new Date()
    };
    
    if (progress !== undefined) {
      updateData.progress = Math.min(100, Math.max(0, progress));
    }
    
    if (progressMessage) {
      updateData.progressMessage = progressMessage;
    }
    
    if (status === 'completed') {
      if (!result) {
        return NextResponse.json(
          { error: 'Result required for completed status' },
          { status: 400 }
        );
      }
      updateData.result = JSON.stringify(result);
      updateData.completedAt = new Date();
    }
    
    if (status === 'failed') {
      updateData.error = error || 'Unknown error';
      updateData.completedAt = new Date();
    }
    
    await db.transformJob.update({
      where: { id: job.id },
      data: updateData
    });
    
    // 6. TODO: Notify UI via WebSocket/SSE
    // await notifyClient(job.graphId, {
    //   type: 'transform_update',
    //   jobId: job.id,
    //   status,
    //   result
    // });
    
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error('Webhook handler error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

---

## Phase 5: Job Queue & States

### 5.1 Transform Executor (External Plugins)

**File:** `src/features/plugins/external-executor.ts`

```typescript
import { db } from '@/lib/db';
import type { OSINTEntity } from './types';

export class ExternalPluginExecutor {
  /**
   * Esegue transform da plugin esterno
   */
  static async executeTransform(
    orgId: string,
    pluginId: string,
    transformId: string,
    entity: OSINTEntity,
    graphId: string,
    config?: Record<string, unknown>
  ) {
    // 1. Get plugin from DB
    const plugin = await db.orgExternalPlugin.findUnique({
      where: {
        organizationId_pluginId: {
          organizationId: orgId,
          pluginId
        }
      }
    });
    
    if (!plugin) {
      throw new Error('Plugin not found');
    }
    
    if (!plugin.enabled) {
      throw new Error('Plugin is disabled');
    }
    
    const manifest = JSON.parse(plugin.manifestData);
    
    // 2. Find transform in manifest
    const transform = manifest.plugin.transforms.find(
      (t: any) => t.id === transformId
    );
    
    if (!transform) {
      throw new Error('Transform not found');
    }
    
    // 3. Create job in DB
    const webhookUrl = this.generateWebhookUrl();
    
    const job = await db.transformJob.create({
      data: {
        organizationId: orgId,
        graphId,
        pluginId,
        transformId,
        status: 'PENDING',
        inputEntity: JSON.stringify(entity),
        config: config ? JSON.stringify(config) : null,
        webhookUrl
      }
    });
    
    // 4. Prepare request payload
    const payload = {
      transformId,
      input: {
        entity: {
          id: entity.id,
          type: entity.type,
          value: entity.value,
          metadata: entity.metadata
        },
        config: config || {}
      },
      callbackUrl: `${process.env.NEXT_PUBLIC_APP_URL}${webhookUrl}?token=${this.generateToken(job.id)}`
    };
    
    try {
      // 5. Call plugin endpoint
      const response = await fetch(transform.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Organization-Id': orgId
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(transform.async ? 5000 : 30000)
      });
      
      if (!response.ok) {
        throw new Error(`Plugin returned ${response.status}`);
      }
      
      const data = await response.json();
      
      // 6. Handle response based on async/sync
      if (data.async) {
        // Async - update job status
        await db.transformJob.update({
          where: { id: job.id },
          data: {
            status: 'SUBMITTED',
            submittedAt: new Date(),
            externalJobId: data.jobId
          }
        });
        
        return {
          success: true,
          async: true,
          jobId: job.id,
          estimatedTime: data.estimatedTime,
          message: data.message || 'Job submitted'
        };
      } else {
        // Sync - job completed immediately
        await db.transformJob.update({
          where: { id: job.id },
          data: {
            status: 'COMPLETED',
            result: JSON.stringify(data.result),
            completedAt: new Date()
          }
        });
        
        return {
          success: true,
          async: false,
          result: data.result
        };
      }
      
    } catch (error) {
      // Mark job as failed
      await db.transformJob.update({
        where: { id: job.id },
        data: {
          status: 'FAILED',
          error: error instanceof Error ? error.message : 'Unknown error',
          completedAt: new Date()
        }
      });
      
      throw error;
    }
  }
  
  private static generateWebhookUrl(): string {
    return `/api/webhooks/transforms/${crypto.randomUUID()}`;
  }
  
  private static generateToken(jobId: string): string {
    // Simple token for URL (non-critical, HMAC is the real security)
    return Buffer.from(jobId).toString('base64url');
  }
}
```

### 5.2 Job Polling/Monitoring

**File:** `src/app/api/jobs/[jobId]/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
import { db } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const { userId, orgId } = auth();
    
    if (!userId || !orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const job = await db.transformJob.findFirst({
      where: {
        id: params.jobId,
        organizationId: orgId
      },
      include: {
        plugin: {
          select: {
            pluginId: true,
            manifestData: true
          }
        }
      }
    });
    
    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }
    
    const manifest = JSON.parse(job.plugin.manifestData);
    
    return NextResponse.json({
      id: job.id,
      status: job.status,
      pluginId: job.plugin.pluginId,
      pluginName: manifest.plugin.name,
      transformId: job.transformId,
      progress: job.progress,
      progressMessage: job.progressMessage,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
      result: job.result ? JSON.parse(job.result) : null,
      error: job.error
    });
    
  } catch (error) {
    console.error('Get job error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### 5.3 Timeout Handler (Cron Job)

**File:** `src/lib/jobs/timeout-handler.ts`

```typescript
import { db } from '@/lib/db';

const TIMEOUT_MS = {
  custom: 30 * 60 * 1000,     // 30 min
  store: 2 * 60 * 60 * 1000,  // 2 hours
  official: 4 * 60 * 60 * 1000 // 4 hours
};

export async function checkTimeouts() {
  const now = new Date();
  
  // Find jobs stuck in SUBMITTED or PROCESSING
  const stuckJobs = await db.transformJob.findMany({
    where: {
      status: { in: ['SUBMITTED', 'PROCESSING'] },
      startedAt: {
        lt: new Date(now.getTime() - TIMEOUT_MS.custom)
      }
    }
  });
  
  for (const job of stuckJobs) {
    await db.transformJob.update({
      where: { id: job.id },
      data: {
        status: 'TIMEOUT',
        error: 'Job exceeded maximum execution time',
        completedAt: now
      }
    });
    
    console.log(`Job ${job.id} timed out`);
  }
}

// Run every 5 minutes
// Use Vercel Cron or similar
export const config = {
  schedule: '*/5 * * * *'
};
```

---

## Phase 6: UI Components

### 6.1 Install Plugin Dialog

**File:** `src/features/plugins/components/install-plugin-dialog.tsx`

```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { IconAlertCircle, IconCheck } from '@tabler/icons-react';
import { toast } from 'sonner';

interface InstallPluginDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InstallPluginDialog({ open, onOpenChange }: InstallPluginDialogProps) {
  const router = useRouter();
  const [manifestUrl, setManifestUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const handleInstall = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/plugins/install', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ manifestUrl })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Installation failed');
      }
      
      toast.success('Plugin installed successfully', {
        description: `${data.plugin.name} v${data.plugin.version}`
      });
      
      // Show webhook secret (user needs to save it)
      if (data.webhookSecret) {
        toast.info('Webhook Secret', {
          description: 'Save this secret in your plugin server configuration',
          action: {
            label: 'Copy',
            onClick: () => navigator.clipboard.writeText(data.webhookSecret)
          },
          duration: 10000
        });
      }
      
      onOpenChange(false);
      setManifestUrl('');
      router.refresh();
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Installation failed');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Install External Plugin</DialogTitle>
          <DialogDescription>
            Install a custom plugin by providing the manifest.json URL
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="manifest-url">Manifest URL</Label>
            <Input
              id="manifest-url"
              placeholder="https://cdn.example.com/plugin/manifest.json"
              value={manifestUrl}
              onChange={(e) => setManifestUrl(e.target.value)}
              disabled={loading}
            />
            <p className="text-muted-foreground text-sm">
              Must be HTTPS and return a valid manifest.json
            </p>
          </div>
          
          {error && (
            <Alert variant="destructive">
              <IconAlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleInstall}
            disabled={!manifestUrl || loading}
            loading={loading}
          >
            <IconCheck className="mr-2 h-4 w-4" />
            Install Plugin
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

### 6.2 External Plugins List

**File:** `src/app/dashboard/plugins/external/page.tsx`

```typescript
'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { InstallPluginDialog } from '@/features/plugins/components/install-plugin-dialog';
import { IconPlus, IconTrash, IconSettings } from '@tabler/icons-react';

export default function ExternalPluginsPage() {
  const [plugins, setPlugins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showInstall, setShowInstall] = useState(false);
  
  useEffect(() => {
    fetchPlugins();
  }, []);
  
  const fetchPlugins = async () => {
    const response = await fetch('/api/plugins');
    const data = await response.json();
    setPlugins(data.plugins);
    setLoading(false);
  };
  
  const handleUninstall = async (pluginId: string) => {
    if (!confirm('Are you sure? This will delete all associated jobs.')) return;
    
    await fetch(`/api/plugins/${pluginId}/uninstall`, { method: 'DELETE' });
    fetchPlugins();
  };
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">External Plugins</h1>
          <p className="text-muted-foreground">
            Manage custom plugins installed in your organization
          </p>
        </div>
        <Button onClick={() => setShowInstall(true)}>
          <IconPlus className="mr-2 h-4 w-4" />
          Install Plugin
        </Button>
      </div>
      
      {loading ? (
        <div>Loading...</div>
      ) : plugins.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground">No external plugins installed</p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => setShowInstall(true)}
          >
            Install Your First Plugin
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4">
          {plugins.map((plugin: any) => (
            <Card key={plugin.id} className="p-6">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{plugin.name}</h3>
                    <Badge variant="outline">{plugin.version}</Badge>
                    {!plugin.enabled && (
                      <Badge variant="secondary">Disabled</Badge>
                    )}
                  </div>
                  <p className="text-muted-foreground text-sm">
                    {plugin.description}
                  </p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>By {plugin.author}</span>
                    <span>•</span>
                    <span>{plugin.category}</span>
                    <span>•</span>
                    <span>Installed {new Date(plugin.installedAt).toLocaleDateString()}</span>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <IconSettings className="mr-2 h-4 w-4" />
                    Configure
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleUninstall(plugin.pluginId)}
                  >
                    <IconTrash className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
      
      <InstallPluginDialog open={showInstall} onOpenChange={setShowInstall} />
    </div>
  );
}
```

---

## Phase 7: Security & Testing

### 7.1 Rate Limiting

**File:** `src/lib/rate-limit.ts`

```typescript
import { db } from '@/lib/db';

const LIMITS = {
  custom: {
    perMinute: 30,
    perHour: 500,
    perDay: 2000
  }
};

export async function checkRateLimit(
  orgId: string,
  pluginId: string
): Promise<{ allowed: boolean; resetAt?: Date }> {
  const now = new Date();
  const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);
  
  // Count jobs in last minute
  const recentJobs = await db.transformJob.count({
    where: {
      organizationId: orgId,
      pluginId,
      createdAt: { gte: oneMinuteAgo }
    }
  });
  
  if (recentJobs >= LIMITS.custom.perMinute) {
    return {
      allowed: false,
      resetAt: new Date(oneMinuteAgo.getTime() + 60 * 1000)
    };
  }
  
  return { allowed: true };
}
```

### 7.2 Integration Tests

**File:** `src/__tests__/external-plugins.test.ts`

```typescript
import { describe, it, expect, beforeAll } from 'vitest';
import { ManifestValidator } from '@/lib/validators/manifest-validator';

describe('External Plugins Integration', () => {
  it('validates manifest schema', () => {
    const manifest = {
      manifestVersion: '1.0',
      plugin: {
        id: 'test-plugin',
        // ... complete manifest
      }
    };
    
    const result = ManifestValidator.validate(manifest);
    expect(result.valid).toBe(true);
  });
  
  it('rejects non-HTTPS endpoints', () => {
    // Test implementation
  });
  
  it('verifies HMAC signatures', () => {
    // Test implementation
  });
});
```

---

## 📋 Implementation Checklist

### Phase 1: Database (Week 1)
- [ ] Update Prisma schema
- [ ] Create migration
- [ ] Generate types
- [ ] Test database operations

### Phase 2: Validation (Week 1)
- [ ] Implement ManifestValidator
- [ ] Add Zod schemas
- [ ] TLS verification
- [ ] Write unit tests

### Phase 3: Installation (Week 2)
- [ ] Install API endpoint
- [ ] List plugins endpoint
- [ ] Uninstall endpoint
- [ ] Configure endpoint

### Phase 4: Webhooks (Week 2)
- [ ] HMAC verification utility
- [ ] Webhook handler endpoint
- [ ] Signature validation
- [ ] Error handling

### Phase 5: Job Queue (Week 3)
- [ ] ExternalPluginExecutor
- [ ] Job status tracking
- [ ] Timeout handler
- [ ] Polling endpoint

### Phase 6: UI (Week 3-4)
- [ ] Install dialog component
- [ ] External plugins page
- [ ] Plugin configuration UI
- [ ] Job status display

### Phase 7: Testing (Week 4)
- [ ] Unit tests
- [ ] Integration tests
- [ ] E2E tests
- [ ] Security audit

---

## 🚀 Deployment Notes

### Environment Variables

```bash
# .env
NEXT_PUBLIC_APP_URL=https://osint-platform.com
DATABASE_URL=postgresql://...

# Optional
ENABLE_EXTERNAL_PLUGINS=true
MAX_PLUGIN_SIZE_MB=10
```

### Monitoring

- Track plugin installation rate
- Monitor webhook failure rate
- Alert on timeout spike
- Track job queue length

---

## 📚 Resources

- [EXTERNAL_PLUGINS.md](./EXTERNAL_PLUGINS.md) - Architecture details
- [SDK.md](./SDK.md) - SDK documentation
- [PLUGIN_SYSTEM.md](./PLUGIN_SYSTEM.md) - Plugin system overview

---

**Status**: 📋 Planning Complete  
**Next**: Start Phase 1 Implementation  
**Timeline**: 4 weeks for MVP


