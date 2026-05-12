import { handleLabCommand } from '../../utils/labTools.js';

export default {
    name: 'netping',
    aliases: [],
    category: 'utility',
    description: 'Network latency check to a host',
    usage: 'netping <input>',
    cooldown: 3,

    async execute(ctx) {
        return handleLabCommand('netping', ctx, { ownerOnly: null });
    }
};
