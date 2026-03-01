import { evaluate } from 'mathjs';
import config from '../../config.js';

export default {
    name: 'advancedcalc',
    aliases: ['acalc', 'math', 'calculate'],
    category: 'utility',
    description: 'Advanced calculator with scientific functions',
    usage: '.advancedcalc <expression>',
    example: '.advancedcalc 2 + 2\n.advancedcalc sqrt(16)\n.advancedcalc sin(45 deg)',
    cooldown: 2,
    permissions: ['user'],
    args: true,
    minArgs: 1,

    async execute({ sock, message, from, args }) {
        const expression = args.join(' ');

        try {
            const result = evaluate(expression);
            const formatted = typeof result === 'number' ? result.toLocaleString() : result.toString();

            let expressionType = 'Basic';
            if (expression.includes('sqrt') || expression.includes('cbrt')) expressionType = 'Root Calculation';
            else if (expression.includes('sin') || expression.includes('cos') || expression.includes('tan')) expressionType = 'Trigonometry';
            else if (expression.includes('log') || expression.includes('ln')) expressionType = 'Logarithm';
            else if (expression.includes('!')) expressionType = 'Factorial';
            else if (expression.includes('^') || expression.includes('**')) expressionType = 'Power';
            else if (expression.includes('*') || expression.includes('/')) expressionType = 'Multiplication/Division';

            const calcText = `╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮
┃  🧮 𝗔𝗗𝗩𝗔𝗡𝗖𝗘𝗗 𝗖𝗔𝗟𝗖𝗨𝗟𝗔𝗧𝗢𝗥
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯

╭─⦿「 📝 CALCULATION 」
│
│  📐 𝗧𝘆𝗽𝗲: ${expressionType}
│  ➕ 𝗘𝘅𝗽𝗿𝗲𝘀𝘀𝗶𝗼𝗻: ${expression}
│  ✅ 𝗥𝗲𝘀𝘂𝗹𝘁: ${formatted}
│
╰────────⦿

╭─⦿「 💡 SUPPORTED FUNCTIONS 」
│
│  • Basic: + - * / ^ %
│  • Roots: sqrt(), cbrt()
│  • Trig: sin(), cos(), tan()
│  • Log: log(), ln(), log10()
│  • Others: abs(), round(), ceil(), floor()
│  • Constants: pi, e
│
╰────────⦿

╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮
┃  💫 ${config.botName} Calculator
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯`;

            await sock.sendMessage(from, {
                text: calcText
            }, { quoted: message });

        } catch (error) {
            await sock.sendMessage(from, {
                text: `❌ *Invalid Expression*\n\n⚠️ Error: ${error.message}\n\n*Examples:*\n• .acalc 2 + 2 * 3\n• .acalc sqrt(144)\n• .acalc sin(45 deg)\n• .acalc log(100)\n• .acalc 5!\n\n💡 Make sure your expression is mathematically valid.`
            }, { quoted: message });
        }
    }
};
