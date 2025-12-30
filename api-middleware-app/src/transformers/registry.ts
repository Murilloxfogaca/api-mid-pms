/**
 * Transformer Registry
 *
 * Central registry for all data transformers
 */

import { BaseTransformer } from './baseTransformer';
import logger from '../utils/logger';

class TransformerRegistry {
    private transformers: Map<string, BaseTransformer> = new Map();

    /**
     * Register a transformer
     */
    register(name: string, transformer: BaseTransformer): void {
        if (this.transformers.has(name)) {
            logger.warn(`Transformer "${name}" is being overwritten`);
        }

        this.transformers.set(name, transformer);
        logger.debug(`Transformer "${name}" registered`);
    }

    /**
     * Get a transformer by name
     */
    get(name: string): BaseTransformer | undefined {
        return this.transformers.get(name);
    }

    /**
     * Check if a transformer exists
     */
    has(name: string): boolean {
        return this.transformers.has(name);
    }

    /**
     * Get all registered transformer names
     */
    list(): string[] {
        return Array.from(this.transformers.keys());
    }

    /**
     * Transform data using a registered transformer
     */
    transform<TInput = any, TOutput = any>(transformerName: string, input: TInput): TOutput {
        const transformer = this.get(transformerName);

        if (!transformer) {
            throw new Error(`Transformer "${transformerName}" not found`);
        }

        return transformer.execute(input) as TOutput;
    }
}

// Singleton instance
export const transformerRegistry = new TransformerRegistry();

// Export for testing and custom registration
export { TransformerRegistry };
