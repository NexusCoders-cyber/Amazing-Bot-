const validator = require('validator');
const logger = require('./logger');

class ValidationUtils {
    constructor() {
        this.patterns = {
            phone: /^\+?[1-9]\d{1,14}$/,
            whatsappJid: /^\d{10,15}@s\.whatsapp\.net$/,
            groupJid: /^\d{17,18}-\d{10}@g\.us$/,
            url: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/,
            email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
            ipv4: /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,
            ipv6: /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]+|::(ffff(:0{1,4})?:)?((25[0-5]|(2[0-4]|1?[0-9])?[0-9])\.){3}(25[0-5]|(2[0-4]|1?[0-9])?[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1?[0-9])?[0-9])\.){3}(25[0-5]|(2[0-4]|1?[0-9])?[0-9]))$/,
            hex: /^[0-9a-fA-F]+$/,
            base64: /^[A-Za-z0-9+/]*={0,2}$/,
            uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
            alphanumeric: /^[a-zA-Z0-9]+$/,
            numeric: /^[0-9]+$/,
            alpha: /^[a-zA-Z]+$/,
            username: /^[a-zA-Z0-9_]{3,20}$/,
            password: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
            hashtag: /^#[a-zA-Z0-9_]+$/,
            mention: /^@[a-zA-Z0-9_]+$/,
            creditCard: /^\d{4}\s?\d{4}\s?\d{4}\s?\d{4}$/,
            ssn: /^\d{3}-\d{2}-\d{4}$/,
            zipCode: /^\d{5}(-\d{4})?$/,
            mongoId: /^[0-9a-fA-F]{24}$/,
            jwt: /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_.+/]*$/
        };
        
        this.limits = {
            string: { min: 0, max: 10000 },
            username: { min: 3, max: 20 },
            password: { min: 8, max: 128 },
            email: { min: 5, max: 254 },
            phone: { min: 10, max: 15 },
            url: { min: 10, max: 2048 },
            message: { min: 1, max: 4096 },
            filename: { min: 1, max: 255 },
            description: { min: 0, max: 500 },
            title: { min: 1, max: 100 },
            amount: { min: 0, max: 1000000 },
            age: { min: 1, max: 150 },
            port: { min: 1, max: 65535 }
        };
    }

    validateString(value, options = {}) {
        const {
            required = false,
            minLength = this.limits.string.min,
            maxLength = this.limits.string.max,
            pattern = null,
            trim = true,
            allowEmpty = !required
        } = options;

        if (value === null || value === undefined) {
            if (required) {
                return { valid: false, error: 'Value is required' };
            }
            return { valid: true, value: null };
        }

        if (typeof value !== 'string') {
            return { valid: false, error: 'Value must be a string' };
        }

        let processedValue = trim ? value.trim() : value;

        if (!allowEmpty && processedValue.length === 0) {
            return { valid: false, error: 'Value cannot be empty' };
        }

        if (processedValue.length < minLength) {
            return { valid: false, error: `Value must be at least ${minLength} characters` };
        }

        if (processedValue.length > maxLength) {
            return { valid: false, error: `Value must not exceed ${maxLength} characters` };
        }

        if (pattern && !pattern.test(processedValue)) {
            return { valid: false, error: 'Value format is invalid' };
        }

        return { valid: true, value: processedValue };
    }

    validateNumber(value, options = {}) {
        const {
            required = false,
            min = Number.MIN_SAFE_INTEGER,
            max = Number.MAX_SAFE_INTEGER,
            integer = false,
            positive = false,
            allowZero = true
        } = options;

        if (value === null || value === undefined) {
            if (required) {
                return { valid: false, error: 'Value is required' };
            }
            return { valid: true, value: null };
        }

        const numValue = typeof value === 'string' ? parseFloat(value) : value;

        if (isNaN(numValue) || typeof numValue !== 'number') {
            return { valid: false, error: 'Value must be a valid number' };
        }

        if (!isFinite(numValue)) {
            return { valid: false, error: 'Value must be finite' };
        }

        if (integer && !Number.isInteger(numValue)) {
            return { valid: false, error: 'Value must be an integer' };
        }

        if (positive && numValue < 0) {
            return { valid: false, error: 'Value must be positive' };
        }

        if (!allowZero && numValue === 0) {
            return { valid: false, error: 'Value cannot be zero' };
        }

        if (numValue < min) {
            return { valid: false, error: `Value must be at least ${min}` };
        }

        if (numValue > max) {
            return { valid: false, error: `Value must not exceed ${max}` };
        }

        return { valid: true, value: numValue };
    }

    validateBoolean(value, options = {}) {
        const { required = false } = options;

        if (value === null || value === undefined) {
            if (required) {
                return { valid: false, error: 'Value is required' };
            }
            return { valid: true, value: null };
        }

        if (typeof value === 'boolean') {
            return { valid: true, value };
        }

        if (typeof value === 'string') {
            const lowerValue = value.toLowerCase().trim();
            if (['true', '1', 'yes', 'on'].includes(lowerValue)) {
                return { valid: true, value: true };
            }
            if (['false', '0', 'no', 'off'].includes(lowerValue)) {
                return { valid: true, value: false };
            }
        }

        if (typeof value === 'number') {
            if (value === 1) return { valid: true, value: true };
            if (value === 0) return { valid: true, value: false };
        }

        return { valid: false, error: 'Value must be a valid boolean' };
    }

    validateArray(value, options = {}) {
        const {
            required = false,
            minLength = 0,
            maxLength = 1000,
            itemValidator = null,
            unique = false
        } = options;

        if (value === null || value === undefined) {
            if (required) {
                return { valid: false, error: 'Array is required' };
            }
            return { valid: true, value: null };
        }

        if (!Array.isArray(value)) {
            return { valid: false, error: 'Value must be an array' };
        }

        if (value.length < minLength) {
            return { valid: false, error: `Array must have at least ${minLength} items` };
        }

        if (value.length > maxLength) {
            return { valid: false, error: `Array must not exceed ${maxLength} items` };
        }

        if (unique) {
            const uniqueItems = [...new Set(value.map(item => JSON.stringify(item)))];
            if (uniqueItems.length !== value.length) {
                return { valid: false, error: 'Array items must be unique' };
            }
        }

        if (itemValidator) {
            const validatedItems = [];
            for (let i = 0; i < value.length; i++) {
                const itemResult = itemValidator(value[i], i);
                if (!itemResult.valid) {
                    return { valid: false, error: `Item at index ${i}: ${itemResult.error}` };
                }
                validatedItems.push(itemResult.value);
            }
            return { valid: true, value: validatedItems };
        }

        return { valid: true, value };
    }

    validateObject(value, schema, options = {}) {
        const { required = false, strict = false, allowUnknown = !strict } = options;

        if (value === null || value === undefined) {
            if (required) {
                return { valid: false, error: 'Object is required' };
            }
            return { valid: true, value: null };
        }

        if (typeof value !== 'object' || Array.isArray(value)) {
            return { valid: false, error: 'Value must be an object' };
        }

        const result = {};
        const errors = [];

        for (const [key, validator] of Object.entries(schema)) {
            const fieldResult = validator(value[key]);
            if (!fieldResult.valid) {
                errors.push(`${key}: ${fieldResult.error}`);
            } else {
                result[key] = fieldResult.value;
            }
        }

        if (!allowUnknown) {
            for (const key of Object.keys(value)) {
                if (!schema[key]) {
                    errors.push(`Unknown field: ${key}`);
                }
            }
        } else {
            for (const key of Object.keys(value)) {
                if (!schema[key]) {
                    result[key] = value[key];
                }
            }
        }

        if (errors.length > 0) {
            return { valid: false, error: errors.join(', ') };
        }

        return { valid: true, value: result };
    }

    validateEmail(email, options = {}) {
        const validation = this.validateString(email, {
            required: options.required,
            minLength: this.limits.email.min,
            maxLength: this.limits.email.max,
            pattern: this.patterns.email
        });

        if (!validation.valid) {
            return validation;
        }

        if (validation.value && !validator.isEmail(validation.value)) {
            return { valid: false, error: 'Invalid email format' };
        }

        return validation;
    }

    validatePhone(phone, options = {}) {
        const validation = this.validateString(phone, {
            required: options.required,
            minLength: this.limits.phone.min,
            maxLength: this.limits.phone.max
        });

        if (!validation.valid) {
            return validation;
        }

        if (validation.value) {
            const cleanPhone = validation.value.replace(/[^\d+]/g, '');
            if (!this.patterns.phone.test(cleanPhone)) {
                return { valid: false, error: 'Invalid phone number format' };
            }
            return { valid: true, value: cleanPhone };
        }

        return validation;
    }

    validateURL(url, options = {}) {
        const { protocols = ['http', 'https'] } = options;

        const validation = this.validateString(url, {
            required: options.required,
            minLength: this.limits.url.min,
            maxLength: this.limits.url.max
        });

        if (!validation.valid) {
            return validation;
        }

        if (validation.value) {
            if (!validator.isURL(validation.value, { protocols })) {
                return { valid: false, error: 'Invalid URL format' };
            }
        }

        return validation;
    }

    validateWhatsAppJid(jid, options = {}) {
        const validation = this.validateString(jid, {
            required: options.required
        });

        if (!validation.valid) {
            return validation;
        }

        if (validation.value) {
            const isUser = this.patterns.whatsappJid.test(validation.value);
            const isGroup = this.patterns.groupJid.test(validation.value);
            
            if (!isUser && !isGroup) {
                return { valid: false, error: 'Invalid WhatsApp JID format' };
            }

            return { valid: true, value: validation.value, type: isUser ? 'user' : 'group' };
        }

        return validation;
    }

    validateUsername(username, options = {}) {
        return this.validateString(username, {
            required: options.required,
            minLength: this.limits.username.min,
            maxLength: this.limits.username.max,
            pattern: this.patterns.username
        });
    }

    validatePassword(password, options = {}) {
        const { requireStrong = true } = options;

        const validation = this.validateString(password, {
            required: options.required,
            minLength: this.limits.password.min,
            maxLength: this.limits.password.max,
            trim: false
        });

        if (!validation.valid) {
            return validation;
        }

        if (validation.value && requireStrong) {
            if (!this.patterns.password.test(validation.value)) {
                return {
                    valid: false,
                    error: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
                };
            }
        }

        return validation;
    }

    validateAmount(amount, options = {}) {
        const { currency = 'USD', allowNegative = false } = options;

        const validation = this.validateNumber(amount, {
            required: options.required,
            min: allowNegative ? -this.limits.amount.max : 0,
            max: this.limits.amount.max,
            positive: !allowNegative
        });

        if (!validation.valid) {
            return validation;
        }

        if (validation.value !== null && validation.value !== undefined) {
            const rounded = Math.round(validation.value * 100) / 100;
            return { valid: true, value: rounded, currency };
        }

        return validation;
    }

    validateDate(date, options = {}) {
        const { required = false, min = null, max = null, future = false, past = false } = options;

        if (date === null || date === undefined) {
            if (required) {
                return { valid: false, error: 'Date is required' };
            }
            return { valid: true, value: null };
        }

        let dateObj;
        if (date instanceof Date) {
            dateObj = date;
        } else if (typeof date === 'string' || typeof date === 'number') {
            dateObj = new Date(date);
        } else {
            return { valid: false, error: 'Invalid date format' };
        }

        if (isNaN(dateObj.getTime())) {
            return { valid: false, error: 'Invalid date' };
        }

        const now = new Date();

        if (future && dateObj <= now) {
            return { valid: false, error: 'Date must be in the future' };
        }

        if (past && dateObj >= now) {
            return { valid: false, error: 'Date must be in the past' };
        }

        if (min && dateObj < new Date(min)) {
            return { valid: false, error: `Date must be after ${new Date(min).toDateString()}` };
        }

        if (max && dateObj > new Date(max)) {
            return { valid: false, error: `Date must be before ${new Date(max).toDateString()}` };
        }

        return { valid: true, value: dateObj };
    }

    validateFile(file, options = {}) {
        const {
            required = false,
            maxSize = 50 * 1024 * 1024,
            allowedTypes = [],
            allowedExtensions = []
        } = options;

        if (!file) {
            if (required) {
                return { valid: false, error: 'File is required' };
            }
            return { valid: true, value: null };
        }

        if (file.size > maxSize) {
            return {
                valid: false,
                error: `File size must not exceed ${Math.round(maxSize / 1024 / 1024)}MB`
            };
        }

        if (allowedTypes.length > 0 && !allowedTypes.includes(file.mimetype)) {
            return {
                valid: false,
                error: `File type not allowed. Allowed types: ${allowedTypes.join(', ')}`
            };
        }

        if (allowedExtensions.length > 0) {
            const extension = file.originalname?.split('.').pop()?.toLowerCase();
            if (!allowedExtensions.includes(extension)) {
                return {
                    valid: false,
                    error: `File extension not allowed. Allowed extensions: ${allowedExtensions.join(', ')}`
                };
            }
        }

        return { valid: true, value: file };
    }

    sanitizeInput(input, options = {}) {
        const {
            removeHTML = true,
            removeScripts = true,
            trim = true,
            maxLength = 10000
        } = options;

        if (typeof input !== 'string') {
            return input;
        }

        let sanitized = input;

        if (trim) {
            sanitized = sanitized.trim();
        }

        if (removeHTML) {
            sanitized = sanitized.replace(/<[^>]*>/g, '');
        }

        if (removeScripts) {
            sanitized = sanitized.replace(/<script[^>]*>.*?<\/script>/gi, '');
            sanitized = sanitized.replace(/javascript:/gi, '');
            sanitized = sanitized.replace(/on\w+\s*=/gi, '');
        }

        if (maxLength && sanitized.length > maxLength) {
            sanitized = sanitized.substring(0, maxLength);
        }

        return sanitized;
    }

    createValidator(schema) {
        return (data) => {
            return this.validateObject(data, schema);
        };
    }

    validateCommandInput(command, args = [], options = {}) {
        const {
            maxArgs = 10,
            requiredArgs = 0,
            argValidators = []
        } = options;

        const commandValidation = this.validateString(command, {
            required: true,
            minLength: 1,
            maxLength: 50,
            pattern: this.patterns.alphanumeric
        });

        if (!commandValidation.valid) {
            return commandValidation;
        }

        if (!Array.isArray(args)) {
            return { valid: false, error: 'Arguments must be an array' };
        }

        if (args.length < requiredArgs) {
            return { valid: false, error: `Command requires at least ${requiredArgs} arguments` };
        }

        if (args.length > maxArgs) {
            return { valid: false, error: `Command accepts maximum ${maxArgs} arguments` };
        }

        const validatedArgs = [];
        for (let i = 0; i < args.length; i++) {
            if (argValidators[i]) {
                const argResult = argValidators[i](args[i]);
                if (!argResult.valid) {
                    return { valid: false, error: `Argument ${i + 1}: ${argResult.error}` };
                }
                validatedArgs.push(argResult.value);
            } else {
                validatedArgs.push(this.sanitizeInput(args[i]));
            }
        }

        return {
            valid: true,
            value: {
                command: commandValidation.value,
                args: validatedArgs
            }
        };
    }

    isValidPattern(value, patternName) {
        if (!this.patterns[patternName]) {
            logger.warn(`Unknown validation pattern: ${patternName}`);
            return false;
        }

        return this.patterns[patternName].test(String(value));
    }

    addCustomPattern(name, pattern) {
        this.patterns[name] = pattern;
        logger.info(`Added custom validation pattern: ${name}`);
    }

    getValidationSummary(results) {
        const summary = {
            valid: true,
            errors: [],
            warnings: [],
            validatedFields: 0,
            invalidFields: 0
        };

        for (const [field, result] of Object.entries(results)) {
            summary.validatedFields++;
            
            if (!result.valid) {
                summary.valid = false;
                summary.invalidFields++;
                summary.errors.push(`${field}: ${result.error}`);
            }
        }

        return summary;
    }
}

