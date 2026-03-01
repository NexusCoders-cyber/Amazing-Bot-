import express from 'express';
import os from 'os';
import fs from 'fs-extra';
import path from 'path';
import logger from '../../utils/logger.js';
import config from '../../config.js';
import { isHealthy } from '../../utils/database.js';
import { cache } from '../../utils/cache.js';

const router = express.Router();

// Main health check endpoint
router.get('/', async (req, res) => {
    try {
        const startTime = Date.now();
        const uptime = process.uptime();
        const memoryUsage = process.memoryUsage();
        
        // Check various system components
        const health = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: Math.floor(uptime),
            version: config.version || '1.0.0',
            environment: process.env.NODE_ENV || 'development',
            bot: {
                name: config.botName || 'Ilom Bot',
                connected: !!global.sock,
                sessionValid: await checkSessionHealth()
            },
            system: {
                platform: process.platform,
                nodeVersion: process.version,
                memory: {
                    used: Math.floor(memoryUsage.heapUsed / 1024 / 1024),
                    total: Math.floor(memoryUsage.heapTotal / 1024 / 1024),
                    free: Math.round(os.freemem() / 1024 / 1024)
                },
                cpu: {
                    cores: os.cpus().length,
                    loadAverage: os.loadavg()
                }
            },
            services: {
                webServer: true,
                whatsapp: !!global.sock,
                database: await isHealthy(),
                cache: await cache.isHealthy()
            }
        };
        
        // Calculate response time
        health.responseTime = Date.now() - startTime;
        
        // Set appropriate status code based on critical services
        const statusCode = health.services.whatsapp ? 200 : 503;
        
        res.status(statusCode).json(health);
    } catch (error) {
        logger.error('Health check error:', error);
        res.status(500).json({
            status: 'error',
            timestamp: new Date().toISOString(),
            error: error.message
        });
    }
});

// Detailed health check with diagnostics
router.get('/detailed', async (req, res) => {
    try {
        const health = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            diagnostics: {
                session: await getSessionDiagnostics(),
                filesystem: await getFilesystemDiagnostics(),
                network: await getNetworkDiagnostics(),
                processes: getProcessDiagnostics()
            }
        };
        
        res.json(health);
    } catch (error) {
        logger.error('Detailed health check error:', error);
        res.status(500).json({
            status: 'error',
            timestamp: new Date().toISOString(),
            error: error.message
        });
    }
});

// Ready check for Kubernetes/Docker
router.get('/ready', async (req, res) => {
    try {
        const isReady = !!global.sock && await checkSessionHealth();
        
        if (isReady) {
            res.status(200).json({ status: 'ready', timestamp: new Date().toISOString() });
        } else {
            res.status(503).json({ status: 'not ready', timestamp: new Date().toISOString() });
        }
    } catch (error) {
        res.status(503).json({ status: 'error', error: error.message });
    }
});

// Liveness check for Kubernetes/Docker
router.get('/live', (req, res) => {
    res.status(200).json({ status: 'alive', timestamp: new Date().toISOString() });
});

router.get('/ping', (req, res) => {
    res.json({ 
        status: 'ok', 
        message: 'pong',
        timestamp: Date.now()
    });
});

// Helper functions
async function checkSessionHealth() {
    try {
        const sessionPath = path.join(process.cwd(), 'session');
        const credsPath = path.join(sessionPath, 'creds.json');

        if (await fs.pathExists(credsPath)) {
            const creds = await fs.readJSON(credsPath);
            return !!(creds.noiseKey || creds.signedIdentityKey);
        }
        return false;
    } catch {
        return false;
    }
}

async function getSessionDiagnostics() {
    const sessionPath = path.join(process.cwd(), 'session');
    const keysPath = path.join(sessionPath, 'keys');
    
    try {
        const diagnostics = {
            sessionExists: await fs.pathExists(sessionPath),
            credsExists: await fs.pathExists(path.join(sessionPath, 'creds.json')),
            keysExists: await fs.pathExists(keysPath),
            keyFiles: []
        };
        
        if (diagnostics.keysExists) {
            try {
                const keyFiles = await fs.readdir(keysPath);
                diagnostics.keyFiles = keyFiles.filter(f => f.endsWith('.json'));
            } catch {
                diagnostics.keyFiles = [];
            }
        }
        
        return diagnostics;
    } catch (error) {
        return { error: error.message };
    }
}

async function getFilesystemDiagnostics() {
    try {
        const requiredDirs = ['session', 'logs', 'temp', 'media'];
        const diagnostics = {};
        
        for (const dir of requiredDirs) {
            diagnostics[dir] = await fs.pathExists(dir);
        }
        
        return diagnostics;
    } catch (error) {
        return { error: error.message };
    }
}

async function getNetworkDiagnostics() {
    return {
        hostname: os.hostname(),
        networkInterfaces: Object.keys(os.networkInterfaces()),
        platform: os.platform()
    };
}

function getProcessDiagnostics() {
    return {
        pid: process.pid,
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        cpuUsage: process.cpuUsage(),
        version: process.version,
        platform: process.platform,
        arch: process.arch
    };
}

export default router;