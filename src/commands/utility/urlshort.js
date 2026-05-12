import { handleLabCommand } from '../../utils/labTools.js';

export default {
    name: 'urlshort',
    aliases: [],
    category: 'utility',
    description: 'Shorten URL using is.gd',
    usage: 'urlshort <input>',
    cooldown: 3,

    async execute(ctx) {
        return handleLabCommand('urlshort', ctx, { ownerOnly: null });
    }
};
