import { handleLabCommand } from '../../utils/labTools.js';

export default {
    name: 'qrgen',
    aliases: [],
    category: 'utility',
    description: 'Generate QR code image',
    usage: 'qrgen <input>',
    cooldown: 3,

    async execute(ctx) {
        return handleLabCommand('qrgen', ctx, { ownerOnly: null });
    }
};
