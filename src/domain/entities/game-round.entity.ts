import { Entity, Enum, PrimaryKey, Property } from '@mikro-orm/core';
import { randomUUID } from 'node:crypto';
import { GameStatus } from '../enums/game-status.enum';
import { GameRoundClosedException } from '../exceptions/game-round-closed.exception';
import { InvalidBetAmountException } from '../exceptions/invalid-bet-amount.exception';

@Entity({ tableName: 'game_rounds' })
export class GameRound {
  @PrimaryKey({ type: 'uuid' })
  public id: string = randomUUID();

  @Enum({ items: () => GameStatus, default: GameStatus.WAITING_BETS })
  public status: GameStatus = GameStatus.WAITING_BETS;

  @Property({ type: 'decimal', precision: 8, scale: 2, default: 1.0 })
  public currentMultiplier: number = 1.0;

  @Property({ type: 'decimal', precision: 8, scale: 2, nullable: true })
  public crashedAtMultiplier?: number;

  @Property({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  public totalPot: number = 0;

  @Property({ type: 'datetime', defaultRaw: 'CURRENT_TIMESTAMP' })
  public createdAt: Date = new Date();

  @Property({ type: 'datetime', nullable: true })
  public finishedAt?: Date;

  public constructor() {}

  public registerBet(amount: number): void {
    if (this.status !== GameStatus.WAITING_BETS) {
      throw new GameRoundClosedException(this.id, this.status);
    }
    if (amount <= 0) {
      throw new InvalidBetAmountException(amount);
    }
    this.totalPot = Number((this.totalPot + amount).toFixed(2));
  }

  public startRound(): void {
    this.status = GameStatus.RUNNING;
    this.currentMultiplier = 1.0;
  }

  public updateMultiplier(nextMultiplier: number): void {
    if (this.status !== GameStatus.RUNNING) {
      return;
    }
    this.currentMultiplier = Number(nextMultiplier.toFixed(2));
  }

  public crash(crashMultiplier: number): void {
    this.status = GameStatus.CRASHED;
    this.crashedAtMultiplier = Number(crashMultiplier.toFixed(2));
    this.finishedAt = new Date();
  }
}
