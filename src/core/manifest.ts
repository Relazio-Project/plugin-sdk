import type {
  PluginManifest,
  PluginConfig,
  ConfigSchema,
  TransformConfig,
  AsyncTransformConfig,
  ManifestOptions,
  EntityType,
} from '../core/types';

/**
 * Genera manifest JSON valido per la piattaforma Relazio
 */
export class ManifestGenerator {
  private config: PluginConfig;
  private transforms: Array<TransformConfig | AsyncTransformConfig> = [];
  private configSchema?: ConfigSchema;

  constructor(config: PluginConfig) {
    this.config = config;
  }

  setConfigSchema(schema: ConfigSchema): void {
    this.configSchema = schema;
  }

  addTransform(transform: TransformConfig | AsyncTransformConfig): void {
    this.transforms.push(transform);
  }

  /**
   * Genera manifest completo
   */
  generate(options: ManifestOptions): PluginManifest {
    if (this.transforms.length === 0) {
      throw new Error('Al least one transform is required');
    }

    if (!options.endpoint.startsWith('https://')) {
      throw new Error('Endpoint must use HTTPS');
    }

    // Raccogli tutti gli input/output types
    const inputTypes = new Set<EntityType>();
    const outputTypes = new Set<EntityType>();
    let hasAsync = false;

    for (const transform of this.transforms) {
      inputTypes.add(transform.inputType);
      transform.outputTypes.forEach((type) => outputTypes.add(type));
      
      // Check if it's async transform
      if ('async' in transform) {
        hasAsync = true;
      }
    }

    const manifest: PluginManifest = {
      manifestVersion: '1.0',
      plugin: {
        id: this.config.id,
        name: this.config.name,
        description: this.config.description,
        version: this.config.version,
        author: this.config.author,
        homepage: this.config.homepage,
        documentation: this.config.documentation,
        license: this.config.license || 'MIT',
        icon: this.config.icon,
        logoUrl: this.config.logoUrl,
        category: this.config.category,
        capabilities: {
          inputTypes: Array.from(inputTypes),
          outputTypes: Array.from(outputTypes),
          estimatedTime: hasAsync ? 'minutes' : 'seconds',
          supportsAsync: hasAsync,
        },
        transforms: this.transforms.map((transform) => ({
          id: transform.id,
          name: transform.name,
          description: transform.description,
          inputType: transform.inputType,
          outputTypes: transform.outputTypes,
          endpoint: `${options.endpoint}/${transform.id}`,
          method: 'POST',
          async: 'async' in transform,
        })),
        metadata: {
          tags: options.tags || [],
          minimumPlatformVersion: options.minimumPlatformVersion || '2.0.0',
        },
      },
    };

    // Aggiungi configurazione se presente
    if (this.configSchema && Object.keys(this.configSchema).length > 0) {
      manifest.plugin.configuration = {
        required: Object.values(this.configSchema).some((field) => field.required),
        schema: this.configSchema,
      };
    }

    return manifest;
  }

  /**
   * Genera manifest come JSON string
   */
  generateJSON(options: ManifestOptions, indent = 2): string {
    const manifest = this.generate(options);
    return JSON.stringify(manifest, null, indent);
  }
}

