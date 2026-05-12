import { handleLabCommand } from '../../utils/labTools.js';

export default {
    name: 'lorem',
    aliases: [],
    category: 'utility',
    description: 'Generate lorem ipsum text',
    usage: 'lorem <input>',
    cooldown: 3,

    async execute(ctx) {
        return handleLabCommand('lorem', ctx, { ownerOnly: null });
    }
};
