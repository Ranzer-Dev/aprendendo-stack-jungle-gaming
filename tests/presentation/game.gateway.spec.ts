import { describe, expect, it, vi } from 'vitest';
import { GameGateway } from '../../src/presentation/gateways/game.gateway';
import { Bet } from '../../src/domain/entities/bet.entity';
import { randomUUID } from 'node:crypto';

describe('GameGateway', () => {
  it('should handle client connection and disconnection logging', () => {
    const mockPlaceBet = {} as never;
    const mockCashout = {} as never;
    const gateway = new GameGateway(mockPlaceBet, mockCashout);

    const mockSocket = { id: 'socket-1' } as never;

    expect(() => gateway.handleConnection(mockSocket)).not.toThrow();
    expect(() => gateway.handleDisconnect(mockSocket)).not.toThrow();
  });

  it('should join client to round room', () => {
    const gateway = new GameGateway({} as never, {} as never);
    const mockSocket = {
      join: vi.fn(),
      emit: vi.fn(),
    };

    gateway.handleJoinRound(mockSocket as never, { gameRoundId: 'round-10' });

    expect(mockSocket.join).toHaveBeenCalledWith('round-10');
    expect(mockSocket.emit).toHaveBeenCalledWith('joinedRound', { gameRoundId: 'round-10' });
  });

  it('should place bet and broadcast to room', async () => {
    const roundId = randomUUID();
    const bet = new Bet('user-1', roundId, 50);

    const mockPlaceBetUseCase = {
      execute: vi.fn().mockResolvedValue(bet),
    };

    const gateway = new GameGateway(mockPlaceBetUseCase as never, {} as never);

    const mockRoomEmitter = { emit: vi.fn() };
    const mockServer = {
      to: vi.fn().mockReturnValue(mockRoomEmitter),
    };
    (gateway as unknown as { server: typeof mockServer }).server = mockServer;

    await gateway.handlePlaceBet({} as never, {
      userId: 'user-1',
      gameRoundId: roundId,
      amount: 50,
    });

    expect(mockServer.to).toHaveBeenCalledWith(roundId);
    expect(mockRoomEmitter.emit).toHaveBeenCalledWith('betAccepted', {
      betId: bet.id,
      userId: bet.userId,
      amount: bet.amount,
      gameRoundId: bet.gameRoundId,
    });
  });

  it('should execute cashout and broadcast to room', async () => {
    const roundId = randomUUID();
    const bet = new Bet('user-1', roundId, 50);
    bet.cashOut(2.0);

    const mockCashoutUseCase = {
      execute: vi.fn().mockResolvedValue({ bet, winAmount: 100 }),
    };

    const gateway = new GameGateway({} as never, mockCashoutUseCase as never);

    const mockRoomEmitter = { emit: vi.fn() };
    const mockServer = {
      to: vi.fn().mockReturnValue(mockRoomEmitter),
    };
    (gateway as unknown as { server: typeof mockServer }).server = mockServer;

    await gateway.handleCashout({} as never, {
      betId: bet.id,
      gameRoundId: roundId,
    });

    expect(mockServer.to).toHaveBeenCalledWith(roundId);
    expect(mockRoomEmitter.emit).toHaveBeenCalledWith('playerCashedOut', {
      betId: bet.id,
      userId: bet.userId,
      winAmount: 100,
      multiplier: 2.0,
    });
  });

  it('should broadcast multiplier tick and round crashed', () => {
    const gateway = new GameGateway({} as never, {} as never);
    const mockRoomEmitter = { emit: vi.fn() };
    const mockServer = {
      to: vi.fn().mockReturnValue(mockRoomEmitter),
    };
    (gateway as unknown as { server: typeof mockServer }).server = mockServer;

    gateway.broadcastMultiplierTick('round-1', 1.55);
    expect(mockServer.to).toHaveBeenCalledWith('round-1');
    expect(mockRoomEmitter.emit).toHaveBeenCalledWith('multiplierTick', {
      gameRoundId: 'round-1',
      multiplier: 1.55,
    });

    gateway.broadcastRoundCrashed('round-1', 2.1);
    expect(mockRoomEmitter.emit).toHaveBeenCalledWith('roundCrashed', {
      gameRoundId: 'round-1',
      crashedAtMultiplier: 2.1,
    });
  });
});
