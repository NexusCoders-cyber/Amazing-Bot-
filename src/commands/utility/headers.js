import { handleLabCommand } from '../../utils/labTools.js';

export default {
    name: 'headers',
    aliases: [],
    category: 'utility',
    description: 'Fetch HTTP response headers for URL',
    usage: 'headers <input>',
    cooldown: 3,

    async execute(ctx) {
        return handleLabCommand('headers', ctx, { ownerOnly: null });
    }
};
