import { handleLabCommand } from '../../utils/labTools.js';

export default {
    name: 'b64',
    aliases: [],
    category: 'utility',
    description: 'Base64 encode/decode utility',
    usage: 'b64 <input>',
    cooldown: 3,

    async execute(ctx) {
        return handleLabCommand('b64', ctx, { ownerOnly: null });
    }
};
