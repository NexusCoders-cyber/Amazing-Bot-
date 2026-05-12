import { handleLabCommand } from '../../utils/labTools.js';

export default {
    name: 'pageinfo',
    aliases: [],
    category: 'utility',
    description: 'Extract title/description/og tags',
    usage: 'pageinfo <input>',
    cooldown: 3,

    async execute(ctx) {
        return handleLabCommand('pageinfo', ctx, { ownerOnly: null });
    }
};
