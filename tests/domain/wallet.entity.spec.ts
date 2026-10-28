import { describe, expect, it } from 'vitest';
import { Wallet } from '../../src/domain/entities/wallet.entity';
import { InsufficientFundsException } from '../../src/domain/exceptions/insufficient-funds.exception';
import { InvalidBetAmountException } from '../../src/domain/exceptions/invalid-bet-amount.exception';

describe('Wallet Entity', () => {
  it('should initialize with provided user id and initial balance', () => {
    const wallet = new Wallet('user-1', 100);

    expect(wallet.userId).toBe('user-1');
    expect(wallet.balance).toBe(100);
    expect(wallet.currency).toBe('BRL');
    expect(wallet.id).toBeDefined();
    expect(wallet.createdAt).toBeInstanceOf(Date);
    expect(wallet.updatedAt).toBeInstanceOf(Date);
  });

  it('should initialize with default balance of zero when omitted', () => {
    const wallet = new Wallet('user-default');
    expect(wallet.balance).toBe(0);
  });

  it('should credit balance with valid amount', () => {
    const wallet = new Wallet('user-1', 50);

    wallet.credit(25.5);

    expect(wallet.balance).toBe(75.5);
  });

  it('should throw InvalidBetAmountException when crediting zero or negative amount', () => {
    const wallet = new Wallet('user-1', 50);

    expect(() => wallet.credit(0)).toThrow(InvalidBetAmountException);
    expect(() => wallet.credit(-10)).toThrow(InvalidBetAmountException);
  });

  it('should debit balance when funds are sufficient', () => {
    const wallet = new Wallet('user-1', 100);

    wallet.debit(30);

    expect(wallet.balance).toBe(70);
  });

  it('should throw InvalidBetAmountException when debiting zero or negative amount', () => {
    const wallet = new Wallet('user-1', 100);

    expect(() => wallet.debit(0)).toThrow(InvalidBetAmountException);
    expect(() => wallet.debit(-5)).toThrow(InvalidBetAmountException);
  });

  it('should throw InsufficientFundsException when debit amount exceeds balance', () => {
    const wallet = new Wallet('user-1', 20);

    expect(() => wallet.debit(50)).toThrow(InsufficientFundsException);
  });
});
