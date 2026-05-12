import { handleLabCommand } from '../../utils/labTools.js';

export default {
    name: 'domainavail',
    aliases: [],
    category: 'utility',
    description: 'Check if domain may be available',
    usage: 'domainavail <input>',
    cooldown: 3,

    async execute(ctx) {
        return handleLabCommand('domainavail', ctx, { ownerOnly: null });
    }
};
