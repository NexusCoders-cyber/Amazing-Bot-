import { handleLabCommand } from '../../utils/labTools.js';

export default {
    name: 'urlencode',
    aliases: [],
    category: 'utility',
    description: 'URL encode/decode text',
    usage: 'urlencode <input>',
    cooldown: 3,

    async execute(ctx) {
        return handleLabCommand('urlencode', ctx, { ownerOnly: null });
    }
};
