import '../src/utils/loadEnv.js';
import mongoose from 'mongoose';
import config from '../src/config.js';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const migrationsDir = path.join(__dirname, '..', 'src', 'database', 'migrations');

async function runMigrations() {
    try {
        console.log('🔄 Starting database migrations...\n');
        
        if (!config.database.enabled) {
            console.log('⚠️  Database is disabled in config. Skipping migrations.');
            return;
        }

        await mongoose.connect(config.database.url, config.database.options);
        console.log('✅ Connected to database\n');

        await fs.ensureDir(migrationsDir);
        
        const migrationFiles = (await fs.readdir(migrationsDir))
            .filter(f => f.endsWith('.js'))
            .sort();

        if (migrationFiles.length === 0) {
            console.log('ℹ️  No migration files found');
            await createInitialMigration();
            process.exit(0);
            return;
        }

        const Migration = mongoose.model('Migration', new mongoose.Schema({
            name: { type: String, unique: true },
            executedAt: { type: Date, default: Date.now }
        }));

        for (const file of migrationFiles) {
            const migrationName = path.basename(file, '.js');
            const alreadyRan = await Migration.findOne({ name: migrationName });

            if (alreadyRan) {
                console.log(`⏭️  Skipped: ${migrationName} (already executed)`);
                continue;
            }

            console.log(`🔄 Running: ${migrationName}`);
            
            try {
                const migration = await import(path.join(migrationsDir, file));
                await migration.up();
                
                await Migration.create({ name: migrationName });
                console.log(`✅ Completed: ${migrationName}\n`);
            } catch (error) {
                console.error(`❌ Failed: ${migrationName}`);
                console.error(error.message);
                
                if (migration.down) {
                    console.log('🔙 Rolling back...');
                    await migration.down();
                }
                throw error;
            }
        }

        console.log('✨ All migrations completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        process.exit(1);
    }
}

async function createInitialMigration() {
    const template = `export async function up() {
    console.log('Running initial migration...');
}

export async function down() {
    console.log('Rolling back initial migration...');
}
`;
    
    const fileName = `${Date.now()}_initial_setup.js`;
    await fs.writeFile(path.join(migrationsDir, fileName), template);
    console.log(`✅ Created migration template: ${fileName}`);
}

runMigrations();
