import { describe, expect, it, vi } from 'vitest';
import { WalletController } from '../../src/presentation/controllers/wallet.controller';
import { Wallet } from '../../src/domain/entities/wallet.entity';

describe('WalletController', () => {
  it('should get balance of existing wallet', async () => {
    const wallet = new Wallet('user-1', 150);

    const mockEm = {
      findOneOrFail: vi.fn().mockResolvedValue(wallet),
    };

    const controller = new WalletController(mockEm as never);
    const result = await controller.getBalance('user-1');

    expect(result).toEqual({
      userId: 'user-1',
      balance: 150,
      currency: 'BRL',
    });
  });

  it('should deposit funds into existing wallet', async () => {
    const wallet = new Wallet('user-1', 50);

    const mockForkedEm = {
      findOne: vi.fn().mockResolvedValue(wallet),
      persist: vi.fn(),
    };

    const mockEm = {
      transactional: vi.fn((cb: (em: typeof mockForkedEm) => Promise<unknown>) => cb(mockForkedEm)),
    };

    const controller = new WalletController(mockEm as never);
    const result = await controller.deposit('user-1', { amount: 75 });

    expect(result.balance).toBe(125);
    expect(wallet.balance).toBe(125);
  });

  it('should create new wallet on deposit if user does not have one', async () => {
    const mockForkedEm = {
      findOne: vi.fn().mockResolvedValue(null),
      persist: vi.fn(),
    };

    const mockEm = {
      transactional: vi.fn((cb: (em: typeof mockForkedEm) => Promise<unknown>) => cb(mockForkedEm)),
    };

    const controller = new WalletController(mockEm as never);
    const result = await controller.deposit('new-user', { amount: 100 });

    expect(result.userId).toBe('new-user');
    expect(result.balance).toBe(100);
    expect(mockForkedEm.persist).toHaveBeenCalled();
  });
});
