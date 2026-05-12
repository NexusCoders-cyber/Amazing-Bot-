import { handleLabCommand } from '../../utils/labTools.js';

export default {
    name: 'portscan',
    aliases: [],
    category: 'utility',
    description: 'Scan common ports on a host',
    usage: 'portscan <input>',
    cooldown: 3,

    async execute(ctx) {
        return handleLabCommand('portscan', ctx, { ownerOnly: null });
    }
};
