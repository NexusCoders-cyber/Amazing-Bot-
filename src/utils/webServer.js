const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs-extra');
const config = require('../config');
const logger = require('./logger');
const { cache } = require('./cache');

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

            this.server = this.app.listen(port, host, () => {
                this.isRunning = true;
                logger.info(`🌐 Web server running on http://${host}:${port}`);
            });

            this.server.on('error', (error) => {
                logger.error('Web server error:', error);
            });

            return this.server;
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

        await this.loadAPIRoutes();
        
        this.app.use(express.static(path.join(__dirname, '..', 'assets', 'public')));
        
        this.app.get('*', this.handle404.bind(this));

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
                    
                    delete require.cache[require.resolve(routePath)];
                    const route = require(routePath);
                    
                    if (typeof route === 'function' && route.length === 4) {
                        this.app.use(`/api/${routeName}`, route);
                        this.routes.set(routeName, route);
                        logger.debug(`Loaded API route: /api/${routeName}`);
                    } else {
                        logger.warn(`Skipping invalid route ${file}: not a valid middleware function`);
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
                version: require('../constants').BOT_VERSION,
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
            const { databaseManager } = require('./database');
            
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
            const { commandManager } = require('./commandManager');
            const { pluginManager } = require('./pluginManager');
            const { taskScheduler } = require('./scheduler');

            const stats = {
                bot: {
                    name: config.botName,
                    version: require('../constants').BOT_VERSION,
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

const webServer = new WebServer();

module.exports = {
    webServer,
    startWebServer: (app) => webServer.startWebServer(app),
    stopWebServer: () => webServer.stopWebServer(),
    addRoute: (path, router) => webServer.addRoute(path, router),
    addMiddleware: (middleware) => webServer.addMiddleware(middleware),
    createWebhook: (path, handler) => webServer.createWebhook(path, handler),
    getStats: () => webServer.getStats(),
    generateServerInfo: () => webServer.generateServerInfo()
};