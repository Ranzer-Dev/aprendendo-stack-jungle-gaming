import { GameStatus } from '../enums/game-status.enum';

export class GameRoundClosedException extends Error {
  public constructor(gameId: string, currentStatus: GameStatus) {
    super(`Game round ${gameId} is not accepting bets. Current status: ${currentStatus}`);
    this.name = 'GameRoundClosedException';
  }
}
