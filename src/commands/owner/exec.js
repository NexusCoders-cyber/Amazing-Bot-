import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const execPromise = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SUPPORTED_LANGUAGES = {
    javascript: { ext: '.js', cmd: 'node' },
    js: { ext: '.js', cmd: 'node' },
    python: { ext: '.py', cmd: 'python3' },
    py: { ext: '.py', cmd: 'python3' },
    bash: { ext: '.sh', cmd: 'bash' },
    sh: { ext: '.sh', cmd: 'bash' },
    shell: { ext: '.sh', cmd: 'bash' },
    ruby: { ext: '.rb', cmd: 'ruby' },
    rb: { ext: '.rb', cmd: 'ruby' },
    php: { ext: '.php', cmd: 'php' },
    perl: { ext: '.pl', cmd: 'perl' },
    pl: { ext: '.pl', cmd: 'perl' },
    go: { ext: '.go', cmd: 'go run' },
    rust: { ext: '.rs', cmd: 'rustc -o /tmp/rust_exec && /tmp/rust_exec' },
    rs: { ext: '.rs', cmd: 'rustc -o /tmp/rust_exec && /tmp/rust_exec' },
    c: { ext: '.c', cmd: 'gcc -o /tmp/c_exec && /tmp/c_exec' },
    cpp: { ext: '.cpp', cmd: 'g++ -o /tmp/cpp_exec && /tmp/cpp_exec' },
    java: { ext: '.java', cmd: 'javac && java Main' },
    lua: { ext: '.lua', cmd: 'lua' }
};

const TIMEOUT = 30000;
const MAX_OUTPUT = 4000;

function detectLanguage(code) {
    const firstLine = code.trim().split('\n')[0].toLowerCase();
    
    if (firstLine.includes('#!/usr/bin/env node') || firstLine.includes('#!/usr/bin/node')) return 'javascript';
    if (firstLine.includes('#!/usr/bin/env python') || firstLine.includes('#!/usr/bin/python')) return 'python';
    if (firstLine.includes('#!/bin/bash') || firstLine.includes('#!/bin/sh')) return 'bash';
    if (firstLine.includes('#!/usr/bin/env ruby') || firstLine.includes('#!/usr/bin/ruby')) return 'ruby';
    if (firstLine.includes('#!/usr/bin/env php') || firstLine.includes('#!/usr/bin/php')) return 'php';
    if (firstLine.includes('#!/usr/bin/env perl') || firstLine.includes('#!/usr/bin/perl')) return 'perl';
    
    if (code.includes('console.log') || code.includes('require(') || code.includes('import ') && code.includes('from ') === false) return 'javascript';
    if (code.includes('print(') || code.includes('def ') || code.includes('import ') && code.includes('from ')) return 'python';
    if (code.includes('echo ') || code.includes('#!/bin/bash')) return 'bash';
    if (code.includes('puts ') || code.includes('def ') && code.includes('end')) return 'ruby';
    if (code.includes('<?php')) return 'php';
    if (code.includes('package main') || code.includes('func main()')) return 'go';
    if (code.includes('fn main()') || code.includes('println!')) return 'rust';
    if (code.includes('#include <stdio.h>') || code.includes('int main()') && !code.includes('std::')) return 'c';
    if (code.includes('#include <iostream>') || code.includes('std::')) return 'cpp';
    if (code.includes('public class') || code.includes('public static void main')) return 'java';
    if (code.includes('print(') && code.includes('local ')) return 'lua';
    
    return null;
}

function truncateOutput(output, maxLength = MAX_OUTPUT) {
    if (output.length <= maxLength) return output;
    const half = Math.floor(maxLength / 2) - 100;
    return output.substring(0, half) + 
           `\n\n[${output.length - maxLength} characters truncated]\n\n` + 
           output.substring(output.length - half);
}

