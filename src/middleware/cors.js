import cors from 'cors';

const corsOptions = {
    origin: (origin, callback) => {
        const whitelist = process.env.CORS_WHITELIST?.split(',') || ['*'];
        
        if (whitelist.includes('*') || !origin || whitelist.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    optionsSuccessStatus: 200,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-API-Key']
};

export default cors(corsOptions);