const validationUtils = new ValidationUtils();

module.exports = {
    validationUtils,
    validateString: (value, options) => validationUtils.validateString(value, options),
    validateNumber: (value, options) => validationUtils.validateNumber(value, options),
    validateBoolean: (value, options) => validationUtils.validateBoolean(value, options),
    validateArray: (value, options) => validationUtils.validateArray(value, options),
    validateObject: (value, schema, options) => validationUtils.validateObject(value, schema, options),
    validateEmail: (email, options) => validationUtils.validateEmail(email, options),
    validatePhone: (phone, options) => validationUtils.validatePhone(phone, options),
    validateURL: (url, options) => validationUtils.validateURL(url, options),
    validateWhatsAppJid: (jid, options) => validationUtils.validateWhatsAppJid(jid, options),
    validateUsername: (username, options) => validationUtils.validateUsername(username, options),
    validatePassword: (password, options) => validationUtils.validatePassword(password, options),
    validateAmount: (amount, options) => validationUtils.validateAmount(amount, options),
    validateDate: (date, options) => validationUtils.validateDate(date, options),
    validateFile: (file, options) => validationUtils.validateFile(file, options),
    sanitizeInput: (input, options) => validationUtils.sanitizeInput(input, options),
    validateCommandInput: (command, args, options) => validationUtils.validateCommandInput(command, args, options),
    isValidPattern: (value, pattern) => validationUtils.isValidPattern(value, pattern),
    addCustomPattern: (name, pattern) => validationUtils.addCustomPattern(name, pattern),
    createValidator: (schema) => validationUtils.createValidator(schema)
};