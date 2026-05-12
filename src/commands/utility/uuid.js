import { handleLabCommand } from '../../utils/labTools.js';

export default {
    name: 'uuid',
    aliases: [],
    category: 'utility',
    description: 'Generate random UUID v4',
    usage: 'uuid <input>',
    cooldown: 3,

    async execute(ctx) {
        return handleLabCommand('uuid', ctx, { ownerOnly: null });
    }
};
