import { describe, expect, it } from 'vitest';
import { BetStatus } from '../../src/domain/enums/bet-status.enum';
import { GameStatus } from '../../src/domain/enums/game-status.enum';
import { TransactionType } from '../../src/domain/enums/transaction-type.enum';

describe('Domain Enums', () => {
  it('should have all expected BetStatus values', () => {
    expect(BetStatus.PENDING).toBe('PENDING');
    expect(BetStatus.ACTIVE).toBe('ACTIVE');
    expect(BetStatus.WON).toBe('WON');
    expect(BetStatus.LOST).toBe('LOST');
    expect(BetStatus.CASHED_OUT).toBe('CASHED_OUT');
  });

  it('should have all expected GameStatus values', () => {
    expect(GameStatus.WAITING_BETS).toBe('WAITING_BETS');
    expect(GameStatus.RUNNING).toBe('RUNNING');
    expect(GameStatus.CRASHED).toBe('CRASHED');
    expect(GameStatus.FINISHED).toBe('FINISHED');
  });

  it('should have all expected TransactionType values', () => {
    expect(TransactionType.DEPOSIT).toBe('DEPOSIT');
    expect(TransactionType.WITHDRAWAL).toBe('WITHDRAWAL');
    expect(TransactionType.BET_DEBIT).toBe('BET_DEBIT');
    expect(TransactionType.BET_WIN).toBe('BET_WIN');
  });
});
