import mongoose from 'mongoose';

const BanSchema = new mongoose.Schema({
    jid: {
        type: String,
        required: true,
        unique: true
    },
    reason: {
        type: String,
        default: 'Violation of bot rules'
    },
    bannedBy: {
        type: String,
        required: true
    },
    bannedAt: {
        type: Date,
        default: Date.now
    },
    expiresAt: {
        type: Date,
        default: null
    },
    permanent: {
        type: Boolean,
        default: false
    },
    active: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

const Ban = mongoose.models.Ban || mongoose.model('Ban', BanSchema);
export default Ban;
