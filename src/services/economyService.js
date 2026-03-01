import logger from '../utils/logger.js';
import { getUserEconomy, updateUserEconomy, createUserEconomy } from '../models/User.js';

class EconomyService {
    constructor() {
        this.currencies = {
            coin: '🪙',
            diamond: '💎',
            star: '⭐'
        };
        this.dailyReward = 1000;
        this.weeklyReward = 5000;
        this.monthlyReward = 20000;
        this.workCooldown = 3600000;
        this.dailyCooldown = 86400000;
        this.lastClaims = new Map();
    }

    async getBalance(userJid) {
        try {
            let economy = await getUserEconomy(userJid);
            
            if (!economy) {
                economy = await this.createAccount(userJid);
            }

            return {
                coins: economy.balance || 0,
                diamonds: economy.diamonds || 0,
                stars: economy.stars || 0,
                bank: economy.bank || 0,
                level: economy.level || 1,
                xp: economy.xp || 0
            };
        } catch (error) {
            logger.error('Error getting balance:', error);
            return null;
        }
    }

    async createAccount(userJid) {
        try {
            const economy = await createUserEconomy({
                jid: userJid,
                balance: 1000,
                diamonds: 0,
                stars: 0,
                bank: 0,
                level: 1,
                xp: 0,
                lastDaily: null,
                lastWeekly: null,
                lastMonthly: null,
                lastWork: null
            });

            logger.info(`Economy account created for ${userJid}`);
            return economy;
        } catch (error) {
            logger.error('Error creating economy account:', error);
            return null;
        }
    }

    async addCoins(userJid, amount, reason = 'transaction') {
        try {
            const economy = await this.getBalance(userJid);
            if (!economy) return false;

            await updateUserEconomy(userJid, {
                balance: economy.coins + amount
            });

            logger.info(`Added ${amount} coins to ${userJid} (${reason})`);
            return true;
        } catch (error) {
            logger.error('Error adding coins:', error);
            return false;
        }
    }

    async removeCoins(userJid, amount, reason = 'transaction') {
        try {
            const economy = await this.getBalance(userJid);
            if (!economy || economy.coins < amount) return false;

            await updateUserEconomy(userJid, {
                balance: economy.coins - amount
            });

            logger.info(`Removed ${amount} coins from ${userJid} (${reason})`);
            return true;
        } catch (error) {
            logger.error('Error removing coins:', error);
            return false;
        }
    }

    async transfer(fromJid, toJid, amount) {
        try {
            const fromEconomy = await this.getBalance(fromJid);
            if (!fromEconomy || fromEconomy.coins < amount) {
                return { success: false, message: 'Insufficient balance' };
            }

            const removed = await this.removeCoins(fromJid, amount, `transfer to ${toJid}`);
            if (!removed) {
                return { success: false, message: 'Transfer failed' };
            }

            await this.addCoins(toJid, amount, `transfer from ${fromJid}`);

            return { 
                success: true, 
                message: `Transferred ${amount} coins successfully`,
                amount 
            };
        } catch (error) {
            logger.error('Error transferring coins:', error);
            return { success: false, message: 'Transfer error' };
        }
    }

    async claimDaily(userJid) {
        try {
            const economy = await this.getBalance(userJid);
            if (!economy) return { success: false, message: 'Account not found' };

            const lastDaily = economy.lastDaily || 0;
            const now = Date.now();

            if (now - lastDaily < this.dailyCooldown) {
                const timeLeft = this.dailyCooldown - (now - lastDaily);
                return { 
                    success: false, 
                    message: `Daily reward already claimed. Try again in ${this.formatTime(timeLeft)}` 
                };
            }

            await this.addCoins(userJid, this.dailyReward, 'daily reward');
            await updateUserEconomy(userJid, { lastDaily: now });

            return { 
                success: true, 
                amount: this.dailyReward,
                message: `Claimed ${this.dailyReward} coins!` 
            };
        } catch (error) {
            logger.error('Error claiming daily:', error);
            return { success: false, message: 'Error claiming daily reward' };
        }
    }

