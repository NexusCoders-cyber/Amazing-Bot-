import { handleLabCommand } from '../../utils/labTools.js';

export default {
    name: 'sitemap',
    aliases: [],
    category: 'utility',
    description: 'Fetch sitemap URLs from domain',
    usage: 'sitemap <input>',
    cooldown: 3,

    async execute(ctx) {
        return handleLabCommand('sitemap', ctx, { ownerOnly: null });
    }
};
