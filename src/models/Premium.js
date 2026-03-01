import mongoose from 'mongoose';

const PremiumSchema = new mongoose.Schema({
    jid: {
        type: String,
        required: true,
        unique: true
    },
    tier: {
        type: String,
        enum: ['basic', 'premium', 'vip', 'lifetime'],
        default: 'basic'
    },
    active: {
        type: Boolean,
        default: true
    },
    startedAt: {
        type: Date,
        default: Date.now
    },
    expiresAt: {
        type: Date,
        required: true
    },
    features: [{
        type: String
    }],
    autoRenew: {
        type: Boolean,
        default: false
    },
    paymentMethod: {
        type: String,
        default: null
    },
    transactionId: {
        type: String,
        default: null
    }
}, {
    timestamps: true
});

PremiumSchema.methods.isExpired = function() {
    return this.expiresAt < new Date();
};

const Premium = mongoose.models.Premium || mongoose.model('Premium', PremiumSchema);
export default Premium;
