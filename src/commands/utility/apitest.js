import { handleLabCommand } from '../../utils/labTools.js';

export default {
    name: 'apitest',
    aliases: [],
    category: 'utility',
    description: 'Test REST endpoint with method/body',
    usage: 'apitest <input>',
    cooldown: 3,

    async execute(ctx) {
        return handleLabCommand('apitest', ctx, { ownerOnly: null });
    }
};
