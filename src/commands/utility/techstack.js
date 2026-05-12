import { handleLabCommand } from '../../utils/labTools.js';

export default {
    name: 'techstack',
    aliases: [],
    category: 'utility',
    description: 'Detect CMS/framework/CDN hints',
    usage: 'techstack <input>',
    cooldown: 3,

    async execute(ctx) {
        return handleLabCommand('techstack', ctx, { ownerOnly: null });
    }
};
