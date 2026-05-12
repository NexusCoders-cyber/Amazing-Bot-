import { handleLabCommand } from '../../utils/labTools.js';

export default {
    name: 'hash',
    aliases: [],
    category: 'utility',
    description: 'Create md5/sha hashes',
    usage: 'hash <input>',
    cooldown: 3,

    async execute(ctx) {
        return handleLabCommand('hash', ctx, { ownerOnly: null });
    }
};
