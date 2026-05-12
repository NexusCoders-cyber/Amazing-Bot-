import { handleLabCommand } from '../../utils/labTools.js';

export default {
    name: 'hosting',
    aliases: [],
    category: 'utility',
    description: 'Lookup hosting provider information',
    usage: 'hosting <input>',
    cooldown: 3,

    async execute(ctx) {
        return handleLabCommand('hosting', ctx, { ownerOnly: null });
    }
};
