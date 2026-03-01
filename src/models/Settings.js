import mongoose from 'mongoose';

const SettingsSchema = new mongoose.Schema({
    key: {
        type: String,
        required: true,
        unique: true
    },
    value: {
        type: mongoose.Schema.Types.Mixed,
        required: true
    },
    type: {
        type: String,
        enum: ['string', 'number', 'boolean', 'object', 'array'],
        required: true
    },
    description: {
        type: String,
        default: ''
    },
    category: {
        type: String,
        default: 'general'
    },
    editable: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

const Settings = mongoose.models.Settings || mongoose.model('Settings', SettingsSchema);
export default Settings;
