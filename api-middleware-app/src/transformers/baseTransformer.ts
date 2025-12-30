/**
 * Base Transformer Class
 *
 * All transformers should extend this class
 */

import { logTransformation } from '../utils/logger';

export abstract class BaseTransformer<TInput = any, TOutput = any> {
    protected name: string;

    constructor(name: string) {
        this.name = name;
    }

    /**
     * Transform data from source format to target format
     */
    abstract transform(input: TInput): TOutput;

    /**
     * Reverse transform (from target format back to source format)
     * Optional - implement if bidirectional transformation is needed
     */
    reverseTransform?(output: TOutput): TInput;

    /**
     * Validate input data before transformation
     * Optional - override to add custom validation
     */
    validate(input: TInput): boolean {
        return input !== null && input !== undefined;
    }

    /**
     * Execute transformation with logging
     */
    execute(input: TInput): TOutput {
        try {
            if (!this.validate(input)) {
                throw new Error('Input validation failed');
            }

            const output = this.transform(input);

            logTransformation(this.name, 'success', {
                inputKeys: Object.keys(input || {}),
                outputKeys: Object.keys(output || {})
            });

            return output;
        } catch (error: any) {
            logTransformation(this.name, 'error', {
                error: error.message,
                input: JSON.stringify(input).substring(0, 500) // Limit log size
            });
            throw error;
        }
    }

    /**
     * Helper: Map field from source to target
     */
    protected mapField(source: any, sourcePath: string, defaultValue?: any): any {
        const keys = sourcePath.split('.');
        let value = source;

        for (const key of keys) {
            if (value && typeof value === 'object' && key in value) {
                value = value[key];
            } else {
                return defaultValue;
            }
        }

        return value !== undefined ? value : defaultValue;
    }

    /**
     * Helper: Format date to ISO string
     */
    protected formatDate(date: Date | string | number): string {
        if (!date) return '';
        return new Date(date).toISOString();
    }

    /**
     * Helper: Parse date from various formats
     */
    protected parseDate(dateString: string): Date | null {
        if (!dateString) return null;
        const date = new Date(dateString);
        return isNaN(date.getTime()) ? null : date;
    }

    /**
     * Helper: Format currency
     */
    protected formatCurrency(amount: number, currency: string = 'USD'): string {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency
        }).format(amount);
    }

    /**
     * Helper: Clean phone number
     */
    protected cleanPhone(phone: string): string {
        if (!phone) return '';
        return phone.replace(/[^\d+]/g, '');
    }
}
