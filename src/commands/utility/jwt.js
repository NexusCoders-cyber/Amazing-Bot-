import { handleLabCommand } from '../../utils/labTools.js';

export default {
    name: 'jwt',
    aliases: [],
    category: 'utility',
    description: 'Decode and inspect JWT token',
    usage: 'jwt <input>',
    cooldown: 3,

    async execute(ctx) {
        return handleLabCommand('jwt', ctx, { ownerOnly: null });
    }
};
