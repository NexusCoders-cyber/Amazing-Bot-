import fs from 'fs';
import path from 'path';

export default {
    name: 'upload',
    aliases: ['save', 'write', 'createfile'],
    category: 'utility',
    description: 'Create and upload files by replying to text messages',
    usage: 'upload <filename.ext> (reply to message with content)',
    example: 'Reply to code message and type: upload mycode.js',
    cooldown: 5,
    permissions: ['user'],
    args: true,
    minArgs: 1,
    maxArgs: 1,
    typing: true,
    premium: false,
    hidden: false,
    ownerOnly: false,
    supportsReply: false,
    supportsChat: false,
    supportsReact: true,
    supportsButtons: false,

    async execute({ sock, message, args, command, user, group, from, sender, isGroup, isGroupAdmin, isBotAdmin, prefix }) {
        try {
            const fileName = args[0].trim();

            const quotedMsg = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            const quotedText = quotedMsg?.conversation || quotedMsg?.extendedTextMessage?.text;

            if (!quotedText) {
                await sock.sendMessage(from, {
                    text: `╭──⦿【 💡 UPLOAD GUIDE 】
│ 𝗛𝗼𝘄 𝘁𝗼 𝘂𝘀𝗲:
│
│ 1. Send or find a text message
│ 2. Reply to it with:
│    ${prefix}upload <filename>
│
│ 📝 𝗘𝘅𝗮𝗺𝗽𝗹𝗲𝘀:
│ ${prefix}upload code.js
│ ${prefix}upload notes.txt
│ ${prefix}upload config.json
│
│ 📋 𝗦𝘂𝗽𝗽𝗼𝗿𝘁𝗲𝗱 𝗳𝗶𝗹𝗲𝘀:
│ .js .txt .json .md .css .html
│ .xml .yml .env .py .java .cpp
╰────────⦿

╭─────────────⦿
│💫 | [ Ilom Bot 🍀 ]
╰────────────⦿`
                }, { quoted: message });
                return;
            }

            const invalidChars = /[<>:"/\\|?*\x00-\x1F]/;
            const traversalCheck = /\.\.\//;
            
            if (!fileName.includes('.') || invalidChars.test(fileName) || traversalCheck.test(fileName)) {
                await sock.sendMessage(from, {
                    text: `╭──⦿【 ❌ ERROR 】
│ 𝗠𝗲𝘀𝘀𝗮𝗴𝗲: Invalid filename
│
│ ❌ 𝗜𝗻𝘃𝗮𝗹𝗶𝗱: ${fileName}
│
│ ✅ 𝗩𝗮𝗹𝗶𝗱 𝗲𝘅𝗮𝗺𝗽𝗹𝗲𝘀:
│ • myfile.js
│ • notes.txt
│ • config.json
│
│ 🚫 𝗔𝘃𝗼𝗶𝗱:
│ • Special characters: < > : " / \\ | ? *
│ • Path traversal: ../
│ • Missing extension
╰────────⦿`
                }, { quoted: message });
                return;
            }

            await sock.sendMessage(from, {
                react: { text: '📤', key: message.key }
            });

            const content = quotedText;
            const fileSizeBytes = Buffer.byteLength(content, 'utf8');
            const fileSizeMB = fileSizeBytes / (1024 * 1024);
            
            if (fileSizeBytes > 5 * 1024 * 1024) {
                await sock.sendMessage(from, {
                    text: `╭──⦿【 ❌ ERROR 】
│ 𝗠𝗲𝘀𝘀𝗮𝗴𝗲: File too large
│
│ 📦 𝗦𝗶𝘇𝗲: ${fileSizeMB.toFixed(2)} MB
│ 🚫 𝗟𝗶𝗺𝗶𝘁: 5 MB
│
│ 💡 Reduce message size
╰────────⦿`
                }, { quoted: message });
                return;
            }

            const tempDir = path.join(process.cwd(), 'temp');
            const timestamp = Date.now();
            const safeFileName = `${timestamp}_${fileName}`;
            const tempFilePath = path.join(tempDir, safeFileName);

            if (!fs.existsSync(tempDir)) {
                fs.mkdirSync(tempDir, { recursive: true });
            }

            fs.writeFileSync(tempFilePath, content, 'utf8');

            const fileStats = fs.statSync(tempFilePath);
            const fileSizeKB = (fileStats.size / 1024).toFixed(2);
            const lines = content.split('\n').length;
            const words = content.split(/\s+/).filter(w => w.length > 0).length;
            const chars = content.length;

            const extension = path.extname(fileName).toLowerCase();
            const mimeTypes = {
                '.js': 'text/javascript',
                '.json': 'application/json',
                '.txt': 'text/plain',
                '.md': 'text/markdown',
                '.html': 'text/html',
                '.css': 'text/css',
                '.xml': 'text/xml',
                '.py': 'text/x-python',
                '.java': 'text/x-java',
                '.cpp': 'text/x-c++src',
                '.yml': 'text/yaml',
                '.yaml': 'text/yaml',
                '.env': 'text/plain'
            };
            const mimeType = mimeTypes[extension] || 'text/plain';

            const fileBuffer = fs.readFileSync(tempFilePath);
            
            await sock.sendMessage(from, {
                document: fileBuffer,
                mimetype: mimeType,
                fileName: fileName,
                caption: `╭──⦿【 ✅ FILE CREATED 】
│ 📄 𝗙𝗶𝗹𝗲: ${fileName}
│ 💾 𝗦𝗶𝘇𝗲: ${fileSizeKB} KB
│ 📝 𝗟𝗶𝗻𝗲𝘀: ${lines}
│ 📊 𝗪𝗼𝗿𝗱𝘀: ${words}
│ 🔤 𝗖𝗵𝗮𝗿𝗮𝗰𝘁𝗲𝗿𝘀: ${chars}
│ 📦 𝗧𝘆𝗽𝗲: ${mimeType}
╰────────⦿

╭──⦿【 📋 CONTENT PREVIEW 】
│ ${content.substring(0, 100)}${content.length > 100 ? '...' : ''}
╰────────⦿

╭─────────────⦿
│💫 | [ Ilom Bot 🍀 ]
╰────────────⦿`
            }, { quoted: message });

            try {
                fs.unlinkSync(tempFilePath);
                const remainingFiles = fs.readdirSync(tempDir);
                if (remainingFiles.length === 0) {
                    fs.rmdirSync(tempDir);
                }
            } catch (cleanupError) {
                console.warn('Cleanup warning:', cleanupError.message);
            }

            await sock.sendMessage(from, {
                react: { text: '✅', key: message.key }
            });

        } catch (error) {
            console.error('Upload command error:', error);
            await sock.sendMessage(from, {
                text: `╭──⦿【 ❌ ERROR 】
│ 𝗠𝗲𝘀𝘀𝗮𝗴𝗲: Upload failed
│
│ ⚠️ 𝗗𝗲𝘁𝗮𝗶𝗹𝘀: ${error.message}
│ 💡 Try again
╰────────⦿`
            }, { quoted: message });
            
            await sock.sendMessage(from, {
                react: { text: '❌', key: message.key }
            });
        }
    }
};