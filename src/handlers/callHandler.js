import logger from '../utils/logger.js';
import config from '../config.js';
import { getUser, updateUser } from '../models/User.js';

class CallHandler {
    constructor() {
        this.callStats = new Map();
        this.autoReject = true;
    }

    async handleIncomingCall(sock, callEvents) {
        if (!config.events.callAutoReject) {
            logger.debug('Call auto-reject is disabled in config');
            return;
        }

        for (const call of callEvents) {
            try {
                const { from, id, status, isVideo, isGroup } = call;
                
                if (status !== 'offer') continue;
                
                logger.info(`Incoming ${isVideo ? 'video' : 'voice'} call from ${from}`);
                
                const isOwner = config.ownerNumbers.some(num => 
                    from.includes(num.replace(/[^0-9]/g, ''))
                );
                
                if (isOwner) {
                    logger.info(`Call from owner ${from} - allowing`);
                    continue;
                }
                
                if (this.autoReject && config.events.callAutoReject) {
                    await sock.rejectCall(id, from);
                    
                    const rejectMessage = `╭──⦿【 📞 CALL REJECTED 】
│
│ ❌ 𝗔𝘂𝘁𝗼𝗺𝗮𝘁𝗶𝗰 𝗖𝗮𝗹𝗹 𝗥𝗲𝗷𝗲𝗰𝘁𝗶𝗼𝗻
│
│ 𝗥𝗲𝗮𝘀𝗼𝗻:
│ This bot does not accept calls
│ to prevent disruptions
│
│ 📝 𝗡𝗼𝘁𝗲:
│ Please send a text message instead
│ Type ${config.prefix}help for assistance
│
│ 💡 𝗧𝗶𝗽:
│ Contact bot owner if urgent
│
╰────────────⦿

💫 | [ ${config.botName} 🍀 ]`;
                    
                    await sock.sendMessage(from, {
                        text: rejectMessage
                    });
                    
                    logger.info(`Call from ${from} rejected and notification sent`);
                    
                    const user = await getUser(from);
                    if (user) {
                        await updateUser(from, {
                            $inc: { callsRejected: 1 }
                        });
                    }
                    
                    if (config.ownerNumbers && config.ownerNumbers.length > 0) {
                        const ownerNotification = `╭──⦿【 📞 CALL ALERT 】
│
│ ⚠️ 𝗖𝗮𝗹𝗹 𝗥𝗲𝗷𝗲𝗰𝘁𝗲𝗱
│
│ 📱 𝗙𝗿𝗼𝗺: @${from.split('@')[0]}
│ 🎥 𝗧𝘆𝗽𝗲: ${isVideo ? 'Video Call' : 'Voice Call'}
│ 🔰 𝗚𝗿𝗼𝘂𝗽: ${isGroup ? 'Yes' : 'No'}
│ 🕐 𝗧𝗶𝗺𝗲: ${new Date().toLocaleString()}
│
│ 🤖 𝗔𝗰𝘁𝗶𝗼𝗻: Auto-rejected
│
╰────────────⦿`;
                        
                        for (const ownerNumber of config.ownerNumbers) {
                            await sock.sendMessage(ownerNumber, {
                                text: ownerNotification,
                                mentions: [from]
                            });
                        }
                    }
                }
                
                this.updateCallStats(from, isVideo);
                
            } catch (error) {
                logger.error('Error handling call:', error);
            }
        }
    }

    updateCallStats(from, isVideo) {
        const stats = this.callStats.get(from) || { total: 0, video: 0, voice: 0 };
        stats.total++;
        if (isVideo) {
            stats.video++;
        } else {
            stats.voice++;
        }
        this.callStats.set(from, stats);
    }

    setAutoReject(enabled) {
        this.autoReject = enabled;
        logger.info(`Auto-reject calls: ${enabled ? 'enabled' : 'disabled'}`);
    }

    getCallStats(from = null) {
        if (from) {
            return this.callStats.get(from) || { total: 0, video: 0, voice: 0 };
        }
        
        let totalCalls = 0;
        let videoCalls = 0;
        let voiceCalls = 0;
        
        for (const stats of this.callStats.values()) {
            totalCalls += stats.total;
            videoCalls += stats.video;
            voiceCalls += stats.voice;
        }
        
        return {
            total: totalCalls,
            video: videoCalls,
            voice: voiceCalls,
            uniqueCallers: this.callStats.size
        };
    }
}

export default new CallHandler();
