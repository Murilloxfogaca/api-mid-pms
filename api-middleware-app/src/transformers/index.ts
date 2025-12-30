/**
 * Transformer Registration
 *
 * Register all available transformers here
 */

import { transformerRegistry } from './registry';
import { BookingReservationTransformer } from './examples/BookingReservationTransformer';

/**
 * Initialize and register all transformers
 */
export function initializeTransformers(): void {
    // Register example transformers
    transformerRegistry.register('BookingReservationTransformer', new BookingReservationTransformer());

    // Add more transformers here as needed
    // transformerRegistry.register('PMSGuestTransformer', new PMSGuestTransformer());
    // transformerRegistry.register('ChannelManagerTransformer', new ChannelManagerTransformer());
}

// Export registry for direct access
export { transformerRegistry };
export { BaseTransformer } from './baseTransformer';
