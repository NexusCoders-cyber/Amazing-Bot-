import { handleLabCommand } from '../../utils/labTools.js';

export default {
    name: 'timestamp',
    aliases: [],
    category: 'utility',
    description: 'Unix timestamp converter',
    usage: 'timestamp <input>',
    cooldown: 3,

    async execute(ctx) {
        return handleLabCommand('timestamp', ctx, { ownerOnly: null });
    }
};
