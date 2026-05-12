import { handleLabCommand } from '../../utils/labTools.js';

export default {
    name: 'colorconvert',
    aliases: [],
    category: 'utility',
    description: 'HEX/RGB color converter',
    usage: 'colorconvert <input>',
    cooldown: 3,

    async execute(ctx) {
        return handleLabCommand('colorconvert', ctx, { ownerOnly: null });
    }
};
