import { Entity, Enum, PrimaryKey, Property } from '@mikro-orm/core';
import { randomUUID } from 'node:crypto';
import { BetStatus } from '../enums/bet-status.enum';
import { InvalidBetAmountException } from '../exceptions/invalid-bet-amount.exception';

@Entity({ tableName: 'bets' })
export class Bet {
  @PrimaryKey({ type: 'uuid' })
  public id: string = randomUUID();

  @Property({ type: 'string' })
  public userId!: string;

  @Property({ type: 'uuid' })
  public gameRoundId!: string;

  @Property({ type: 'decimal', precision: 12, scale: 2 })
  public amount!: number;

  @Enum({ items: () => BetStatus, default: BetStatus.ACTIVE })
  public status: BetStatus = BetStatus.ACTIVE;

  @Property({ type: 'decimal', precision: 8, scale: 2, nullable: true })
  public cashedOutAtMultiplier?: number;

  @Property({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  public winAmount: number = 0;

  @Property({ type: 'datetime', defaultRaw: 'CURRENT_TIMESTAMP' })
  public createdAt: Date = new Date();

  @Property({ type: 'datetime', onUpdate: () => new Date(), defaultRaw: 'CURRENT_TIMESTAMP' })
  public updatedAt: Date = new Date();

  public constructor(userId: string, gameRoundId: string, amount: number) {
    if (amount <= 0) {
      throw new InvalidBetAmountException(amount);
    }
    this.userId = userId;
    this.gameRoundId = gameRoundId;
    this.amount = Number(amount.toFixed(2));
    this.status = BetStatus.ACTIVE;
  }

  public cashOut(multiplier: number): number {
    if (this.status !== BetStatus.ACTIVE) {
      throw new Error(`Bet is not in active state. Current status: ${this.status}`);
    }
    this.status = BetStatus.CASHED_OUT;
    this.cashedOutAtMultiplier = Number(multiplier.toFixed(2));
    this.winAmount = Number((this.amount * multiplier).toFixed(2));
    return this.winAmount;
  }

  public markAsLost(): void {
    if (this.status === BetStatus.ACTIVE) {
      this.status = BetStatus.LOST;
      this.winAmount = 0;
    }
  }
}
