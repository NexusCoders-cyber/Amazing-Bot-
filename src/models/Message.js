import mongoose from 'mongoose';

const MessageSchema = new mongoose.Schema({
    messageId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    from: {
        type: String,
        required: true,
        index: true
    },
    sender: {
        type: String,
        required: true,
        index: true
    },
    timestamp: {
        type: Date,
        required: true,
        index: true
    },
    content: {
        type: String,
        default: ''
    },
    messageType: {
        type: String,
        enum: ['text', 'image', 'video', 'audio', 'document', 'sticker', 'contact', 'location', 'liveLocation', 'poll', 'buttonResponse', 'listResponse'],
        default: 'text'
    },
    isGroup: {
        type: Boolean,
        default: false,
        index: true
    },
    hasMedia: {
        type: Boolean,
        default: false
    },
    isCommand: {
        type: Boolean,
        default: false
    },
    userData: {
        phone: String,
        name: String
    },
    metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    }
}, {
    timestamps: true,
    versionKey: false
});

MessageSchema.index({ sender: 1, timestamp: -1 });
MessageSchema.index({ from: 1, timestamp: -1 });
MessageSchema.index({ messageType: 1, timestamp: -1 });

const Message = mongoose.model('Message', MessageSchema);

async function createMessage(messageData) {
    try {
        if (mongoose.connection.readyState !== 1) {
            return null;
        }
        const message = new Message(messageData);
        return await message.save();
    } catch (error) {
        return null;
    }
}

async function getMessage(messageId) {
    try {
        if (mongoose.connection.readyState !== 1) {
            return null;
        }
        return await Message.findOne({ messageId });
    } catch (error) {
        return null;
    }
}

async function getMessagesByUser(user, limit = 100) {
    try {
        if (mongoose.connection.readyState !== 1) {
            return [];
        }
        return await Message.find({ sender: user })
            .sort({ timestamp: -1 })
            .limit(limit);
    } catch (error) {
        return [];
    }
}

async function getMessagesByGroup(group, limit = 100) {
    try {
        if (mongoose.connection.readyState !== 1) {
            return [];
        }
        return await Message.find({ from: group })
            .sort({ timestamp: -1 })
            .limit(limit);
    } catch (error) {
        return [];
    }
}

async function getMessageStats(timeRange = null) {
    try {
        if (mongoose.connection.readyState !== 1) {
            return {
                totalMessages: 0,
                textMessages: 0,
                mediaMessages: 0,
                commandMessages: 0,
                groupMessages: 0,
                privateMessages: 0
            };
        }
        let match = {};

        if (timeRange) {
            match.timestamp = { $gte: new Date(Date.now() - timeRange) };
        }

        const stats = await Message.aggregate([
            { $match: match },
            {
                $group: {
                    _id: null,
                    totalMessages: { $sum: 1 },
                    textMessages: { $sum: { $cond: [{ $eq: ['$messageType', 'text'] }, 1, 0] } },
                    mediaMessages: { $sum: { $cond: ['$hasMedia', 1, 0] } },
                    commandMessages: { $sum: { $cond: ['$isCommand', 1, 0] } },
                    groupMessages: { $sum: { $cond: ['$isGroup', 1, 0] } },
                    privateMessages: { $sum: { $cond: ['$isGroup', 0, 1] } }
                }
            }
        ]);

        return stats[0] || {
            totalMessages: 0,
            textMessages: 0,
            mediaMessages: 0,
            commandMessages: 0,
            groupMessages: 0,
            privateMessages: 0
        };
    } catch (error) {
        return {
            totalMessages: 0,
            textMessages: 0,
            mediaMessages: 0,
            commandMessages: 0,
            groupMessages: 0,
            privateMessages: 0
        };
    }
}

async function deleteMessage(messageId) {
    try {
        if (mongoose.connection.readyState !== 1) {
            return null;
        }
        return await Message.findOneAndDelete({ messageId });
    } catch (error) {
        return null;
    }
}

export {
    Message,
    createMessage,
    getMessage,
    getMessagesByUser,
    getMessagesByGroup,
    getMessageStats,
    deleteMessage
};