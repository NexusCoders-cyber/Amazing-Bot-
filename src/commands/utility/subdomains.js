import { handleLabCommand } from '../../utils/labTools.js';

export default {
    name: 'subdomains',
    aliases: [],
    category: 'utility',
    description: 'Find subdomains via crt.sh',
    usage: 'subdomains <input>',
    cooldown: 3,

    async execute(ctx) {
        return handleLabCommand('subdomains', ctx, { ownerOnly: null });
    }
};
