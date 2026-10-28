import { describe, expect, it } from 'vitest';
import { Bet } from '../../src/domain/entities/bet.entity';
import { BetStatus } from '../../src/domain/enums/bet-status.enum';
import { InvalidBetAmountException } from '../../src/domain/exceptions/invalid-bet-amount.exception';

describe('Bet Entity', () => {
  it('should initialize active bet with provided values', () => {
    const bet = new Bet('user-1', 'round-1', 50);

    expect(bet.id).toBeDefined();
    expect(bet.userId).toBe('user-1');
    expect(bet.gameRoundId).toBe('round-1');
    expect(bet.amount).toBe(50);
    expect(bet.status).toBe(BetStatus.ACTIVE);
    expect(bet.winAmount).toBe(0);
    expect(bet.cashedOutAtMultiplier).toBeUndefined();
  });

  it('should throw InvalidBetAmountException when initializing with zero or negative amount', () => {
    expect(() => new Bet('user-1', 'round-1', 0)).toThrow(InvalidBetAmountException);
    expect(() => new Bet('user-1', 'round-1', -20)).toThrow(InvalidBetAmountException);
  });

  it('should cash out bet, calculate win amount and set CASHED_OUT status', () => {
    const bet = new Bet('user-1', 'round-1', 100);

    const win = bet.cashOut(2.5);

    expect(win).toBe(250);
    expect(bet.winAmount).toBe(250);
    expect(bet.cashedOutAtMultiplier).toBe(2.5);
    expect(bet.status).toBe(BetStatus.CASHED_OUT);
  });

  it('should throw error when trying to cash out an inactive bet', () => {
    const bet = new Bet('user-1', 'round-1', 100);
    bet.cashOut(1.5);

    expect(() => bet.cashOut(2.0)).toThrow('Bet is not in active state');
  });

  it('should mark active bet as lost', () => {
    const bet = new Bet('user-1', 'round-1', 50);

    bet.markAsLost();

    expect(bet.status).toBe(BetStatus.LOST);
    expect(bet.winAmount).toBe(0);
  });

  it('should ignore markAsLost if bet is already cashed out', () => {
    const bet = new Bet('user-1', 'round-1', 50);
    bet.cashOut(2.0);

    bet.markAsLost();

    expect(bet.status).toBe(BetStatus.CASHED_OUT);
    expect(bet.winAmount).toBe(100);
  });
});
