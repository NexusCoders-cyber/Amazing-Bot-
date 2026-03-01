import mongoose from 'mongoose';

const LogSchema = new mongoose.Schema({
    level: {
        type: String,
        required: true,
        enum: ['error', 'warn', 'info', 'http', 'verbose', 'debug']
    },
    message: {
        type: String,
        required: true
    },
    metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    userId: {
        type: String,
        default: null
    },
    groupId: {
        type: String,
        default: null
    },
    command: {
        type: String,
        default: null
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

LogSchema.index({ timestamp: -1 });
LogSchema.index({ level: 1 });
LogSchema.index({ userId: 1 });

const Log = mongoose.models.Log || mongoose.model('Log', LogSchema);
export default Log;
