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

    async execute({ sock, message, args, prefix, from }) {
        try {
            const fileName = args[0].trim();

            const quotedMsg = message.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            const quotedText = quotedMsg?.conversation || quotedMsg?.extendedTextMessage?.text;

            if (!quotedText) {
                await sock.sendMessage(from, {
                    text: `╭──⦿【 💡 UPLOAD GUIDE 】\n│ Usage:\n│ ${prefix}upload <filename>\n│\n│ Example:\n│ ${prefix}upload code.js\n│ ${prefix}upload notes.txt\n│ ${prefix}upload config.json\n╰────────⦿`
                }, { quoted: message });
                return;
            }

            const invalidChars = /[<>:"/\\|?*\x00-\x1F]/;
            const traversalCheck = /\.\.\//;
            
            if (!fileName.includes('.') || invalidChars.test(fileName) || traversalCheck.test(fileName)) {
                await sock.sendMessage(from, {
                    text: `╭──⦿【 ❌ ERROR 】\n│ Invalid filename: ${fileName}\n│\n│ Valid examples:\n│ • myfile.js\n│ • notes.txt\n│ • config.json\n╰────────⦿`
                }, { quoted: message });
                return;
            }

            await sock.sendMessage(from, { react: { text: '📤', key: message.key } });

            const content = quotedText;
            const fileSizeBytes = Buffer.byteLength(content, 'utf8');
            const fileSizeMB = fileSizeBytes / (1024 * 1024);
            
            if (fileSizeBytes > 5 * 1024 * 1024) {
                await sock.sendMessage(from, {
                    text: `╭──⦿【 ❌ ERROR 】\n│ File too large\n│ Size: ${fileSizeMB.toFixed(2)} MB\n│ Limit: 5 MB\n╰────────⦿`
                }, { quoted: message });
                return;
            }

            const tempDir = path.join(process.cwd(), 'temp');
            if (!fs.existsSync(tempDir)) {
                fs.mkdirSync(tempDir, { recursive: true });
            }

            const tempFilePath = path.join(tempDir, fileName);
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
                caption: `╭──⦿【 ✅ FILE CREATED 】\n│ 📄 File: ${fileName}\n│ 💾 Size: ${fileSizeKB} KB\n│ 📝 Lines: ${lines}\n│ 📊 Words: ${words}\n│ 🔤 Characters: ${chars}\n│ 📦 Type: ${mimeType}\n╰────────⦿\n\n╭──⦿【 📋 PREVIEW 】\n│ ${content.substring(0, 100)}${content.length > 100 ? '...' : ''}\n╰────────⦿`
            }, { quoted: message });

            fs.unlinkSync(tempFilePath);

            await sock.sendMessage(from, { react: { text: '✅', key: message.key } });

        } catch (error) {
            console.error('Upload command error:', error);
            await sock.sendMessage(from, {
                text: `╭──⦿【 ❌ ERROR 】\n│ Upload failed\n│ Details: ${error.message}\n╰────────⦿`
            }, { quoted: message });
            await sock.sendMessage(from, { react: { text: '❌', key: message.key } });
        }
    }
};
