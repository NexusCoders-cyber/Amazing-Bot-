import { handleLabCommand } from '../../utils/labTools.js';

export default {
    name: 'regex',
    aliases: [],
    category: 'utility',
    description: 'Test regex pattern against string',
    usage: 'regex <input>',
    cooldown: 3,

    async execute(ctx) {
        return handleLabCommand('regex', ctx, { ownerOnly: null });
    }
};
