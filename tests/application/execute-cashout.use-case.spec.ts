import { describe, expect, it, vi } from 'vitest';
import { ExecuteCashoutUseCase } from '../../src/application/use-cases/execute-cashout.use-case';
import { Bet } from '../../src/domain/entities/bet.entity';
import { GameRound } from '../../src/domain/entities/game-round.entity';
import { Wallet } from '../../src/domain/entities/wallet.entity';
import { IEventPublisher } from '../../src/infrastructure/messaging/event-publisher.interface';
import { randomUUID } from 'node:crypto';

describe('ExecuteCashoutUseCase', () => {
  it('should successfully execute cashout when game round is running', async () => {
    const roundId = randomUUID();
    const betId = randomUUID();

    const wallet = new Wallet('user-1', 10);
    const gameRound = new GameRound();
    gameRound.id = roundId;
    gameRound.startRound();
    gameRound.updateMultiplier(2.0);

    const bet = new Bet('user-1', roundId, 50);
    bet.id = betId;

    const mockForkedEm = {
      findOneOrFail: vi.fn((entity: unknown, criteria: unknown) => {
        if (entity === Bet) return Promise.resolve(bet);
        if (entity === GameRound) return Promise.resolve(gameRound);
        if (entity === Wallet) return Promise.resolve(wallet);
        return Promise.reject(new Error('Unknown entity'));
      }),
    };

    const mockEm = {
      transactional: vi.fn((cb: (em: typeof mockForkedEm) => Promise<unknown>) => cb(mockForkedEm)),
    };

    const mockPublisher: IEventPublisher = {
      publishToTopic: vi.fn().mockResolvedValue(undefined),
      sendToQueue: vi.fn(),
    };

    const useCase = new ExecuteCashoutUseCase(mockEm as never, mockPublisher);

    const result = await useCase.execute({
      betId,
      gameRoundId: roundId,
    });

    expect(result.winAmount).toBe(100);
    expect(wallet.balance).toBe(110);
    expect(mockPublisher.publishToTopic).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        eventType: 'PlayerCashedOutEvent',
        aggregateId: betId,
      }),
    );
  });

  it('should throw error when game round is not running', async () => {
    const roundId = randomUUID();
    const betId = randomUUID();

    const gameRound = new GameRound();
    gameRound.id = roundId;
    const bet = new Bet('user-1', roundId, 50);

    const mockForkedEm = {
      findOneOrFail: vi.fn((entity: unknown) => {
        if (entity === Bet) return Promise.resolve(bet);
        if (entity === GameRound) return Promise.resolve(gameRound);
        return Promise.reject(new Error('Unknown entity'));
      }),
    };

    const mockEm = {
      transactional: vi.fn((cb: (em: typeof mockForkedEm) => Promise<unknown>) => cb(mockForkedEm)),
    };

    const mockPublisher: IEventPublisher = {
      publishToTopic: vi.fn(),
      sendToQueue: vi.fn(),
    };

    const useCase = new ExecuteCashoutUseCase(mockEm as never, mockPublisher);

    await expect(
      useCase.execute({
        betId,
        gameRoundId: roundId,
      }),
    ).rejects.toThrow('Cannot cash out. Game round is not currently running.');
  });
});
