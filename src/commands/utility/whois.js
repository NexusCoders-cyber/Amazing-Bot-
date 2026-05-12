import { handleLabCommand } from '../../utils/labTools.js';

export default {
    name: 'whois',
    aliases: [],
    category: 'utility',
    description: 'WHOIS lookup for a domain',
    usage: 'whois <input>',
    cooldown: 3,

    async execute(ctx) {
        return handleLabCommand('whois', ctx, { ownerOnly: null });
    }
};
