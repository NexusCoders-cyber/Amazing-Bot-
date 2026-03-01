import { createCanvas } from '@napi-rs/canvas';
import config from '../../config.js';

const hangmanCache = new Map();

export default {
    name: 'hangman',
    aliases: ['hang', 'hm'],
    category: 'games',
    description: 'Play an amazing hangman word guessing game with visual graphics',
    usage: 'hangman start or hangman <letter>',
    cooldown: 2,
    permissions: ['user'],
    supportsReply: true,
    args: true,
    minArgs: 1,

    async execute({ sock, message, args, from, sender, prefix }) {
        const input = args[0].toLowerCase();
        const gameKey = `${sender}_${from}`;
        
        if (input === 'start' || input === 'new') {
            const words = [
                'javascript', 'python', 'computer', 'internet', 'keyboard', 'monitor',
                'software', 'hardware', 'programming', 'algorithm', 'database', 'network',
                'android', 'whatsapp', 'message', 'technology', 'artificial', 'intelligence',
                'machine', 'learning', 'development', 'application', 'framework', 'library',
                'adventure', 'champion', 'elephant', 'fantastic', 'happiness', 'journey'
            ];
            
            const word = words[Math.floor(Math.random() * words.length)].toUpperCase();
            const guessed = [];
            const wrongGuesses = [];
            
            hangmanCache.set(gameKey, {
                word: word,
                guessed: guessed,
                wrongGuesses: wrongGuesses,
                maxWrong: 6,
                startTime: Date.now()
            });
            
            const imageBuffer = await this.createHangmanCanvas(word, guessed, wrongGuesses, 0);
            
            const gameText = `🎮 *HANGMAN GAME STARTED!*

🔤 Word: ${this.displayWord(word, guessed)}
📝 Guessed: None yet
❌ Wrong: 0/6

🎯 *How to Play:*
• Reply to this message with a letter
• Or type: ${prefix}hangman <letter>

💡 *Quick Examples:*
• Reply: "a" 
• Or: ${prefix}hangman a

Good luck! 🍀`;
            
            const sentMsg = await sock.sendMessage(from, {
                image: imageBuffer,
                caption: gameText
            }, { quoted: message });
            
            this.setupReplyHandler(sock, from, sentMsg.key.id, gameKey, sender, prefix);
            
            return sentMsg;
        }
        
        const game = hangmanCache.get(gameKey);
        if (!game) {
            return sock.sendMessage(from, {
                text: `❌ *No active hangman game*

Start one with: ${prefix}hangman start`
            }, { quoted: message });
        }
        
        await this.processGuess(sock, message, from, input, game, gameKey, sender, prefix);
    },

    async processGuess(sock, message, from, input, game, gameKey, sender, prefix) {
        const letter = input.toUpperCase();
        
        if (!/^[A-Z]$/.test(letter)) {
            return sock.sendMessage(from, {
                text: `❌ *Invalid input*

Please guess a single letter (A-Z)
Reply with a letter or use: ${prefix}hangman <letter>`
            }, { quoted: message });
        }
        
        if (game.guessed.includes(letter)) {
            return sock.sendMessage(from, {
                text: `⚠️ *Already guessed!*

You already tried "${letter}"
Try a different letter! 🔄`
            }, { quoted: message });
        }
        
        game.guessed.push(letter);
        
        if (game.word.includes(letter)) {
            const wordDisplay = this.displayWord(game.word, game.guessed);
            
            if (!wordDisplay.includes('_')) {
                const timeTaken = ((Date.now() - game.startTime) / 1000).toFixed(1);
                hangmanCache.delete(gameKey);
                
                const imageBuffer = await this.createVictoryCanvas(game.word, timeTaken);
                
                const winText = `🎉 *YOU WON!* 🏆

✅ Word: ${game.word}
⏱️ Time: ${timeTaken}s
❌ Wrong: ${game.wrongGuesses.length}/${game.maxWrong}
📝 Guesses: ${game.guessed.join(', ')}

🌟 Excellent word guessing!
🆕 Play again: ${prefix}hangman start`;
                
                return sock.sendMessage(from, {
                    image: imageBuffer,
                    caption: winText
                }, { quoted: message });
            }
            
            const imageBuffer = await this.createHangmanCanvas(game.word, game.guessed, game.wrongGuesses, game.wrongGuesses.length);
            
            const goodText = `✅ *Good guess!*

🔤 Word: ${wordDisplay}
📝 Guessed: ${game.guessed.join(', ')}
❌ Wrong: ${game.wrongGuesses.length}/${game.maxWrong}

🎯 Keep guessing!
💡 Reply or use: ${prefix}hangman <letter>`;
            
            const sentMsg = await sock.sendMessage(from, {
                image: imageBuffer,
                caption: goodText
            }, { quoted: message });
            
            this.setupReplyHandler(sock, from, sentMsg.key.id, gameKey, sender, prefix);
            
            return sentMsg;
        } else {
            game.wrongGuesses.push(letter);
            
            if (game.wrongGuesses.length >= game.maxWrong) {
                hangmanCache.delete(gameKey);
                
                const imageBuffer = await this.createGameOverCanvas(game.word);
                
                const loseText = `💀 *GAME OVER!*

❌ You lost!
✅ The word was: *${game.word}*
📝 Your guesses: ${game.guessed.join(', ')}
❌ Wrong letters: ${game.wrongGuesses.join(', ')}

🆕 Try again: ${prefix}hangman start`;
                
                return sock.sendMessage(from, {
                    image: imageBuffer,
                    caption: loseText
                }, { quoted: message });
            }
            
            const imageBuffer = await this.createHangmanCanvas(game.word, game.guessed, game.wrongGuesses, game.wrongGuesses.length);
            
            const wrongText = `❌ *Wrong letter!*

🔤 Word: ${this.displayWord(game.word, game.guessed)}
📝 Guessed: ${game.guessed.join(', ')}
❌ Wrong: ${game.wrongGuesses.length}/${game.maxWrong}

⚠️ Be careful! ${game.maxWrong - game.wrongGuesses.length} chances left!
💡 Reply or use: ${prefix}hangman <letter>`;
            
            const sentMsg = await sock.sendMessage(from, {
                image: imageBuffer,
                caption: wrongText
            }, { quoted: message });
            
            this.setupReplyHandler(sock, from, sentMsg.key.id, gameKey, sender, prefix);
            
            return sentMsg;
        }
    },

    setupReplyHandler(sock, from, messageId, gameKey, sender, prefix) {
        const replyTimeout = setTimeout(() => {
            if (global.replyHandlers && global.replyHandlers[messageId]) {
                delete global.replyHandlers[messageId];
            }
        }, 300000);
        
        if (!global.replyHandlers) {
            global.replyHandlers = {};
        }
        
        global.replyHandlers[messageId] = {
            command: 'hangman',
            gameKey: gameKey,
            timeout: replyTimeout,
            handler: async (replyText, replyMessage) => {
                const game = hangmanCache.get(gameKey);
                if (!game) {
                    await sock.sendMessage(from, {
                        text: `❌ Game expired or ended!\n\nStart new: ${prefix}hangman start`
                    }, { quoted: replyMessage });
                    clearTimeout(replyTimeout);
                    delete global.replyHandlers[messageId];
                    return;
                }
                
                const letter = replyText.trim().toUpperCase();
                
                if (!/^[A-Z]$/.test(letter)) {
                    await sock.sendMessage(from, {
                        text: `❌ Please reply with a single letter (A-Z)`
                    }, { quoted: replyMessage });
                    return;
                }
                
                await this.processGuess(sock, replyMessage, from, letter, game, gameKey, sender, prefix);
                
                clearTimeout(replyTimeout);
                delete global.replyHandlers[messageId];
            }
        };
    },
    
    displayWord(word, guessed) {
        return word
            .split('')
            .map(letter => guessed.includes(letter) ? letter : '_')
            .join(' ');
    },

    async createHangmanCanvas(word, guessed, wrongGuesses, wrongCount) {
        const canvas = createCanvas(800, 600);
        const ctx = canvas.getContext('2d');

        const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        gradient.addColorStop(0, '#1e3c72');
        gradient.addColorStop(1, '#2a5298');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.font = 'bold 50px Arial';
        ctx.fillStyle = '#ffd700';
        ctx.textAlign = 'center';
        ctx.fillText('🎮 HANGMAN GAME', 400, 60);

        this.drawHangmanStage(ctx, wrongCount);

        ctx.font = 'bold 40px Arial';
        ctx.fillStyle = '#ffffff';
        const wordDisplay = this.displayWord(word, guessed);
        ctx.fillText(wordDisplay, 400, 420);

        ctx.font = '28px Arial';
        ctx.fillStyle = '#00ff88';
        ctx.fillText(`Guessed: ${guessed.length > 0 ? guessed.join(', ') : 'None'}`, 400, 470);

        ctx.font = '28px Arial';
        ctx.fillStyle = wrongCount >= 4 ? '#ff4444' : '#ffaa00';
        ctx.fillText(`Wrong: ${wrongCount}/6`, 400, 510);

        ctx.font = '22px Arial';
        ctx.fillStyle = '#e0e0e0';
        ctx.fillText('Reply with a letter to guess!', 400, 560);

        return canvas.toBuffer('image/png');
    },

    async createVictoryCanvas(word, time) {
        const canvas = createCanvas(800, 600);
        const ctx = canvas.getContext('2d');

        const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        gradient.addColorStop(0, '#00c9ff');
        gradient.addColorStop(1, '#92fe9d');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.font = 'bold 70px Arial';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
        ctx.shadowBlur = 10;
        ctx.fillText('🎉 YOU WON! 🏆', 400, 150);

        ctx.font = 'bold 50px Arial';
        ctx.fillStyle = '#ffd700';
        ctx.fillText(`Word: ${word}`, 400, 280);

        ctx.font = '35px Arial';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(`Time: ${time}s`, 400, 350);

        ctx.font = '30px Arial';
        ctx.fillStyle = '#e0e0e0';
        ctx.fillText('🌟 Excellent Word Guessing! 🌟', 400, 450);

        ctx.font = '25px Arial';
        ctx.fillText(`Powered by ${config.botName}`, 400, 550);

        return canvas.toBuffer('image/png');
    },

    async createGameOverCanvas(word) {
        const canvas = createCanvas(800, 600);
        const ctx = canvas.getContext('2d');

        const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        gradient.addColorStop(0, '#ee0979');
        gradient.addColorStop(1, '#ff6a00');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.font = 'bold 70px Arial';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
        ctx.shadowBlur = 10;
        ctx.fillText('💀 GAME OVER!', 400, 150);

        this.drawHangmanStage(ctx, 6);

        ctx.font = 'bold 45px Arial';
        ctx.fillStyle = '#ffd700';
        ctx.fillText(`The word was:`, 400, 420);

        ctx.font = 'bold 55px Arial';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(word, 400, 490);

        ctx.font = '25px Arial';
        ctx.fillStyle = '#e0e0e0';
        ctx.fillText('Better luck next time!', 400, 550);

        return canvas.toBuffer('image/png');
    },

    drawHangmanStage(ctx, wrongCount) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';

        ctx.beginPath();
        ctx.moveTo(200, 320);
        ctx.lineTo(350, 320);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(240, 320);
        ctx.lineTo(240, 120);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(240, 120);
        ctx.lineTo(340, 120);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(340, 120);
        ctx.lineTo(340, 150);
        ctx.stroke();

        if (wrongCount >= 1) {
            ctx.beginPath();
            ctx.arc(340, 175, 25, 0, Math.PI * 2);
            ctx.stroke();
        }

        if (wrongCount >= 2) {
            ctx.beginPath();
            ctx.moveTo(340, 200);
            ctx.lineTo(340, 260);
            ctx.stroke();
        }

        if (wrongCount >= 3) {
            ctx.beginPath();
            ctx.moveTo(340, 220);
            ctx.lineTo(310, 240);
            ctx.stroke();
        }

        if (wrongCount >= 4) {
            ctx.beginPath();
            ctx.moveTo(340, 220);
            ctx.lineTo(370, 240);
            ctx.stroke();
        }

        if (wrongCount >= 5) {
            ctx.beginPath();
            ctx.moveTo(340, 260);
            ctx.lineTo(315, 300);
            ctx.stroke();
        }

        if (wrongCount >= 6) {
            ctx.beginPath();
            ctx.moveTo(340, 260);
            ctx.lineTo(365, 300);
            ctx.stroke();
        }
    }
};
