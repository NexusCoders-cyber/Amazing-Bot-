import { handleLabCommand } from '../../utils/labTools.js';

export default {
    name: 'cron',
    aliases: [],
    category: 'utility',
    description: 'Explain cron expression',
    usage: 'cron <input>',
    cooldown: 3,

    async execute(ctx) {
        return handleLabCommand('cron', ctx, { ownerOnly: null });
    }
};