    async work(userJid) {
        try {
            const economy = await this.getBalance(userJid);
            if (!economy) return { success: false, message: 'Account not found' };

            const lastWork = economy.lastWork || 0;
            const now = Date.now();

            if (now - lastWork < this.workCooldown) {
                const timeLeft = this.workCooldown - (now - lastWork);
                return { 
                    success: false, 
                    message: `You're tired! Rest for ${this.formatTime(timeLeft)}` 
                };
            }

            const workReward = Math.floor(Math.random() * 500) + 100;
            await this.addCoins(userJid, workReward, 'work reward');
            await updateUserEconomy(userJid, { lastWork: now });

            const jobs = [
                'developer', 'designer', 'writer', 'teacher', 'driver', 
                'chef', 'doctor', 'engineer', 'artist', 'musician'
            ];
            const job = jobs[Math.floor(Math.random() * jobs.length)];

            return { 
                success: true, 
                amount: workReward,
                job,
                message: `You worked as a ${job} and earned ${workReward} coins!` 
            };
        } catch (error) {
            logger.error('Error working:', error);
            return { success: false, message: 'Error processing work' };
        }
    }

    async gamble(userJid, amount) {
        try {
            const economy = await this.getBalance(userJid);
            if (!economy || economy.coins < amount) {
                return { success: false, message: 'Insufficient balance' };
            }

            const win = Math.random() > 0.5;
            const multiplier = Math.random() * 2;
            const winAmount = Math.floor(amount * multiplier);

            if (win) {
                await this.addCoins(userJid, winAmount, 'gamble win');
                return { 
                    success: true, 
                    won: true,
                    amount: winAmount,
                    message: `You won ${winAmount} coins! 🎉` 
                };
            } else {
                await this.removeCoins(userJid, amount, 'gamble loss');
                return { 
                    success: true, 
                    won: false,
                    amount: amount,
                    message: `You lost ${amount} coins! 😢` 
                };
            }
        } catch (error) {
            logger.error('Error gambling:', error);
            return { success: false, message: 'Gambling error' };
        }
    }

    async deposit(userJid, amount) {
        try {
            const economy = await this.getBalance(userJid);
            if (!economy || economy.coins < amount) {
                return { success: false, message: 'Insufficient balance' };
            }

            await updateUserEconomy(userJid, {
                balance: economy.coins - amount,
                bank: economy.bank + amount
            });

            return { 
                success: true, 
                amount,
                message: `Deposited ${amount} coins to bank` 
            };
        } catch (error) {
            logger.error('Error depositing:', error);
            return { success: false, message: 'Deposit error' };
        }
    }

    async withdraw(userJid, amount) {
        try {
            const economy = await this.getBalance(userJid);
            if (!economy || economy.bank < amount) {
                return { success: false, message: 'Insufficient bank balance' };
            }

            await updateUserEconomy(userJid, {
                balance: economy.coins + amount,
                bank: economy.bank - amount
            });

            return { 
                success: true, 
                amount,
                message: `Withdrawn ${amount} coins from bank` 
            };
        } catch (error) {
            logger.error('Error withdrawing:', error);
            return { success: false, message: 'Withdrawal error' };
        }
    }

    formatTime(ms) {
        const hours = Math.floor(ms / 3600000);
        const minutes = Math.floor((ms % 3600000) / 60000);
        const seconds = Math.floor((ms % 60000) / 1000);

        if (hours > 0) return `${hours}h ${minutes}m`;
        if (minutes > 0) return `${minutes}m ${seconds}s`;
        return `${seconds}s`;
    }

    async getLeaderboard(limit = 10) {
        try {
            logger.info(`Getting economy leaderboard (top ${limit})`);
            return [];
        } catch (error) {
            logger.error('Error getting leaderboard:', error);
            return [];
        }
    }
}

const economyService = new EconomyService();

export default economyService;
