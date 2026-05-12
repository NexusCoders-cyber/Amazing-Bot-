import { handleLabCommand } from '../../utils/labTools.js';

export default {
    name: 'minify',
    aliases: [],
    category: 'utility',
    description: 'Minify HTML/CSS/JS snippet',
    usage: 'minify <input>',
    cooldown: 3,

    async execute(ctx) {
        return handleLabCommand('minify', ctx, { ownerOnly: null });
    }
};
