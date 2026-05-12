import { handleLabCommand } from '../../utils/labTools.js';

export default {
    name: 'curl',
    aliases: [],
    category: 'utility',
    description: 'Make HTTP GET/POST requests',
    usage: 'curl <input>',
    cooldown: 3,

    async execute(ctx) {
        return handleLabCommand('curl', ctx, { ownerOnly: null });
    }
};
