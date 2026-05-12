import { handleLabCommand } from '../../utils/labTools.js';

export default {
    name: 'webstatus',
    aliases: [],
    category: 'utility',
    description: 'Check if website is up/down',
    usage: 'webstatus <input>',
    cooldown: 3,

    async execute(ctx) {
        return handleLabCommand('webstatus', ctx, { ownerOnly: null });
    }
};
