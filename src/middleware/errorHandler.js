import logger from '../utils/logger.js';

export default function errorHandler(err, req, res, next) {
    logger.error('Express error:', {
        error: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method,
        ip: req.ip
    });

    const statusCode = err.statusCode || err.status || 500;
    const message = err.message || 'Internal server error';

    res.status(statusCode).json({
        success: false,
        error: {
            message,
            ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
        }
    });
}
