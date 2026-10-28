import { describe, expect, it } from 'vitest';
import { GameRound } from '../../src/domain/entities/game-round.entity';
import { GameStatus } from '../../src/domain/enums/game-status.enum';
import { GameRoundClosedException } from '../../src/domain/exceptions/game-round-closed.exception';
import { InvalidBetAmountException } from '../../src/domain/exceptions/invalid-bet-amount.exception';

describe('GameRound Entity', () => {
  it('should initialize with WAITING_BETS status and 1.0 multiplier', () => {
    const round = new GameRound();

    expect(round.id).toBeDefined();
    expect(round.status).toBe(GameStatus.WAITING_BETS);
    expect(round.currentMultiplier).toBe(1.0);
    expect(round.totalPot).toBe(0);
    expect(round.crashedAtMultiplier).toBeUndefined();
    expect(round.finishedAt).toBeUndefined();
  });

  it('should register bet and increase total pot when status is WAITING_BETS', () => {
    const round = new GameRound();

    round.registerBet(50);
    round.registerBet(25.5);

    expect(round.totalPot).toBe(75.5);
  });

  it('should throw InvalidBetAmountException when registering zero or negative bet', () => {
    const round = new GameRound();

    expect(() => round.registerBet(0)).toThrow(InvalidBetAmountException);
    expect(() => round.registerBet(-10)).toThrow(InvalidBetAmountException);
  });

  it('should throw GameRoundClosedException when registering bet after round starts', () => {
    const round = new GameRound();
    round.startRound();

    expect(() => round.registerBet(50)).toThrow(GameRoundClosedException);
  });

  it('should start round and change status to RUNNING', () => {
    const round = new GameRound();

    round.startRound();

    expect(round.status).toBe(GameStatus.RUNNING);
    expect(round.currentMultiplier).toBe(1.0);
  });

  it('should update current multiplier during running state', () => {
    const round = new GameRound();
    round.startRound();

    round.updateMultiplier(1.85);

    expect(round.currentMultiplier).toBe(1.85);
  });

  it('should not update multiplier if round is not running', () => {
    const round = new GameRound();

    round.updateMultiplier(2.5);

    expect(round.currentMultiplier).toBe(1.0);
  });

  it('should crash round, set crashed multiplier and finished timestamp', () => {
    const round = new GameRound();
    round.startRound();

    round.crash(3.42);

    expect(round.status).toBe(GameStatus.CRASHED);
    expect(round.crashedAtMultiplier).toBe(3.42);
    expect(round.finishedAt).toBeInstanceOf(Date);
  });
});
