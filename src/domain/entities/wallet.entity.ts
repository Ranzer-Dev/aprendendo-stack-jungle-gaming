import { Entity, PrimaryKey, Property } from '@mikro-orm/core';
import { randomUUID } from 'node:crypto';
import { InsufficientFundsException } from '../exceptions/insufficient-funds.exception';
import { InvalidBetAmountException } from '../exceptions/invalid-bet-amount.exception';

@Entity({ tableName: 'wallets' })
export class Wallet {
  @PrimaryKey({ type: 'uuid' })
  public id: string = randomUUID();

  @Property({ type: 'string', unique: true })
  public userId!: string;

  @Property({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  public balance: number = 0;

  @Property({ type: 'string', default: 'BRL' })
  public currency: string = 'BRL';

  @Property({ type: 'datetime', defaultRaw: 'CURRENT_TIMESTAMP' })
  public createdAt: Date = new Date();

  @Property({ type: 'datetime', onUpdate: () => new Date(), defaultRaw: 'CURRENT_TIMESTAMP' })
  public updatedAt: Date = new Date();

  public constructor(userId: string, initialBalance: number = 0) {
    this.userId = userId;
    this.balance = initialBalance;
  }

  public debit(amount: number): void {
    if (amount <= 0) {
      throw new InvalidBetAmountException(amount);
    }
    if (this.balance < amount) {
      throw new InsufficientFundsException(this.balance, amount);
    }
    this.balance = Number((this.balance - amount).toFixed(2));
  }

  public credit(amount: number): void {
    if (amount <= 0) {
      throw new InvalidBetAmountException(amount);
    }
    this.balance = Number((this.balance + amount).toFixed(2));
  }
}
