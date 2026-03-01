import logger from '../utils/logger.js';

class GameService {
    constructor() {
        this.activeGames = new Map();
        this.gameTypes = ['trivia', 'math', 'word', 'guess'];
    }

    async startGame(gameType, userJid, groupJid) {
        try {
            const gameId = `${groupJid || userJid}_${Date.now()}`;
            const game = {
                id: gameId,
                type: gameType,
                player: userJid,
                group: groupJid,
                startTime: Date.now(),
                score: 0,
                active: true
            };

            this.activeGames.set(gameId, game);
            logger.info(`Game started: ${gameType} by ${userJid}`);
            return game;
        } catch (error) {
            logger.error('Error starting game:', error);
            return null;
        }
    }

    async endGame(gameId) {
        try {
            const game = this.activeGames.get(gameId);
            if (game) {
                game.active = false;
                game.endTime = Date.now();
                this.activeGames.delete(gameId);
                logger.info(`Game ended: ${gameId}`);
                return game;
            }
            return null;
        } catch (error) {
            logger.error('Error ending game:', error);
            return null;
        }
    }

    async getActiveGame(userJid) {
        for (const [id, game] of this.activeGames.entries()) {
            if (game.player === userJid && game.active) {
                return game;
            }
        }
        return null;
    }
}

const gameService = new GameService();
export default gameService;
