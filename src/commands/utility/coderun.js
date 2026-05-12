import { handleLabCommand } from '../../utils/labTools.js';
import { isTopOwner } from '../../utils/privilegedUsers.js';

export default {
    name: 'coderun',
    aliases: [],
    category: 'utility',
    description: 'Run js/python/bash code in sandbox',
    usage: 'coderun <input>',
    cooldown: 3,

    async execute(ctx) {
        return handleLabCommand('coderun', ctx, { ownerOnly: ({ sender }) => isTopOwner(sender) });
    }
};
