import { z } from 'zod';

export const PlaceBetSchema = z.object({
  userId: z.string().min(1, 'User identifier is required'),
  gameRoundId: z.string().uuid('Invalid game round identifier format'),
  amount: z.number().positive('Bet amount must be greater than zero').max(100000, 'Bet amount exceeds limit'),
});

export type PlaceBetInput = z.infer<typeof PlaceBetSchema>;
