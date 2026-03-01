import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import compression from 'compression';
import morgan from 'morgan';
import path from 'path';
import fs from 'fs-extra';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import config from '../config.js';
import logger from './logger.js';
import { cache } from './cache.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class WebServer {
    constructor() {
        this.app = express();
        this.server = null;
        this.isRunning = false;
        this.routes = new Map();
        this.middleware = [];
        this.requestStats = {
            total: 0,
            success: 0,
            errors: 0,
            avgResponseTime: 0
        };
    }

    async startWebServer(customApp = null) {
        try {
            if (this.isRunning) {
                logger.warn('Web server is already running');
                return;
            }

            if (customApp) {
                this.app = customApp;
            }

            await this.setupMiddleware();
            await this.setupRoutes();
            await this.setupErrorHandling();

            const port = config.server.port || 3000;
            const host = config.server.host || '0.0.0.0';

            return new Promise((resolve, reject) => {
                this.server = this.app.listen(port, host, () => {
                    this.isRunning = true;
                    logger.info(`🌐 Web server running on http://${host}:${port}`);
                    resolve(this.server);
                });

                this.server.on('error', (error) => {
                    if (error.code === 'EADDRINUSE') {
                        logger.error(`Port ${port} is already in use. Trying alternative ports...`);
                        
                        const altPort = port + 1;
                        this.server = this.app.listen(altPort, host, () => {
                            this.isRunning = true;
                            logger.info(`🌐 Web server running on http://${host}:${altPort}`);
                            resolve(this.server);
                        });
                        
                        this.server.on('error', (err) => {
                            logger.error('Web server error on alternative port:', err);
                            reject(err);
                        });
                    } else {
                        logger.error('Web server error:', error);
                        reject(error);
                    }
                });
            });

        } catch (error) {
            logger.error('Failed to start web server:', error);
            throw error;
        }
    }

    async setupMiddleware() {
        this.app.use(helmet({
            contentSecurityPolicy: false,
            crossOriginEmbedderPolicy: false
        }));

        if (config.server.cors) {
            this.app.use(cors({
                origin: config.security.allowedOrigins,
                credentials: true
            }));
        }

        this.app.use(compression());

        const limiter = rateLimit({
            windowMs: config.server.rateLimit.windowMs,
            max: config.server.rateLimit.max,
            message: {
                error: 'Too many requests',
                message: 'Rate limit exceeded. Please try again later.'
            },
            standardHeaders: true,
            legacyHeaders: false
        });
        this.app.use('/api/', limiter);

        this.app.use(express.json({ 
            limit: '10mb',
            verify: (req, res, buf) => {
                req.rawBody = buf;
            }
        }));
        this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

        this.app.use(morgan('combined', {
            stream: {
                write: (message) => {
                    logger.http(message.trim());
                }
            }
        }));

        this.app.use((req, res, next) => {
            req.startTime = Date.now();
            next();
        });

        this.app.use((req, res, next) => {
            const originalSend = res.send;
            
            res.send = function(data) {
                const responseTime = Date.now() - req.startTime;
                
                logger.logAPI(req.method, req.path, res.statusCode, responseTime, req.get('User-Agent'));
                
                return originalSend.call(this, data);
            };
            
            next();
        });

        logger.info('Web server middleware configured');
    }

    async setupRoutes() {
        this.app.get('/', this.handleRoot.bind(this));
        this.app.get('/health', this.handleHealth.bind(this));
        this.app.get('/stats', this.handleStats.bind(this));
        this.app.get('/api/status', this.handleAPIStatus.bind(this));

        // Add QR routes
        this.app.get('/qr', this.handleQRPage.bind(this));
        this.app.get('/qr/image', this.handleQRImage.bind(this));
        this.app.get('/qr/data', this.handleQRData.bind(this));

        await this.loadAPIRoutes();

        this.app.use(express.static(path.join(__dirname, '..', 'assets', 'public')));

        this.app.use(this.handle404.bind(this));

        logger.info('Web server routes configured');
    }

    async loadAPIRoutes() {
        const routesPath = path.join(__dirname, '..', 'api', 'routes');
        
        if (!await fs.pathExists(routesPath)) {
            logger.info('API routes directory not found, skipping route loading');
            return;
        }

        try {
            const routeFiles = (await fs.readdir(routesPath))
                .filter(file => file.endsWith('.js'));

            for (const file of routeFiles) {
                try {
                    const routePath = path.join(routesPath, file);
                    const routeName = path.basename(file, '.js');
                    
                    const routeModule = await import(routePath);
                    const route = routeModule.default || routeModule;
                    
                    if (typeof route === 'function' || (route && typeof route.stack === 'object')) {
                        this.app.use(`/api/${routeName}`, route);
                        this.routes.set(routeName, route);
                        logger.info(`✅ Loaded API route: /api/${routeName}`);
                    } else {
                        logger.warn(`Skipping invalid route ${file}: not a valid Express router or middleware function`);
                    }
                } catch (error) {
                    logger.warn(`Skipping problematic route ${file}: ${error.message}`);
                }
            }
        } catch (error) {
            logger.warn(`Error reading routes directory: ${error.message}`);
        }
    }

    async createDefaultAPIRoutes() {
        const routesPath = path.join(__dirname, '..', 'api', 'routes');
        await fs.ensureDir(routesPath);

        const defaultRoutes = {
            'health.js': this.generateHealthRoute(),
            'stats.js': this.generateStatsRoute(),
            'commands.js': this.generateCommandsRoute(),
            'users.js': this.generateUsersRoute(),
            'groups.js': this.generateGroupsRoute()
        };

        for (const [filename, content] of Object.entries(defaultRoutes)) {
            const filePath = path.join(routesPath, filename);
            if (!await fs.pathExists(filePath)) {
                await fs.writeFile(filePath, content);
            }
        }
    }

    generateHealthRoute() {
        return `const express = require('express');
const router = express.Router();
const { cache } = require('../../utils/cache');
const { databaseManager } = require('../../utils/database');

router.get('/', async (req, res) => {
    try {
        const health = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            database: await databaseManager.isHealthy(),
            cache: await cache.isHealthy(),
            version: require('../../constants').BOT_VERSION
        };
        
        res.json(health);
    } catch (error) {
        res.status(500).json({
            status: 'unhealthy',
            error: error.message
        });
    }
});

module.exports = router;`;
    }

    generateStatsRoute() {
        return `const express = require('express');
const router = express.Router();
const { commandManager } = require('../../utils/commandManager');
const { pluginManager } = require('../../utils/pluginManager');
const { cache } = require('../../utils/cache');

router.get('/', async (req, res) => {
    try {
        const stats = {
            commands: commandManager.getSystemStats(),
            plugins: pluginManager.getPluginStats(),
            cache: await cache.getStats(),
            system: {
                uptime: process.uptime(),
                memory: process.memoryUsage(),
                platform: process.platform,
                nodeVersion: process.version
            }
        };
        
        res.json(stats);
    } catch (error) {
        res.status(500).json({
            error: 'Failed to get stats',
            message: error.message
        });
    }
});

module.exports = router;`;
    }

    generateCommandsRoute() {
        return `const express = require('express');
const router = express.Router();
const { commandManager } = require('../../utils/commandManager');

router.get('/', async (req, res) => {
    try {
        const commands = commandManager.getAllCommands().map(cmd => ({
            name: cmd.name,
            category: cmd.category,
            description: cmd.description,
            usage: cmd.usage,
            permissions: cmd.permissions,
            cooldown: cmd.cooldown,
            premium: cmd.premium
        }));
        
        res.json({
            total: commands.length,
            commands
        });
    } catch (error) {
        res.status(500).json({
            error: 'Failed to get commands',
            message: error.message
        });
    }
});

router.get('/categories', async (req, res) => {
    try {
        const categories = commandManager.getAllCategories();
        const categoryStats = {};
        
        for (const category of categories) {
            const commands = commandManager.getCommandsByCategory(category);
            categoryStats[category] = commands.length;
        }
        
        res.json({
            categories,
            stats: categoryStats
        });
    } catch (error) {
        res.status(500).json({
            error: 'Failed to get categories',
            message: error.message
        });
    }
});

module.exports = router;`;
    }

    generateUsersRoute() {
        return `const express = require('express');
const router = express.Router();
const { getUserStats } = require('../../models/User');

router.get('/stats', async (req, res) => {
    try {
        const stats = await getUserStats();
        res.json(stats);
    } catch (error) {
        res.status(500).json({
            error: 'Failed to get user stats',
            message: error.message
        });
    }
});

module.exports = router;`;
    }

    generateGroupsRoute() {
        return `const express = require('express');
const router = express.Router();
const { getGroupStats } = require('../../models/Group');

router.get('/stats', async (req, res) => {
    try {
        const stats = await getGroupStats();
        res.json(stats);
    } catch (error) {
        res.status(500).json({
            error: 'Failed to get group stats',
            message: error.message
        });
    }
});

module.exports = router;`;
    }

    async handleRoot(req, res) {
        try {
            const botInfo = {
                name: config.botName,
                version: (await import('../constants.js')).default.BOT_VERSION,
                description: config.botDescription,
                status: 'online',
                uptime: process.uptime(),
                timestamp: new Date().toISOString(),
                endpoints: {
                    health: '/health',
                    stats: '/stats',
                    api: '/api'
                }
            };

            res.json(botInfo);
        } catch (error) {
            res.status(500).json({
                error: 'Internal server error',
                message: error.message
            });
        }
    }

    async handleHealth(req, res) {
        try {
            const { databaseManager } = await import('./database.js');
            
            const health = {
                status: 'healthy',
                services: {
                    database: await databaseManager.isHealthy(),
                    cache: await cache.isHealthy(),
                    whatsapp: global.sock?.user ? true : false
                },
                uptime: process.uptime(),
                memory: process.memoryUsage(),
                timestamp: new Date().toISOString()
            };

            const allHealthy = Object.values(health.services).every(status => status === true);
            
            res.status(allHealthy ? 200 : 503).json(health);
        } catch (error) {
            res.status(500).json({
                status: 'unhealthy',
                error: error.message
            });
        }
    }

    async handleStats(req, res) {
        try {
            const { commandManager } = await import('./commandManager.js');
            const { pluginManager } = await import('./pluginManager.js');
            const { taskScheduler } = await import('./scheduler.js');

            const stats = {
                bot: {
                    name: config.botName,
                    version: (await import('../constants.js')).default.BOT_VERSION,
                    uptime: process.uptime(),
                    connected: global.sock?.user ? true : false
                },
                system: {
                    platform: process.platform,
                    nodeVersion: process.version,
                    memory: process.memoryUsage(),
                    cpu: process.cpuUsage()
                },
                commands: commandManager.getSystemStats(),
                plugins: pluginManager.getPluginStats(),
                tasks: taskScheduler.getTaskStats(),
                cache: await cache.getStats(),
                requests: this.requestStats,
                timestamp: new Date().toISOString()
            };

            res.json(stats);
        } catch (error) {
            res.status(500).json({
                error: 'Failed to get stats',
                message: error.message
            });
        }
    }

    async handleAPIStatus(req, res) {
        try {
            const status = {
                api: 'online',
                version: '1.0.0',
                endpoints: Array.from(this.routes.keys()).map(route => `/api/${route}`),
                timestamp: new Date().toISOString()
            };

            res.json(status);
        } catch (error) {
            res.status(500).json({
                error: 'API status error',
                message: error.message
            });
        }
    }

    async handleQRPage(req, res) {
        try {
            const { qrService } = await import('../services/qrService.js');
            const qrStatus = qrService.getQRStatus();

            if (!qrStatus.enabled) {
                return res.status(403).send(`
                    <html>
                        <head><title>QR Scanner Disabled</title></head>
                        <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
                            <h1>QR Scanner is Disabled</h1>
                            <p>Set <code>QR_SCANNER_ENABLED=true</code> in your environment variables to enable QR scanner.</p>
                        </body>
                    </html>
                `);
            }

            if (!qrStatus.hasQR) {
                return res.status(404).send(`
                    <html>
                        <head><title>No QR Code Available</title></head>
                        <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
                            <h1>No QR Code Available</h1>
                            <p>QR code will be generated when WhatsApp connection requires authentication.</p>
                            <p>Please wait for the connection process to start...</p>
                        </body>
                    </html>
                `);
            }

            res.send(`
                <html>
                    <head>
                        <title>WhatsApp QR Code</title>
                        <style>
                            body {
                                font-family: Arial, sans-serif;
                                text-align: center;
                                padding: 20px;
                                background-color: #f5f5f5;
                            }
                            .container {
                                max-width: 400px;
                                margin: 0 auto;
                                background: white;
                                padding: 30px;
                                border-radius: 10px;
                                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                            }
                            h1 {
                                color: #25d366;
                                margin-bottom: 20px;
                            }
                            img {
                                max-width: 100%;
                                height: auto;
                                border: 2px solid #25d366;
                                border-radius: 5px;
                            }
                            p {
                                color: #666;
                                margin: 15px 0;
                            }
                            .refresh-btn {
                                background: #25d366;
                                color: white;
                                border: none;
                                padding: 10px 20px;
                                border-radius: 5px;
                                cursor: pointer;
                                margin-top: 15px;
                            }
                            .refresh-btn:hover {
                                background: #128c7e;
                            }
                        </style>
                    </head>
                    <body>
                        <div class="container">
                            <h1>📱 WhatsApp QR Code</h1>
                            <p>Scan this QR code with WhatsApp to connect your bot</p>
                            <img src="/qr/image" alt="WhatsApp QR Code" />
                            <p><small>If the QR code doesn't work, refresh the page</small></p>
                            <button class="refresh-btn" onclick="location.reload()">🔄 Refresh</button>
                        </div>
                    </body>
                </html>
            `);
        } catch (error) {
            logger.error('Error serving QR page:', error);
            res.status(500).send(`
                <html>
                    <head><title>Error</title></head>
                    <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
                        <h1>Error Loading QR Code</h1>
                        <p>${error.message}</p>
                    </body>
                </html>
            `);
        }
    }

    async handleQRImage(req, res) {
        try {
            const { qrService } = await import('../services/qrService.js');
            const qrStatus = qrService.getQRStatus();

            if (!qrStatus.enabled) {
                return res.status(403).json({ error: 'QR scanner is not enabled' });
            }

            if (!qrStatus.hasQR || !qrStatus.exists) {
                return res.status(404).json({ error: 'QR code image not found' });
            }

            res.setHeader('Content-Type', 'image/png');
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');

            const fs = await import('fs-extra');
            const qrStream = fs.createReadStream(qrStatus.path);
            qrStream.pipe(res);

            qrStream.on('error', (error) => {
                logger.error('Error streaming QR image:', error);
                if (!res.headersSent) {
                    res.status(500).json({ error: 'Failed to stream QR image' });
                }
            });
        } catch (error) {
            logger.error('Error serving QR image:', error);
            if (!res.headersSent) {
                res.status(500).json({ error: 'Failed to serve QR image' });
            }
        }
    }

    async handleQRData(req, res) {
        try {
            const { qrService } = await import('../services/qrService.js');
            const qrStatus = qrService.getQRStatus();

            if (!qrStatus.enabled) {
                return res.status(403).json({ error: 'QR scanner is not enabled' });
            }

            if (!qrStatus.qrData) {
                return res.status(404).json({ error: 'No QR data available' });
            }

            const qrDataURL = await qrService.generateQRDataURL(qrStatus.qrData);

            if (!qrDataURL) {
                return res.status(500).json({ error: 'Failed to generate QR data URL' });
            }

            res.json({
                status: 'success',
                qrDataURL: qrDataURL,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            logger.error('Error getting QR data:', error);
            res.status(500).json({ error: 'Failed to get QR data' });
        }
    }

    handle404(req, res) {
        res.status(404).json({
            error: 'Not Found',
            message: `Route ${req.path} not found`,
            timestamp: new Date().toISOString()
        });
    }

    async setupErrorHandling() {
        this.app.use((error, req, res, next) => {
            logger.error('Express error:', error);
            
            this.requestStats.errors++;
            
            res.status(500).json({
                error: 'Internal Server Error',
                message: config.isDevelopment() ? error.message : 'Something went wrong',
                timestamp: new Date().toISOString()
            });
        });

        process.on('unhandledRejection', (reason, promise) => {
            logger.error('Unhandled Rejection in web server:', reason);
        });

        process.on('uncaughtException', (error) => {
            logger.error('Uncaught Exception in web server:', error);
        });
    }

    addRoute(path, router) {
        this.app.use(path, router);
        this.routes.set(path, router);
        logger.info(`Added custom route: ${path}`);
    }

    addMiddleware(middleware) {
        this.app.use(middleware);
        this.middleware.push(middleware);
        logger.info('Added custom middleware');
    }

    getStats() {
        return {
            isRunning: this.isRunning,
            port: this.server?.address()?.port,
            routes: this.routes.size,
            middleware: this.middleware.length,
            requests: this.requestStats
        };
    }

    async createWebhook(path, handler) {
        this.app.post(path, async (req, res) => {
            try {
                const result = await handler(req.body, req.headers);
                res.json({ success: true, result });
            } catch (error) {
                logger.error(`Webhook error [${path}]:`, error);
                res.status(500).json({ 
                    success: false, 
                    error: error.message 
                });
            }
        });

        logger.info(`Created webhook: ${path}`);
    }

    async stopWebServer() {
        try {
            if (this.server && this.isRunning) {
                await new Promise((resolve) => {
                    this.server.close(() => {
                        this.isRunning = false;
                        logger.info('Web server stopped');
                        resolve();
                    });
                });
            }
        } catch (error) {
            logger.error('Failed to stop web server:', error);
        }
    }

    generateServerInfo() {
        const serverInfo = this.getStats();
        
        return `🌐 *Web Server Status*

📊 *Server Info:*
├ Status: ${serverInfo.isRunning ? '🟢 Running' : '🔴 Stopped'}
├ Port: ${serverInfo.port || 'N/A'}
├ Routes: ${serverInfo.routes}
├ Middleware: ${serverInfo.middleware}

📈 *Request Stats:*
├ Total: ${this.requestStats.total}
├ Success: ${this.requestStats.success}
├ Errors: ${this.requestStats.errors}
├ Success Rate: ${this.requestStats.total > 0 ? 
    ((this.requestStats.success / this.requestStats.total) * 100).toFixed(2) : 0}%
╰ Avg Response: ${this.requestStats.avgResponseTime.toFixed(2)}ms

🔗 *Available Endpoints:*
├ Health: /health
├ Stats: /stats
├ API Status: /api/status
├ Commands: /api/commands
├ Users: /api/users/stats
╰ Groups: /api/groups/stats

_Server running on http://localhost:${serverInfo.port}_`;
    }
}

export const webServer = new WebServer();

export const startWebServer = (app) => webServer.startWebServer(app);
export const stopWebServer = () => webServer.stopWebServer();
export const addRoute = (path, router) => webServer.addRoute(path, router);
export const addMiddleware = (middleware) => webServer.addMiddleware(middleware);
export const createWebhook = (path, handler) => webServer.createWebhook(path, handler);
export const getStats = () => webServer.getStats();
export const generateServerInfo = () => webServer.generateServerInfo();