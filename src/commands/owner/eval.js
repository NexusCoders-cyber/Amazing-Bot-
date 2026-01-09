import config from '../../config.js';

export default {
    name: 'eval',
    aliases: ['e', 'evaluate', 'run'],
    category: 'owner',
    description: 'Execute JavaScript code - Owner only',
    usage: 'eval <code>',
    example: 'eval 2+2\neval sock.user.id\neval await sock.groupMetadata(from)\neval Object.keys(config)',
    cooldown: 0,
    permissions: ['owner'],
    ownerOnly: true,
    args: true,
    minArgs: 1,

    async execute({ sock, message, args, from, sender, prefix }) {
        try {
            if (process.env.DISABLE_EVAL === 'true') {
                await sock.sendMessage(from, {
                    text: 'Eval command is disabled. Set DISABLE_EVAL=false to enable.'
                }, { quoted: message });
                return;
            }

            const code = args.join(' ');
            
            const blockedPatterns = [
                /process\.env\..*SECRET/i,
                /process\.env\..*KEY/i,
                /process\.env\..*PASSWORD/i,
                /process\.env\..*TOKEN/i,
                /require\s*\(\s*['"]child_process['"]\s*\)/i,
                /import\s+.*from\s+['"]child_process['"]/i
            ];
            
            const hasBlockedPattern = blockedPatterns.some(pattern => pattern.test(code));
            
            if (hasBlockedPattern) {
                await sock.sendMessage(from, {
                    text: 'Blocked: Code contains restricted operations (environment secrets, process manipulation)'
                }, { quoted: message });
                return;
            }
            
            const startTime = Date.now();
            let result;
            let error = null;
            
            try {
                const asyncCode = `(async () => { return ${code} })()`;
                result = await eval(asyncCode);
                
                if (typeof result === 'object' && result !== null) {
                    result = JSON.stringify(result, (key, value) => {
                        if (typeof value === 'function') {
                            return `[Function: ${value.name || 'anonymous'}]`;
                        }
                        if (typeof value === 'bigint') {
                            return value.toString() + 'n';
                        }
                        return value;
                    }, 2);
                } else if (typeof result === 'function') {
                    result = `[Function: ${result.name || 'anonymous'}]`;
                } else if (typeof result === 'undefined') {
                    result = 'undefined';
                } else {
                    result = String(result);
                }
                
                const sensitivePatterns = [
                    /sk-[a-zA-Z0-9]{20,}/g,
                    /api[_-]?key/gi,
                    /token/gi,
                    /password/gi
                ];
                
                sensitivePatterns.forEach(pattern => {
                    result = result.replace(pattern, '[REDACTED]');
                });
                
            } catch (evalError) {
                error = evalError;
                result = error.message || 'Unknown error';
            }
            
            const executionTime = Date.now() - startTime;
            
            let response = `${error ? '❌ Error' : '✅ Success'}\n\n`;
            response += `Code:\n${code}\n\n`;
            response += `Result:\n${result.length > 3500 ? result.substring(0, 3500) + '...[truncated]' : result}\n\n`;
            response += `Time: ${executionTime}ms`;
            
            await sock.sendMessage(from, { text: response }, { quoted: message });
            
        } catch (error) {
            console.error('Eval command error:', error);
            
            await sock.sendMessage(from, {
                text: `Eval error: ${error.message}`
            }, { quoted: message });
        }
    }
};