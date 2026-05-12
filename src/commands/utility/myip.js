import { handleLabCommand } from '../../utils/labTools.js';

export default {
    name: 'myip',
    aliases: [],
    category: 'utility',
    description: 'Get bot server public IP',
    usage: 'myip <input>',
    cooldown: 3,

    async execute(ctx) {
        return handleLabCommand('myip', ctx, { ownerOnly: null });
    }
};
