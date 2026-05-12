import { handleLabCommand } from '../../utils/labTools.js';

export default {
    name: 'jsonformat',
    aliases: [],
    category: 'utility',
    description: 'Validate and pretty-print JSON',
    usage: 'jsonformat <input>',
    cooldown: 3,

    async execute(ctx) {
        return handleLabCommand('jsonformat', ctx, { ownerOnly: null });
    }
};
