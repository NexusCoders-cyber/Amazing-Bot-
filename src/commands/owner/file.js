import fs from 'fs-extra';
import path from 'path';
import { commandHandler } from '../../handlers/commandHandler.js';

export default {
    name: 'file',
    aliases: ['addfile', 'createfile', 'savefile'],
    category: 'owner',
    description: 'Create, view, or replace command files',
    usage: 'file <action> [category/filename.js] | [content]',
    example: 'file create fun/joke.js | <code>\nfile list fun\nfile view fun/joke.js\nfile delete fun/joke.js',
    cooldown: 0,
    permissions: ['owner'],
    args: false,
    minArgs: 1,
    typing: true,
    premium: false,
    hidden: false,
    ownerOnly: true,
    supportsReply: false,
    supportsChat: false,
    supportsReact: true,
    supportsButtons: false,

    validCategories: ['admin', 'ai', 'downloader', 'economy', 'fun', 'games', 'general', 'media', 'owner', 'utility'],

    async execute({ sock, message, args, from, sender, prefix }) {
        try {
            const action = args[0]?.toLowerCase();

            if (!action || action === 'help') {
                return this.showHelp({ sock, message, from, prefix });
            }

            switch (action) {
                case 'create':
                case 'add':
                    await this.handleCreate({ sock, message, args, from, sender });
                    break;
                case 'list':
                case 'ls':
                    await this.handleList({ sock, message, args, from });
                    break;
                case 'view':
                case 'read':
                    await this.handleView({ sock, message, args, from });
                    break;
                case 'delete':
                case 'del':
                case 'rm':
                    await this.handleDelete({ sock, message, args, from, sender });
                    break;
                case 'reload':
                    await this.handleReload({ sock, message, args, from });
                    break;
                default:
                    const fullText = args.join(' ');
                    if (fullText.includes('|')) {
                        await this.handleCreate({ sock, message, args, from, sender, isLegacy: true });
                    } else {
                        await this.showHelp({ sock, message, from, prefix });
                    }
            }

        } catch (error) {
            console.error('File command error:', error);
            await sock.sendMessage(from, {
                text: `❌ Error\n\n${error.message}`
            }, { quoted: message });
        }
    },

    async showHelp({ sock, message, from, prefix }) {
        const helpText = `📁 FILE MANAGER HELP\n\n` +
            `🔹 CREATE/REPLACE\n` +
            `${prefix}file create <category/name.js> | <code>\n` +
            `${prefix}file fun/joke.js | export default {...}\n\n` +
            `🔹 LIST FILES\n` +
            `${prefix}file list [category]\n` +
            `${prefix}file list fun\n\n` +
            `🔹 VIEW FILE\n` +
            `${prefix}file view <category/name.js>\n` +
            `${prefix}file view fun/joke.js\n\n` +
            `🔹 DELETE FILE\n` +
            `${prefix}file delete <category/name.js>\n` +
            `${prefix}file delete fun/joke.js\n\n` +
            `🔹 RELOAD COMMAND\n` +
            `${prefix}file reload <command-name>\n\n` +
            `📂 Valid Categories:\n` +
            `${this.validCategories.join(', ')}`;

        await sock.sendMessage(from, {
            text: helpText
        }, { quoted: message });
    },

    async handleCreate({ sock, message, args, from, sender, isLegacy = false }) {
        let fullText;
        
        if (isLegacy) {
            fullText = args.join(' ');
        } else {
            fullText = args.slice(1).join(' ');
        }

        if (!fullText.includes('|')) {
            return await sock.sendMessage(from, {
                text: `❌ Invalid Format\n\nUse: file create <category/filename.js> | <code>\n\nExample:\nfile create fun/test.js | export default { name: "test", ... }`
            }, { quoted: message });
        }

        const [filePath, ...contentParts] = fullText.split('|');
        const fileContent = contentParts.join('|').trim();
        const cleanPath = filePath.trim();

        if (!cleanPath || !fileContent) {
            return await sock.sendMessage(from, {
                text: `❌ Missing Data\n\nBoth filepath and content are required.`
            }, { quoted: message });
        }

        let category = '';
        let filename = '';

        if (cleanPath.includes('/')) {
            const parts = cleanPath.split('/');
            category = parts[0].toLowerCase();
            filename = parts[parts.length - 1];
        } else {
            filename = cleanPath;
        }

        if (category && !this.validCategories.includes(category)) {
            return await sock.sendMessage(from, {
                text: `❌ Invalid Category\n\n"${category}" is not valid.\n\nValid: ${this.validCategories.join(', ')}`
            }, { quoted: message });
        }

        if (!filename.endsWith('.js')) {
            filename += '.js';
        }

        const finalPath = category 
            ? path.join(process.cwd(), 'src', 'commands', category, filename)
            : path.join(process.cwd(), 'src', 'commands', 'general', filename);

        const displayPath = category 
            ? `src/commands/${category}/${filename}`
            : `src/commands/general/${filename}`;

        const fileExists = await fs.pathExists(finalPath);

        if (fileExists) {
            const confirmMsg = await sock.sendMessage(from, {
                text: `⚠️ File Already Exists\n\n📁 Path: ${displayPath}\n📂 Category: ${category || 'general'}\n\nReact:\n✅ - Replace file\n❌ - Cancel`
            }, { quoted: message });

            await sock.sendMessage(from, {
                react: { text: '✅', key: confirmMsg.key }
            });
            await sock.sendMessage(from, {
                react: { text: '❌', key: confirmMsg.key }
            });

            this.setupReactionHandler(sock, from, confirmMsg.key.id, sender, finalPath, fileContent, displayPath, category || 'general', filename);
        } else {
            await fs.ensureDir(path.dirname(finalPath));
            await fs.writeFile(finalPath, fileContent, 'utf8');

            const commandName = filename.replace('.js', '');
            await commandHandler.loadCommands();

            await sock.sendMessage(from, {
                text: `✅ File Created\n\n📁 Path: ${displayPath}\n📂 Category: ${category || 'general'}\n📏 Size: ${fileContent.length} bytes\n👤 By: @${sender.split('@')[0]}\n📅 Date: ${new Date().toLocaleString()}\n\n💡 Use: ${commandName}`,
                mentions: [sender]
            }, { quoted: message });
        }
    },

    async handleList({ sock, message, args, from }) {
        const category = args[1]?.toLowerCase();

        if (category && !this.validCategories.includes(category)) {
            return await sock.sendMessage(from, {
                text: `❌ Invalid Category\n\nValid: ${this.validCategories.join(', ')}`
            }, { quoted: message });
        }

        const commandsPath = path.join(process.cwd(), 'src', 'commands');
        let listText = `📁 COMMAND FILES\n\n`;

        if (category) {
            const categoryPath = path.join(commandsPath, category);
            if (await fs.pathExists(categoryPath)) {
                const files = (await fs.readdir(categoryPath)).filter(f => f.endsWith('.js'));
                listText += `📂 ${category.toUpperCase()} (${files.length})\n\n`;
                files.forEach(file => {
                    listText += `  ✧ ${file}\n`;
                });
            } else {
                listText += `Empty category`;
            }
        } else {
            for (const cat of this.validCategories) {
                const categoryPath = path.join(commandsPath, cat);
                if (await fs.pathExists(categoryPath)) {
                    const files = (await fs.readdir(categoryPath)).filter(f => f.endsWith('.js'));
                    if (files.length > 0) {
                        listText += `📂 ${cat} (${files.length})\n`;
                        files.slice(0, 5).forEach(file => {
                            listText += `  ✧ ${file}\n`;
                        });
                        if (files.length > 5) {
                            listText += `  ... and ${files.length - 5} more\n`;
                        }
                        listText += `\n`;
                    }
                }
            }
        }

        await sock.sendMessage(from, {
            text: listText
        }, { quoted: message });
    },

    async handleView({ sock, message, args, from }) {
        if (!args[1]) {
            return await sock.sendMessage(from, {
                text: `❌ Missing File Path\n\nUse: file view <category/filename.js>`
            }, { quoted: message });
        }

        const filePath = args[1];
        let category = '';
        let filename = '';

        if (filePath.includes('/')) {
            const parts = filePath.split('/');
            category = parts[0].toLowerCase();
            filename = parts[parts.length - 1];
        } else {
            filename = filePath;
        }

        if (!filename.endsWith('.js')) {
            filename += '.js';
        }

        const fullPath = category
            ? path.join(process.cwd(), 'src', 'commands', category, filename)
            : path.join(process.cwd(), 'src', 'commands', 'general', filename);

        if (!(await fs.pathExists(fullPath))) {
            return await sock.sendMessage(from, {
                text: `❌ File Not Found\n\n${filePath}`
            }, { quoted: message });
        }

        const content = await fs.readFile(fullPath, 'utf8');
        const stats = await fs.stat(fullPath);

        await sock.sendMessage(from, {
            document: Buffer.from(content),
            fileName: filename,
            mimetype: 'text/javascript',
            caption: `📄 ${filename}\n\n📂 Category: ${category || 'general'}\n📏 Size: ${stats.size} bytes\n📅 Modified: ${stats.mtime.toLocaleString()}`
        }, { quoted: message });
    },

    async handleDelete({ sock, message, args, from, sender }) {
        if (!args[1]) {
            return await sock.sendMessage(from, {
                text: `❌ Missing File Path\n\nUse: file delete <category/filename.js>`
            }, { quoted: message });
        }

        const filePath = args[1];
        let category = '';
        let filename = '';

        if (filePath.includes('/')) {
            const parts = filePath.split('/');
            category = parts[0].toLowerCase();
            filename = parts[parts.length - 1];
        } else {
            filename = filePath;
        }

        if (!filename.endsWith('.js')) {
            filename += '.js';
        }

        const fullPath = category
            ? path.join(process.cwd(), 'src', 'commands', category, filename)
            : path.join(process.cwd(), 'src', 'commands', 'general', filename);

        if (!(await fs.pathExists(fullPath))) {
            return await sock.sendMessage(from, {
                text: `❌ File Not Found\n\n${filePath}`
            }, { quoted: message });
        }

        const displayPath = category
            ? `src/commands/${category}/${filename}`
            : `src/commands/general/${filename}`;

        const confirmMsg = await sock.sendMessage(from, {
            text: `⚠️ Delete File?\n\n📁 Path: ${displayPath}\n\nReact:\n✅ - Delete permanently\n❌ - Cancel`
        }, { quoted: message });

        await sock.sendMessage(from, {
            react: { text: '✅', key: confirmMsg.key }
        });
        await sock.sendMessage(from, {
            react: { text: '❌', key: confirmMsg.key }
        });

        this.setupDeleteHandler(sock, from, confirmMsg.key.id, sender, fullPath, displayPath, filename);
    },

    async handleReload({ sock, message, args, from }) {
        if (!args[1]) {
            return await sock.sendMessage(from, {
                text: `❌ Missing Command Name\n\nUse: file reload <command-name>`
            }, { quoted: message });
        }

        const commandName = args[1].toLowerCase();
        const success = await commandHandler.reloadCommand(commandName);

        if (success) {
            await sock.sendMessage(from, {
                text: `✅ Command Reloaded\n\n🔄 ${commandName}\n\nThe command has been reloaded successfully.`
            }, { quoted: message });
        } else {
            await sock.sendMessage(from, {
                text: `❌ Reload Failed\n\n🔄 ${commandName}\n\nCommand not found or reload error.`
            }, { quoted: message });
        }
    },

    setupReactionHandler(sock, from, messageId, sender, filePath, fileContent, displayPath, category, filename) {
        const reactionTimeout = setTimeout(() => {
            if (global.reactHandlers && global.reactHandlers[messageId]) {
                delete global.reactHandlers[messageId];
                sock.sendMessage(from, {
                    text: `⏰ Operation Cancelled\n\nReaction timeout (60s).`
                });
            }
        }, 60000);

        if (!global.reactHandlers) {
            global.reactHandlers = {};
        }

        global.reactHandlers[messageId] = {
            command: this.name,
            timeout: reactionTimeout,
            handler: async (reactionEmoji, reactSender) => {
                if (reactSender !== sender) return;

                clearTimeout(reactionTimeout);

                if (reactionEmoji === '✅') {
                    try {
                        await fs.ensureDir(path.dirname(filePath));
                        await fs.writeFile(filePath, fileContent, 'utf8');

                        const commandName = filename.replace('.js', '');
                        await commandHandler.reloadCommand(commandName);

                        await sock.sendMessage(from, {
                            text: `✅ File Replaced\n\n📁 Path: ${displayPath}\n📂 Category: ${category}\n📏 Size: ${fileContent.length} bytes\n👤 By: @${sender.split('@')[0]}\n📅 Date: ${new Date().toLocaleString()}\n\n🔄 Command reloaded automatically`,
                            mentions: [sender]
                        });
                    } catch (error) {
                        await sock.sendMessage(from, {
                            text: `❌ Error\n\nFailed to replace file: ${error.message}`
                        });
                    }
                } else if (reactionEmoji === '❌') {
                    await sock.sendMessage(from, {
                        text: `❌ Operation Cancelled\n\n📁 ${displayPath}\n\nFile was not modified.`
                    });
                }

                delete global.reactHandlers[messageId];
            }
        };
    },

    setupDeleteHandler(sock, from, messageId, sender, filePath, displayPath, filename) {
        const reactionTimeout = setTimeout(() => {
            if (global.reactHandlers && global.reactHandlers[messageId]) {
                delete global.reactHandlers[messageId];
                sock.sendMessage(from, {
                    text: `⏰ Operation Cancelled\n\nReaction timeout (60s).`
                });
            }
        }, 60000);

        if (!global.reactHandlers) {
            global.reactHandlers = {};
        }

        global.reactHandlers[messageId] = {
            command: this.name,
            timeout: reactionTimeout,
            handler: async (reactionEmoji, reactSender) => {
                if (reactSender !== sender) return;

                clearTimeout(reactionTimeout);

                if (reactionEmoji === '✅') {
                    try {
                        await fs.remove(filePath);

                        const commandName = filename.replace('.js', '');
                        await commandHandler.loadCommands();

                        await sock.sendMessage(from, {
                            text: `✅ File Deleted\n\n📁 Path: ${displayPath}\n👤 By: @${sender.split('@')[0]}\n📅 Date: ${new Date().toLocaleString()}\n\n🗑️ Command removed from bot`,
                            mentions: [sender]
                        });
                    } catch (error) {
                        await sock.sendMessage(from, {
                            text: `❌ Error\n\nFailed to delete file: ${error.message}`
                        });
                    }
                } else if (reactionEmoji === '❌') {
                    await sock.sendMessage(from, {
                        text: `❌ Operation Cancelled\n\n📁 ${displayPath}\n\nFile was not deleted.`
                    });
                }

                delete global.reactHandlers[messageId];
            }
        };
    }
};