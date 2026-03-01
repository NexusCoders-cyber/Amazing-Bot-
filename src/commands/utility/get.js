import axios from 'axios';

export default {
    name: 'get',
    aliases: ['api', 'fetch'],
    category: 'utility',
    description: 'Fetch and display data from a given API URL',
    usage: 'get <URL>',
    example: 'get https://ytplay-api-j5a1.onrender.com/play/audio?query=Bohemian%20Rhapsody',
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
            const url = args[0].trim();

            if (!url.startsWith('http://') && !url.startsWith('https://')) {
                await sock.sendMessage(from, {
                    text: `❌ *Error*\nURL must start with http:// or https://.\n\n💡 *Example*: \`${prefix}get https://example.com/api\``
                }, { quoted: message });
                return;
            }

            // React with magnifying glass emoji (🔍)
            await sock.sendMessage(from, {
                react: { text: '🔍', key: message.key }
            });

            // Send initial progress message
            const progressMessage = await sock.sendMessage(from, {
                text: `🌐 *Fetching Data*...\n📊 Progress: 0%`
            }, { quoted: message });

            let progress = 0;

            // Fetch data from URL with extended timeout and download progress
            const response = await axios.get(url, {
                timeout: 120000, // 120 seconds for slow APIs
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                },
                onDownloadProgress: (progressEvent) => {
                    if (progressEvent.total) {
                        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                        if (percentCompleted > progress) {
                            progress = percentCompleted;
                            // Update progress message
                            sock.sendMessage(from, {
                                edit: progressMessage.key,
                                text: `🌐 *Fetching Data*...\n📊 Progress: ${progress}%`
                            });
                        }
                    }
                }
            });

            const data = response.data;

            // Edit progress to "Processing response..."
            await sock.sendMessage(from, {
                edit: progressMessage.key,
                text: `🌐 *Processing Response*...\n📊 Progress: 0%`
            });

            // Check if response contains an image URL
            let imageUrl = null;
            if (typeof data === 'object') {
                // Common fields where image URLs might be
                const possibleImageFields = ['image', 'thumbnail', 'url', 'poster', 'avatar', 'photo'];
                for (const field of possibleImageFields) {
                    if (data[field] && typeof data[field] === 'string' && (data[field].startsWith('http://') || data[field].startsWith('https://')) && data[field].match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
                        imageUrl = data[field];
                        break;
                    }
                }
                // If no top-level, check nested objects (e.g., results array)
                if (!imageUrl && data.results && Array.isArray(data.results) && data.results.length > 0) {
                    const firstResult = data.results[0];
                    for (const field of possibleImageFields) {
                        if (firstResult[field] && typeof firstResult[field] === 'string' && (firstResult[field].startsWith('http://') || firstResult[field].startsWith('https://')) && firstResult[field].match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
                            imageUrl = firstResult[field];
                            break;
                        }
                    }
                }
            }

            // Format JSON response
            const jsonString = JSON.stringify(data, null, 2);
            const maxMessageLength = 4096; // WhatsApp text limit

            if (jsonString.length <= maxMessageLength) {
                // Small response: Send directly
                const output = `🌐 *Fetched Data*:\n\`\`\`json\n${jsonString}\n\`\`\`\n\n> Ilom bot`;
                await sock.sendMessage(from, {
                    edit: progressMessage.key,
                    text: output
                }, { quoted: message });
            } else {
                // Large response: Stream in chunks
                const chunks = [];
                let remaining = jsonString;
                let chunkProgress = 0;

                while (remaining.length > 0) {
                    let chunkSize = maxMessageLength - 100; // Buffer for headers/footers
                    let chunk = remaining.slice(0, chunkSize);
                    
                    // Try to split at a safe point (e.g., after a newline or brace)
                    const lastNewline = chunk.lastIndexOf('\n');
                    const lastBrace = chunk.lastIndexOf('}');
                    const lastBracket = chunk.lastIndexOf(']');
                    const splitIndex = Math.max(lastNewline, lastBrace, lastBracket);
                    if (splitIndex > 0 && splitIndex < chunkSize - 50) {
                        chunk = remaining.slice(0, splitIndex + 1);
                    }

                    chunks.push(chunk);
                    remaining = remaining.slice(chunk.length);

                    // Update progress
                    chunkProgress += (chunk.length / jsonString.length) * 100;
                    await sock.sendMessage(from, {
                        edit: progressMessage.key,
                        text: `🌐 *Streaming Response*...\n📊 Progress: ${Math.round(chunkProgress)}%`
                    });
                }

                // Send first chunk with header
                let firstChunkOutput = `🌐 *Fetched Data* (Part 1/${chunks.length}):\n\`\`\`json\n${chunks[0]}\n\`\`\``;
                await sock.sendMessage(from, {
                    edit: progressMessage.key,
                    text: firstChunkOutput
                }, { quoted: message });

                // Send remaining chunks
                for (let i = 1; i < chunks.length; i++) {
                    const partNum = i + 1;
                    let chunkOutput = `🌐 *Fetched Data* (Part ${partNum}/${chunks.length}):\n\`\`\`json\n${chunks[i]}`;
                    if (i === chunks.length - 1) {
                        chunkOutput += `\n\`\`\`\n\n> Ilom bot`;
                    } else {
                        chunkOutput += `\n\`\`\``;
                    }
                    await sock.sendMessage(from, {
                        text: chunkOutput
                    }, { quoted: message });

                    // Update progress for each chunk
                    const finalProgress = Math.round(((i + 1) / chunks.length) * 100);
                    await sock.sendMessage(from, {
                        edit: progressMessage.key,
                        text: `🌐 *Streaming Response*...\n📊 Progress: ${finalProgress}%`
                    });
                }

                // Final progress update
                await sock.sendMessage(from, {
                    edit: progressMessage.key,
                    text: `🌐 *Streaming Complete*!\n📊 Progress: 100%`
                });
            }

            // If an image URL was found, send it as an image
            if (imageUrl) {
                await sock.sendMessage(from, {
                    image: { url: imageUrl },
                    caption: `🖼️ *Detected Image from Response*:\n🔗 ${imageUrl}`,
                    contextInfo: {
                    }
                }, { quoted: message });
            }

        } catch (error) {
            console.error('Get command error:', error);
            await sock.sendMessage(from, {
                text: `❌ *Error*\nFailed to fetch data: ${error.message}\n\n💡 Check the URL and try again!`
            }, { quoted: message });
        }
    }
};