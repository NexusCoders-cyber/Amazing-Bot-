import { handleLabCommand } from '../../utils/labTools.js';

export default {
    name: 'robots',
    aliases: [],
    category: 'utility',
    description: 'Fetch robots.txt for domain',
    usage: 'robots <input>',
    cooldown: 3,

    async execute(ctx) {
        return handleLabCommand('robots', ctx, { ownerOnly: null });
    }
};