async function executeCode(code, language) {
    const langConfig = SUPPORTED_LANGUAGES[language.toLowerCase()];
    if (!langConfig) {
        throw new Error(`Unsupported language: ${language}`);
    }

    const tempDir = path.join(__dirname, '..', '..', 'temp', 'exec');
    await fs.ensureDir(tempDir);

    const fileName = `exec_${Date.now()}${langConfig.ext}`;
    const filePath = path.join(tempDir, fileName);

    await fs.writeFile(filePath, code);

    if (langConfig.ext === '.sh') {
        await fs.chmod(filePath, '755');
    }

    let command = `${langConfig.cmd} ${filePath}`;
    
    if (language === 'rust' || language === 'rs') {
        command = `rustc ${filePath} -o /tmp/rust_exec_${Date.now()} && /tmp/rust_exec_${Date.now()}`;
    } else if (language === 'c') {
        const execPath = `/tmp/c_exec_${Date.now()}`;
        command = `gcc ${filePath} -o ${execPath} && ${execPath}`;
    } else if (language === 'cpp') {
        const execPath = `/tmp/cpp_exec_${Date.now()}`;
        command = `g++ ${filePath} -o ${execPath} && ${execPath}`;
    } else if (language === 'java') {
        const className = code.match(/public\s+class\s+(\w+)/)?.[1] || 'Main';
        const javaPath = path.join(tempDir, `${className}.java`);
        await fs.writeFile(javaPath, code);
        command = `cd ${tempDir} && javac ${className}.java && java ${className}`;
    }

    try {
        const { stdout, stderr } = await execPromise(command, {
            timeout: TIMEOUT,
            maxBuffer: 1024 * 1024 * 10,
            cwd: tempDir
        });

        await fs.remove(filePath).catch(() => {});

        return {
            success: true,
            output: stdout || stderr || 'Execution completed with no output',
            error: null
        };
    } catch (error) {
        await fs.remove(filePath).catch(() => {});

        return {
            success: false,
            output: error.stdout || '',
            error: error.stderr || error.message || 'Execution failed'
        };
    }
}

export default {
    name: 'exec',
    aliases: ['run', 'execute', 'code'],
    category: 'owner',
    description: 'Execute code in multiple programming languages',
    usage: 'exec <language> <code>\nexec <code>',
    example: 'exec js console.log("Hello")\nexec python print("Hello")',
    cooldown: 0,
    permissions: ['owner'],
    args: true,
    minArgs: 1,
    typing: true,
    ownerOnly: true,
    hidden: false,

    async execute({ sock, message, args, from, prefix }) {
        try {
            let language = null;
            let code = '';

            const firstArg = args[0].toLowerCase();
            if (SUPPORTED_LANGUAGES[firstArg]) {
                language = firstArg;
                code = args.slice(1).join(' ');
            } else {
                code = args.join(' ');
            }

            const quotedMsg = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            if (quotedMsg && !code) {
                const quotedText = quotedMsg.conversation ||
                                 quotedMsg.extendedTextMessage?.text || '';
                if (quotedText) {
                    code = quotedText;
                }
            }

            if (!code || code.trim().length === 0) {
                const langList = Object.keys(SUPPORTED_LANGUAGES)
                    .filter(key => !['js', 'py', 'sh', 'rb', 'rs', 'pl'].includes(key))
                    .join(', ');

                return await sock.sendMessage(from, {
                    text: `Usage: ${prefix}exec <language> <code>\n\nSupported languages: ${langList}\n\nExamples:\n${prefix}exec js console.log("Hello")\n${prefix}exec python print("Hello")\n${prefix}exec bash echo "Hello"`
                }, { quoted: message });
            }

            if (!language) {
                language = detectLanguage(code);
                if (!language) {
                    return await sock.sendMessage(from, {
                        text: `Could not detect language. Please specify: ${prefix}exec <language> <code>`
                    }, { quoted: message });
                }
            }

            await sock.sendMessage(from, {
                react: { text: '⏳', key: message.key }
            });

            const statusMsg = await sock.sendMessage(from, {
                text: `Executing ${language}...`
            }, { quoted: message });

            const startTime = Date.now();
            const result = await executeCode(code, language);
            const executionTime = Date.now() - startTime;

            let responseText = `Language: ${language}\nTime: ${executionTime}ms\nStatus: ${result.success ? 'Success' : 'Failed'}\n\n`;
            
            if (result.success) {
                responseText += `Output:\n${truncateOutput(result.output.trim())}`;
            } else {
                if (result.output) {
                    responseText += `Output:\n${truncateOutput(result.output.trim())}\n\n`;
                }
                responseText += `Error:\n${truncateOutput(result.error.trim())}`;
            }

            await sock.sendMessage(from, {
                text: responseText,
                edit: statusMsg.key
            });

            await sock.sendMessage(from, {
                react: { text: result.success ? '✅' : '❌', key: message.key }
            });

        } catch (error) {
            console.error('Exec command error:', error);
            
            await sock.sendMessage(from, {
                text: `Execution error: ${error.message || 'Unknown error'}`
            }, { quoted: message });

            await sock.sendMessage(from, {
                react: { text: '❌', key: message.key }
            });
        }
    }
};