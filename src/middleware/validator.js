import { validationResult } from 'express-validator';
import logger from '../utils/logger.js';

export function validateRequest(req, res, next) {
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
        logger.warn('Validation errors:', {
            path: req.path,
            errors: errors.array()
        });
        
        return res.status(400).json({
            success: false,
            errors: errors.array().map(err => ({
                field: err.path || err.param,
                message: err.msg
            }))
        });
    }
    
    next();
}

export default validateRequest;
