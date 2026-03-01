import mongoose from 'mongoose';

const SessionSchema = new mongoose.Schema({
    sessionId: {
        type: String,
        required: true,
        unique: true
    },
    userId: {
        type: String,
        required: true
    },
    token: {
        type: String,
        required: true
    },
    ipAddress: {
        type: String,
        default: null
    },
    userAgent: {
        type: String,
        default: null
    },
    active: {
        type: Boolean,
        default: true
    },
    expiresAt: {
        type: Date,
        required: true
    },
    lastActivity: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

SessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
SessionSchema.index({ userId: 1 });
SessionSchema.index({ token: 1 });

const Session = mongoose.models.Session || mongoose.model('Session', SessionSchema);
export default Session;
