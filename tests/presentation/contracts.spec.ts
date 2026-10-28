import { describe, expect, it } from 'vitest';
import { PlaceBetSchema } from '../../src/presentation/contracts/place-bet.contract';
import { CashoutSchema } from '../../src/presentation/contracts/cashout.contract';
import { randomUUID } from 'node:crypto';

describe('Contracts Validation Schemas', () => {
  describe('PlaceBetSchema', () => {
    it('should validate valid payload', () => {
      const validPayload = {
        userId: 'user-123',
        gameRoundId: randomUUID(),
        amount: 50,
      };

      const parsed = PlaceBetSchema.parse(validPayload);
      expect(parsed).toEqual(validPayload);
    });

    it('should throw validation error on empty userId', () => {
      const invalid = {
        userId: '',
        gameRoundId: randomUUID(),
        amount: 50,
      };

      expect(() => PlaceBetSchema.parse(invalid)).toThrow();
    });

    it('should throw validation error on invalid uuid for gameRoundId', () => {
      const invalid = {
        userId: 'user-1',
        gameRoundId: 'not-a-uuid',
        amount: 50,
      };

      expect(() => PlaceBetSchema.parse(invalid)).toThrow();
    });

    it('should throw validation error on non-positive amount or excessive amount', () => {
      const nonPositive = {
        userId: 'user-1',
        gameRoundId: randomUUID(),
        amount: 0,
      };

      const excessive = {
        userId: 'user-1',
        gameRoundId: randomUUID(),
        amount: 150000,
      };

      expect(() => PlaceBetSchema.parse(nonPositive)).toThrow();
      expect(() => PlaceBetSchema.parse(excessive)).toThrow();
    });
  });

  describe('CashoutSchema', () => {
    it('should validate valid cashout payload', () => {
      const validPayload = {
        betId: randomUUID(),
        gameRoundId: randomUUID(),
      };

      const parsed = CashoutSchema.parse(validPayload);
      expect(parsed).toEqual(validPayload);
    });

    it('should throw validation error on invalid uuids', () => {
      expect(() => CashoutSchema.parse({ betId: 'invalid', gameRoundId: randomUUID() })).toThrow();
      expect(() => CashoutSchema.parse({ betId: randomUUID(), gameRoundId: 'invalid' })).toThrow();
    });
  });
});
