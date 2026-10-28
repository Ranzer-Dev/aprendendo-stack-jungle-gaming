import { describe, expect, it, vi } from 'vitest';
import { PlaceBetUseCase } from '../../src/application/use-cases/place-bet.use-case';
import { GameRound } from '../../src/domain/entities/game-round.entity';
import { Wallet } from '../../src/domain/entities/wallet.entity';
import { IEventPublisher } from '../../src/infrastructure/messaging/event-publisher.interface';
import { randomUUID } from 'node:crypto';

describe('PlaceBetUseCase', () => {
  it('should successfully place bet with atomic transaction and enqueue SQS event', async () => {
    const roundId = randomUUID();
    const wallet = new Wallet('user-1', 100);
    const gameRound = new GameRound();
    gameRound.id = roundId;

    const mockForkedEm = {
      findOneOrFail: vi.fn((entity: unknown) => {
        if (entity === Wallet) return Promise.resolve(wallet);
        if (entity === GameRound) return Promise.resolve(gameRound);
        return Promise.reject(new Error('Unknown entity'));
      }),
      persist: vi.fn(),
    };

    const mockEm = {
      transactional: vi.fn((cb: (em: typeof mockForkedEm) => Promise<unknown>) => cb(mockForkedEm)),
    };

    const mockPublisher: IEventPublisher = {
      publishToTopic: vi.fn(),
      sendToQueue: vi.fn().mockResolvedValue(undefined),
    };

    const useCase = new PlaceBetUseCase(mockEm as never, mockPublisher);

    const result = await useCase.execute({
      userId: 'user-1',
      gameRoundId: roundId,
      amount: 40,
    });

    expect(result.userId).toBe('user-1');
    expect(result.amount).toBe(40);
    expect(wallet.balance).toBe(60);
    expect(gameRound.totalPot).toBe(40);
    expect(mockForkedEm.persist).toHaveBeenCalledWith(result);
    expect(mockPublisher.sendToQueue).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        eventType: 'BetPlacedEvent',
        aggregateId: result.id,
      }),
    );
  });

  it('should throw validation error when payload fails schema', async () => {
    const mockEm = { transactional: vi.fn() };
    const mockPublisher: IEventPublisher = {
      publishToTopic: vi.fn(),
      sendToQueue: vi.fn(),
    };

    const useCase = new PlaceBetUseCase(mockEm as never, mockPublisher);

    await expect(
      useCase.execute({
        userId: '',
        gameRoundId: 'not-a-uuid',
        amount: -5,
      }),
    ).rejects.toThrow();
  });
});
