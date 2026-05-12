import { handleLabCommand } from '../../utils/labTools.js';

export default {
    name: 'ipinfo',
    aliases: [],
    category: 'utility',
    description: 'IP geolocation and ASN info',
    usage: 'ipinfo <input>',
    cooldown: 3,

    async execute(ctx) {
        return handleLabCommand('ipinfo', ctx, { ownerOnly: null });
    }
};
