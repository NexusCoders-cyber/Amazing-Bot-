import { handleLabCommand } from '../../utils/labTools.js';

export default {
    name: 'ssl',
    aliases: [],
    category: 'utility',
    description: 'Get SSL cert details and expiry',
    usage: 'ssl <input>',
    cooldown: 3,

    async execute(ctx) {
        return handleLabCommand('ssl', ctx, { ownerOnly: null });
    }
};
