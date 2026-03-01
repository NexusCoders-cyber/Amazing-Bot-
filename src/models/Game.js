import mongoose from 'mongoose';

const GameSchema = new mongoose.Schema({
    gameId: {
        type: String,
        required: true,
        unique: true
    },
    type: {
        type: String,
        required: true,
        enum: ['trivia', 'math', 'word', 'guess', 'quiz', 'puzzle']
    },
    player: {
        type: String,
        required: true
    },
    group: {
        type: String,
        default: null
    },
    score: {
        type: Number,
        default: 0
    },
    status: {
        type: String,
        enum: ['active', 'completed', 'abandoned'],
        default: 'active'
    },
    startedAt: {
        type: Date,
        default: Date.now
    },
    completedAt: {
        type: Date,
        default: null
    },
    answers: [{
        question: String,
        answer: String,
        correct: Boolean,
        timestamp: Date
    }]
}, {
    timestamps: true
});

const Game = mongoose.models.Game || mongoose.model('Game', GameSchema);
export default Game;
