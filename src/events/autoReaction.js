import logger from '../utils/logger.js';
import config from '../config.js';
import { getUser, updateUser } from '../models/User.js';

const autoReactKeywords = {
    '❤️': ['love', 'heart', 'cute', 'beautiful', 'amazing'],
    '😂': ['haha', 'lol', 'funny', 'lmao', 'rofl', '😂', '🤣'],
    '🔥': ['fire', 'hot', 'lit', 'awesome', 'dope'],
    '👏': ['congrats', 'congratulations', 'well done', 'applause', 'bravo'],
    '💯': ['perfect', '100', 'exactly', 'facts', 'true'],
    '🎉': ['party', 'celebrate', 'birthday', 'anniversary', 'yay'],
    '😍': ['gorgeous', 'stunning', 'lovely', 'pretty'],
    '💪': ['strong', 'power', 'strength', 'motivation', 'gym'],
    '🙏': ['thank', 'thanks', 'grateful', 'appreciate', 'bless'],
    '⚡': ['energy', 'electric', 'shock', 'lightning', 'fast'],
    '✨': ['sparkle', 'shine', 'magic', 'magical', 'special'],
    '🎯': ['goal', 'target', 'aim', 'bullseye', 'perfect'],
    '💎': ['diamond', 'precious', 'valuable', 'gem', 'treasure'],
    '🌟': ['star', 'superstar', 'shine', 'bright', 'excellent'],
    '👑': ['king', 'queen', 'royal', 'crown', 'boss'],
    '🚀': ['rocket', 'launch', 'space', 'speed', 'fast'],
    '💰': ['money', 'cash', 'rich', 'profit', 'win'],
    '🎵': ['music', 'song', 'melody', 'tune', 'beat'],
    '📚': ['book', 'study', 'learn', 'education', 'knowledge'],
    '☕': ['coffee', 'tea', 'drink', 'morning', 'caffeine']
};

export default async function handleAutoReaction(sock, message) {
    try {
        const messageText = message.message?.conversation || 
                           message.message?.extendedTextMessage?.text || '';
        
        if (!messageText) return;
        
        const from = message.key.remoteJid;
        const sender = message.key.participant || from;
        const isGroup = from.endsWith('@g.us');
        
        const lowerText = messageText.toLowerCase();
        
        for (const [emoji, keywords] of Object.entries(autoReactKeywords)) {
            for (const keyword of keywords) {
                if (lowerText.includes(keyword)) {
                    try {
                        const reactionMessage = {
                            react: {
                                text: emoji,
                                key: message.key
                            }
                        };
                        
                        await sock.sendMessage(from, reactionMessage);
                        logger.debug(`Auto-reacted with ${emoji} to message containing "${keyword}"`);
                        
                        await updateUser(sender, {
                            $inc: { 'stats.reactionsReceived': 1 }
                        });
                        
                        return;
                    } catch (error) {
                        logger.error('Error sending auto-reaction:', error);
                    }
                }
            }
        }
        
        if (messageText.length > 500 && !isGroup) {
            try {
                await sock.sendMessage(from, {
                    react: {
                        text: '📝',
                        key: message.key
                    }
                });
            } catch (error) {
                logger.error('Error sending long message reaction:', error);
            }
        }
        
        const hasMedia = message.message?.imageMessage || 
                        message.message?.videoMessage || 
                        message.message?.documentMessage;
        
        if (hasMedia) {
            try {
                await sock.sendMessage(from, {
                    react: {
                        text: '📎',
                        key: message.key
                    }
                });
            } catch (error) {
                logger.error('Error sending media reaction:', error);
            }
        }
        
        if (lowerText.includes(config.botName.toLowerCase())) {
            try {
                await sock.sendMessage(from, {
                    react: {
                        text: '🤖',
                        key: message.key
                    }
                });
            } catch (error) {
                logger.error('Error sending bot mention reaction:', error);
            }
        }
        
    } catch (error) {
        logger.error('Error in autoReaction event:', error);
    }
}
