import Database from 'better-sqlite3';
import path from 'path';

export interface DatabaseConfig {
    filename: string;
    verbose?: boolean;
}

export class DatabaseConnection {
    private db: Database.Database | null = null;

    constructor(private config: DatabaseConfig) {}

    connect(): Database.Database {
        if (!this.db) {
            this.db = new Database(this.config.filename, {
                verbose: this.config.verbose ? console.log : undefined,
            });
        }
        return this.db;
    }

    getConnection(): Database.Database {
        if (!this.db) {
            throw new Error('Database not connected. Call connect() first.');
        }
        return this.db;
    }

    close(): void {
        if (this.db) {
            this.db.close();
            this.db = null;
        }
    }

    isConnected(): boolean {
        return this.db !== null;
    }
}

// Database configuration for different environments
export const getDatabaseConfig = (env: string = process.env.NODE_ENV || 'development'): DatabaseConfig => {
    const configs: Record<string, DatabaseConfig> = {
        test: {
            filename: ':memory:', // In-memory database for tests
            verbose: false,
        },
        development: {
            filename: path.join(process.cwd(), 'data', 'dev.db'),
            verbose: true,
        },
        production: {
            filename: path.join(process.cwd(), 'data', 'prod.db'),
            verbose: false,
        },
    };

    return configs[env] || configs.development;
};

export default DatabaseConnection;
