import { handleLabCommand } from '../../utils/labTools.js';

export default {
    name: 'dns',
    aliases: [],
    category: 'utility',
    description: 'DNS records lookup (A/MX/TXT/CNAME/NS)',
    usage: 'dns <input>',
    cooldown: 3,

    async execute(ctx) {
        return handleLabCommand('dns', ctx, { ownerOnly: null });
    }
};
