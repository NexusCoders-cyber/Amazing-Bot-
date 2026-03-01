import { exec, spawn } from 'child_process';
import util from 'util';
import fs from 'fs-extra';
import path from 'path';

const execPromise = util.promisify(exec);

const BLOCKED = [
    'rm -rf /', 'rm -rf *', 'rm -rf ~', 'rm -rf ./',
    'mkfs', 'dd if=/dev/zero', 'dd if=/dev/null',
    ':(){:|:&};:', 'shutdown', 'reboot', 'init 0',
    'init 6', 'halt', 'poweroff', '> /dev/sda',
    'chmod -R 777 /', 'chown -R', 'wget -O- | sh',
    'curl | sh', 'curl | bash', 'wget | bash'
];

function isBlocked(cmd) {
    const lower = cmd.toLowerCase().trim();
    return BLOCKED.some(b => lower.includes(b.toLowerCase()));
}

function fmt(ms) {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
}

function splitOutput(text, chunkSize = 3800) {
    const chunks = [];
    let remaining = text;
    while (remaining.length > 0) {
        chunks.push(remaining.slice(0, chunkSize));
        remaining = remaining.slice(chunkSize);
    }
    return chunks;
}

async function runStreaming(command, onData, timeoutMs = 120000) {
    return new Promise((resolve, reject) => {
        const proc = spawn('/bin/bash', ['-c', command], {
            cwd: process.cwd(),
            env: process.env
        });

        let stdout = '';
        let stderr = '';
        let killed = false;

        const timer = setTimeout(() => {
            killed = true;
            proc.kill('SIGKILL');
            reject(new Error(`Command timed out after ${timeoutMs / 1000}s`));
        }, timeoutMs);

        proc.stdout.on('data', d => {
            stdout += d.toString();
            onData(stdout + stderr);
        });

        proc.stderr.on('data', d => {
            stderr += d.toString();
            onData(stdout + stderr);
        });

        proc.on('close', code => {
            clearTimeout(timer);
            if (!killed) resolve({ stdout, stderr, code });
        });

        proc.on('error', err => {
            clearTimeout(timer);
            reject(err);
        });
    });
}

export default {
    name: 'shell',
    aliases: ['sh', 'bash', 'terminal', '$'],
    category: 'owner',
    description: 'Execute shell commands on the server with live streaming output',
    usage: 'shell <command>',
    cooldown: 0,
    ownerOnly: true,
    args: true,
    minArgs: 1,

    async execute({ sock, message, args, from }) {
        const command = args.join(' ');

        if (isBlocked(command)) {
            return await sock.sendMessage(from, {
                text: `🚫 Blocked\n\nCommand: ${command}\n\nThis command is blocked for system safety.`
            }, { quoted: message });
        }

        const startTime = Date.now();
        let sentMsg = null;
        let lastUpdate = 0;
        let finalOutput = '';

        sentMsg = await sock.sendMessage(from, {
            text: `⚙️ Running...\n\n$ ${command}`
        }, { quoted: message });

        try {
            const { stdout, stderr, code } = await runStreaming(command, async (liveOutput) => {
                const now = Date.now();
                if (now - lastUpdate < 2000) return;
                lastUpdate = now;
                try {
                    const preview = liveOutput.slice(-800) || '(no output yet)';
                    await sock.sendMessage(from, {
                        text: `⚙️ Running...\n\n$ ${command}\n\n${preview}`,
                        edit: sentMsg.key
                    });
                } catch {}
            }, 120000);

            finalOutput = (stdout + stderr).trim() || '(no output)';
            const elapsed = fmt(Date.now() - startTime);
            const status = code === 0 ? '✅ Success' : `⚠️ Exited ${code}`;

            const header = `${status}  [${elapsed}]\n$ ${command}\n${'─'.repeat(40)}\n`;
            const footer = `\n${'─'.repeat(40)}\nExit: ${code ?? 0}  |  Time: ${new Date().toLocaleTimeString()}`;

            const fullText = header + finalOutput + footer;

            if (fullText.length <= 4000) {
                await sock.sendMessage(from, {
                    text: fullText,
                    edit: sentMsg.key
                });
            } else {
                await sock.sendMessage(from, {
                    text: `${status}  [${elapsed}]\n$ ${command}\n\nOutput too long — sending as file + chunks below.`,
                    edit: sentMsg.key
                });

                await sock.sendMessage(from, {
                    document: Buffer.from(finalOutput, 'utf8'),
                    mimetype: 'text/plain',
                    fileName: `shell_output_${Date.now()}.txt`,
                    caption: `📄 Full output  |  ${finalOutput.length} chars  |  ${elapsed}`
                }, { quoted: message });

                const chunks = splitOutput(finalOutput);
                for (let i = 0; i < Math.min(chunks.length, 5); i++) {
                    await sock.sendMessage(from, {
                        text: `Part ${i + 1}/${chunks.length}:\n\n${chunks[i]}`
                    }, { quoted: message });
                }

                if (chunks.length > 5) {
                    await sock.sendMessage(from, {
                        text: `...${chunks.length - 5} more parts in the file above.`
                    }, { quoted: message });
                }
            }

        } catch (error) {
            const elapsed = fmt(Date.now() - startTime);
            const errText = error.stderr || error.stdout || error.message || 'Unknown error';
            const header = `❌ Error  [${elapsed}]\n$ ${command}\n${'─'.repeat(40)}\n`;
            const footer = `\n${'─'.repeat(40)}\nExit: ${error.code ?? 1}  |  Time: ${new Date().toLocaleTimeString()}`;
            const fullText = header + errText + footer;

            if (fullText.length <= 4000) {
                await sock.sendMessage(from, {
                    text: fullText,
                    edit: sentMsg?.key
                });
            } else {
                await sock.sendMessage(from, {
                    text: `❌ Error  [${elapsed}]\n$ ${command}\n\nError too long — sending as file.`,
                    edit: sentMsg?.key
                });
                await sock.sendMessage(from, {
                    document: Buffer.from(errText, 'utf8'),
                    mimetype: 'text/plain',
                    fileName: `shell_error_${Date.now()}.txt`,
                    caption: `📄 Error output  |  ${errText.length} chars`
                }, { quoted: message });
            }
        }
    }
};
