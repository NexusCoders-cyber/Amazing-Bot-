import { handleLabCommand } from '../../utils/labTools.js';

export default {
    name: 'scrape',
    aliases: [],
    category: 'utility',
    description: 'Scrape text from any webpage',
    usage: 'scrape <input>',
    cooldown: 3,

    async execute(ctx) {
        return handleLabCommand('scrape', ctx, { ownerOnly: null });
    }
};
