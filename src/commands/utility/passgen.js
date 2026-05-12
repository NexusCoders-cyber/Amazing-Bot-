import { handleLabCommand } from '../../utils/labTools.js';

export default {
    name: 'passgen',
    aliases: [],
    category: 'utility',
    description: 'Generate strong random password',
    usage: 'passgen <input>',
    cooldown: 3,

    async execute(ctx) {
        return handleLabCommand('passgen', ctx, { ownerOnly: null });
    }
};
