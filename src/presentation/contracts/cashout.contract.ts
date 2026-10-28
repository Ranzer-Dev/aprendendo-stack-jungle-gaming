import { z } from 'zod';

export const CashoutSchema = z.object({
  betId: z.string().uuid('Invalid bet identifier format'),
  gameRoundId: z.string().uuid('Invalid game round identifier format'),
});

export type CashoutInput = z.infer<typeof CashoutSchema>;
