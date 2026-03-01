import mongoose from 'mongoose';

const EconomySchema = new mongoose.Schema({
    jid: {
        type: String,
        required: true,
        unique: true
    },
    balance: {
        type: Number,
        default: 1000
    },
    bank: {
        type: Number,
        default: 0
    },
    diamonds: {
        type: Number,
        default: 0
    },
    stars: {
        type: Number,
        default: 0
    },
    level: {
        type: Number,
        default: 1
    },
    xp: {
        type: Number,
        default: 0
    },
    lastDaily: {
        type: Date,
        default: null
    },
    lastWeekly: {
        type: Date,
        default: null
    },
    lastMonthly: {
        type: Date,
        default: null
    },
    lastWork: {
        type: Date,
        default: null
    },
    transactions: [{
        type: {
            type: String,
            enum: ['earn', 'spend', 'transfer'],
            required: true
        },
        amount: Number,
        reason: String,
        timestamp: {
            type: Date,
            default: Date.now
        }
    }]
}, {
    timestamps: true
});

const Economy = mongoose.models.Economy || mongoose.model('Economy', EconomySchema);
export default Economy;
