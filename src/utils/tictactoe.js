export default class TicTacToe {
    constructor(playerX, playerO = null) {
        this.playerX = playerX;
        this.playerO = playerO;
        this._board = Array(9).fill(null);
        this._turn = 'X';
        this.turns = 0;
        this.winner = null;
    }

    get currentTurn() {
        return this._turn === 'X' ? this.playerX : this.playerO;
    }

    render() {
        return this._board.map((v, i) => v || String(i + 1));
    }

    turn(isO, index) {
        if (this.winner) return false;
        if (index < 0 || index > 8) return false;
        const symbol = isO ? 'O' : 'X';
        if (symbol !== this._turn) return false;
        if (this._board[index]) return false;

        this._board[index] = symbol;
        this.turns += 1;

        if (this.checkWin(symbol)) {
            this.winner = symbol === 'X' ? this.playerX : this.playerO;
            return true;
        }

        this._turn = this._turn === 'X' ? 'O' : 'X';
        return true;
    }

    checkWin(symbol) {
        const lines = [
            [0, 1, 2], [3, 4, 5], [6, 7, 8],
            [0, 3, 6], [1, 4, 7], [2, 5, 8],
            [0, 4, 8], [2, 4, 6]
        ];
        return lines.some(([a, b, c]) => this._board[a] === symbol && this._board[b] === symbol && this._board[c] === symbol);
    }
}
