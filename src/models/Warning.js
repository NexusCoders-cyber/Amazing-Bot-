import mongoose from 'mongoose';
import logger from '../utils/logger.js';

const warningSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true,
        index: true
    },
    groupId: {
        type: String,
        required: true,
        index: true
    },
    reason: {
        type: String,
        required: true
    },
    warnedBy: {
        type: String,
        required: true
    },
    warnedAt: {
        type: Date,
        default: Date.now
    },
    active: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

warningSchema.index({ userId: 1, groupId: 1, active: 1 });

const Warning = mongoose.model('Warning', warningSchema);

export async function addWarning(userId, groupId, reason, warnedBy) {
    try {
        const warning = new Warning({
            userId,
            groupId,
            reason,
            warnedBy,
            active: true
        });

        await warning.save();

        const activeWarnings = await Warning.find({
            userId,
            groupId,
            active: true
        }).sort({ warnedAt: -1 });

        logger.info(`Warning added to ${userId} in ${groupId}: ${reason}`);

        return {
            warning,
            count: activeWarnings.length,
            warnings: activeWarnings
        };
    } catch (error) {
        logger.error('Error adding warning:', error);
        throw error;
    }
}

export async function removeWarning(userId, groupId) {
    try {
        const warning = await Warning.findOne({
            userId,
            groupId,
            active: true
        }).sort({ warnedAt: -1 });

        if (warning) {
            warning.active = false;
            await warning.save();

            const activeWarnings = await Warning.find({
                userId,
                groupId,
                active: true
            }).sort({ warnedAt: -1 });

            logger.info(`Warning removed from ${userId} in ${groupId}`);

            return {
                warning,
                count: activeWarnings.length,
                warnings: activeWarnings
            };
        }

        return null;
    } catch (error) {
        logger.error('Error removing warning:', error);
        throw error;
    }
}

export async function clearWarnings(userId, groupId) {
    try {
        await Warning.updateMany(
            { userId, groupId, active: true },
            { $set: { active: false } }
        );

        logger.info(`All warnings cleared for ${userId} in ${groupId}`);

        return true;
    } catch (error) {
        logger.error('Error clearing warnings:', error);
        throw error;
    }
}

export async function getWarnings(userId, groupId) {
    try {
        const warnings = await Warning.find({
            userId,
            groupId,
            active: true
        }).sort({ warnedAt: -1 });

        return warnings;
    } catch (error) {
        logger.error('Error getting warnings:', error);
        throw error;
    }
}

export async function getWarningCount(userId, groupId) {
    try {
        const count = await Warning.countDocuments({
            userId,
            groupId,
            active: true
        });

        return count;
    } catch (error) {
        logger.error('Error getting warning count:', error);
        throw error;
    }
}

export default Warning;
export { Warning };
