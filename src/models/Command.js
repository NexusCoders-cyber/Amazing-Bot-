import mongoose from 'mongoose';

const CommandSchema = new mongoose.Schema({
    user: {
        type: String,
        required: true,
        index: true
    },
    command: {
        type: String,
        required: true,
        index: true
    },
    group: {
        type: String,
        default: null
    },
    isGroup: {
        type: Boolean,
        default: false
    },
    executionTime: {
        type: Number,
        default: 0
    },
    timestamp: {
        type: Date,
        default: Date.now,
        index: true
    }
}, {
    timestamps: true,
    versionKey: false
});

CommandSchema.index({ user: 1, timestamp: -1 });
CommandSchema.index({ command: 1, timestamp: -1 });

const Command = mongoose.model('Command', CommandSchema);

async function logCommand(user, command, group, isGroup, executionTime) {
    try {
        if (mongoose.connection.readyState !== 1) {
            return null;
        }
        const commandLog = new Command({
            user,
            command,
            group: isGroup ? group : null,
            isGroup,
            executionTime
        });
        return await commandLog.save();
    } catch (error) {
        return null;
    }
}

async function getCommandStats(command = null, user = null, timeRange = null) {
    try {
        if (mongoose.connection.readyState !== 1) {
            return [];
        }
        let match = {};

        if (command) {
            match.command = command;
        }

        if (user) {
            match.user = user;
        }

        if (timeRange) {
            match.timestamp = { $gte: new Date(Date.now() - timeRange) };
        }

        const stats = await Command.aggregate([
            { $match: match },
            {
                $group: {
                    _id: command ? null : '$command',
                    count: { $sum: 1 },
                    totalExecutionTime: { $sum: '$executionTime' },
                    avgExecutionTime: { $avg: '$executionTime' },
                    lastUsed: { $max: '$timestamp' }
                }
            },
            { $sort: { count: -1 } }
        ]);

        return stats;
    } catch (error) {
        return [];
    }
}

async function getUserCommandHistory(user, limit = 50) {
    try {
        if (mongoose.connection.readyState !== 1) {
            return [];
        }
        return await Command.find({ user })
            .sort({ timestamp: -1 })
            .limit(limit);
    } catch (error) {
        return [];
    }
}

export {
    Command,
    logCommand,
    getCommandStats,
    getUserCommandHistory
};